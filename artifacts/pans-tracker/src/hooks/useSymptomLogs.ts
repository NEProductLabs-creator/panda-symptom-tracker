import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { SymptomLog } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { DEMO_LOGS, DEMO_EXPLORING_LOGS, DEMO_IN_CRISIS_LOGS } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';
import { track } from '@/lib/analytics';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useSymptomLogs() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [logs, setLogs] = useState<SymptomLog[]>(() => {
    if (!isDemoMode) return storage.getLogs();
    const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
    if (scenario === 'exploring') return DEMO_EXPLORING_LOGS;
    if (scenario === 'in_crisis') return DEMO_IN_CRISIS_LOGS;
    return DEMO_LOGS;
  });
  const loading = false;

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.logs.getAll()
      .then((serverLogs) => {
        const local = storage.getLogs();
        const { merged, localOnly } = mergeById(local, serverLogs);
        storage.saveLogs(merged);
        setLogs(merged);
        localOnly.forEach((l) => {
          queueMutation('POST', '/logs', l, getToken, toast);
        });
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addLog = useCallback(
    (log: SymptomLog) => {
      if (isDemoMode) { dispatchDemo(); return; }
      const stamped: SymptomLog = { ...log, updatedAt: now() };
      setLogs((prev) => {
        const isNew = prev.findIndex((l) => l.date === stamped.date) < 0;
        const next = isNew
          ? [...prev, stamped]
          : prev.map((l) => (l.date === stamped.date ? stamped : l));
        storage.saveLogs(next);
        if (isNew) track('symptom_log_created');
        return next;
      });
      queueMutation('POST', '/logs', stamped, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      setLogs((prev) => {
        const next = prev.filter((l) => l.id !== id);
        storage.saveLogs(next);
        return next;
      });
      queueMutation('DELETE', `/logs/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  return { logs, loading, addLog, deleteLog };
}
