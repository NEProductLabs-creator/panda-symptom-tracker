import { useState, useCallback } from 'react';
import { PTECLog } from '@/lib/types';
import { storage } from '@/lib/storage';

export function usePTECLogs() {
  const [ptecLogs, setPTECLogs] = useState<PTECLog[]>(() =>
    storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
  );

  const addOrUpdateLog = useCallback((log: PTECLog) => {
    storage.addOrUpdatePTECLog(log);
    setPTECLogs(
      storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
    );
  }, []);

  const deleteLog = useCallback((id: string) => {
    storage.deletePTECLog(id);
    setPTECLogs(
      storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
    );
  }, []);

  const getLogForWeek = useCallback(
    (weekStartDate: string) => ptecLogs.find((l) => l.weekStartDate === weekStartDate),
    [ptecLogs]
  );

  return { ptecLogs, addOrUpdateLog, deleteLog, getLogForWeek };
}
