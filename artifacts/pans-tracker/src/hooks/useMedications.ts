import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { Medication, MissedDose } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { DEMO_MEDICATIONS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useMedications() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [medications, setMedications] = useState<Medication[]>(() =>
    isDemoMode ? DEMO_MEDICATIONS : storage.getMedications(),
  );

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.medications.getAll()
      .then((serverMeds) => {
        if (serverMeds.length > 0) {
          storage.saveMedications(serverMeds);
          setMedications(serverMeds);
        } else {
          const local = storage.getMedications();
          if (local.length > 0) {
            local.forEach((m) => api.medications.save(m).catch(() => {}));
          }
        }
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addMedication = useCallback(
    (med: Medication) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === med.id);
        const next =
          existingIdx >= 0
            ? prev.map((m, i) => (i === existingIdx ? med : m))
            : [...prev, med];
        storage.saveMedications(next);
        return next;
      });
      api.medications.save(med).catch(() => {});
    },
    [isDemoMode, api],
  );

  const deleteMedication = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const next = prev.filter((m) => m.id !== id);
        storage.saveMedications(next);
        return next;
      });
      api.medications.delete(id).catch(() => {});
    },
    [isDemoMode, api],
  );

  const addMissedDose = useCallback(
    (medId: string, missed: MissedDose) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const next = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: [...(m.missedDoses ?? []), missed] }
            : m,
        );
        storage.saveMedications(next);
        const updated = next.find((m) => m.id === medId);
        if (updated) api.medications.save(updated).catch(() => {});
        return next;
      });
    },
    [isDemoMode, api],
  );

  const deleteMissedDose = useCallback(
    (medId: string, doseId: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const next = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: (m.missedDoses ?? []).filter((d) => d.id !== doseId) }
            : m,
        );
        storage.saveMedications(next);
        const updated = next.find((m) => m.id === medId);
        if (updated) api.medications.save(updated).catch(() => {});
        return next;
      });
    },
    [isDemoMode, api],
  );

  return { medications, addMedication, deleteMedication, addMissedDose, deleteMissedDose };
}
