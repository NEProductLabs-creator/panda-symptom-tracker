import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { WellbeingLog } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { DEMO_WELLBEING_LOGS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

const STORAGE_KEY = 'pans_tracker_wellbeing';
const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

function loadLogs(): WellbeingLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WellbeingLog[]) : [];
  } catch {
    return [];
  }
}

function persistLogs(logs: WellbeingLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function useWellbeingLogs() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [logs, setLogs] = useState<WellbeingLog[]>(() =>
    isDemoMode ? DEMO_WELLBEING_LOGS : loadLogs(),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.wellbeing.getAll()
      .then((serverLogs) => {
        const local = loadLogs();
        const { merged, localOnly } = mergeById(local, serverLogs);
        persistLogs(merged);
        setLogs(merged);
        localOnly.forEach((l) => {
          queueMutation('POST', '/wellbeing', l, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useWellbeingLogs', error: String(e) });
        toast({ title: 'Could not load latest data. Showing your last saved version.' });
        setLoading(false);
      });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const upsertLog = useCallback(
    (entry: Omit<WellbeingLog, 'id'> & { id?: string }) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setLogs((prev) => {
        const existing = prev.find((l) => l.date === entry.date);
        let next: WellbeingLog[];
        if (existing) {
          next = prev.map((l) =>
            l.date === entry.date
              ? { ...existing, ...entry, id: existing.id, updatedAt: now() }
              : l,
          );
        } else {
          const id = entry.id ?? `wlog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          next = [...prev, { ...entry, id, updatedAt: now() }];
        }
        persistLogs(next);
        return next;
      });
      const saved = loadLogs().find((l) => l.date === entry.date);
      if (saved) {
        queueMutation('POST', '/wellbeing', saved, getToken, toast);
      }
    },
    [isDemoMode, getToken, toast],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      setLogs((prev) => {
        const next = prev.filter((l) => l.id !== id);
        persistLogs(next);
        return next;
      });
      queueMutation('DELETE', `/wellbeing/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  return { logs, loading, upsertLog, deleteLog };
}
