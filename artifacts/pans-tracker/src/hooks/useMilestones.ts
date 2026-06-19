import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { Milestone } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';

export function useMilestones() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [milestones, setMilestones] = useState<Milestone[]>(() => storage.getMilestones());
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    api.milestones.getAll()
      .then((serverItems) => {
        const local = storage.getMilestones();
        const { merged, localOnly } = mergeById(local, serverItems);
        storage.saveMilestones(merged);
        setMilestones(merged);
        localOnly.forEach((item) => {
          queueMutation('POST', '/milestones', item, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useMilestones', error: String(e) });
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

  const addMilestone = useCallback(
    (data: Omit<Milestone, 'id'>) => {
      const item: Milestone = { ...data, id: crypto.randomUUID(), updatedAt: now() };
      setMilestones((prev) => {
        const updated = [...prev, item];
        storage.saveMilestones(updated);
        return updated;
      });
      queueMutation('POST', '/milestones', item, getToken, toast);
      return item;
    },
    [getToken, toast],
  );

  const updateMilestone = useCallback(
    (id: string, data: Omit<Milestone, 'id'>) => {
      const item: Milestone = { ...data, id, updatedAt: now() };
      setMilestones((prev) => {
        const updated = prev.map((m) => (m.id === id ? item : m));
        storage.saveMilestones(updated);
        return updated;
      });
      queueMutation('POST', '/milestones', item, getToken, toast);
    },
    [getToken, toast],
  );

  const deleteMilestone = useCallback(
    (id: string) => {
      setMilestones((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        storage.saveMilestones(updated);
        return updated;
      });
      queueMutation('DELETE', `/milestones/${id}`, undefined, getToken, toast);
    },
    [getToken, toast],
  );

  return { milestones, loading, addMilestone, updateMilestone, deleteMilestone, refetch };
}
