import type { SupabaseClient } from '@supabase/supabase-js';

export type SafeUpsertResult = 'ok' | 'forbidden';

/**
 * Ownership-safe upsert: SELECT → INSERT (new row) | UPDATE (caller owns it) | 'forbidden'.
 *
 * Plain `.upsert()` rewrites every column including user_id on conflict, so a
 * caller who guesses a foreign row's UUID can silently overwrite it. This
 * function prevents that by checking ownership before any write:
 *
 *   1. SELECT user_id FROM <table> WHERE id = ?
 *   2. Row missing  → INSERT (fresh row)
 *   3. Row exists, user_id matches caller → UPDATE
 *   4. Row exists, user_id differs       → return 'forbidden' (no write)
 *
 * The caller must translate 'forbidden' into a 404 response (don't reveal
 * whether the id exists — just return Not Found).
 *
 * Throws on any Supabase error so the route handler can log and 500.
 */
export async function safeUpsert(
  db: SupabaseClient,
  table: string,
  userId: string,
  id: string,
  row: Record<string, unknown>,
): Promise<SafeUpsertResult> {
  const { data: existing, error: selErr } = await db
    .from(table)
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (selErr) throw selErr;

  const now = new Date().toISOString();

  if (existing === null) {
    const { error } = await db.from(table).insert({ ...row, updated_at: now });
    if (error) throw error;
    return 'ok';
  }

  if ((existing as { user_id: string }).user_id !== userId) return 'forbidden';

  const { error } = await db
    .from(table)
    .update({ ...row, updated_at: now })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  return 'ok';
}
