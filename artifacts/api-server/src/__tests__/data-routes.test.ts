/**
 * Integration tests for the core data routes:
 *   /api/data/logs      — symptom log CRUD
 *   /api/data/medications — medication CRUD
 *
 * Supabase and safeUpsert are fully stubbed so no live database is required.
 * Each describe block gets a fresh Express app (vi.resetModules + dynamic
 * import) so rate-limit in-memory stores are completely isolated.
 *
 * Mock strategy:
 *   - lib/supabase    → requireSupabase() returns a configurable chainable mock
 *   - lib/safeUpsert  → safeUpsert() is a vi.fn() that defaults to 'ok'
 *   - supabaseAuth    → attachUser reads X-Test-User-Id header; requireAuth enforces it
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { Application } from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Shared mutable state — the mock closures read from this object, so tests
// can reconfigure behavior between requests without reloading the module.
// ---------------------------------------------------------------------------

interface MockDb {
  tableRows: Record<string, unknown[]>;
  childRow: { id: string } | null;
  deleteError: { message: string } | null;
}

const mockDb: MockDb = {
  tableRows: {},
  childRow: null,
  deleteError: null,
};

/** Resets mock state to clean defaults before each test */
function resetMockDb() {
  mockDb.tableRows = {};
  mockDb.childRow = null;
  mockDb.deleteError = null;
}

// ---------------------------------------------------------------------------
// safeUpsert mock — accessible so individual tests can change its return value
// ---------------------------------------------------------------------------

let safeUpsertMock: ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Mock registration helpers (called after each vi.resetModules())
// ---------------------------------------------------------------------------

