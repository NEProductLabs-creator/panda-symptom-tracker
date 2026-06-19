export type SymptomLog = {
  id: string;
  date: string; // YYYY-MM-DD
  ocd: number | null;
  anxiety: number | null;
  rage: number | null;
  tics: number | null;
  sleep: number | null;
  cognition: number | null;
  notes?: string;
  medicationsTaken?: string[]; // array of MedLibraryItem IDs
  calmDay?: boolean;
  updatedAt?: string; // ISO timestamp — used for last-write-wins sync merge
};

export type MedicationType = 'antibiotic' | 'ssri' | 'supplement' | 'ivig' | 'steroid' | 'other';

export type CourseType = 'prophylactic' | 'treatment';

export type MissedDose = {
  id: string;
  date: string; // YYYY-MM-DD
  note?: string;
};

export type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency?: FrequencyOption;
  type: MedicationType;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  prescribingDoctor?: string;
  courseType?: CourseType;
  courseDays?: number; // planned duration for treatment courses
  supplyDays?: number; // days of supply on hand (user-updated)
  notes?: string;
  missedDoses?: MissedDose[];
  updatedAt?: string; // ISO timestamp — used for last-write-wins sync merge
};

export type FrequencyOption = 'once' | 'twice' | 'three_times' | 'as_needed';

export const FREQUENCY_LABELS: Record<FrequencyOption, string> = {
  once: 'Once a day',
  twice: 'Twice a day',
  three_times: 'Three times a day',
  as_needed: 'As needed',
};

export type MedLibraryItem = {
  id: string;
  name: string;
  dosage: string;
  frequency: FrequencyOption;
  updatedAt?: string; // ISO timestamp — used for last-write-wins sync merge
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
  updatedAt?: string; // ISO timestamp — used for last-write-wins sync merge
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
  updatedAt?: string; // ISO timestamp — used for last-write-wins sync merge
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
  updatedAt?: string; // ISO timestamp — used for last-write-wins sync merge
};

export type HouseholdIllness = {
  id: string;
  memberName: string;
  illnessType: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  notes?: string;
  updatedAt?: string; // ISO timestamp — used for last-write-wins sync merge
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

export type WellbeingLog = {
  id: string;
  date: string; // YYYY-MM-DD
  holding: number;   // 1–5: how the caregiver is holding up (5 = thriving)
  stress: number;    // 1–5: how manageable home stress feels (5 = very calm)
  connected: number; // 1–5: how connected they feel to support (5 = well-supported)
  notes?: string;    // private caregiver-only notes
  hardDay: boolean;  // flags this date as a particularly hard day
  updatedAt?: string; // ISO timestamp — used for last-write-wins sync merge
};

// ─── Journey State ────────────────────────────────────────────────────────────

export type JourneyStage = 'exploring' | 'in_crisis' | 'tracking';

export type JourneyState = {
  user_id: string;
  /** @deprecated Moved to children.journey_stage after migration 010. May be absent. */
  journey_stage?: JourneyStage | null;
  /** @deprecated Moved to children.journey_stage_set_at after migration 010. May be absent. */
  journey_stage_set_at?: string | null; // ISO timestamp
  onboarding_completed: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
};

// ─── Children ─────────────────────────────────────────────────────────────────

export type DiagnosisStatus = 'undiagnosed' | 'suspected' | 'diagnosed';

export type Child = {
  id: string;
  user_id: string;
  name: string;
  date_of_birth: string | null; // YYYY-MM-DD
  diagnosis_status: DiagnosisStatus;
  journey_stage: JourneyStage | null;
  journey_stage_set_at: string | null; // ISO timestamp
  is_archived: boolean;
  sort_order: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
};

export type CreateChildInput = {
  id: string;
  name: string;
  date_of_birth?: string | null;
  diagnosis_status: DiagnosisStatus;
  journey_stage?: JourneyStage | null;
  sort_order?: number;
};

export type UpdateChildInput = Partial<
  Pick<Child, 'name' | 'date_of_birth' | 'diagnosis_status' | 'journey_stage' | 'journey_stage_set_at' | 'sort_order' | 'is_archived'>
>;
