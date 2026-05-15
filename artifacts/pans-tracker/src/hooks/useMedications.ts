import { useState, useEffect, useCallback } from 'react';
import { Medication } from '@/lib/types';
import { storage } from '@/lib/storage';

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);

  useEffect(() => {
    setMedications(storage.getMedications());
  }, []);

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

  return { medications, addMedication, deleteMedication };
}
