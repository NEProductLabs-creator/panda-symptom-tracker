import { useState, useCallback } from 'react';
import { Medication, MissedDose } from '@/lib/types';
import { storage } from '@/lib/storage';

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>(() => storage.getMedications());

  const addMedication = useCallback((med: Medication) => {
    setMedications(prev => {
      const existingIdx = prev.findIndex(m => m.id === med.id);
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
  }, []);

  const deleteMedication = useCallback((id: string) => {
    setMedications(prev => {
      const newMeds = prev.filter(m => m.id !== id);
      storage.saveMedications(newMeds);
      return newMeds;
    });
  }, []);

  const addMissedDose = useCallback((medId: string, missed: MissedDose) => {
    setMedications(prev => {
      const newMeds = prev.map(m =>
        m.id === medId
          ? { ...m, missedDoses: [...(m.missedDoses ?? []), missed] }
          : m
      );
      storage.saveMedications(newMeds);
      return newMeds;
    });
  }, []);

  const deleteMissedDose = useCallback((medId: string, doseId: string) => {
    setMedications(prev => {
      const newMeds = prev.map(m =>
        m.id === medId
          ? { ...m, missedDoses: (m.missedDoses ?? []).filter(d => d.id !== doseId) }
          : m
      );
      storage.saveMedications(newMeds);
      return newMeds;
    });
  }, []);

  return { medications, addMedication, deleteMedication, addMissedDose, deleteMissedDose };
}
