import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { TriggerEntry } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';

export function useTriggerLog() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [entries, setEntries] = useState<TriggerEntry[]>(() =>
    storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)),
  );
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId) return;
    setLoading(true);
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
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useTriggerLog', error: String(e) });
        toast({ title: 'Could not load latest data. Showing your last saved version.' });
        setLoading(false);
      });
  }, [userId, getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    document.addEventListener('pans:foreground', handler);
    return () => document.removeEventListener('pans:foreground', handler);
  }, [refetch]);

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

  return { entries, loading, addEntry, deleteEntry, refetch };
}
