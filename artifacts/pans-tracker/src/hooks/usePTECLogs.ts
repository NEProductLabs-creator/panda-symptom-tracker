import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { PTECLog, FlareEvent } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { detectPTECFlare } from '@/lib/ptec';
import { DEMO_PTEC_LOGS } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';
import { track } from '@/lib/analytics';
import { format } from 'date-fns';
import { useActiveChild } from '@/hooks/useActiveChild';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function usePTECLogs() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const activeChild = useActiveChild();
  const { toast } = useToast();

  const [ptecLogs, setPTECLogs] = useState<PTECLog[]>(() => {
    if (isDemoMode) {
      const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
      if (scenario === 'exploring' || scenario === 'in_crisis') return [];
      return DEMO_PTEC_LOGS;
    }
    return storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  });

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.ptec.getAll()
      .then((serverLogs) => {
        const local = storage.getPTECLogs();
        const { merged, localOnly } = mergeById(local, serverLogs);
        const sorted = [...merged].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
        storage.savePTECLogs(sorted);
        setPTECLogs(sorted);
        localOnly.forEach((l) => {
          queueMutation('POST', '/ptec', l, getToken, toast);
        });
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addOrUpdateLog = useCallback(
    (log: PTECLog) => {
      if (isDemoMode) { dispatchDemo(); return; }
      const stamped: PTECLog = { ...log, updatedAt: now() };
      storage.addOrUpdatePTECLog(stamped);
      const updated = storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
      setPTECLogs(updated);
      track('ptec_checkin_completed', { child_id: activeChild?.id ?? null });
      queueMutation('POST', '/ptec', stamped, getToken, toast);

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
        queueMutation('POST', '/flares', event, getToken, toast);
      }
    },
    [isDemoMode, getToken, toast],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      storage.deletePTECLog(id);
      setPTECLogs(
        storage.getPTECLogs().sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)),
      );
      queueMutation('DELETE', `/ptec/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  const getLogForWeek = useCallback(
    (weekStartDate: string) => ptecLogs.find((l) => l.weekStartDate === weekStartDate),
    [ptecLogs],
  );

  return { ptecLogs, addOrUpdateLog, deleteLog, getLogForWeek };
}
