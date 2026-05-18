import { useState, useEffect, useCallback } from 'react';
import { SymptomLog } from '@/lib/types';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

// ─── DB row ↔ app type helpers ─────────────────────────────────────────────────

type DbRow = {
  id: string;
  user_id: string;
  date: string;
  ocd: number;
  anxiety: number;
  rage: number;
  tics: number;
  sleep: number;
  cognition: number;
  notes: string | null;
  medications_taken: string[];
};

type DbInsert = DbRow & { updated_at: string };

function rowToLog(row: DbRow): SymptomLog {
  return {
    id: row.id,
    date: row.date,
    ocd: row.ocd,
    anxiety: row.anxiety,
    rage: row.rage,
    tics: row.tics,
    sleep: row.sleep,
    cognition: row.cognition,
    notes: row.notes ?? undefined,
    medicationsTaken: row.medications_taken ?? [],
  };
}

function logToInsert(log: SymptomLog, userId: string): DbInsert {
  return {
    id: log.id,
    user_id: userId,
    date: log.date,
    ocd: log.ocd,
    anxiety: log.anxiety,
    rage: log.rage,
    tics: log.tics,
    sleep: log.sleep,
    cognition: log.cognition,
    notes: log.notes ?? null,
    medications_taken: log.medicationsTaken ?? [],
    updated_at: new Date().toISOString(),
  };
}

// One-time migration flag — set once localStorage data has been uploaded
const MIGRATED_KEY = 'pans_tracker_sb_migrated_v1';

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSymptomLogs() {
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Get the signed-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Fetch all logs for this user
      const { data, error } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error('[symptom_logs] fetch error', error.message);
        setLoading(false);
        return;
      }

      const fetched = ((data ?? []) as DbRow[]).map(rowToLog);

      // One-time migration: upload any localStorage logs if Supabase is empty
      if (fetched.length === 0 && !localStorage.getItem(MIGRATED_KEY)) {
        const local = storage.getLogs();
        if (local.length > 0) {
          const rows = local.map((l) => logToInsert(l, user.id));
          const { error: migrateErr } = await supabase
            .from('symptom_logs')
            .upsert(rows);
          if (migrateErr) {
            console.error('[symptom_logs] migration error', migrateErr.message);
          } else if (!cancelled) {
            setLogs(local);
          }
        } else if (!cancelled) {
          setLogs([]);
        }
        localStorage.setItem(MIGRATED_KEY, '1');
      } else if (!cancelled) {
        setLogs(fetched);
        localStorage.setItem(MIGRATED_KEY, '1');
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Upsert a log (optimistic: updates local state immediately, persists in background)
  const addLog = useCallback((log: SymptomLog) => {
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.date === log.date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = log;
        return next;
      }
      return [...prev, log];
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('symptom_logs')
        .upsert(logToInsert(log, user.id))
        .then(({ error }) => {
          if (error) console.error('[symptom_logs] upsert error', error.message);
        });
    });
  }, []);

  // Delete a log (optimistic)
  const deleteLog = useCallback((id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));

    supabase
      .from('symptom_logs')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('[symptom_logs] delete error', error.message);
      });
  }, []);

  return { logs, loading, addLog, deleteLog };
}
