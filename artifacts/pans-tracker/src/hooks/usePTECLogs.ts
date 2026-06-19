import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useSupabaseAuth';
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
  const activeChildId = activeChild?.id ?? null;
  const { toast } = useToast();

  const [ptecLogs, setPTECLogs] = useState<PTECLog[]>(() => {
    if (isDemoMode) {
      const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
      if (scenario === 'exploring' || scenario === 'in_crisis') return [];
      return DEMO_PTEC_LOGS;
    }
    const all = storage.getPTECLogs();
    const scoped = activeChildId ? all.filter((l) => l.child_id === activeChildId) : [];
    return scoped.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.ptec.getAll()
      .then((serverLogs) => {
        // Scope to the active child only
        const childServerLogs = activeChildId
          ? serverLogs.filter((l) => l.child_id === activeChildId)
          : [];
        const allLocal = storage.getPTECLogs();
        const childLocal = activeChildId
          ? allLocal.filter((l) => l.child_id === activeChildId)
          : [];
        const { merged, localOnly } = mergeById(childLocal, childServerLogs);
        // Preserve other children's logs in localStorage
        const otherLogs = allLocal.filter((l) => l.child_id !== activeChildId);
        storage.savePTECLogs(
          [...otherLogs, ...merged].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)),
        );
        const sorted = [...merged].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
        setPTECLogs(sorted);
        localOnly.forEach((l) => {
          queueMutation('POST', '/ptec', l, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'usePTECLogs', error: String(e) });
        toast({ title: 'Could not load latest data. Showing your last saved version.' });
        setLoading(false);
      });
  }, [userId, activeChildId, getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    document.addEventListener('pans:foreground', handler);
    return () => document.removeEventListener('pans:foreground', handler);
  }, [refetch]);

  const addOrUpdateLog = useCallback(
    (log: PTECLog) => {
      if (isDemoMode) { dispatchDemo(); return; }
      const stamped: PTECLog = { ...log, child_id: activeChildId ?? undefined, updatedAt: now() };
      storage.addOrUpdatePTECLog(stamped);
      const allLogs = storage.getPTECLogs();
      const childLogs = activeChildId
        ? allLogs.filter((l) => l.child_id === activeChildId)
        : allLogs;
      const sorted = childLogs.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
      setPTECLogs(sorted);
      track('ptec_checkin_completed', { child_id: activeChildId });
      queueMutation('POST', '/ptec', stamped, getToken, toast);

      const flare = detectPTECFlare(sorted);
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
    [isDemoMode, activeChildId, getToken, toast],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      storage.deletePTECLog(id);
      const allLogs = storage.getPTECLogs();
      const childLogs = activeChildId
        ? allLogs.filter((l) => l.child_id === activeChildId)
        : allLogs;
      setPTECLogs(
        childLogs.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)),
      );
      queueMutation('DELETE', `/ptec/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const getLogForWeek = useCallback(
    (weekStartDate: string) => ptecLogs.find((l) => l.weekStartDate === weekStartDate),
    [ptecLogs],
  );

  return { ptecLogs, loading, addOrUpdateLog, deleteLog, getLogForWeek, refetch };
}
