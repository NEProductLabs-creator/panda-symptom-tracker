import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { HouseholdIllness } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';

export function useHouseholdHealth() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [illnesses, setIllnesses] = useState<HouseholdIllness[]>(() =>
    storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)),
  );

  useEffect(() => {
    if (!userId) return;
    api.household.getAll()
      .then((serverItems) => {
        const local = storage.getHouseholdHealth();
        const { merged, localOnly } = mergeById(local, serverItems);
        const sorted = [...merged].sort((a, b) => b.startDate.localeCompare(a.startDate));
        storage.saveHouseholdHealth(sorted);
        setIllnesses(sorted);
        localOnly.forEach((item) => {
          queueMutation('POST', '/household', item, getToken, toast);
        });
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addIllness = useCallback(
    (illness: HouseholdIllness) => {
      const stamped: HouseholdIllness = { ...illness, updatedAt: now() };
      storage.addHouseholdIllness(stamped);
      setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
      queueMutation('POST', '/household', stamped, getToken, toast);
    },
    [getToken, toast],
  );

  const deleteIllness = useCallback(
    (id: string) => {
      storage.deleteHouseholdIllness(id);
      setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
      queueMutation('DELETE', `/household/${id}`, undefined, getToken, toast);
    },
    [getToken, toast],
  );

  return { illnesses, addIllness, deleteIllness };
}
