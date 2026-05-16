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

export type PTECLog = {
  id: string;
  weekStartDate: string; // YYYY-MM-DD (Monday of the week)
  date: string; // YYYY-MM-DD (date of actual entry)
  scores: {
    ocdBehaviors: number;
    anxiety: number;
    emotionalLability: number;
    aggression: number;
    restrictiveEating: number;
    sleepDisturbance: number;
    urinarySymptoms: number;
    sensorySensitivities: number;
    tics: number;
    handwritingRegression: number;
    academicDecline: number;
    personalityChange: number;
  };
  totalScore: number; // 0–72
  notes?: string;
};

export type PTECScores = PTECLog['scores'];

// ─── Trigger Log ─────────────────────────────────────────────────────────────

export type TriggerCategory =
  | 'strep_exposure'
  | 'child_illness'
  | 'household_illness'
  | 'vaccination'
  | 'high_stress'
  | 'dietary_change'
  | 'poor_sleep'
  | 'seasonal_weather'
  | 'other';

export type TriggerSeverity = 'low' | 'medium' | 'high';

export type TriggerEntry = {
  id: string;
  category: TriggerCategory;
  date: string; // YYYY-MM-DD
  notes: string;
  severity: TriggerSeverity;
  householdMemberName?: string; // for household_illness category
  customCategory?: string; // for 'other' category
};

export type HouseholdIllness = {
  id: string;
  memberName: string;
  illnessType: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  notes?: string;
};

export type FlareEvent = {
  id: string;
  detectedDate: string; // YYYY-MM-DD
  weekStartDate: string; // PTEC week that triggered
  ptecScore: number;
  averageScore: number;
  percentAboveAvg: number;
};

export type ActivityLevel = 'low' | 'moderate' | 'high';

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  low: 'Low — prefers quiet activities',
  moderate: 'Moderate — mix of active and calm',
  high: 'High — on the go, always moving',
};

export type ChildBaseline = {
  childName: string;
  childAge: string;
  description: string;
  sleepHours: string;
  appetite: string;
  activityLevel: ActivityLevel;
  socialBehavior: string;
  schoolPerformance: string;
  behavioralNotes: string;
  lastUpdated: string; // ISO timestamp
};
