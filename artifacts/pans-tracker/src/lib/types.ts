export type SymptomLog = {
  id: string;
  date: string; // YYYY-MM-DD
  ocd: number;
  anxiety: number;
  rage: number;
  tics: number;
  sleep: number;
  cognition: number;
  notes?: string;
};

export type MedicationType = 'antibiotic' | 'ssri' | 'supplement' | 'ivig' | 'steroid' | 'other';

export type Medication = {
  id: string;
  name: string;
  dose: string;
  type: MedicationType;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  notes?: string;
};
