import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { SymptomLog } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { useToast } from '@/hooks/use-toast';
import { DEMO_LOGS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';
import { track } from '@/lib/analytics';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useSymptomLogs() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [logs, setLogs] = useState<SymptomLog[]>(() =>
    isDemoMode ? DEMO_LOGS : storage.getLogs(),
  );
  const loading = false;

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.logs.getAll()
      .then((serverLogs) => {
        const local = storage.getLogs();
        const { merged, localOnly } = mergeById(local, serverLogs);
        storage.saveLogs(merged);
        setLogs(merged);
        let syncToastShown = false;
        localOnly.forEach((l) =>
          api.logs.save(l).catch(() => {
            if (!syncToastShown) {
              syncToastShown = true;
              toast({ title: 'Saved offline', description: 'Some entries are saved locally and will sync when connection is restored.' });
            }
          }),
        );
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
      api.logs.save(stamped).catch(() => {
        toast({ title: 'Saved offline', description: 'Your log entry is saved locally and will sync later.' });
      });
    },
    [isDemoMode, api, toast],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      setLogs((prev) => {
        const next = prev.filter((l) => l.id !== id);
        storage.saveLogs(next);
        return next;
      });
      api.logs.delete(id).catch(() => {
        toast({ title: 'Delete may not have synced', description: 'The deletion was applied locally but could not reach the server.' });
      });
    },
    [isDemoMode, api, toast],
  );

  return { logs, loading, addLog, deleteLog };
}
