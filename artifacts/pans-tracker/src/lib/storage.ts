import { SymptomLog, Medication } from './types';

const SYMPTOM_LOGS_KEY = 'pans_tracker_symptom_logs';
const MEDICATIONS_KEY = 'pans_tracker_medications';

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
  }
};
