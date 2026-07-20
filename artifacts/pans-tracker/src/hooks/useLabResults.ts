import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useSupabaseAuth';
import { LabResult } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { useActiveChild } from '@/hooks/useActiveChild';
import { DEMO_ALL_LAB_RESULTS } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';

export function useLabResults() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();
  const activeChild = useActiveChild();
  const activeChildId = activeChild?.id ?? null;

  const [entries, setEntries] = useState<LabResult[]>(() => {
    if (isDemoMode) {
      const scenario = (localStorage.getItem(DEMO_SCENARIO_KEY) ?? 'tracking') as keyof typeof DEMO_ALL_LAB_RESULTS;
      const data = DEMO_ALL_LAB_RESULTS[scenario] ?? [];
      const filtered = activeChildId ? data.filter((e) => e.child_id === activeChildId) : data;
      return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    }
    const all = storage.getLabResults();
    const filtered = activeChildId ? all.filter((e) => e.child_id === activeChildId) : all;
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.labs.getAll()
      .then((serverEntries) => {
        const local = storage.getLabResults();
        const { merged, localOnly } = mergeById(local, serverEntries);
        storage.saveLabResults(merged);
        const filtered = activeChildId ? merged.filter((e) => e.child_id === activeChildId) : merged;
        setEntries([...filtered].sort((a, b) => b.date.localeCompare(a.date)));
        localOnly.forEach((e) => {
          queueMutation('POST', '/labs', e, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useLabResults', error: String(e) });
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

  useEffect(() => {
    if (isDemoMode) {
      const scenario = (localStorage.getItem(DEMO_SCENARIO_KEY) ?? 'tracking') as keyof typeof DEMO_ALL_LAB_RESULTS;
      const data = DEMO_ALL_LAB_RESULTS[scenario] ?? [];
      const filtered = activeChildId ? data.filter((e) => e.child_id === activeChildId) : data;
      setEntries([...filtered].sort((a, b) => b.date.localeCompare(a.date)));
      return;
    }
    const all = storage.getLabResults();
    const filtered = activeChildId ? all.filter((e) => e.child_id === activeChildId) : all;
    setEntries([...filtered].sort((a, b) => b.date.localeCompare(a.date)));
  }, [activeChildId, isDemoMode]);

  const addEntry = useCallback(
    (data: Omit<LabResult, 'id' | 'child_id' | 'updatedAt'>) => {
      if (isDemoMode || !activeChildId) return;
      const entry: LabResult = {
        ...data,
        id: crypto.randomUUID(),
        child_id: activeChildId,
        updatedAt: now(),
      };
      const all = [...storage.getLabResults(), entry];
      storage.saveLabResults(all);
      setEntries(all.filter((e) => e.child_id === activeChildId).sort((a, b) => b.date.localeCompare(a.date)));
      queueMutation('POST', '/labs', entry, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const updateEntry = useCallback(
    (entry: LabResult) => {
      if (isDemoMode) return;
      const stamped: LabResult = { ...entry, updatedAt: now() };
      const all = storage.getLabResults().map((e) => (e.id === stamped.id ? stamped : e));
      storage.saveLabResults(all);
      const filtered = activeChildId ? all.filter((e) => e.child_id === activeChildId) : all;
      setEntries([...filtered].sort((a, b) => b.date.localeCompare(a.date)));
      queueMutation('POST', '/labs', stamped, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      const all = storage.getLabResults().filter((e) => e.id !== id);
      storage.saveLabResults(all);
      const filtered = activeChildId ? all.filter((e) => e.child_id === activeChildId) : all;
      setEntries([...filtered].sort((a, b) => b.date.localeCompare(a.date)));
      queueMutation('DELETE', `/labs/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  return { entries, loading, addEntry, updateEntry, deleteEntry, refetch };
}
