import { useState, useCallback } from 'react';
import { HouseholdIllness } from '@/lib/types';
import { storage } from '@/lib/storage';

export function useHouseholdHealth() {
  const [illnesses, setIllnesses] = useState<HouseholdIllness[]>(() =>
    storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate))
  );

  const addIllness = useCallback((illness: HouseholdIllness) => {
    storage.addHouseholdIllness(illness);
    setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
  }, []);

  const deleteIllness = useCallback((id: string) => {
    storage.deleteHouseholdIllness(id);
    setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
  }, []);

  return { illnesses, addIllness, deleteIllness };
}
