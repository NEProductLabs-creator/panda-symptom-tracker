import { useState } from "react";
import { DEMO_HOPEBOARD_INDICES } from "@/lib/demoData";
import { DEMO_KEY } from "@/contexts/DemoContext";

const STORAGE_KEY = "pans_tracker_hopeboard";
const dispatchDemo = () => window.dispatchEvent(new CustomEvent("pans:demo:save"));

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
  const isDemoMode = localStorage.getItem(DEMO_KEY) === "1";

  const [data, setData] = useState<HopeBoardData>(() =>
    isDemoMode
      ? { savedIndices: DEMO_HOPEBOARD_INDICES, dismissedMilestones: [] }
      : load(),
  );

  function toggleSaved(index: number) {
    if (isDemoMode) { dispatchDemo(); return; }
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
    if (isDemoMode) return;
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
