import { useState, useEffect, useCallback } from 'react';
import { SymptomLog } from '@/lib/types';
import { storage } from '@/lib/storage';

export function useSymptomLogs() {
  const [logs, setLogs] = useState<SymptomLog[]>([]);

  useEffect(() => {
    setLogs(storage.getLogs());
  }, []);

  const addLog = useCallback((log: SymptomLog) => {
    setLogs(prev => {
      const existingIdx = prev.findIndex(l => l.date === log.date);
      let newLogs;
      if (existingIdx >= 0) {
        newLogs = [...prev];
        newLogs[existingIdx] = log;
      } else {
        newLogs = [...prev, log];
      }
      storage.saveLogs(newLogs);
      return newLogs;
    });
  }, []);

  const deleteLog = useCallback((id: string) => {
    setLogs(prev => {
      const newLogs = prev.filter(l => l.id !== id);
      storage.saveLogs(newLogs);
      return newLogs;
    });
  }, []);

  return { logs, addLog, deleteLog };
}
