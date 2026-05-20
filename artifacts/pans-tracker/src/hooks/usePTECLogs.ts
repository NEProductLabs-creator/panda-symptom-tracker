import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { PTECLog, FlareEvent } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { detectPTECFlare } from '@/lib/ptec';
import { DEMO_PTEC_LOGS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';
import { track } from '@/lib/analytics';
import { format } from 'date-fns';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function usePTECLogs() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [ptecLogs, setPTECLogs] = useState<PTECLog[]>(() => {
    if (isDemoMode) return DEMO_PTEC_LOGS;
    return storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  });

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.ptec.getAll()
      .then((serverLogs) => {
        if (serverLogs.length > 0) {
          storage.savePTECLogs(serverLogs);
          setPTECLogs([...serverLogs].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)));
        } else {
          const local = storage.getPTECLogs();
          if (local.length > 0) {
            local.forEach((l) => api.ptec.save(l).catch(() => {}));
          }
        }
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addOrUpdateLog = useCallback(
    (log: PTECLog) => {
      if (isDemoMode) { dispatchDemo(); return; }
      storage.addOrUpdatePTECLog(log);
      const updated = storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
      setPTECLogs(updated);
      track('ptec_checkin_completed');
      api.ptec.save(log).catch(() => {});

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
        api.flares.save(event).catch(() => {});
      }
    },
    [isDemoMode, api],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      storage.deletePTECLog(id);
      setPTECLogs(
        storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)),
      );
      api.ptec.delete(id).catch(() => {});
    },
    [isDemoMode, api],
  );

  const getLogForWeek = useCallback(
    (weekStartDate: string) => ptecLogs.find((l) => l.weekStartDate === weekStartDate),
    [ptecLogs],
  );

  return { ptecLogs, addOrUpdateLog, deleteLog, getLogForWeek };
}
