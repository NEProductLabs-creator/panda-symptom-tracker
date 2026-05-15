import { useState } from 'react';
import { storage } from '@/lib/storage';
import { Milestone } from '@/lib/types';

export function useMilestones() {
  const [milestones, setMilestones] = useState<Milestone[]>(() => storage.getMilestones());

  function addMilestone(data: Omit<Milestone, 'id'>) {
    const item: Milestone = { ...data, id: `ms-${Date.now()}` };
    const updated = [...milestones, item];
    setMilestones(updated);
    storage.saveMilestones(updated);
    return item;
  }

  function deleteMilestone(id: string) {
    const updated = milestones.filter((m) => m.id !== id);
    setMilestones(updated);
    storage.saveMilestones(updated);
  }

  return { milestones, addMilestone, deleteMilestone };
}
