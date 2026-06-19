/**
 * Integration tests for pushLimiter — applied to /api/push/*.
 *
 * pushLimiter config: limit=20, windowMs=60s, standardHeaders="draft-7",
 * keyGenerator = IP + userId (composite) or IP-only (unauthenticated).
 *
 * Two describe blocks each get a fresh Express app instance (vi.resetModules +
 * dynamic import) so their in-memory rate-limit stores are completely isolated.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { Application } from 'express';
import type { RequestHandler } from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Shared Supabase mock factory — called after each vi.resetModules()
// ---------------------------------------------------------------------------

function registerSupabaseMock() {
  vi.doMock('../lib/supabase.js', () => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.upsert = vi.fn().mockResolvedValue({ error: null });
    chain.delete = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    return { supabase: chain, requireSupabase: () => chain };
  });
}

// ---------------------------------------------------------------------------
// Helper: build a mock attachUser middleware that reads req.userId from the
// X-Test-User-Id header (lets tests simulate authenticated users without a
// real JWT). requireAuth is left as a pass-through since we control userId
// injection directly.
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

const VALID_BODY = { token: 'device-token-abc123', platform: 'ios' };

// ---------------------------------------------------------------------------
// Suite 1: threshold — limits to 20 per minute, 21st → 429, draft-7 headers
// ---------------------------------------------------------------------------

describe('pushLimiter — threshold (20 req/min)', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();

    registerSupabaseMock();

    // Authenticated user (userId always set)
    vi.doMock('../middlewares/supabaseAuth.js', () =>
      makeAuthMock(() => 'test-user-id'),
    );

    const mod = await import('../app.js');
    app = mod.default;
  });

  it('returns 200 for each of the first 20 requests', async () => {
    for (let i = 1; i <= 20; i++) {
      const res = await request(app)
        .post('/api/push/register-native')
        .send(VALID_BODY)
        .set('Content-Type', 'application/json');

      expect(res.status, `request ${i} should be 200`).toBe(200);
      // draft-7 rate-limit headers must be present on every successful response
      expect(res.headers, `request ${i} missing ratelimit`).toHaveProperty('ratelimit');
      expect(res.headers, `request ${i} missing ratelimit-policy`).toHaveProperty('ratelimit-policy');
    }
  });

  it('returns 429 on the 21st request', async () => {
    const blocked = await request(app)
      .post('/api/push/register-native')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json');

    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ error: expect.stringContaining('Too many') });
  });

  it('includes correct RateLimit-Policy header (limit=20, window=60 s)', async () => {
    const res = await request(app)
      .post('/api/push/register-native')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json');

    expect(res.headers).toHaveProperty('ratelimit');
    expect(res.headers).toHaveProperty('ratelimit-policy');
    const policy: string = res.headers['ratelimit-policy'] as string;
    // draft-7 policy format: "<limit>;w=<windowSeconds>"
    expect(policy).toMatch(/20;w=60/);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: composite key — IP+userId buckets are independent
// ---------------------------------------------------------------------------

describe('pushLimiter — IP+userId composite key isolation', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();

    registerSupabaseMock();

    // Reads the custom X-Test-User-Id header to simulate authenticated users
    vi.doMock('../middlewares/supabaseAuth.js', () =>
      makeAuthMock((req) => (req.headers['x-test-user-id'] as string) || undefined),
    );

    const mod = await import('../app.js');
    app = mod.default;
  });

  it('exhausting user-A quota does not affect user-B bucket', async () => {
    // Consume all 20 slots for user-A
    for (let i = 1; i <= 20; i++) {
      const res = await request(app)
        .post('/api/push/register-native')
        .set('X-Test-User-Id', 'user-A')
        .send(VALID_BODY)
        .set('Content-Type', 'application/json');
      expect(res.status, `user-A request ${i} should be 200`).toBe(200);
    }

    // user-A's 21st is blocked
    const blockedA = await request(app)
      .post('/api/push/register-native')
      .set('X-Test-User-Id', 'user-A')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json');
    expect(blockedA.status).toBe(429);

    // user-B (same IP, different userId) has a separate bucket — still allowed
    const resB = await request(app)
      .post('/api/push/register-native')
      .set('X-Test-User-Id', 'user-B')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json');
    expect(resB.status, 'user-B should have its own fresh quota').toBe(200);
  });
});
