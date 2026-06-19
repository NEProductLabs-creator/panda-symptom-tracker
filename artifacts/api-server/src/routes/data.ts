import { Router, Request, Response } from 'express';
import { requireAuth } from '@clerk/express';
import { requireSupabase } from '../lib/supabase';
import { logger, errCode } from '../lib/logger';

const router = Router();

router.use(requireAuth());

function uid(req: Request): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).auth.userId as string;
}

// Log a stable error code string instead of a full Supabase error object,
// which may contain schema details or partial PII.
function err(res: Response, e: unknown, ctx: string): void {
  logger.error({ errCode: errCode(e) }, ctx);
  res.status(500).json({ error: 'Internal server error' });
}

// ── Generic helpers ────────────────────────────────────────────────────────────

async function getAll(table: string, userId: string): Promise<unknown[]> {
  const db = requireSupabase();
  const { data, error } = await db.from(table).select('data').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: { data: unknown }) => r.data);
}

async function upsertItem(
  table: string,
  userId: string,
  id: string,
  item: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  const db = requireSupabase();
  const row = { id, user_id: userId, data: item, updated_at: new Date().toISOString(), ...extra };
  const { error } = await db.from(table).upsert(row);
  if (error) throw error;
}

async function deleteItem(table: string, userId: string, id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from(table).delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
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
    const log = req.body as { id: string; date: string; child_id?: string };
    const row: Record<string, unknown> = {
      id: log.id,
      user_id: uid(req),
      date: log.date,
      data: log,
      updated_at: new Date().toISOString(),
    };
    if (log.child_id) row.child_id = log.child_id;
    // Upsert by id (primary key) so different children can each have a log on the same date
    const { error } = await db.from('symptom_logs').upsert(row, { onConflict: 'id' });
    if (error) throw error;
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
  try { res.json(await getAll('medications', uid(req))); }
  catch (e) { err(res, e, 'GET /medications'); }
});

