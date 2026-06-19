import { Router, Request, Response } from 'express';
import { requireAuth } from '@clerk/express';
import { requireSupabase } from '../lib/supabase';
import { logger, errCode } from '../lib/logger';
import { safeUpsert } from '../lib/safeUpsert';

const router = Router();

router.use(requireAuth());

function uid(req: Request): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).auth.userId as string;
}

function err(res: Response, e: unknown, ctx: string): void {
  logger.error({ errCode: errCode(e) }, ctx);
  res.status(500).json({ error: 'Internal server error' });
}

// ── Generic helpers ────────────────────────────────────────────────────────────

/**
 * Fetch all rows for a user from a table that stores its payload in a `data`
 * column. When childId is provided, additionally filters by child_id.
 */
async function getAll(
  table: string,
  userId: string,
  childId?: string,
): Promise<unknown[]> {
  const db = requireSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db.from(table).select('data').eq('user_id', userId);
  if (childId) query = query.eq('child_id', childId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r: { data: unknown }) => r.data);
}

// Returns 'forbidden' when the id exists but is owned by a different user.
async function upsertItem(
  table: string,
  userId: string,
  id: string,
  item: unknown,
  extra?: Record<string, unknown>,
): Promise<'ok' | 'forbidden'> {
  const db = requireSupabase();
  const row = { id, user_id: userId, data: item, ...extra };
  return safeUpsert(db, table, userId, id, row);
}

