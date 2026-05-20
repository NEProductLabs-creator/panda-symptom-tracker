import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { SymptomLog } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { DEMO_LOGS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';
import { track } from '@/lib/analytics';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useSymptomLogs() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [logs, setLogs] = useState<SymptomLog[]>(() =>
    isDemoMode ? DEMO_LOGS : storage.getLogs(),
  );
  const loading = false;

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.logs.getAll()
      .then((serverLogs) => {
        if (serverLogs.length > 0) {
          storage.saveLogs(serverLogs);
          setLogs(serverLogs);
        } else {
          const local = storage.getLogs();
          if (local.length > 0) {
            local.forEach((l) => api.logs.save(l).catch(() => {}));
          }
        }
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addLog = useCallback(
    (log: SymptomLog) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setLogs((prev) => {
        const isNew = prev.findIndex((l) => l.date === log.date) < 0;
        const next = isNew
          ? [...prev, log]
          : prev.map((l) => (l.date === log.date ? log : l));
        storage.saveLogs(next);
        if (isNew) track('symptom_log_created');
        return next;
      });
      api.logs.save(log).catch(() => {});
    },
    [isDemoMode, api],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      setLogs((prev) => {
        const next = prev.filter((l) => l.id !== id);
        storage.saveLogs(next);
        return next;
      });
      api.logs.delete(id).catch(() => {});
    },
    [isDemoMode, api],
  );

  return { logs, loading, addLog, deleteLog };
}
