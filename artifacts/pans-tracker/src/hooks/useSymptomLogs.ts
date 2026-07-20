import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useSupabaseAuth';
import { SymptomLog } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import {
  DEMO_LOGS,
  DEMO_EXPLORING_LOGS,
  DEMO_IN_CRISIS_LOGS,
  DEMO_MULTI_CHILD_LOGS,
} from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';
import { track } from '@/lib/analytics';
import { useActiveChild } from '@/hooks/useActiveChild';
import { filterByChild } from '@/lib/childScoping';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useSymptomLogs() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();
  const activeChild = useActiveChild();
  const activeChildId = activeChild?.id ?? null;

  const [logs, setLogs] = useState<SymptomLog[]>(() => {
    if (!isDemoMode) return filterByChild(storage.getLogs(), activeChildId);
    const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
    if (scenario === 'exploring') return DEMO_EXPLORING_LOGS;
    if (scenario === 'in_crisis') return DEMO_IN_CRISIS_LOGS;
    if (scenario === 'multi_child') return filterByChild(DEMO_MULTI_CHILD_LOGS, activeChildId);
    return DEMO_LOGS;
  });
  const [loading, setLoading] = useState(false);

  // Sync from server; also called on foreground return
  const refetch = useCallback(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.logs.getAll()
      .then((serverLogs) => {
        const local = storage.getLogs();
        const { merged, localOnly } = mergeById(local, serverLogs);
        storage.saveLogs(merged);
        setLogs(filterByChild(merged, activeChildId));
        localOnly.forEach((l) => {
          queueMutation('POST', '/logs', l, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useSymptomLogs', error: String(e) });
        toast({ title: 'Could not load latest data. Showing your last saved version.' });
        setLoading(false);
      });
  }, [userId, getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    document.addEventListener('pans:foreground', handler);
    return () => document.removeEventListener('pans:foreground', handler);
  }, [refetch]);

  // Re-filter from localStorage (or demo source) whenever the active child changes
  useEffect(() => {
    if (isDemoMode) {
      const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
      if (scenario === 'multi_child') {
        setLogs(filterByChild(DEMO_MULTI_CHILD_LOGS, activeChildId));
      }
      return;
    }
    setLogs(filterByChild(storage.getLogs(), activeChildId));
  }, [activeChildId, isDemoMode]);

  const addLog = useCallback(
    (log: SymptomLog) => {
      if (isDemoMode) { dispatchDemo(); return; }
      const stamped: SymptomLog = {
        ...log,
        child_id: activeChildId ?? undefined,
        updatedAt: now(),
      };
      setLogs((prev) => {
        const isNew = prev.findIndex((l) => l.date === stamped.date) < 0;
        const nextFiltered = isNew
          ? [...prev, stamped]
          : prev.map((l) => (l.date === stamped.date ? stamped : l));

        // Preserve other children's logs when writing back to localStorage
        const allLogs = storage.getLogs();
        const otherLogs = activeChildId
          ? allLogs.filter(l => l.child_id && l.child_id !== activeChildId)
          : [];
        storage.saveLogs([...otherLogs, ...nextFiltered]);

        if (isNew) track('symptom_log_created', { child_id: activeChildId });
        return nextFiltered;
      });
      queueMutation('POST', '/logs', stamped, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      setLogs((prev) => {
        const nextFiltered = prev.filter((l) => l.id !== id);
        const allLogs = storage.getLogs();
        const otherLogs = activeChildId
          ? allLogs.filter(l => l.child_id && l.child_id !== activeChildId)
          : [];
        storage.saveLogs([...otherLogs, ...nextFiltered]);
        return nextFiltered;
      });
      queueMutation('DELETE', `/logs/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  return { logs, loading, addLog, deleteLog, refetch };
}