function registerSupabaseMock() {
  vi.doMock('../lib/supabase.js', () => {
    function makeChain(table: string) {
      let isDelete = false;

      const chain: Record<string, unknown> = {
        select() { return chain; },
        eq() { return chain; },
        order() { return chain; },
        limit() { return chain; },
        delete() { isDelete = true; return chain; },
        update() { return chain; },
        maybeSingle() {
          // resolveChildId / baseline lookups use children table
          if (table === 'children') {
            return Promise.resolve({ data: mockDb.childRow, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single() {
          return Promise.resolve({ data: null, error: null });
        },
        then(
          onfulfilled: ((v: unknown) => unknown) | null,
          onrejected?: ((e: unknown) => unknown) | null,
        ) {
          let result: unknown;
          if (isDelete) {
            result = { error: mockDb.deleteError };
          } else {
            const rows = (mockDb.tableRows[table] ?? []).map((d) => ({ data: d }));
            result = { data: rows, error: null };
          }
          return Promise.resolve(result).then(
            onfulfilled ?? undefined,
            onrejected ?? undefined,
          );
        },
      };
      return chain;
    }

    const requireSupabase = () => ({
      from: (table: string) => makeChain(table),
    });

    return { supabase: requireSupabase(), requireSupabase };
  });
}

function registerSafeUpsertMock() {
  safeUpsertMock = vi.fn().mockResolvedValue('ok');
  vi.doMock('../lib/safeUpsert.js', () => ({
    safeUpsert: (...args: unknown[]) => safeUpsertMock(...args),
  }));
}

function registerAuthMock() {
  vi.doMock('../middlewares/supabaseAuth.js', () => ({
    attachUser: (
      req: import('express').Request,
      _res: import('express').Response,
      next: import('express').NextFunction,
    ) => {
      const id = req.headers['x-test-user-id'] as string | undefined;
      if (id) (req as import('express').Request & { userId?: string }).userId = id;
      next();
    },
    requireAuth: (
      req: import('express').Request,
      res: import('express').Response,
      next: import('express').NextFunction,
    ) => {
      if (!(req as import('express').Request & { userId?: string }).userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      next();
    },
  }));
}

function registerAllMocks() {
  registerSupabaseMock();
  registerSafeUpsertMock();
  registerAuthMock();
}

// ---------------------------------------------------------------------------
// Helper: send an authenticated request with the test user header
// ---------------------------------------------------------------------------

const USER_ID = 'user-test-abc';
const CHILD_ID = 'child-test-xyz';

// ---------------------------------------------------------------------------
// Suite 1: Authentication enforcement
// Verifies that every data route returns 401 when no user is attached.
// ---------------------------------------------------------------------------

describe('data routes — 401 without authentication', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();
    registerAllMocks();
    const mod = await import('../app.js');
    app = mod.default;
  });

  const unauthenticatedCases: Array<{ method: 'get' | 'post' | 'delete'; path: string }> = [
    { method: 'get',    path: '/api/data/logs' },
    { method: 'post',   path: '/api/data/logs' },
    { method: 'delete', path: '/api/data/logs/some-id' },
    { method: 'get',    path: '/api/data/medications' },
    { method: 'post',   path: '/api/data/medications' },
    { method: 'delete', path: '/api/data/medications/some-id' },
  ];

  for (const { method, path } of unauthenticatedCases) {
    it(`${method.toUpperCase()} ${path} → 401`, async () => {
      const res = await (request(app)[method] as (url: string) => request.Test)(path)
        .set('Content-Type', 'application/json')
        .send({});
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: expect.any(String) });
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 2: GET /api/data/logs
// ---------------------------------------------------------------------------

describe('GET /api/data/logs', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();
    registerAllMocks();
    const mod = await import('../app.js');
    app = mod.default;
  });

  beforeEach(() => resetMockDb());

  it('returns an empty array when no logs exist', async () => {
    mockDb.tableRows['symptom_logs'] = [];
    const res = await request(app)
      .get('/api/data/logs')
      .set('X-Test-User-Id', USER_ID);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns the data payload of each row', async () => {
    const log1 = { id: 'log-1', date: '2026-01-01', scores: { ocd: 2 } };
    const log2 = { id: 'log-2', date: '2026-01-02', scores: { ocd: 3 } };
    mockDb.tableRows['symptom_logs'] = [log1, log2];

    const res = await request(app)
      .get('/api/data/logs')
      .set('X-Test-User-Id', USER_ID);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([log1, log2]);
  });

  it('passes child_id query param through without error', async () => {
    mockDb.tableRows['symptom_logs'] = [];
    const res = await request(app)
      .get('/api/data/logs')
      .query({ child_id: CHILD_ID })
      .set('X-Test-User-Id', USER_ID);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when Supabase returns an error', async () => {
    // Override the chain so it resolves with an error
    vi.doMock('../lib/supabase.js', () => {
      const errChain: Record<string, unknown> = {
        select() { return errChain; },
        eq() { return errChain; },
        then(
          onfulfilled: ((v: unknown) => unknown) | null,
          onrejected?: ((e: unknown) => unknown) | null,
        ) {
          return Promise.resolve({ data: null, error: { message: 'db error' } }).then(
            onfulfilled ?? undefined,
            onrejected ?? undefined,
          );
        },
      };
      return { supabase: { from: () => errChain }, requireSupabase: () => ({ from: () => errChain }) };
    });

    // Need a fresh app to pick up the new mock
    vi.resetModules();
    vi.doMock('../lib/supabase.js', () => {
      const errChain: Record<string, unknown> = {
        select() { return errChain; },
        eq() { return errChain; },
        then(
          onfulfilled: ((v: unknown) => unknown) | null,
          onrejected?: ((e: unknown) => unknown) | null,
        ) {
          return Promise.resolve({ data: null, error: { message: 'db error' } }).then(
            onfulfilled ?? undefined,
            onrejected ?? undefined,
          );
        },
      };
      return { supabase: {}, requireSupabase: () => ({ from: () => errChain }) };
    });
    registerSafeUpsertMock();
    registerAuthMock();
    const freshMod = await import('../app.js');
    const freshApp = freshMod.default;

    const res = await request(freshApp)
      .get('/api/data/logs')
      .set('X-Test-User-Id', USER_ID);
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// Suite 3: POST /api/data/logs
// ---------------------------------------------------------------------------

describe('POST /api/data/logs', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();
    registerAllMocks();
    const mod = await import('../app.js');
    app = mod.default;
  });

  beforeEach(() => {
    resetMockDb();
    safeUpsertMock.mockClear();
    safeUpsertMock.mockResolvedValue('ok');
  });

  it('returns 204 when safeUpsert succeeds', async () => {
    const body = { id: 'log-new', date: '2026-06-01', child_id: CHILD_ID };
    const res = await request(app)
      .post('/api/data/logs')
      .set('X-Test-User-Id', USER_ID)
      .send(body);
    expect(res.status).toBe(204);
  });

  it('calls safeUpsert with the correct table and user id', async () => {
    const body = { id: 'log-abc', date: '2026-06-02', child_id: CHILD_ID };
    await request(app)
      .post('/api/data/logs')
      .set('X-Test-User-Id', USER_ID)
      .send(body);
    expect(safeUpsertMock).toHaveBeenCalledWith(
      expect.anything(),   // db instance
      'symptom_logs',
      USER_ID,
      'log-abc',
      expect.objectContaining({ id: 'log-abc', user_id: USER_ID, date: '2026-06-02' }),
    );
  });

  it('returns 404 when safeUpsert returns forbidden (cross-user write attempt)', async () => {
    safeUpsertMock.mockResolvedValue('forbidden');
    const body = { id: 'log-other', date: '2026-06-03' };
    const res = await request(app)
      .post('/api/data/logs')
      .set('X-Test-User-Id', USER_ID)
      .send(body);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// Suite 4: DELETE /api/data/logs/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/data/logs/:id', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();
    registerAllMocks();
    const mod = await import('../app.js');
    app = mod.default;
  });

  beforeEach(() => resetMockDb());

  it('returns 204 on successful delete', async () => {
    mockDb.deleteError = null;
    const res = await request(app)
      .delete('/api/data/logs/log-to-delete')
      .set('X-Test-User-Id', USER_ID);
    expect(res.status).toBe(204);
  });

  it('returns 500 when Supabase delete returns an error', async () => {
    mockDb.deleteError = { message: 'constraint violation' };
    const res = await request(app)
      .delete('/api/data/logs/log-bad')
      .set('X-Test-User-Id', USER_ID);
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// Suite 5: GET /api/data/medications
// ---------------------------------------------------------------------------

describe('GET /api/data/medications', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();
    registerAllMocks();
    const mod = await import('../app.js');
    app = mod.default;
  });

  beforeEach(() => resetMockDb());

  it('returns an empty array when no medications exist', async () => {
    mockDb.tableRows['medications'] = [];
    const res = await request(app)
      .get('/api/data/medications')
      .set('X-Test-User-Id', USER_ID);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns the data payload of each row', async () => {
    const med1 = { id: 'med-1', name: 'Augmentin', dose: '500mg' };
    const med2 = { id: 'med-2', name: 'Ibuprofen', dose: '200mg' };
    mockDb.tableRows['medications'] = [med1, med2];

    const res = await request(app)
      .get('/api/data/medications')
      .set('X-Test-User-Id', USER_ID);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([med1, med2]);
  });

  it('accepts optional child_id filter without error', async () => {
    mockDb.tableRows['medications'] = [];
    const res = await request(app)
      .get('/api/data/medications')
      .query({ child_id: CHILD_ID })
      .set('X-Test-User-Id', USER_ID);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Suite 6: POST /api/data/medications
// ---------------------------------------------------------------------------

describe('POST /api/data/medications', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();
    registerAllMocks();
    const mod = await import('../app.js');
    app = mod.default;
  });

  beforeEach(() => {
    resetMockDb();
    safeUpsertMock.mockClear();
    safeUpsertMock.mockResolvedValue('ok');
  });

  it('returns 204 when a child exists and safeUpsert succeeds', async () => {
    mockDb.childRow = { id: CHILD_ID };
    const body = { id: 'med-new', name: 'Azithromycin', child_id: CHILD_ID };
    const res = await request(app)
      .post('/api/data/medications')
      .set('X-Test-User-Id', USER_ID)
      .send(body);
    expect(res.status).toBe(204);
  });

  it('calls safeUpsert with child_id from request body when provided', async () => {
    mockDb.childRow = { id: CHILD_ID };
    const body = { id: 'med-body-child', name: 'Pred', child_id: CHILD_ID };
    await request(app)
      .post('/api/data/medications')
      .set('X-Test-User-Id', USER_ID)
      .send(body);
    expect(safeUpsertMock).toHaveBeenCalledWith(
      expect.anything(),
      'medications',
      USER_ID,
      'med-body-child',
      expect.objectContaining({ child_id: CHILD_ID }),
    );
  });

  it('returns 204 silently (no upsert) when user has no children', async () => {
    // resolveChildId will return null when no child found
    mockDb.childRow = null;
    const body = { id: 'med-no-child', name: 'Test' };
    const res = await request(app)
      .post('/api/data/medications')
      .set('X-Test-User-Id', USER_ID)
      .send(body);
    // Silent 204 — no child_id, nothing inserted
    expect(res.status).toBe(204);
    expect(safeUpsertMock).not.toHaveBeenCalled();
  });

  it('returns 404 when safeUpsert returns forbidden', async () => {
    mockDb.childRow = { id: CHILD_ID };
    safeUpsertMock.mockResolvedValue('forbidden');
    const body = { id: 'med-forbidden', name: 'Test', child_id: CHILD_ID };
    const res = await request(app)
      .post('/api/data/medications')
      .set('X-Test-User-Id', USER_ID)
      .send(body);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it('resolves child via DB lookup when child_id is not in request body', async () => {
    mockDb.childRow = { id: CHILD_ID };
    const body = { id: 'med-resolved', name: 'Resolved' }; // no child_id
    const res = await request(app)
      .post('/api/data/medications')
      .set('X-Test-User-Id', USER_ID)
      .send(body);
    expect(res.status).toBe(204);
    expect(safeUpsertMock).toHaveBeenCalledWith(
      expect.anything(),
      'medications',
      USER_ID,
      'med-resolved',
      expect.objectContaining({ child_id: CHILD_ID }),
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 7: DELETE /api/data/medications/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/data/medications/:id', () => {
  let app: Application;

  beforeAll(async () => {
    vi.resetModules();
    registerAllMocks();
    const mod = await import('../app.js');
    app = mod.default;
  });

  beforeEach(() => resetMockDb());

  it('returns 204 on successful delete', async () => {
    mockDb.deleteError = null;
    const res = await request(app)
      .delete('/api/data/medications/med-to-delete')
      .set('X-Test-User-Id', USER_ID);
    expect(res.status).toBe(204);
  });

  it('returns 500 when Supabase delete returns an error', async () => {
    mockDb.deleteError = { message: 'delete failed' };
    const res = await request(app)
      .delete('/api/data/medications/med-bad')
      .set('X-Test-User-Id', USER_ID);
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});
