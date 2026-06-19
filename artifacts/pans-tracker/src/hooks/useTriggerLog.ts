import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useSupabaseAuth';
import { TriggerEntry } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { useActiveChild } from '@/hooks/useActiveChild';
import { DEMO_MULTI_CHILD_TRIGGERS } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';

function filterByChild(items: TriggerEntry[], childId: string | null): TriggerEntry[] {
  if (!childId) return items;
  return items.filter((e) => !e.child_id || e.child_id === childId);
}

function sorted(items: TriggerEntry[]): TriggerEntry[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

export function useTriggerLog() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();
  const activeChildId = useActiveChild()?.id ?? null;

  const [entries, setEntries] = useState<TriggerEntry[]>(() => {
    if (isDemoMode) {
      const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
      if (scenario === 'multi_child') return sorted(filterByChild(DEMO_MULTI_CHILD_TRIGGERS, activeChildId));
      return [];
    }
    return sorted(filterByChild(storage.getTriggerLog(), activeChildId));
  });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.triggers.getAll()
      .then((serverEntries) => {
        const local = storage.getTriggerLog();
        const { merged, localOnly } = mergeById(local, serverEntries);
        storage.saveTriggerLog(merged);
        setEntries(sorted(filterByChild(merged, activeChildId)));
        localOnly.forEach((e) => {
          const toSync = activeChildId && !e.child_id ? { ...e, child_id: activeChildId } : e;
          queueMutation('POST', '/triggers', toSync, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useTriggerLog', error: String(e) });
        toast({ title: 'Could not load latest data. Showing your last saved version.' });
        setLoading(false);
      });
  }, [userId, getToken, activeChildId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    document.addEventListener('pans:foreground', handler);
    return () => document.removeEventListener('pans:foreground', handler);
  }, [refetch]);

  // Re-filter when the active child changes.
  useEffect(() => {
    if (isDemoMode) {
      const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
      if (scenario === 'multi_child') {
        setEntries(sorted(filterByChild(DEMO_MULTI_CHILD_TRIGGERS, activeChildId)));
      }
      return;
    }
    setEntries(sorted(filterByChild(storage.getTriggerLog(), activeChildId)));
  }, [activeChildId, isDemoMode]);

  const addEntry = useCallback(
    (entry: TriggerEntry) => {
      if (isDemoMode) { return; }
      if (!activeChildId) {
        console.warn('[useTriggerLog] addEntry called with no active child; queuing without optimistic update');
        const stamped: TriggerEntry = { ...entry, updatedAt: now() };
        queueMutation('POST', '/triggers', stamped, getToken, toast);
        return;
      }
      const stamped: TriggerEntry = { ...entry, child_id: activeChildId, updatedAt: now() };
      storage.addTriggerEntry(stamped);
      setEntries(sorted(filterByChild(storage.getTriggerLog(), activeChildId)));
      queueMutation('POST', '/triggers', stamped, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      storage.deleteTriggerEntry(id);
      setEntries(sorted(filterByChild(storage.getTriggerLog(), activeChildId)));
      queueMutation('DELETE', `/triggers/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  return { entries, loading, addEntry, deleteEntry, refetch };
}
