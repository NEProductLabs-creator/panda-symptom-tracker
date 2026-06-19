import { Router, Request, Response } from 'express';
import { requireSupabase } from '../lib/supabase';
import { logger, errCode } from '../lib/logger';
import { ALLOWED_VERSIONS } from '../lib/termsVersion';

const router = Router();

// POST /api/terms/agree
// Auth-optional: works for demo users (no token) and signed-in users (token present).
// Rate limiting is handled by termsLimiter in app.ts (10 req / 1 hour, IP+userId key).
router.post('/agree', async (req: Request, res: Response) => {
  try {
    const db = requireSupabase();
    const userId: string | null = req.userId ?? null;
    const { email, terms_version, context } = req.body as {
      email?: string;
      terms_version: string;
      context: 'signup' | 'demo';
    };

    if (!terms_version || !context) {
      res.status(400).json({ error: 'terms_version and context are required' });
      return;
    }

    // Validate terms_version against the server-side allowlist
    if (!(ALLOWED_VERSIONS as readonly string[]).includes(terms_version)) {
      res.status(400).json({ error: `Unrecognised terms_version: ${terms_version}` });
      return;
    }

    const ip = req.ip ?? null;
    const agreedAt = new Date().toISOString();

    const { error: insertErr } = await db.from('terms_agreements').insert({
      user_id: userId,
      email: email ?? null,
      terms_version,
      agreed_at: agreedAt,
      ip_address: ip,
      context,
    });
    if (insertErr) throw insertErr;

    if (userId) {
      const { error: upsertErr } = await db.from('user_terms').upsert({
        user_id: userId,
        terms_version_agreed: terms_version,
        terms_agreed_at: agreedAt,
      });
      if (upsertErr) throw upsertErr;
    }

    res.json({ ok: true });
  } catch (e) {
    logger.error({ errCode: errCode(e) }, 'POST /terms/agree');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/terms/status
// Auth required: returns the authenticated user's current agreed version.
router.get('/status', async (req: Request, res: Response) => {
  const userId: string | null = req.userId ?? null;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const db = requireSupabase();
    const { data, error } = await db
      .from('user_terms')
      .select('terms_version_agreed, terms_agreed_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    res.json(data ?? { terms_version_agreed: null, terms_agreed_at: null });
  } catch (e) {
    logger.error({ errCode: errCode(e) }, 'GET /terms/status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
