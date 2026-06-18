import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { Milestone } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { useToast } from '@/hooks/use-toast';

export function useMilestones() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [milestones, setMilestones] = useState<Milestone[]>(() => storage.getMilestones());

  useEffect(() => {
    if (!userId) return;
    api.milestones.getAll()
      .then((serverItems) => {
        const local = storage.getMilestones();
        const { merged, localOnly } = mergeById(local, serverItems);
        storage.saveMilestones(merged);
        setMilestones(merged);
        let syncToastShown = false;
        localOnly.forEach((item) =>
          api.milestones.save(item).catch(() => {
            if (!syncToastShown) {
              syncToastShown = true;
              toast({ title: 'Saved offline', description: 'Some milestones are saved locally and will sync when connection is restored.' });
            }
          }),
        );
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addMilestone = useCallback(
    (data: Omit<Milestone, 'id'>) => {
      const item: Milestone = { ...data, id: `ms-${Date.now()}`, updatedAt: now() };
      setMilestones((prev) => {
        const updated = [...prev, item];
        storage.saveMilestones(updated);
        return updated;
      });
      api.milestones.save(item).catch(() => {
        toast({ title: 'Saved offline', description: 'Your milestone is saved locally and will sync later.' });
      });
      return item;
    },
    [api, toast],
  );

  const updateMilestone = useCallback(
    (id: string, data: Omit<Milestone, 'id'>) => {
      const item: Milestone = { ...data, id, updatedAt: now() };
      setMilestones((prev) => {
        const updated = prev.map((m) => (m.id === id ? item : m));
        storage.saveMilestones(updated);
        return updated;
      });
      api.milestones.save(item).catch(() => {
        toast({ title: 'Saved offline', description: 'Your milestone update is saved locally and will sync later.' });
      });
    },
    [api, toast],
  );

  const deleteMilestone = useCallback(
    (id: string) => {
      setMilestones((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        storage.saveMilestones(updated);
        return updated;
      });
      api.milestones.delete(id).catch(() => {
        toast({ title: 'Delete may not have synced', description: 'The deletion was applied locally but could not reach the server.' });
      });
    },
    [api, toast],
  );

  return { milestones, addMilestone, updateMilestone, deleteMilestone };
}
