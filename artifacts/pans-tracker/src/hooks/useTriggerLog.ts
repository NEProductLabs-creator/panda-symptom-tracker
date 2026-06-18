import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { TriggerEntry } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
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
        localOnly.forEach((e) => {
          queueMutation('POST', '/triggers', e, getToken, toast);
        });
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addEntry = useCallback(
    (entry: TriggerEntry) => {
      const stamped: TriggerEntry = { ...entry, updatedAt: now() };
      storage.addTriggerEntry(stamped);
      setEntries(storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)));
      queueMutation('POST', '/triggers', stamped, getToken, toast);
    },
    [getToken, toast],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      storage.deleteTriggerEntry(id);
      setEntries(storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)));
      queueMutation('DELETE', `/triggers/${id}`, undefined, getToken, toast);
    },
    [getToken, toast],
  );

  return { entries, addEntry, deleteEntry };
}
