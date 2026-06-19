import { useState, useEffect } from "react";
import { useActiveChild } from "@/hooks/useActiveChild";
import { DEMO_HOPEBOARD_INDICES } from "@/lib/demoData";
import { DEMO_KEY } from "@/contexts/DemoContext";

// Legacy key written before child scoping was introduced.
const LEGACY_STORAGE_KEY = "pans_tracker_hopeboard";

// Per-child storage key. Falls back to "none" so callers with no child still
// get a stable, isolated namespace instead of colliding with future children.
function storageKey(childId: string | null): string {
  return `hopeBoard.saved.${childId ?? "none"}`;
}

const dispatchDemo = () => window.dispatchEvent(new CustomEvent("pans:demo:save"));

interface HopeBoardData {
  savedIndices: number[];
  dismissedMilestones: string[];
}

const EMPTY: HopeBoardData = { savedIndices: [], dismissedMilestones: [] };

function load(childId: string | null): HopeBoardData {
  try {
    const raw = localStorage.getItem(storageKey(childId));
    return raw ? (JSON.parse(raw) as HopeBoardData) : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function persist(data: HopeBoardData, childId: string | null): void {
  localStorage.setItem(storageKey(childId), JSON.stringify(data));
}

/**
 * One-time migration: move data stored under the legacy unscoped key into the
 * active child's slot. Runs on mount and whenever the active child changes
 * (in case a child is selected for the first time after migration).
 * Deletes the legacy key once the data has been migrated.
 */
function migrateLegacyKey(childId: string | null): void {
  const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyRaw) return;
  // Only write into the child slot if it's still empty, so we never overwrite
  // data the user already saved after the migration was introduced.
  const targetKey = storageKey(childId);
  if (!localStorage.getItem(targetKey)) {
    localStorage.setItem(targetKey, legacyRaw);
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function useHopeBoard() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === "1";
  const activeChildId = useActiveChild()?.id ?? null;

  const [data, setData] = useState<HopeBoardData>(() => {
    if (isDemoMode) return { savedIndices: DEMO_HOPEBOARD_INDICES, dismissedMilestones: [] };
    migrateLegacyKey(activeChildId);
    return load(activeChildId);
  });

  // Reload when the active child changes (or on first mount after a child loads).
  useEffect(() => {
    if (isDemoMode) return;
    migrateLegacyKey(activeChildId);
    setData(load(activeChildId));
  }, [activeChildId, isDemoMode]);

  function toggleSaved(index: number) {
    if (isDemoMode) { dispatchDemo(); return; }
    setData((prev) => {
      const saved = prev.savedIndices.includes(index)
        ? prev.savedIndices.filter((i) => i !== index)
        : [...prev.savedIndices, index];
      const next = { ...prev, savedIndices: saved };
      persist(next, activeChildId);
      return next;
    });
  }

  function dismissMilestone(id: string) {
    if (isDemoMode) return;
    setData((prev) => {
      if (prev.dismissedMilestones.includes(id)) return prev;
      const next = { ...prev, dismissedMilestones: [...prev.dismissedMilestones, id] };
      persist(next, activeChildId);
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
