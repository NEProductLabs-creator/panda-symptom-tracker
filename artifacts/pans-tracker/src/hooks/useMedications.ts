import { useState, useCallback } from 'react';
import { Medication, MissedDose } from '@/lib/types';
import { storage } from '@/lib/storage';
import { DEMO_MEDICATIONS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useMedications() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';

  const [medications, setMedications] = useState<Medication[]>(() =>
    isDemoMode ? DEMO_MEDICATIONS : storage.getMedications(),
  );

  const addMedication = useCallback(
    (med: Medication) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === med.id);
        let newMeds;
        if (existingIdx >= 0) {
          newMeds = [...prev];
          newMeds[existingIdx] = med;
        } else {
          newMeds = [...prev, med];
        }
        storage.saveMedications(newMeds);
        return newMeds;
      });
    },
    [isDemoMode],
  );

  const deleteMedication = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const newMeds = prev.filter((m) => m.id !== id);
        storage.saveMedications(newMeds);
        return newMeds;
      });
    },
    [isDemoMode],
  );

  const addMissedDose = useCallback(
    (medId: string, missed: MissedDose) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const newMeds = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: [...(m.missedDoses ?? []), missed] }
            : m,
        );
        storage.saveMedications(newMeds);
        return newMeds;
      });
    },
    [isDemoMode],
  );

  const deleteMissedDose = useCallback(
    (medId: string, doseId: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const newMeds = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: (m.missedDoses ?? []).filter((d) => d.id !== doseId) }
            : m,
        );
        storage.saveMedications(newMeds);
        return newMeds;
      });
    },
    [isDemoMode],
  );

  return { medications, addMedication, deleteMedication, addMissedDose, deleteMissedDose };
}
