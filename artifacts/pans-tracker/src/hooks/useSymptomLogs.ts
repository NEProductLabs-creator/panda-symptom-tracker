import { useState, useCallback } from 'react';
import { SymptomLog } from '@/lib/types';
import { storage } from '@/lib/storage';
import { DEMO_LOGS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';
import { track } from '@/lib/analytics';

export function useSymptomLogs() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';

  const [logs, setLogs] = useState<SymptomLog[]>(() =>
    isDemoMode ? DEMO_LOGS : storage.getLogs(),
  );

  // loading is always false — data comes from localStorage synchronously
  const loading = false;

  const addLog = useCallback(
    (log: SymptomLog) => {
      if (isDemoMode) {
        window.dispatchEvent(new CustomEvent('pans:demo:save'));
        return;
      }
      setLogs((prev) => {
        const isNew = prev.findIndex((l) => l.date === log.date) < 0;
        const next = isNew ? [...prev, log] : prev.map((l) => l.date === log.date ? log : l);
        storage.saveLogs(next);
        if (isNew) track('symptom_log_created');
        return next;
      });
    },
    [isDemoMode],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      setLogs((prev) => {
        const next = prev.filter((l) => l.id !== id);
        storage.saveLogs(next);
        return next;
      });
    },
    [isDemoMode],
  );

  return { logs, loading, addLog, deleteLog };
}