async function deleteItem(table: string, userId: string, id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from(table).delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

/**
 * Resolve a child_id for the given user.
 *  - If `provided` is non-empty, return it as-is.
 *  - Otherwise look up the user's lowest sort_order non-archived child.
 *  - Returns null when the user has no children at all (zero-children legacy path).
 */
async function resolveChildId(userId: string, provided: string | undefined): Promise<string | null> {
  if (provided) return provided;
  const db = requireSupabase();
  const { data } = await db
    .from('children')
    .select('id')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

// ── Symptom Logs ───────────────────────────────────────────────────────────────

router.get('/logs', async (req, res) => {
  try {
    const db = requireSupabase();
    const userId = uid(req);
    const childId = req.query.child_id as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db.from('symptom_logs').select('data').eq('user_id', userId);
    if (childId) query = query.eq('child_id', childId);
    const { data, error } = await query;
    if (error) throw error;
    res.json((data ?? []).map((r: { data: unknown }) => r.data));
  } catch (e) { err(res, e, 'GET /logs'); }
});

router.post('/logs', async (req, res) => {
  try {
    const db = requireSupabase();
    const userId = uid(req);
    const log = req.body as { id: string; date: string; child_id?: string };
    const row: Record<string, unknown> = { id: log.id, user_id: userId, date: log.date, data: log };
    if (log.child_id) row.child_id = log.child_id;
    const result = await safeUpsert(db, 'symptom_logs', userId, log.id, row);
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /logs'); }
});

router.delete('/logs/:id', async (req, res) => {
  try {
    await deleteItem('symptom_logs', uid(req), req.params.id);
    res.status(204).send();
  } catch (e) { err(res, e, 'DELETE /logs/:id'); }
});

// ── Medications ────────────────────────────────────────────────────────────────

router.get('/medications', async (req, res) => {
  try {
    const childId = req.query.child_id as string | undefined;
    res.json(await getAll('medications', uid(req), childId));
  } catch (e) { err(res, e, 'GET /medications'); }
});

router.post('/medications', async (req, res) => {
  try {
    const userId = uid(req);
    const body = req.body as { id: string; child_id?: string };
    const childId = await resolveChildId(userId, body.child_id);
    // child_id is NOT NULL in the schema; skip silently for zero-children legacy callers.
    if (!childId) { res.status(204).send(); return; }
    const result = await upsertItem('medications', userId, body.id, body, { child_id: childId });
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /medications'); }
});

router.delete('/medications/:id', async (req, res) => {
  try { await deleteItem('medications', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /medications/:id'); }
});

// ── Medication Library ─────────────────────────────────────────────────────────

router.get('/medlibrary', async (req, res) => {
  try {
    const childId = req.query.child_id as string | undefined;
    res.json(await getAll('med_library', uid(req), childId));
  } catch (e) { err(res, e, 'GET /medlibrary'); }
});

router.post('/medlibrary', async (req, res) => {
  try {
    const userId = uid(req);
    const body = req.body as { id: string; child_id?: string };
    const childId = await resolveChildId(userId, body.child_id);
    if (!childId) { res.status(204).send(); return; }
    const result = await upsertItem('med_library', userId, body.id, body, { child_id: childId });
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /medlibrary'); }
});

router.delete('/medlibrary/:id', async (req, res) => {
  try { await deleteItem('med_library', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /medlibrary/:id'); }
});

// ── Milestones ─────────────────────────────────────────────────────────────────

router.get('/milestones', async (req, res) => {
  try {
    const childId = req.query.child_id as string | undefined;
    res.json(await getAll('milestones', uid(req), childId));
  } catch (e) { err(res, e, 'GET /milestones'); }
});

router.post('/milestones', async (req, res) => {
  try {
    const userId = uid(req);
    const body = req.body as { id: string; child_id?: string };
    const childId = await resolveChildId(userId, body.child_id);
    if (!childId) { res.status(204).send(); return; }
    const result = await upsertItem('milestones', userId, body.id, body, { child_id: childId });
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /milestones'); }
});

router.delete('/milestones/:id', async (req, res) => {
  try { await deleteItem('milestones', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /milestones/:id'); }
});

// ── Child Baseline (per-child column on children table) ───────────────────────

router.get('/children/:id/baseline', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  try {
    const { data, error } = await db
      .from('children')
      .select('baseline')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    res.json((data as { baseline: unknown } | null)?.baseline ?? null);
  } catch (e) { err(res, e, 'GET /children/:id/baseline'); }
});

router.put('/children/:id/baseline', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  try {
    const { error } = await db
      .from('children')
      .update({ baseline: req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', userId);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { err(res, e, 'PUT /children/:id/baseline'); }
});

// ── PTEC Logs ──────────────────────────────────────────────────────────────────

router.get('/ptec', async (req, res) => {
  try { res.json(await getAll('ptec_logs', uid(req))); }
  catch (e) { err(res, e, 'GET /ptec'); }
});

router.post('/ptec', async (req, res) => {
  try {
    const db = requireSupabase();
    const userId = uid(req);
    const log = req.body as { id: string; weekStartDate: string; child_id?: string };
    const row = { id: log.id, user_id: userId, child_id: log.child_id ?? null, week_start: log.weekStartDate, data: log };
    const result = await safeUpsert(db, 'ptec_logs', userId, log.id, row);
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /ptec'); }
});

router.delete('/ptec/:id', async (req, res) => {
  try { await deleteItem('ptec_logs', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /ptec/:id'); }
});

// ── Flare History ──────────────────────────────────────────────────────────────

router.get('/flares', async (req, res) => {
  try {
    const childId = req.query.child_id as string | undefined;
    res.json(await getAll('flare_history', uid(req), childId));
  } catch (e) { err(res, e, 'GET /flares'); }
});

router.post('/flares', async (req, res) => {
  try {
    const userId = uid(req);
    const body = req.body as { id: string; child_id?: string };
    const childId = await resolveChildId(userId, body.child_id);
    if (!childId) { res.status(204).send(); return; }
    const result = await upsertItem('flare_history', userId, body.id, body, { child_id: childId });
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /flares'); }
});

// ── Trigger Log ────────────────────────────────────────────────────────────────

router.get('/triggers', async (req, res) => {
  try {
    const childId = req.query.child_id as string | undefined;
    res.json(await getAll('trigger_log', uid(req), childId));
  } catch (e) { err(res, e, 'GET /triggers'); }
});

router.post('/triggers', async (req, res) => {
  try {
    const userId = uid(req);
    const body = req.body as { id: string; child_id?: string };
    const childId = await resolveChildId(userId, body.child_id);
    if (!childId) { res.status(204).send(); return; }
    const result = await upsertItem('trigger_log', userId, body.id, body, { child_id: childId });
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /triggers'); }
});

router.delete('/triggers/:id', async (req, res) => {
  try { await deleteItem('trigger_log', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /triggers/:id'); }
});

// ── Household Health ───────────────────────────────────────────────────────────

router.get('/household', async (req, res) => {
  try { res.json(await getAll('household_health', uid(req))); }
  catch (e) { err(res, e, 'GET /household'); }
});

router.post('/household', async (req, res) => {
  try {
    const result = await upsertItem('household_health', uid(req), req.body.id, req.body);
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /household'); }
});

router.delete('/household/:id', async (req, res) => {
  try { await deleteItem('household_health', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /household/:id'); }
});

// ── Wellbeing Logs ─────────────────────────────────────────────────────────────

router.get('/wellbeing', async (req, res) => {
  try { res.json(await getAll('wellbeing_logs', uid(req))); }
  catch (e) { err(res, e, 'GET /wellbeing'); }
});

router.post('/wellbeing', async (req, res) => {
  try {
    const db = requireSupabase();
    const userId = uid(req);
    const log = req.body as { id: string; date: string };
    const row = { id: log.id, user_id: userId, date: log.date, data: log };
    const result = await safeUpsert(db, 'wellbeing_logs', userId, log.id, row);
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /wellbeing'); }
});

router.delete('/wellbeing/:id', async (req, res) => {
  try { await deleteItem('wellbeing_logs', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /wellbeing/:id'); }
});

// ── Bulk Sync (localStorage → server migration) ───────────────────────────────

router.post('/sync', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  const {
    logs = [], medications = [], medLibrary = [], milestones = [],
    baseline = null, ptecLogs = [], flares = [], triggers = [],
    household = [], wellbeing = [],
  } = req.body as {
    logs?:        Array<{ id: string; date: string; child_id?: string }>;
    medications?: Array<{ id: string; child_id?: string }>;
    medLibrary?:  Array<{ id: string; child_id?: string }>;
    milestones?:  Array<{ id: string; child_id?: string }>;
    baseline?:    Record<string, unknown> | null;
    ptecLogs?:    Array<{ id: string; weekStartDate: string; child_id?: string }>;
    flares?:      Array<{ id: string; child_id?: string }>;
    triggers?:    Array<{ id: string; child_id?: string }>;
    household?:   Array<{ id: string }>;
    wellbeing?:   Array<{ id: string; date: string }>;
  };

  const errors: string[] = [];

  async function bulkUpsert(
    table: string,
    items: Array<Record<string, unknown>>,
    toRow: (item: Record<string, unknown>) => Record<string, unknown>,
    conflictCol?: string,
  ): Promise<void> {
    if (items.length === 0) return;
    const rows = items.map(toRow);
    const opts = conflictCol ? { onConflict: conflictCol } : undefined;
    const { error } = opts
      ? await db.from(table).upsert(rows, opts)
      : await db.from(table).upsert(rows);
    if (error) errors.push(`${table}: ${error.message}`);
  }

  try {
    // ── Resolve default child once for all collections that need one ──────────
    // Look up the user's first non-archived child so rows that arrive without a
    // child_id (legacy localStorage flushes) can be assigned automatically.
    // Returns null when the user genuinely has no children yet.
    const needsChildResolution =
      logs.some((l) => !l.child_id) ||
      medications.some((m) => !m.child_id) ||
      medLibrary.some((m) => !m.child_id) ||
      milestones.some((m) => !m.child_id) ||
      flares.some((f) => !f.child_id) ||
      triggers.some((t) => !t.child_id);

    let defaultChildId: string | null = null;
    if (needsChildResolution) {
      const { data: dc } = await db
        .from('children')
        .select('id')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      defaultChildId = (dc as { id: string } | null)?.id ?? null;
    }

    // ── Helper: resolve child_id for a single item, push error and return null
    //            when neither the item nor the default provides one. ──────────
    function pickChildId(
      table: string,
      item: { id: string; child_id?: string },
    ): string | null {
      const childId = item.child_id ?? defaultChildId ?? null;
      if (!childId) {
        errors.push(`${table}: skipped item ${item.id} — no child_id and user has no children`);
      }
      return childId;
    }

    // ── Symptom logs (child-scoped, conflict on user_id,child_id,date) ───────
    const logsWithChild: Array<Record<string, unknown>> = [];
    for (const l of logs) {
      const childId = pickChildId('symptom_logs', l);
      if (childId) logsWithChild.push({ id: l.id, user_id: userId, child_id: childId, date: l.date, data: l });
    }

    // ── Medications ───────────────────────────────────────────────────────────
    const medsWithChild: Array<Record<string, unknown>> = [];
    for (const m of medications) {
      const childId = pickChildId('medications', m);
      if (childId) medsWithChild.push({ id: m.id, user_id: userId, child_id: childId, data: m });
    }

    // ── Med Library ───────────────────────────────────────────────────────────
    const medLibWithChild: Array<Record<string, unknown>> = [];
    for (const m of medLibrary) {
      const childId = pickChildId('med_library', m);
      if (childId) medLibWithChild.push({ id: m.id, user_id: userId, child_id: childId, data: m });
    }

    // ── Milestones ────────────────────────────────────────────────────────────
    const milestonesWithChild: Array<Record<string, unknown>> = [];
    for (const m of milestones) {
      const childId = pickChildId('milestones', m);
      if (childId) milestonesWithChild.push({ id: m.id, user_id: userId, child_id: childId, data: m });
    }

    // ── Flare History ─────────────────────────────────────────────────────────
    const flaresWithChild: Array<Record<string, unknown>> = [];
    for (const f of flares) {
      const childId = pickChildId('flare_history', f);
      if (childId) flaresWithChild.push({ id: f.id, user_id: userId, child_id: childId, data: f });
    }

    // ── Trigger Log ───────────────────────────────────────────────────────────
    const triggersWithChild: Array<Record<string, unknown>> = [];
    for (const t of triggers) {
      const childId = pickChildId('trigger_log', t);
      if (childId) triggersWithChild.push({ id: t.id, user_id: userId, child_id: childId, data: t });
    }

    await Promise.all([
      // symptom_logs — conflict on (user_id, child_id, date)
      logsWithChild.length > 0
        ? db.from('symptom_logs')
            .upsert(logsWithChild, { onConflict: 'user_id,child_id,date' })
            .then(({ error }) => { if (error) errors.push(`symptom_logs: ${error.message}`); })
        : Promise.resolve(),

      // medications, med_library, milestones, flare_history, trigger_log
      bulkUpsert('medications',   medsWithChild,      (r) => r),
      bulkUpsert('med_library',   medLibWithChild,    (r) => r),
      bulkUpsert('milestones',    milestonesWithChild,(r) => r),
      bulkUpsert('flare_history', flaresWithChild,    (r) => r),
      bulkUpsert('trigger_log',   triggersWithChild,  (r) => r),

      // ptec_logs — conflict on (user_id, child_id, week_start)
      bulkUpsert('ptec_logs',
        ptecLogs as Array<Record<string, unknown>>,
        (p) => ({ id: p.id, user_id: userId, child_id: (p.child_id as string | undefined) ?? null, week_start: p.weekStartDate, data: p }),
        'user_id,child_id,week_start'),

      // household_health / wellbeing_logs — not child-scoped
      bulkUpsert('household_health',
        household as Array<Record<string, unknown>>,
        (h) => ({ id: h.id, user_id: userId, data: h })),
      bulkUpsert('wellbeing_logs',
        wellbeing as Array<Record<string, unknown>>,
        (w) => ({ id: w.id, user_id: userId, date: w.date, data: w }),
        'user_id,date'),

      // baseline — attach to the user's first child
      baseline
        ? (async () => {
            const { data: dc } = await db
              .from('children')
              .select('id')
              .eq('user_id', userId)
              .eq('is_archived', false)
              .order('sort_order', { ascending: true })
              .limit(1)
              .maybeSingle();
            if (!dc) { errors.push('sync baseline: no child found to attach baseline'); return; }
            const { error } = await db
              .from('children')
              .update({ baseline })
              .eq('id', (dc as { id: string }).id)
              .eq('user_id', userId);
            if (error) errors.push(`sync baseline: ${error.message}`);
          })()
        : Promise.resolve(),
    ]);

    res.json({ ok: errors.length === 0, errors });
  } catch (e) {
    err(res, e, 'POST /sync');
  }
});

// ── Journey State ─────────────────────────────────────────────────────────────

router.get('/journey-state', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  try {
    const { error: insertError } = await db
      .from('user_journey_state')
      .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (insertError) throw insertError;

    const { data, error } = await db
      .from('user_journey_state')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { err(res, e, 'GET /journey-state'); }
});

router.patch('/journey-state', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  try {
    const allowed = ['onboarding_completed'] as const;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in req.body) patch[key] = req.body[key];
    }
    const { error } = await db
      .from('user_journey_state')
      .update(patch)
      .eq('user_id', userId);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { err(res, e, 'PATCH /journey-state'); }
});

// ── Children ──────────────────────────────────────────────────────────────────

router.get('/children', async (req, res) => {
  const db = requireSupabase();
  try {
    const { data, error } = await db
      .from('children')
      .select('*')
      .eq('user_id', uid(req))
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { err(res, e, 'GET /children'); }
});

router.post('/children', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  try {
    const body = req.body as {
      id: string;
      name: string;
      date_of_birth?: string | null;
      diagnosis_status: string;
      journey_stage?: string | null;
      sort_order?: number;
    };
    const now = new Date().toISOString();
    const { data, error } = await db
      .from('children')
      .insert({
        id: body.id,
        user_id: userId,
        name: body.name,
        date_of_birth: body.date_of_birth ?? null,
        diagnosis_status: body.diagnosis_status ?? 'undiagnosed',
        journey_stage: body.journey_stage ?? null,
        journey_stage_set_at: body.journey_stage ? now : null,
        sort_order: body.sort_order ?? 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { err(res, e, 'POST /children'); }
});

router.put('/children/:id', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  try {
    const allowed = [
      'name', 'date_of_birth', 'diagnosis_status',
      'journey_stage', 'journey_stage_set_at', 'sort_order', 'is_archived',
    ] as const;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in req.body) patch[key] = req.body[key];
    }
    if ('journey_stage' in req.body && !('journey_stage_set_at' in req.body)) {
      patch['journey_stage_set_at'] = req.body.journey_stage ? new Date().toISOString() : null;
    }
    const { data, error } = await db
      .from('children')
      .update(patch)
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { err(res, e, 'PUT /children/:id'); }
});

router.delete('/children/:id', async (req, res) => {
  const db = requireSupabase();
  try {
    const { error } = await db
      .from('children')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', uid(req));
    if (error) throw error;
    res.status(204).send();
  } catch (e) { err(res, e, 'DELETE /children/:id'); }
});

// ── Right Now checklist state ─────────────────────────────────────────────────

router.get('/right-now-checklist', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  const date = (req.query.date as string) ?? new Date().toISOString().split('T')[0];
  const childId = req.query.child_id as string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .from('right_now_checklist_state')
      .select('action_key, completed')
      .eq('user_id', userId)
      .eq('date', date);
    if (childId) query = query.eq('child_id', childId);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { err(res, e, 'GET /right-now-checklist'); }
});

router.post('/right-now-checklist', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  try {
    const { date, action_key, completed, child_id } = req.body as {
      date: string;
      action_key: string;
      completed: boolean;
      child_id?: string;
    };
    if (!child_id) { res.status(400).json({ error: 'child_id is required' }); return; }
    const id = `${userId}_${child_id}_${date}_${action_key}`;
    const row = { id, user_id: userId, child_id, date, action_key, completed };
    const { error } = await db
      .from('right_now_checklist_state')
      .upsert(row, { onConflict: 'user_id,child_id,date,action_key' });
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (e) { err(res, e, 'POST /right-now-checklist'); }
});

// ── Parent observation summaries (Learn → Self-Check) ────────────────────────

router.post('/parent-observation', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);
  try {
    const { id, responses, child_id } = req.body as {
      id: string;
      responses: Record<string, string>;
      child_id?: string;
    };
    const row: Record<string, unknown> = { id, user_id: userId, responses };
    if (child_id) row.child_id = child_id;
    const { error } = await db.from('parent_observation_summaries').insert(row);
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (e) { err(res, e, 'POST /parent-observation'); }
});

// ── Lab Results ────────────────────────────────────────────────────────────────

router.get('/labs', async (req, res) => {
  try {
    const db = requireSupabase();
    const userId = uid(req);
    const { data, error } = await db
      .from('lab_results')
      .select('id, child_id, date, test_name, result_value, result_unit, reference_range, lab_name, notes, updated_at')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (data ?? []).map((r: any) => ({
      id: r.id,
      child_id: r.child_id,
      date: r.date,
      test_name: r.test_name,
      result_value: r.result_value,
      result_unit: r.result_unit,
      reference_range: r.reference_range,
      lab_name: r.lab_name,
      notes: r.notes,
      updatedAt: r.updated_at,
    }));
    res.json(results);
  } catch (e) { err(res, e, 'GET /labs'); }
});

router.post('/labs', async (req, res) => {
  try {
    const db = requireSupabase();
    const userId = uid(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = req.body as any;
    const row = {
      id: body.id,
      user_id: userId,
      child_id: body.child_id,
      date: body.date,
      test_name: body.test_name,
      result_value: body.result_value ?? null,
      result_unit: body.result_unit ?? null,
      reference_range: body.reference_range ?? null,
      lab_name: body.lab_name ?? null,
      notes: body.notes ?? null,
    };
    const result = await safeUpsert(db, 'lab_results', userId, body.id, row);
    if (result === 'forbidden') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /labs'); }
});

router.delete('/labs/:id', async (req, res) => {
  try {
    const db = requireSupabase();
    const { error } = await db
      .from('lab_results')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', uid(req));
    if (error) throw error;
    res.status(204).send();
  } catch (e) { err(res, e, 'DELETE /labs/:id'); }
});

// ── Delete all data for user (account deletion) ───────────────────────────────
// CASCADE from children covers medications, med_library, milestones, trigger_log,
// and flare_history after migration 021, but we still delete by user_id first
// (faster than waiting for the cascade) and rely on cascade as the safety net.

router.delete('/all', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);

  const nonChildTables = [
    'symptom_logs',
    'medications',
    'med_library',
    'milestones',
    'ptec_logs',
    'flare_history',
    'trigger_log',
    'household_health',
    'wellbeing_logs',
    'lab_results',
    'parent_observation_summaries',
    'right_now_checklist_state',
    'shares',
    'push_subscriptions',
    'user_journey_state',
    'terms_agreements',
    'user_terms',
  ];

  const nonChildErrors = (
    await Promise.all(
      nonChildTables.map((table) =>
        db.from(table).delete().eq('user_id', userId).then(({ error }) => error ?? null),
      ),
    )
  ).filter(Boolean);

  if (nonChildErrors.length > 0) {
    return err(res, nonChildErrors[0], 'DELETE /all');
  }

  const { error: childrenError } = await db.from('children').delete().eq('user_id', userId);
  if (childrenError) {
    return err(res, childrenError, 'DELETE /all (children)');
  }

  res.status(204).send();
});

export default router;
