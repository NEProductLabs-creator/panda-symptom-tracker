import { Router, Request, Response } from 'express';
import { requireAuth } from '@clerk/express';
import { requireSupabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

router.use(requireAuth());

function uid(req: Request): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).auth.userId as string;
}

function err(res: Response, e: unknown, ctx: string): void {
  logger.error({ err: e }, ctx);
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
    res.json(await getAll('symptom_logs', uid(req)));
  } catch (e) { err(res, e, 'GET /logs'); }
});

router.post('/logs', async (req, res) => {
  try {
    const db = requireSupabase();
    const log = req.body as { id: string; date: string };
    const { error } = await db.from('symptom_logs').upsert(
      { id: log.id, user_id: uid(req), date: log.date, data: log, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    );
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

export default router;