router.post('/medications', async (req, res) => {
  try {
    await upsertItem('medications', uid(req), req.body.id, req.body);
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /medications'); }
});

router.delete('/medications/:id', async (req, res) => {
  try { await deleteItem('medications', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /medications/:id'); }
});

// ── Medication Library ─────────────────────────────────────────────────────────

router.get('/medlibrary', async (req, res) => {
  try { res.json(await getAll('med_library', uid(req))); }
  catch (e) { err(res, e, 'GET /medlibrary'); }
});

router.post('/medlibrary', async (req, res) => {
  try {
    await upsertItem('med_library', uid(req), req.body.id, req.body);
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /medlibrary'); }
});

router.delete('/medlibrary/:id', async (req, res) => {
  try { await deleteItem('med_library', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /medlibrary/:id'); }
});

// ── Milestones ─────────────────────────────────────────────────────────────────

router.get('/milestones', async (req, res) => {
  try { res.json(await getAll('milestones', uid(req))); }
  catch (e) { err(res, e, 'GET /milestones'); }
});

router.post('/milestones', async (req, res) => {
  try {
    await upsertItem('milestones', uid(req), req.body.id, req.body);
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /milestones'); }
});

router.delete('/milestones/:id', async (req, res) => {
  try { await deleteItem('milestones', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /milestones/:id'); }
});

// ── Child Baseline (singleton per user) ───────────────────────────────────────

router.get('/baseline', async (req, res) => {
  try {
    const db = requireSupabase();
    const { data, error } = await db
      .from('child_baseline')
      .select('data')
      .eq('user_id', uid(req))
      .maybeSingle();
    if (error) throw error;
    res.json(data?.data ?? null);
  } catch (e) { err(res, e, 'GET /baseline'); }
});

router.put('/baseline', async (req, res) => {
  try {
    const db = requireSupabase();
    const { error } = await db
      .from('child_baseline')
      .upsert({ user_id: uid(req), data: req.body, updated_at: new Date().toISOString() });
    if (error) throw error;
    res.status(204).send();
  } catch (e) { err(res, e, 'PUT /baseline'); }
});

// ── PTEC Logs ──────────────────────────────────────────────────────────────────

router.get('/ptec', async (req, res) => {
  try { res.json(await getAll('ptec_logs', uid(req))); }
  catch (e) { err(res, e, 'GET /ptec'); }
});

router.post('/ptec', async (req, res) => {
  try {
    const db = requireSupabase();
    const log = req.body as { id: string; weekStartDate: string };
    const { error } = await db.from('ptec_logs').upsert(
      { id: log.id, user_id: uid(req), week_start: log.weekStartDate, data: log, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_start' },
    );
    if (error) throw error;
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /ptec'); }
});

router.delete('/ptec/:id', async (req, res) => {
  try { await deleteItem('ptec_logs', uid(req), req.params.id); res.status(204).send(); }
  catch (e) { err(res, e, 'DELETE /ptec/:id'); }
});

// ── Flare History ──────────────────────────────────────────────────────────────

router.get('/flares', async (req, res) => {
  try { res.json(await getAll('flare_history', uid(req))); }
  catch (e) { err(res, e, 'GET /flares'); }
});

router.post('/flares', async (req, res) => {
  try {
    await upsertItem('flare_history', uid(req), req.body.id, req.body);
    res.status(204).send();
  } catch (e) { err(res, e, 'POST /flares'); }
});

// ── Trigger Log ────────────────────────────────────────────────────────────────

router.get('/triggers', async (req, res) => {
  try { res.json(await getAll('trigger_log', uid(req))); }
  catch (e) { err(res, e, 'GET /triggers'); }
});

router.post('/triggers', async (req, res) => {
  try {
    await upsertItem('trigger_log', uid(req), req.body.id, req.body);
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
    await upsertItem('household_health', uid(req), req.body.id, req.body);
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
    const log = req.body as { id: string; date: string };
    const { error } = await db.from('wellbeing_logs').upsert(
      { id: log.id, user_id: uid(req), date: log.date, data: log, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    );
    if (error) throw error;
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
    logs?: Array<{ id: string; date: string }>;
    medications?: Array<{ id: string }>;
    medLibrary?: Array<{ id: string }>;
    milestones?: Array<{ id: string }>;
    baseline?: Record<string, unknown> | null;
    ptecLogs?: Array<{ id: string; weekStartDate: string }>;
    flares?: Array<{ id: string }>;
    triggers?: Array<{ id: string }>;
    household?: Array<{ id: string }>;
    wellbeing?: Array<{ id: string; date: string }>;
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
    await Promise.all([
      bulkUpsert('symptom_logs',
        logs as Array<Record<string, unknown>>,
        (l) => ({ id: l.id, user_id: userId, date: l.date, data: l }),
        'user_id,date'),
      bulkUpsert('medications',
        medications as Array<Record<string, unknown>>,
        (m) => ({ id: m.id, user_id: userId, data: m })),
      bulkUpsert('med_library',
        medLibrary as Array<Record<string, unknown>>,
        (m) => ({ id: m.id, user_id: userId, data: m })),
      bulkUpsert('milestones',
        milestones as Array<Record<string, unknown>>,
        (m) => ({ id: m.id, user_id: userId, data: m })),
      bulkUpsert('ptec_logs',
        ptecLogs as Array<Record<string, unknown>>,
        (p) => ({ id: p.id, user_id: userId, week_start: p.weekStartDate, data: p }),
        'user_id,week_start'),
      bulkUpsert('flare_history',
        flares as Array<Record<string, unknown>>,
        (f) => ({ id: f.id, user_id: userId, data: f })),
      bulkUpsert('trigger_log',
        triggers as Array<Record<string, unknown>>,
        (t) => ({ id: t.id, user_id: userId, data: t })),
      bulkUpsert('household_health',
        household as Array<Record<string, unknown>>,
        (h) => ({ id: h.id, user_id: userId, data: h })),
      bulkUpsert('wellbeing_logs',
        wellbeing as Array<Record<string, unknown>>,
        (w) => ({ id: w.id, user_id: userId, date: w.date, data: w }),
        'user_id,date'),
      ...(baseline
        ? [db.from('child_baseline').upsert({ user_id: userId, data: baseline }).then(({ error }) => {
            if (error) errors.push(`child_baseline: ${error.message}`);
          })]
        : []),
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
    // Insert row with defaults if it doesn't exist yet (no-op on conflict)
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
    // journey_stage / journey_stage_set_at moved to the children table (migration 010).
    // Only onboarding_completed is still on user_journey_state.
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
    // Auto-set journey_stage_set_at when journey_stage changes
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
    const id = child_id
      ? `${userId}_${child_id}_${date}_${action_key}`
      : `${userId}_${date}_${action_key}`;
    const row: Record<string, unknown> = { id, user_id: userId, date, action_key, completed };
    if (child_id) row.child_id = child_id;
    const { error } = await db
      .from('right_now_checklist_state')
      .upsert(row, { onConflict: 'user_id,date,action_key' });
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

// ── Delete all data for user (account deletion) ───────────────────────────────

router.delete('/all', async (req, res) => {
  const db = requireSupabase();
  const userId = uid(req);

  const tables = [
    'children',
    'symptom_logs',
    'medications',
    'med_library',
    'milestones',
    'child_baseline',
    'ptec_logs',
    'flare_history',
    'trigger_log',
    'household_health',
    'wellbeing_logs',
    'parent_observation_summaries',
    'right_now_checklist_state',
    'shares',
    'push_subscriptions',
    'user_journey_state',
    'terms_agreements',
    'user_terms',
  ];

  const errors = (
    await Promise.all(
      tables.map((table) =>
        db.from(table).delete().eq('user_id', userId).then(({ error }) => error ?? null),
      ),
    )
  ).filter(Boolean);

  if (errors.length > 0) {
    return err(res, errors[0], 'DELETE /all');
  }

  res.status(204).send();
});

export default router;
