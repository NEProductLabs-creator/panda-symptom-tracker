import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { HouseholdIllness } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
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
        let syncToastShown = false;
        localOnly.forEach((item) =>
          api.household.save(item).catch(() => {
            if (!syncToastShown) {
              syncToastShown = true;
              toast({ title: 'Saved offline', description: 'Some household health entries are saved locally and will sync when connection is restored.' });
            }
          }),
        );
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addIllness = useCallback(
    (illness: HouseholdIllness) => {
      const stamped: HouseholdIllness = { ...illness, updatedAt: now() };
      storage.addHouseholdIllness(stamped);
      setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
      api.household.save(stamped).catch(() => {
        toast({ title: 'Saved offline', description: 'Your household health entry is saved locally and will sync later.' });
      });
    },
    [api, toast],
  );

  const deleteIllness = useCallback(
    (id: string) => {
      storage.deleteHouseholdIllness(id);
      setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
      api.household.delete(id).catch(() => {
        toast({ title: 'Delete may not have synced', description: 'The deletion was applied locally but could not reach the server.' });
      });
    },
    [api, toast],
  );

  return { illnesses, addIllness, deleteIllness };
}
