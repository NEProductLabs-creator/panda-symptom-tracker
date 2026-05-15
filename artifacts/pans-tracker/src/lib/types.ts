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
  medicationsTaken?: string[]; // array of MedLibraryItem IDs
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

export type FrequencyOption = 'once' | 'twice' | 'three_times';

export const FREQUENCY_LABELS: Record<FrequencyOption, string> = {
  once: 'Once a day',
  twice: 'Twice a day',
  three_times: 'Three times a day',
};

export type MedLibraryItem = {
  id: string;
  name: string;
  dosage: string;
  frequency: FrequencyOption;
};

export type MilestoneType = 'appointment' | 'lab_results' | 'medication_change' | 'other';

export const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  appointment: 'Doctor Appointment',
  lab_results: 'Lab Results',
  medication_change: 'Medication Change',
  other: 'Other',
};

export type Milestone = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: MilestoneType;
  notes?: string;
};
