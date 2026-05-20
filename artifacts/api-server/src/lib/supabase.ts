import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  logger.warn('VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase routes will be unavailable');
}

export const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export function requireSupabase(): NonNullable<typeof supabase> {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}
