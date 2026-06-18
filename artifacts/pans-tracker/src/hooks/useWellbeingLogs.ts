import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { WellbeingLog } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { useToast } from '@/hooks/use-toast';
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

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.wellbeing.getAll()
      .then((serverLogs) => {
        const local = loadLogs();
        const { merged, localOnly } = mergeById(local, serverLogs);
        persistLogs(merged);
        setLogs(merged);
        let syncToastShown = false;
        localOnly.forEach((l) =>
          api.wellbeing.save(l).catch(() => {
            if (!syncToastShown) {
              syncToastShown = true;
              toast({ title: 'Saved offline', description: 'Some wellbeing logs are saved locally and will sync when connection is restored.' });
            }
          }),
        );
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const upsertLog = useCallback(
    (entry: Omit<WellbeingLog, 'id'> & { id?: string }) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setLogs((prev) => {
        const existing = prev.find((l) => l.date === entry.date);
        let next: WellbeingLog[];
        let saved: WellbeingLog;
        if (existing) {
          saved = { ...existing, ...entry, id: existing.id, updatedAt: now() };
          next = prev.map((l) => (l.date === entry.date ? saved : l));
        } else {
          const id = entry.id ?? `wlog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          saved = { ...entry, id, updatedAt: now() };
          next = [...prev, saved];
        }
        persistLogs(next);
        api.wellbeing.save(saved).catch(() => {
          toast({ title: 'Saved offline', description: 'Your wellbeing log is saved locally and will sync later.' });
        });
        return next;
      });
    },
    [isDemoMode, api, toast],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      setLogs((prev) => {
        const next = prev.filter((l) => l.id !== id);
        persistLogs(next);
        return next;
      });
      api.wellbeing.delete(id).catch(() => {
        toast({ title: 'Delete may not have synced', description: 'The deletion was applied locally but could not reach the server.' });
      });
    },
    [isDemoMode, api, toast],
  );

  return { logs, upsertLog, deleteLog };
}
