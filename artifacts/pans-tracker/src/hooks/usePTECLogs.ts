import { useState, useCallback } from 'react';
import { PTECLog, FlareEvent } from '@/lib/types';
import { storage } from '@/lib/storage';
import { detectPTECFlare } from '@/lib/ptec';
import { format } from 'date-fns';

export function usePTECLogs() {
  const [ptecLogs, setPTECLogs] = useState<PTECLog[]>(() =>
    storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
  );

  const addOrUpdateLog = useCallback((log: PTECLog) => {
    storage.addOrUpdatePTECLog(log);
    const updated = storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
    setPTECLogs(updated);

    // Save flare event if this update triggered a flare
    const flare = detectPTECFlare(updated);
    if (flare.isActive && flare.latestWeekStart) {
      const event: FlareEvent = {
        id: `flare-${flare.latestWeekStart}`,
        detectedDate: format(new Date(), 'yyyy-MM-dd'),
        weekStartDate: flare.latestWeekStart,
        ptecScore: flare.latestScore,
        averageScore: flare.fourWeekAvg,
        percentAboveAvg: flare.percentAbove,
      };
      storage.addFlareEventIfNew(event);
    }
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
