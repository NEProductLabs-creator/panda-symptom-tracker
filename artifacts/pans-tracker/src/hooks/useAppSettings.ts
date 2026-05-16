import { useState, useCallback } from "react";

const STORAGE_KEY = "pans_tracker_settings";

export interface AppSettings {
  diagnosisStatus: "confirmed" | "suspected" | "exploring" | "";
  teacherName: string;
  schoolName: string;
  householdMembers: string[];
  onboardingComplete: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  diagnosisStatus: "",
  teacherName: "",
  schoolName: "",
  householdMembers: [],
  onboardingComplete: false,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persist(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function getOnboardingComplete(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!parsed.onboardingComplete;
  } catch {
    return false;
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(load);

  const saveSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  return { settings, saveSettings };
}
