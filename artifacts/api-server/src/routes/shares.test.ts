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
