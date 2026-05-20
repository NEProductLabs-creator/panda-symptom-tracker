import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { TriggerEntry } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';

export function useTriggerLog() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [entries, setEntries] = useState<TriggerEntry[]>(() =>
    storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)),
  );

  useEffect(() => {
    if (!userId) return;
    api.triggers.getAll()
      .then((serverEntries) => {
        if (serverEntries.length > 0) {
          storage.saveTriggerLog(serverEntries);
          setEntries([...serverEntries].sort((a, b) => b.date.localeCompare(a.date)));
        } else {
          const local = storage.getTriggerLog();
          if (local.length > 0) {
            local.forEach((e) => api.triggers.save(e).catch(() => {}));
          }
        }
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addEntry = useCallback(
    (entry: TriggerEntry) => {
      storage.addTriggerEntry(entry);
      setEntries(storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)));
      api.triggers.save(entry).catch(() => {});
    },
    [api],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      storage.deleteTriggerEntry(id);
      setEntries(storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)));
      api.triggers.delete(id).catch(() => {});
    },
    [api],
  );

  return { entries, addEntry, deleteEntry };
}
