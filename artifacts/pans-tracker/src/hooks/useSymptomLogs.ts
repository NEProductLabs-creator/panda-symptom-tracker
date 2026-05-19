import { useState, useCallback } from 'react';
import { SymptomLog } from '@/lib/types';
import { storage } from '@/lib/storage';
import { DEMO_LOGS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

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
        const idx = prev.findIndex((l) => l.date === log.date);
        let next;
        if (idx >= 0) {
          next = [...prev];
          next[idx] = log;
        } else {
          next = [...prev, log];
        }
        storage.saveLogs(next);
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
