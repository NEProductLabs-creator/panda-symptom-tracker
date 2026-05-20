import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { Milestone } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';

export function useMilestones() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [milestones, setMilestones] = useState<Milestone[]>(() => storage.getMilestones());

  useEffect(() => {
    if (!userId) return;
    api.milestones.getAll()
      .then((serverItems) => {
        if (serverItems.length > 0) {
          storage.saveMilestones(serverItems);
          setMilestones(serverItems);
        } else {
          const local = storage.getMilestones();
          if (local.length > 0) {
            local.forEach((item) => api.milestones.save(item).catch(() => {}));
          }
        }
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addMilestone = useCallback(
    (data: Omit<Milestone, 'id'>) => {
      const item: Milestone = { ...data, id: `ms-${Date.now()}` };
      setMilestones((prev) => {
        const updated = [...prev, item];
        storage.saveMilestones(updated);
        return updated;
      });
      api.milestones.save(item).catch(() => {});
      return item;
    },
    [api],
  );

  const updateMilestone = useCallback(
    (id: string, data: Omit<Milestone, 'id'>) => {
      const item: Milestone = { ...data, id };
      setMilestones((prev) => {
        const updated = prev.map((m) => (m.id === id ? item : m));
        storage.saveMilestones(updated);
        return updated;
      });
      api.milestones.save(item).catch(() => {});
    },
    [api],
  );

  const deleteMilestone = useCallback(
    (id: string) => {
      setMilestones((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        storage.saveMilestones(updated);
        return updated;
      });
      api.milestones.delete(id).catch(() => {});
    },
    [api],
  );

  return { milestones, addMilestone, updateMilestone, deleteMilestone };
}
