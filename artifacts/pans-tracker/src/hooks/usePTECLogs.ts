import { useState, useCallback } from 'react';
import { PTECLog, FlareEvent } from '@/lib/types';
import { storage } from '@/lib/storage';
import { detectPTECFlare } from '@/lib/ptec';
import { DEMO_PTEC_LOGS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';
import { format } from 'date-fns';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function usePTECLogs() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';

  const [ptecLogs, setPTECLogs] = useState<PTECLog[]>(() => {
    if (isDemoMode) return DEMO_PTEC_LOGS;
    return storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  });

  const addOrUpdateLog = useCallback((log: PTECLog) => {
    if (isDemoMode) { dispatchDemo(); return; }
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
  }, [isDemoMode]);

  const deleteLog = useCallback((id: string) => {
    if (isDemoMode) { dispatchDemo(); return; }
    storage.deletePTECLog(id);
    setPTECLogs(
      storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
    );
  }, [isDemoMode]);

  const getLogForWeek = useCallback(
    (weekStartDate: string) => ptecLogs.find((l) => l.weekStartDate === weekStartDate),
    [ptecLogs]
  );

  return { ptecLogs, addOrUpdateLog, deleteLog, getLogForWeek };
}
