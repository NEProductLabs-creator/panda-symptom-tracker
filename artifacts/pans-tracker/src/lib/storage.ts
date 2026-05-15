import { SymptomLog, Medication, MedLibraryItem, Milestone } from './types';

const SYMPTOM_LOGS_KEY = 'pans_tracker_symptom_logs';
const MEDICATIONS_KEY = 'pans_tracker_medications';
const MED_LIBRARY_KEY = 'pans_tracker_med_library';
const MILESTONES_KEY = 'pans_tracker_milestones';

export const storage = {
  getLogs: (): SymptomLog[] => {
    const data = localStorage.getItem(SYMPTOM_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveLogs: (logs: SymptomLog[]) => {
    localStorage.setItem(SYMPTOM_LOGS_KEY, JSON.stringify(logs));
  },

  getMedications: (): Medication[] => {
    const data = localStorage.getItem(MEDICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveMedications: (meds: Medication[]) => {
    localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(meds));
  },

  getMedLibrary: (): MedLibraryItem[] => {
    const data = localStorage.getItem(MED_LIBRARY_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveMedLibrary: (items: MedLibraryItem[]) => {
    localStorage.setItem(MED_LIBRARY_KEY, JSON.stringify(items));
  },

  getMilestones: (): Milestone[] => {
    const data = localStorage.getItem(MILESTONES_KEY);
    if (!data) return [];
    // migrate old format: label→title, add default type
    return (JSON.parse(data) as any[]).map((m) => ({
      ...m,
      title: m.title ?? m.label ?? '',
      type: m.type ?? 'other',
    }));
  },

  saveMilestones: (milestones: Milestone[]) => {
    localStorage.setItem(MILESTONES_KEY, JSON.stringify(milestones));
  },
};
