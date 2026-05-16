import { useState } from "react";

const STORAGE_KEY = "pans_tracker_hopeboard";

interface HopeBoardData {
  savedIndices: number[];
  dismissedMilestones: string[];
}

function load(): HopeBoardData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { savedIndices: [], dismissedMilestones: [] };
  } catch {
    return { savedIndices: [], dismissedMilestones: [] };
  }
}

function persist(data: HopeBoardData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useHopeBoard() {
  const [data, setData] = useState<HopeBoardData>(load);

  function toggleSaved(index: number) {
    setData((prev) => {
      const saved = prev.savedIndices.includes(index)
        ? prev.savedIndices.filter((i) => i !== index)
        : [...prev.savedIndices, index];
      const next = { ...prev, savedIndices: saved };
      persist(next);
      return next;
    });
  }

  function dismissMilestone(id: string) {
    setData((prev) => {
      if (prev.dismissedMilestones.includes(id)) return prev;
      const next = { ...prev, dismissedMilestones: [...prev.dismissedMilestones, id] };
      persist(next);
      return next;
    });
  }

  function isSaved(index: number) {
    return data.savedIndices.includes(index);
  }

  function isDismissed(id: string) {
    return data.dismissedMilestones.includes(id);
  }

  return {
    savedIndices: data.savedIndices,
    toggleSaved,
    dismissMilestone,
    isSaved,
    isDismissed,
  };
}
