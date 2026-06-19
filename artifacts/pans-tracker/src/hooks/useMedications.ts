import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { Medication, MissedDose } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { DEMO_MEDICATIONS, DEMO_IN_CRISIS_MEDICATIONS, DEMO_EXPLORING_MEDICATIONS } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useMedications() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [medications, setMedications] = useState<Medication[]>(() => {
    if (!isDemoMode) return storage.getMedications();
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
        setMedications(merged);
        localOnly.forEach((m) => {
          queueMutation('POST', '/medications', m, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useMedications', error: String(e) });
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

  const addMedication = useCallback(
    (med: Medication) => {
      if (isDemoMode) { dispatchDemo(); return; }
      const stamped: Medication = { ...med, updatedAt: now() };
      setMedications((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === stamped.id);
        const next =
          existingIdx >= 0
            ? prev.map((m, i) => (i === existingIdx ? stamped : m))
            : [...prev, stamped];
        storage.saveMedications(next);
        return next;
      });
      queueMutation('POST', '/medications', stamped, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  const deleteMedication = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const next = prev.filter((m) => m.id !== id);
        storage.saveMedications(next);
        return next;
      });
      queueMutation('DELETE', `/medications/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  const addMissedDose = useCallback(
    (medId: string, missed: MissedDose) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const next = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: [...(m.missedDoses ?? []), missed], updatedAt: now() }
            : m,
        );
        storage.saveMedications(next);
        return next;
      });
      const updated = storage.getMedications().find((m) => m.id === medId);
      if (updated) {
        queueMutation('POST', '/medications', updated, getToken, toast);
      }
    },
    [isDemoMode, getToken, toast],
  );

  const deleteMissedDose = useCallback(
    (medId: string, doseId: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const next = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: (m.missedDoses ?? []).filter((d) => d.id !== doseId), updatedAt: now() }
            : m,
        );
        storage.saveMedications(next);
        return next;
      });
      const updated = storage.getMedications().find((m) => m.id === medId);
      if (updated) {
        queueMutation('POST', '/medications', updated, getToken, toast);
      }
    },
    [isDemoMode, getToken, toast],
  );

  return { medications, loading, addMedication, deleteMedication, addMissedDose, deleteMissedDose, refetch };
}
