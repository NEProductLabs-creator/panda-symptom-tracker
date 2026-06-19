/**
 * Integration tests for globalApiLimiter — the catch-all safety net mounted at
 * app.use("/api", globalApiLimiter) in app.ts.
 *
 * globalApiLimiter config: limit=200, windowMs=60s, standardHeaders="draft-7",
 * keyGenerator = IP + userId (composite) or IP-only (unauthenticated).
 *
 * GET /api/healthz has no per-route limiter, so it is a clean target: any
 * rate-limit response here can only come from the global catch-all.
 *
 * Each describe block gets a fresh Express app (vi.resetModules + dynamic
 * import) so in-memory stores are fully isolated.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { Application } from 'express';
import type { RequestHandler } from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Supabase mock — required because app.ts imports lib/supabase indirectly
// ---------------------------------------------------------------------------

function registerSupabaseMock() {
  vi.doMock('../lib/supabase.js', () => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.insert = vi.fn().mockResolvedValue({ error: null });
    chain.upsert = vi.fn().mockResolvedValue({ error: null });
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    return { supabase: chain, requireSupabase: () => chain };
  });
}

// ---------------------------------------------------------------------------
// Auth mock — attachUser reads X-Test-User-Id header; requireAuth passes
// ---------------------------------------------------------------------------

function makeAuthMock(
  getUserId: (req: import('express').Request) => string | undefined,
): Record<string, RequestHandler> {
  return {
    attachUser: (req, _res, next) => {
      const id = getUserId(req);
      if (id)
        (req as import('express').Request & { userId?: string }).userId = id;
      next();
    },
    requireAuth: (_req, _res, next) => next(),
  };
}

// ---------------------------------------------------------------------------
// Suite 1: threshold — 201st request is blocked; draft-7 headers present
// ---------------------------------------------------------------------------

describe('globalApiLimiter — threshold (200 req/min on /api/healthz)', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();
    registerSupabaseMock();
    vi.doMock('../middlewares/supabaseAuth.js', () =>
      makeAuthMock(() => undefined),
    );
    const mod = await import('../app.js');
    app = mod.default;
  });

  it('returns 200 for each of the first 200 requests', async () => {
    for (let i = 1; i <= 200; i++) {
      const res = await request(app).get('/api/healthz');
      expect(res.status, `request ${i} should be 200`).toBe(200);
      expect(res.headers, `request ${i} missing ratelimit`).toHaveProperty(
        'ratelimit',
      );
      expect(
        res.headers,
        `request ${i} missing ratelimit-policy`,
      ).toHaveProperty('ratelimit-policy');
    }
  });

  it('returns 429 on the 201st request', async () => {
    const blocked = await request(app).get('/api/healthz');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      error: expect.stringContaining('Too many'),
    });
  });

  it('includes correct RateLimit-Policy header (limit=200, window=60 s)', async () => {
    const res = await request(app).get('/api/healthz');
    expect(res.headers).toHaveProperty('ratelimit-policy');
    const policy: string = res.headers['ratelimit-policy'] as string;
    expect(policy).toMatch(/200;w=60/);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: composite key — IP+userId buckets are independent
// ---------------------------------------------------------------------------

describe('globalApiLimiter — IP+userId composite key isolation', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();
    registerSupabaseMock();
    vi.doMock('../middlewares/supabaseAuth.js', () =>
      makeAuthMock(
        (req) => (req.headers['x-test-user-id'] as string) || undefined,
      ),
    );
    const mod = await import('../app.js');
    app = mod.default;
  });

  it('exhausting user-A quota does not affect user-B', async () => {
    // Consume all 200 slots for user-A
    for (let i = 1; i <= 200; i++) {
      const res = await request(app)
        .get('/api/healthz')
        .set('X-Test-User-Id', 'user-A');
      expect(res.status, `user-A request ${i} should be 200`).toBe(200);
    }

    // user-A's 201st is blocked
    const blockedA = await request(app)
      .get('/api/healthz')
      .set('X-Test-User-Id', 'user-A');
    expect(blockedA.status).toBe(429);

    // user-B (same IP, different userId) has a separate bucket — still allowed
    const resB = await request(app)
      .get('/api/healthz')
      .set('X-Test-User-Id', 'user-B');
    expect(resB.status, 'user-B should have its own fresh quota').toBe(200);
  });
});
