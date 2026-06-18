import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { TriggerEntry } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { useToast } from '@/hooks/use-toast';

export function useTriggerLog() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [entries, setEntries] = useState<TriggerEntry[]>(() =>
    storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)),
  );

  useEffect(() => {
    if (!userId) return;
    api.triggers.getAll()
      .then((serverEntries) => {
        const local = storage.getTriggerLog();
        const { merged, localOnly } = mergeById(local, serverEntries);
        const sorted = [...merged].sort((a, b) => b.date.localeCompare(a.date));
        storage.saveTriggerLog(sorted);
        setEntries(sorted);
        let syncToastShown = false;
        localOnly.forEach((e) =>
          api.triggers.save(e).catch(() => {
            if (!syncToastShown) {
              syncToastShown = true;
              toast({ title: 'Saved offline', description: 'Some trigger entries are saved locally and will sync when connection is restored.' });
            }
          }),
        );
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addEntry = useCallback(
    (entry: TriggerEntry) => {
      const stamped: TriggerEntry = { ...entry, updatedAt: now() };
      storage.addTriggerEntry(stamped);
      setEntries(storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)));
      api.triggers.save(stamped).catch(() => {
        toast({ title: 'Saved offline', description: 'Your trigger entry is saved locally and will sync later.' });
      });
    },
    [api, toast],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      storage.deleteTriggerEntry(id);
      setEntries(storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)));
      api.triggers.delete(id).catch(() => {
        toast({ title: 'Delete may not have synced', description: 'The deletion was applied locally but could not reach the server.' });
      });
    },
    [api, toast],
  );

  return { entries, addEntry, deleteEntry };
}
