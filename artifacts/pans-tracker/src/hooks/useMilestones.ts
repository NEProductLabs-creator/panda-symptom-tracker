import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useSupabaseAuth';
import { Milestone } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { useActiveChild } from '@/hooks/useActiveChild';
import { DEMO_MILESTONES } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';

function filterByChild(items: Milestone[], childId: string | null): Milestone[] {
  if (!childId) return items;
  return items.filter((m) => !m.child_id || m.child_id === childId);
}

export function useMilestones() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();
  const activeChildId = useActiveChild()?.id ?? null;

  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    if (isDemoMode) {
      const scenario = (localStorage.getItem(DEMO_SCENARIO_KEY) ?? 'tracking') as keyof typeof DEMO_MILESTONES;
      return filterByChild(DEMO_MILESTONES[scenario] ?? [], activeChildId);
    }
    return filterByChild(storage.getMilestones(), activeChildId);
  });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.milestones.getAll()
      .then((serverItems) => {
        const local = storage.getMilestones();
        const { merged, localOnly } = mergeById(local, serverItems);
        storage.saveMilestones(merged);
        setMilestones(filterByChild(merged, activeChildId));
        localOnly.forEach((item) => {
          const toSync = activeChildId && !item.child_id ? { ...item, child_id: activeChildId } : item;
          queueMutation('POST', '/milestones', toSync, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useMilestones', error: String(e) });
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
      const scenario = (localStorage.getItem(DEMO_SCENARIO_KEY) ?? 'tracking') as keyof typeof DEMO_MILESTONES;
      setMilestones(filterByChild(DEMO_MILESTONES[scenario] ?? [], activeChildId));
      return;
    }
    setMilestones(filterByChild(storage.getMilestones(), activeChildId));
  }, [activeChildId, isDemoMode]);

  const addMilestone = useCallback(
    (data: Omit<Milestone, 'id'>) => {
      if (isDemoMode) return {} as Milestone;
      if (!activeChildId) {
        console.warn('[useMilestones] addMilestone called with no active child; queuing without optimistic update');
        const item: Milestone = { ...data, id: crypto.randomUUID(), updatedAt: now() };
        queueMutation('POST', '/milestones', item, getToken, toast);
        return item;
      }
      const item: Milestone = { ...data, child_id: activeChildId, id: crypto.randomUUID(), updatedAt: now() };
      setMilestones((prev) => {
        const nextFiltered = [...prev, item];
        const all = storage.getMilestones();
        const others = all.filter((m) => m.child_id && m.child_id !== activeChildId);
        storage.saveMilestones([...others, ...nextFiltered]);
        return nextFiltered;
      });
      queueMutation('POST', '/milestones', item, getToken, toast);
      return item;
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const updateMilestone = useCallback(
    (id: string, data: Omit<Milestone, 'id'>) => {
      if (isDemoMode) return;
      if (!activeChildId) {
        console.warn('[useMilestones] updateMilestone called with no active child; queuing without optimistic update');
        const item: Milestone = { ...data, id, updatedAt: now() };
        queueMutation('POST', '/milestones', item, getToken, toast);
        return;
      }
      const item: Milestone = { ...data, child_id: activeChildId, id, updatedAt: now() };
      setMilestones((prev) => {
        const nextFiltered = prev.map((m) => (m.id === id ? item : m));
        const all = storage.getMilestones();
        const others = all.filter((m) => m.child_id && m.child_id !== activeChildId);
        storage.saveMilestones([...others, ...nextFiltered]);
        return nextFiltered;
      });
      queueMutation('POST', '/milestones', item, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const deleteMilestone = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      setMilestones((prev) => {
        const nextFiltered = prev.filter((m) => m.id !== id);
        const all = storage.getMilestones();
        const others = activeChildId
          ? all.filter((m) => m.child_id && m.child_id !== activeChildId)
          : [];
        storage.saveMilestones([...others, ...nextFiltered]);
        return nextFiltered;
      });
      queueMutation('DELETE', `/milestones/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  return { milestones, loading, addMilestone, updateMilestone, deleteMilestone, refetch };
}
