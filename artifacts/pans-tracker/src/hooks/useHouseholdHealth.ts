import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { HouseholdIllness } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';

export function useHouseholdHealth() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [illnesses, setIllnesses] = useState<HouseholdIllness[]>(() =>
    storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)),
  );

  useEffect(() => {
    if (!userId) return;
    api.household.getAll()
      .then((serverItems) => {
        if (serverItems.length > 0) {
          storage.saveHouseholdHealth(serverItems);
          setIllnesses([...serverItems].sort((a, b) => b.startDate.localeCompare(a.startDate)));
        } else {
          const local = storage.getHouseholdHealth();
          if (local.length > 0) {
            local.forEach((item) => api.household.save(item).catch(() => {}));
          }
        }
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addIllness = useCallback(
    (illness: HouseholdIllness) => {
      storage.addHouseholdIllness(illness);
      setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
      api.household.save(illness).catch(() => {});
    },
    [api],
  );

  const deleteIllness = useCallback(
    (id: string) => {
      storage.deleteHouseholdIllness(id);
      setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
      api.household.delete(id).catch(() => {});
    },
    [api],
  );

  return { illnesses, addIllness, deleteIllness };
}
