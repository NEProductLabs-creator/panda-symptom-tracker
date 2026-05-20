import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { WellbeingLog } from '@/lib/types';
import { createApiClient } from '@/lib/api';

const STORAGE_KEY = 'pans_tracker_wellbeing';

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
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [logs, setLogs] = useState<WellbeingLog[]>(loadLogs);

  useEffect(() => {
    if (!userId) return;
    api.wellbeing.getAll()
      .then((serverLogs) => {
        if (serverLogs.length > 0) {
          persistLogs(serverLogs);
          setLogs(serverLogs);
        } else {
          const local = loadLogs();
          if (local.length > 0) {
            local.forEach((l) => api.wellbeing.save(l).catch(() => {}));
          }
        }
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const upsertLog = useCallback(
    (entry: Omit<WellbeingLog, 'id'> & { id?: string }) => {
      setLogs((prev) => {
        const existing = prev.find((l) => l.date === entry.date);
        let next: WellbeingLog[];
        if (existing) {
          next = prev.map((l) => (l.date === entry.date ? { ...l, ...entry, id: l.id } : l));
        } else {
          const id = entry.id ?? `wlog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          next = [...prev, { ...entry, id }];
        }
        persistLogs(next);
        const saved = next.find((l) => l.date === entry.date);
        if (saved) api.wellbeing.save(saved).catch(() => {});
        return next;
      });
    },
    [api],
  );

  const deleteLog = useCallback(
    (id: string) => {
      setLogs((prev) => {
        const next = prev.filter((l) => l.id !== id);
        persistLogs(next);
        return next;
      });
      api.wellbeing.delete(id).catch(() => {});
    },
    [api],
  );

  return { logs, upsertLog, deleteLog };
}
