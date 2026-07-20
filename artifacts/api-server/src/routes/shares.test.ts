/**
 * Integration tests for GET /api/shares/:token — shareLookupLimiter
 *
 * shareLookupLimiter config: limit=30, windowMs=60s, standardHeaders="draft-7",
 * keyGenerator = IP-only (route is public; no userId is available).
 *
 * Two describe blocks each get a fresh Express app instance (vi.resetModules +
 * dynamic import) so their in-memory rate-limit stores are completely isolated.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { Application } from 'express';
import type { RequestHandler } from 'express';
import request from 'supertest';

// A syntactically valid share token: 64 lowercase hex chars.
const VALID_TOKEN = 'a'.repeat(64);

// ---------------------------------------------------------------------------
// Shared Supabase mock factory — called after each vi.resetModules()
// Returns null for every share lookup so the handler responds 404 (not 500).
// 404 is still "under the limit"; the test just needs non-429 for the first
// 30 requests, then a 429 on the 31st.
// ---------------------------------------------------------------------------

function registerSupabaseMock() {
  vi.doMock('../lib/supabase.js', () => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.insert = vi.fn().mockResolvedValue({ error: null });
    chain.upsert = vi.fn().mockResolvedValue({ error: null });
    return { supabase: chain, requireSupabase: () => chain };
  });
}

// ---------------------------------------------------------------------------
// Helper: build a mock attachUser middleware. requireAuth is a pass-through
// since GET /:token does not require authentication.
// ---------------------------------------------------------------------------

function makeAuthMock(getUserId: (req: import('express').Request) => string | undefined): Record<string, RequestHandler> {
  return {
    attachUser: (req, _res, next) => {
      const id = getUserId(req);
      if (id) (req as import('express').Request & { userId?: string }).userId = id;
      next();
    },
    requireAuth: (_req, _res, next) => next(),
  };
}

// ---------------------------------------------------------------------------
// Suite 1: threshold — limits to 30 per minute, 31st → 429, draft-7 headers
// ---------------------------------------------------------------------------

describe('shareLookupLimiter — threshold (30 req/min)', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();

    registerSupabaseMock();

    // Unauthenticated — public endpoint, IP-only key
    vi.doMock('../middlewares/supabaseAuth.js', () =>
      makeAuthMock(() => undefined),
    );

    const mod = await import('../app.js');
    app = mod.default;
  });

  it('returns a non-429 status for each of the first 30 requests', async () => {
    for (let i = 1; i <= 30; i++) {
      const res = await request(app).get(`/api/shares/${VALID_TOKEN}`);

      expect(res.status, `request ${i} must not be rate-limited`).not.toBe(429);
      // draft-7 rate-limit headers must be present on every response
      expect(res.headers, `request ${i} missing ratelimit`).toHaveProperty('ratelimit');
      expect(res.headers, `request ${i} missing ratelimit-policy`).toHaveProperty('ratelimit-policy');
    }
  });

  it('returns 429 on the 31st request', async () => {
    const blocked = await request(app).get(`/api/shares/${VALID_TOKEN}`);

    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ error: expect.stringContaining('Too many') });
  });

  it('includes correct RateLimit-Policy header (limit=30, window=60 s)', async () => {
    // Still in the same window — a 429 or carry-over is fine here
    const res = await request(app).get(`/api/shares/${VALID_TOKEN}`);

    expect(res.headers).toHaveProperty('ratelimit');
    expect(res.headers).toHaveProperty('ratelimit-policy');
    const policy: string = res.headers['ratelimit-policy'] as string;
    // draft-7 policy format: "<limit>;w=<windowSeconds>"
    expect(policy).toMatch(/30;w=60/);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: child-scoped data filtering
// A share scoped to child A must not include child B's medications.
// ---------------------------------------------------------------------------

describe('GET /:token — child-scoped medications', () => {
  let app: Application;

  const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
  const SHARE_TOKEN = 'b'.repeat(64);
  const CHILD_A_ID = 'child-a-id';
  const CHILD_B_ID = 'child-b-id';
  const USER_ID = 'user-1';

  const shareRow = {
    token: SHARE_TOKEN,
    user_id: USER_ID,
    expires_at: FUTURE,
    include_notes: true,
    revoked: false,
    child_id: CHILD_A_ID,
  };

  const childrenRows = [
    { id: CHILD_A_ID, name: 'Alice', baseline: null },
    { id: CHILD_B_ID, name: 'Bob', baseline: null },
  ];

  const medA = { id: 'med-a', name: 'Augmentin', child_id: CHILD_A_ID };
  const medB = { id: 'med-b', name: 'Azithromycin', child_id: CHILD_B_ID };

  beforeAll(async () => {
    vi.resetModules();

    vi.doMock('../lib/supabase.js', () => {
      const makeChain = (table: string) => {
        const filters: Record<string, string> = {};

        const chain: Record<string, unknown> = {};

        chain.select = () => chain;
        chain.eq = (col: string, val: string) => {
          filters[String(col)] = String(val);
          return chain;
        };
        chain.order = () => chain;
        chain.limit = () => chain;

        // Terminal: single-row lookup (shares table only)
        chain.maybeSingle = () => {
          if (table === 'shares') {
            return Promise.resolve({ data: shareRow, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        };

        // Terminal: array query — called when the chain is awaited directly.
        // JavaScript calls .then() on a thenable in await / Promise.all.
        chain.then = (
          resolve: (v: { data: unknown[]; error: null }) => unknown,
          reject: (e: unknown) => unknown,
        ) => {
          let data: unknown[] = [];

          if (table === 'children') {
            data = childrenRows;
          } else if (table === 'medications') {
            if (filters.child_id === CHILD_A_ID) data = [{ data: medA }];
            else if (filters.child_id === CHILD_B_ID) data = [{ data: medB }];
            else data = [{ data: medA }, { data: medB }]; // unscoped fallback
          }
          // med_library, milestones, symptom_logs, ptec_logs → empty

          return Promise.resolve({ data, error: null }).then(resolve, reject);
        };

        return chain;
      };

      const db = { from: (table: string) => makeChain(table) };
      return { supabase: db, requireSupabase: () => db };
    });

    vi.doMock('../middlewares/supabaseAuth.js', () =>
      makeAuthMock(() => undefined),
    );

    const mod = await import('../app.js');
    app = mod.default;
  });

  it("returns only child A's medication when the share is scoped to child A", async () => {
    const res = await request(app).get(`/api/shares/${SHARE_TOKEN}`);

    expect(res.status).toBe(200);

    const medications: unknown[] = res.body.medications;
    expect(medications).toBeDefined();

    // Child A's med must be present
    expect(medications).toContainEqual(expect.objectContaining({ id: 'med-a' }));

    // Child B's med must NOT be present
    expect(medications).not.toContainEqual(expect.objectContaining({ id: 'med-b' }));

    // Confirm the share resolved to the correct child
    expect(res.body.child).toMatchObject({ id: CHILD_A_ID, name: 'Alice' });
  });
});

// ---------------------------------------------------------------------------
// Suite 2: IP-only key — all requests share one bucket regardless of userId
// ---------------------------------------------------------------------------

describe('shareLookupLimiter — IP-only key (no per-user isolation)', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();

    registerSupabaseMock();

    // Even when a userId is present, the limiter uses IP only
    vi.doMock('../middlewares/supabaseAuth.js', () =>
      makeAuthMock((req) => (req.headers['x-test-user-id'] as string) || undefined),
    );

    const mod = await import('../app.js');
    app = mod.default;
  });

  it('requests from different userIds share the same IP bucket', async () => {
    // Consume all 30 slots — alternating between two "users" (same IP in supertest)
    for (let i = 1; i <= 30; i++) {
      const userId = i % 2 === 0 ? 'user-A' : 'user-B';
      const res = await request(app)
        .get(`/api/shares/${VALID_TOKEN}`)
        .set('X-Test-User-Id', userId);

      expect(res.status, `request ${i} (${userId}) must not be rate-limited`).not.toBe(429);
    }

    // 31st request — different userId, same IP — still blocked (IP-only bucket)
    const blocked = await request(app)
      .get(`/api/shares/${VALID_TOKEN}`)
      .set('X-Test-User-Id', 'user-C');

    expect(blocked.status, 'IP bucket exhausted — must return 429 regardless of userId').toBe(429);
  });
});
