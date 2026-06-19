import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeUpsert } from './safeUpsert';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Minimal Supabase client mock
//
// safeUpsert makes three possible call patterns:
//   SELECT:  db.from(t).select('user_id').eq('id',id).maybeSingle()  → Promise<{data,error}>
//   INSERT:  db.from(t).insert(row)                                   → Promise<{error}>
//   UPDATE:  db.from(t).update(row).eq('id',id).eq('user_id',uid)    → awaitable → {error}
//
// The builder returned by from() is used for all three paths. It implements
// .then() so that "await builder" works for the chained update path.
// ---------------------------------------------------------------------------

function makeBuilder(existing: { user_id: string } | null) {
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  const updateFn = vi.fn();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
    insert: insertFn,
    update: updateFn,
    // Thenable: lets `await db.from(t).update(r).eq().eq()` resolve to { error: null }
    then(
      onfulfilled: ((v: { error: null }) => unknown) | null,
      onrejected?: ((e: unknown) => unknown) | null,
    ) {
      return Promise.resolve({ error: null }).then(
        onfulfilled ?? undefined,
        onrejected ?? undefined,
      );
    },
  };
  updateFn.mockReturnValue(builder);

  const db = { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient;
  return { db, builder, insertFn, updateFn };
}

const TABLE = 'symptom_logs';
const ROW = { id: 'row-1', user_id: 'user_A', data: {}, date: '2026-01-01' };

// ---------------------------------------------------------------------------

describe('safeUpsert — new row (id not found)', () => {
  it('calls INSERT and returns ok', async () => {
    const { db, insertFn, updateFn } = makeBuilder(null);
    const result = await safeUpsert(db, TABLE, 'user_A', 'row-1', ROW);
    expect(result).toBe('ok');
    expect(insertFn).toHaveBeenCalledOnce();
    expect(updateFn).not.toHaveBeenCalled();
  });
});

describe('safeUpsert — row exists, same user', () => {
  it('calls UPDATE and returns ok', async () => {
    const { db, insertFn, updateFn } = makeBuilder({ user_id: 'user_A' });
    const result = await safeUpsert(db, TABLE, 'user_A', 'row-1', ROW);
    expect(result).toBe('ok');
    expect(updateFn).toHaveBeenCalledOnce();
    expect(insertFn).not.toHaveBeenCalled();
  });
});

describe('safeUpsert — ownership check: second user cannot overwrite another user\'s row', () => {
  let db: SupabaseClient;
  let insertFn: ReturnType<typeof vi.fn>;
  let updateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Row is owned by user_A; caller is user_B
    ({ db, insertFn, updateFn } = makeBuilder({ user_id: 'user_A' }));
  });

  it('returns forbidden', async () => {
    const result = await safeUpsert(db, TABLE, 'user_B', 'row-1', { ...ROW, user_id: 'user_B' });
    expect(result).toBe('forbidden');
  });

  it('never calls INSERT', async () => {
    await safeUpsert(db, TABLE, 'user_B', 'row-1', ROW);
    expect(insertFn).not.toHaveBeenCalled();
  });

  it('never calls UPDATE', async () => {
    await safeUpsert(db, TABLE, 'user_B', 'row-1', ROW);
    expect(updateFn).not.toHaveBeenCalled();
  });
});

describe('safeUpsert — Supabase SELECT error propagates', () => {
  it('throws so the route can 500', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }),
    };
    const db = { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient;
    await expect(safeUpsert(db, TABLE, 'user_A', 'row-1', ROW)).rejects.toEqual({ message: 'db down' });
  });
});
