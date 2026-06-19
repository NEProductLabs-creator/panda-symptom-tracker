import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useSupabaseAuth';
import { MedLibraryItem } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { useActiveChild } from '@/hooks/useActiveChild';
import {
  DEMO_MED_LIBRARY,
  DEMO_EXPLORING_MED_LIBRARY,
  DEMO_IN_CRISIS_MED_LIBRARY,
  DEMO_MULTI_CHILD_MED_LIBRARY,
} from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

function filterByChild(items: MedLibraryItem[], childId: string | null): MedLibraryItem[] {
  if (!childId) return items;
  return items.filter((m) => !m.child_id || m.child_id === childId);
}

function demoInitForScenario(scenario: string | null, activeChildId: string | null): MedLibraryItem[] {
  if (scenario === 'exploring') return DEMO_EXPLORING_MED_LIBRARY;
  if (scenario === 'in_crisis') return DEMO_IN_CRISIS_MED_LIBRARY;
  if (scenario === 'multi_child') return filterByChild(DEMO_MULTI_CHILD_MED_LIBRARY, activeChildId);
  return DEMO_MED_LIBRARY;
}

export function useMedLibrary() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();
  const activeChildId = useActiveChild()?.id ?? null;

  const [medLibrary, setMedLibrary] = useState<MedLibraryItem[]>(() => {
    if (!isDemoMode) return filterByChild(storage.getMedLibrary(), activeChildId);
    return demoInitForScenario(localStorage.getItem(DEMO_SCENARIO_KEY), activeChildId);
  });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.medLibrary.getAll()
      .then((serverItems) => {
        const local = storage.getMedLibrary();
        const { merged, localOnly } = mergeById(local, serverItems);
        storage.saveMedLibrary(merged);
        setMedLibrary(filterByChild(merged, activeChildId));
        localOnly.forEach((item) => {
          const toSync = activeChildId && !item.child_id ? { ...item, child_id: activeChildId } : item;
          queueMutation('POST', '/medlibrary', toSync, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useMedLibrary', error: String(e) });
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
        setMedLibrary(filterByChild(DEMO_MULTI_CHILD_MED_LIBRARY, activeChildId));
      }
      return;
    }
    setMedLibrary(filterByChild(storage.getMedLibrary(), activeChildId));
  }, [activeChildId, isDemoMode]);

  const saveMedLibraryItem = useCallback(
    (item: MedLibraryItem) => {
      if (isDemoMode) { dispatchDemo(); return; }
      if (!activeChildId) {
        console.warn('[useMedLibrary] saveMedLibraryItem called with no active child; queuing without optimistic update');
        queueMutation('POST', '/medlibrary', { ...item, updatedAt: now() }, getToken, toast);
        return;
      }
      const stamped: MedLibraryItem = { ...item, child_id: activeChildId, updatedAt: now() };
      setMedLibrary((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === stamped.id);
        const nextFiltered = existingIdx >= 0
          ? prev.map((m, i) => (i === existingIdx ? stamped : m))
          : [...prev, stamped];
        const all = storage.getMedLibrary();
        const others = all.filter((m) => m.child_id && m.child_id !== activeChildId);
        storage.saveMedLibrary([...others, ...nextFiltered]);
        return nextFiltered;
      });
      queueMutation('POST', '/medlibrary', stamped, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const deleteMedLibraryItem = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedLibrary((prev) => {
        const nextFiltered = prev.filter((m) => m.id !== id);
        const all = storage.getMedLibrary();
        const others = activeChildId
          ? all.filter((m) => m.child_id && m.child_id !== activeChildId)
          : [];
        storage.saveMedLibrary([...others, ...nextFiltered]);
        return nextFiltered;
      });
      queueMutation('DELETE', `/medlibrary/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  return { medLibrary, loading, saveMedLibraryItem, deleteMedLibraryItem, refetch };
}
