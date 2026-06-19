import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { Medication, MissedDose } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { useActiveChild } from '@/hooks/useActiveChild';
import { DEMO_MEDICATIONS, DEMO_IN_CRISIS_MEDICATIONS, DEMO_EXPLORING_MEDICATIONS } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

function filterByChild(items: Medication[], childId: string | null): Medication[] {
  if (!childId) return items;
  return items.filter((m) => !m.child_id || m.child_id === childId);
}

export function useMedications() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();
  const activeChildId = useActiveChild()?.id ?? null;

  const [medications, setMedications] = useState<Medication[]>(() => {
    if (!isDemoMode) return filterByChild(storage.getMedications(), activeChildId);
    const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
    if (scenario === 'exploring') return DEMO_EXPLORING_MEDICATIONS;
    if (scenario === 'in_crisis') return DEMO_IN_CRISIS_MEDICATIONS;
    return DEMO_MEDICATIONS;
  });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.medications.getAll()
      .then((serverMeds) => {
        const local = storage.getMedications();
        const { merged, localOnly } = mergeById(local, serverMeds);
        storage.saveMedications(merged);
        setMedications(filterByChild(merged, activeChildId));
        localOnly.forEach((m) => {
          const toSync = activeChildId && !m.child_id ? { ...m, child_id: activeChildId } : m;
          queueMutation('POST', '/medications', toSync, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useMedications', error: String(e) });
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

  // Re-filter from localStorage immediately when the active child changes.
  useEffect(() => {
    if (isDemoMode) return;
    setMedications(filterByChild(storage.getMedications(), activeChildId));
  }, [activeChildId, isDemoMode]);

  const addMedication = useCallback(
    (med: Medication) => {
      if (isDemoMode) { dispatchDemo(); return; }
      if (!activeChildId) {
        console.warn('[useMedications] addMedication called with no active child; queuing without optimistic update');
        queueMutation('POST', '/medications', { ...med, updatedAt: now() }, getToken, toast);
        return;
      }
      const stamped: Medication = { ...med, child_id: activeChildId, updatedAt: now() };
      setMedications((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === stamped.id);
        const nextFiltered = existingIdx >= 0
          ? prev.map((m, i) => (i === existingIdx ? stamped : m))
          : [...prev, stamped];
        // Preserve other children's medications in localStorage.
        const all = storage.getMedications();
        const others = all.filter((m) => m.child_id && m.child_id !== activeChildId);
        storage.saveMedications([...others, ...nextFiltered]);
        return nextFiltered;
      });
      queueMutation('POST', '/medications', stamped, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const deleteMedication = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const nextFiltered = prev.filter((m) => m.id !== id);
        const all = storage.getMedications();
        const others = activeChildId
          ? all.filter((m) => m.child_id && m.child_id !== activeChildId)
          : [];
        storage.saveMedications([...others, ...nextFiltered]);
        return nextFiltered;
      });
      queueMutation('DELETE', `/medications/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const addMissedDose = useCallback(
    (medId: string, missed: MissedDose) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const nextFiltered = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: [...(m.missedDoses ?? []), missed], updatedAt: now() }
            : m,
        );
        const all = storage.getMedications();
        const others = activeChildId
          ? all.filter((m) => m.child_id && m.child_id !== activeChildId)
          : [];
        storage.saveMedications([...others, ...nextFiltered]);
        return nextFiltered;
      });
      const updated = storage.getMedications().find((m) => m.id === medId);
      if (updated) {
        queueMutation('POST', '/medications', updated, getToken, toast);
      }
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  const deleteMissedDose = useCallback(
    (medId: string, doseId: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const nextFiltered = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: (m.missedDoses ?? []).filter((d) => d.id !== doseId), updatedAt: now() }
            : m,
        );
        const all = storage.getMedications();
        const others = activeChildId
          ? all.filter((m) => m.child_id && m.child_id !== activeChildId)
          : [];
        storage.saveMedications([...others, ...nextFiltered]);
        return nextFiltered;
      });
      const updated = storage.getMedications().find((m) => m.id === medId);
      if (updated) {
        queueMutation('POST', '/medications', updated, getToken, toast);
      }
    },
    [isDemoMode, activeChildId, getToken, toast],
  );

  return { medications, loading, addMedication, deleteMedication, addMissedDose, deleteMissedDose, refetch };
}
