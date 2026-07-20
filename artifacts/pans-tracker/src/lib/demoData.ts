// DEMO_DATA: last updated 2026-07-20
// All four scenarios (exploring, in_crisis, tracking, multi_child) now have
// complete data for milestones, triggers, lab results, screener results, and
// household health. See DEMO_MILESTONES, DEMO_TRIGGERS, DEMO_ALL_LAB_RESULTS,
// DEMO_HOUSEHOLD_HEALTH, and the expanded DEMO_SCREENER_RESULTS array below.

import type { SymptomLog, ChildBaseline, Medication, MedLibraryItem, Milestone, TriggerEntry, PTECLog, WellbeingLog, JourneyState, Child, LabResult, HouseholdIllness } from "@/lib/types";
import { computePTECTotal } from "@/lib/ptec";
import type { ReportHistoryItem } from "@/lib/reportHistory";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// Returns the ISO date of the Monday starting the week that contains the date `n` days ago
function mondayOf(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const dow = d.getDay(); // 0 = Sun, 1 = Mon … 6 = Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

// Returns the ISO date `k` days after a given YYYY-MM-DD string
function addDays(dateStr: string, k: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getUTCDate() + k);
  return d.toISOString().split("T")[0];
}

// ── Demo child builder ─────────────────────────────────────────────────────────

function demoChild(
  id: string,
  name: string,
  ageYears: number,
  diagnosisStatus: Child["diagnosis_status"],
  journeyStage: NonNullable<Child["journey_stage"]>,
  sortOrder: number,
): Child {
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - ageYears);
  return {
    id,
    user_id: "demo",
    name,
    date_of_birth: dob.toISOString().split("T")[0],
    diagnosis_status: diagnosisStatus,
    journey_stage: journeyStage,
    journey_stage_set_at: daysAgo(90) + "T12:00:00.000Z",
    is_archived: false,
    sort_order: sortOrder,
    created_at: daysAgo(90) + "T12:00:00.000Z",
    updated_at: daysAgo(7) + "T12:00:00.000Z",
  };
}

// ── Child profiles per scenario ────────────────────────────────────────────────

export const DEMO_CHILDREN: Record<"exploring" | "in_crisis" | "tracking" | "multi_child", Child[]> = {
  exploring:   [demoChild("demo-child-sam",   "Sam",   8,  "suspected",  "exploring", 0)],
  in_crisis:   [demoChild("demo-child-riley", "Riley", 7,  "undiagnosed","in_crisis",  0)],
  tracking:    [demoChild("demo-child-avery", "Avery", 10, "diagnosed",  "tracking",  0)],
  multi_child: [
    demoChild("demo-child-mia",  "Mia",  9, "diagnosed", "tracking",  0),
    demoChild("demo-child-theo", "Theo", 6, "suspected", "exploring", 1),
  ],
};

// ── Child profile (tracking scenario) ─────────────────────────────────────────

export const DEMO_BASELINE: ChildBaseline = {
  childName: "Avery",
  childAge: "10",
  description:
    "Avery is usually curious, playful, and loves Lego and soccer. At baseline they're calm, sleep well, and excel at school.",
  sleepHours: "9",
  appetite: "Good - eats most foods without fuss",
  activityLevel: "moderate",
  socialBehavior: "Very social. Loves playing with friends and their younger sibling.",
  schoolPerformance: "A/B student, strong in reading and math, well-liked by teachers.",
  behavioralNotes:
    "PANDAS diagnosis confirmed after a strep infection approximately 6 months ago. Responds well to antibiotics when treatment starts early.",
  lastUpdated: daysAgo(45),
};

// ── Medication library ────────────────────────────────────────────────────────

export const DEMO_MED_LIBRARY: MedLibraryItem[] = [
  { id: "demo-lib-1", name: "Augmentin", dosage: "500mg", frequency: "twice" },
  { id: "demo-lib-2", name: "Ibuprofen", dosage: "200mg", frequency: "as_needed" },
  { id: "demo-lib-3", name: "Culturelle Probiotic", dosage: "1 capsule", frequency: "once" },
];

// ── Full medications ──────────────────────────────────────────────────────────

export const DEMO_MEDICATIONS: Medication[] = [
  {
    id: "demo-med-1",
    name: "Augmentin",
    dose: "500mg",
    frequency: "twice",
    type: "antibiotic",
    startDate: daysAgo(180),
    endDate: null,
    prescribingDoctor: "Dr. Chen",
    courseType: "prophylactic",
    notes: "Prophylactic antibiotic - maintaining dose since PANDAS diagnosis.",
  },
  {
    id: "demo-med-2",
    name: "Ibuprofen",
    dose: "200mg",
    frequency: "as_needed",
    type: "other",
    startDate: daysAgo(180),
    endDate: null,
    notes: "As-needed for flares - anti-inflammatory effect helps reduce severity.",
  },
  {
    id: "demo-med-3",
    name: "Culturelle Probiotic",
    dose: "1 capsule",
    frequency: "once",
    type: "supplement",
    startDate: daysAgo(180),
    endDate: null,
    notes: "To support gut health during ongoing antibiotic therapy.",
  },
];

// ── Symptom logs — 6 weeks, realistic PANDAS flare pattern ────────────────────
//
// Pattern:
//   Weeks 1–2  (days 41–28): Stable — low scores, good baseline
//   Weeks 3–4  (days 27–10): Flare — gradual onset, peak, sustained elevation
//   Weeks 5–6  (days  9– 0): Recovery — gradual improvement back toward baseline

const daily = [
  "demo-lib-1",
  "demo-lib-3",
]; // Augmentin + Probiotic taken most days
const dailyPlusIbu = ["demo-lib-1", "demo-lib-2", "demo-lib-3"]; // + Ibuprofen on bad days

export const DEMO_LOGS: SymptomLog[] = [
  // ── Stable period (weeks 1–2) ─────────────────────────────────────────────
  {
    id: "dl-41", date: daysAgo(41),
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 3, cognition: 4,
    medicationsTaken: daily,
  },
  {
    id: "dl-40", date: daysAgo(40),
    ocd: 2, anxiety: 1, rage: 1, tics: 1, sleep: 3, cognition: 4,
    medicationsTaken: daily,
  },
  {
    id: "dl-39", date: daysAgo(39),
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 3, cognition: 4,
    medicationsTaken: daily,
    notes:
      "Good day overall - Avery played soccer after school and was relaxed all evening. Hoping the stable stretch continues.",
  },
  {
    id: "dl-38", date: daysAgo(38),
    ocd: 1, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-36", date: daysAgo(36),
    ocd: 2, anxiety: 1, rage: 1, tics: 1, sleep: 3, cognition: 4,
    medicationsTaken: daily,
  },
  {
    id: "dl-35", date: daysAgo(35),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 3,
    medicationsTaken: daily,
    notes:
      "Some repetitive questioning before bed - asked if the front door was locked four times. Settled after reassurance.",
  },
  {
    id: "dl-34", date: daysAgo(34),
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 3, cognition: 4,
    medicationsTaken: daily,
  },
  {
    id: "dl-32", date: daysAgo(32),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-31", date: daysAgo(31),
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 3, cognition: 4,
    medicationsTaken: daily,
  },
  {
    id: "dl-29", date: daysAgo(29),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 3,
    medicationsTaken: daily,
  },
  // ── Building toward flare (late week 2 / week 3 onset) ───────────────────
  {
    id: "dl-28", date: daysAgo(28),
    ocd: 2, anxiety: 2, rage: 2, tics: 1, sleep: 3, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-27", date: daysAgo(27),
    ocd: 3, anxiety: 3, rage: 2, tics: 1, sleep: 2, cognition: 3,
    medicationsTaken: daily,
    notes:
      "Meltdown before school - couldn't get dressed for 45 minutes. This is very out of character for them. Calling the doctor tomorrow.",
  },
  {
    id: "dl-26", date: daysAgo(26),
    ocd: 3, anxiety: 3, rage: 2, tics: 2, sleep: 2, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-24", date: daysAgo(24),
    ocd: 3, anxiety: 4, rage: 2, tics: 2, sleep: 2, cognition: 2,
    medicationsTaken: daily,
    notes:
      "Woke up at 2am anxious, took almost an hour to settle. Dark circles under their eyes this morning. Exhausted.",
  },
  {
    id: "dl-23", date: daysAgo(23),
    ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 2, cognition: 2,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-22", date: daysAgo(22),
    ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 1, cognition: 2,
    medicationsTaken: dailyPlusIbu,
  },
  // ── Peak flare (week 3–4) ─────────────────────────────────────────────────
  {
    id: "dl-21", date: daysAgo(21),
    ocd: 4, anxiety: 5, rage: 3, tics: 3, sleep: 1, cognition: 1,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-20", date: daysAgo(20),
    ocd: 5, anxiety: 5, rage: 4, tics: 3, sleep: 1, cognition: 1,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-19", date: daysAgo(19),
    ocd: 5, anxiety: 5, rage: 4, tics: 3, sleep: 1, cognition: 1,
    medicationsTaken: dailyPlusIbu,
    notes:
      "OCD significantly elevated - checking locks, refusing to touch the car door handle, repeating rituals. Hard day for everyone.",
  },
  {
    id: "dl-18", date: daysAgo(18),
    ocd: 5, anxiety: 5, rage: 5, tics: 3, sleep: 1, cognition: 1,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-17", date: daysAgo(17),
    ocd: 5, anxiety: 5, rage: 5, tics: 3, sleep: 1, cognition: 1,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-16", date: daysAgo(16),
    ocd: 5, anxiety: 5, rage: 5, tics: 3, sleep: 1, cognition: 1,
    medicationsTaken: dailyPlusIbu,
    notes:
      "Worst day in months. Full rage episode lasted nearly 30 minutes over something small. Called the PANDAS helpline tonight.",
  },
  {
    id: "dl-15", date: daysAgo(15),
    ocd: 4, anxiety: 5, rage: 4, tics: 3, sleep: 1, cognition: 1,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-14", date: daysAgo(14),
    ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 2, cognition: 2,
    medicationsTaken: dailyPlusIbu,
  },
  // ── Recovery (week 5–6) ───────────────────────────────────────────────────
  {
    id: "dl-13", date: daysAgo(13),
    ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 2, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-12", date: daysAgo(12),
    ocd: 3, anxiety: 3, rage: 3, tics: 2, sleep: 2, cognition: 2,
    medicationsTaken: daily,
    notes:
      "Still not themselves, but slightly calmer. Teacher emailed - Avery is struggling to focus and seems 'far away' in class.",
  },
  {
    id: "dl-11", date: daysAgo(11),
    ocd: 3, anxiety: 3, rage: 2, tics: 2, sleep: 2, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-10", date: daysAgo(10),
    ocd: 3, anxiety: 3, rage: 2, tics: 2, sleep: 2, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-9", date: daysAgo(9),
    ocd: 2, anxiety: 3, rage: 2, tics: 2, sleep: 2, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-8", date: daysAgo(8),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 3,
    medicationsTaken: daily,
    notes:
      "Finished homework without a meltdown for the first time in two weeks. Ate a full dinner too. Small wins matter.",
  },
  {
    id: "dl-7", date: daysAgo(7),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-5", date: daysAgo(5),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-4", date: daysAgo(4),
    ocd: 1, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 4,
    medicationsTaken: daily,
    notes:
      "Much better day - laughed at their little sister's jokes at dinner for the first time in weeks. I actually cried after they went to bed.",
  },
  {
    id: "dl-2", date: daysAgo(2),
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 3, cognition: 4,
    medicationsTaken: daily,
  },
  {
    id: "dl-1", date: daysAgo(1),
    ocd: 1, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 4,
    medicationsTaken: daily,
    notes:
      "Mild OCD behaviors still present but energy and mood are returning. Cautiously optimistic. Follow-up with Dr. Chen this week.",
  },
];

// ── PTEC weekly check-ins — 6 weeks, consistent with daily log pattern ─────────
//
// Scale per subscale: 0=Absent 1=Minimal 2=Mild 3=Moderate 4=Significant 5=Severe 6=Extreme
// Total severity zones: 0–12 Mild · 13–30 Moderate · 31–50 Significant · 51–72 Severe
//
// Recovery profile by subscale (user-specified):
//   OCD + Anxiety         → slowest; peak 5, still 3 by week 6
//   Sleep                 → fastest; recovers to 1 by week 5
//   Food Intake           → slow/partial; reaches 2 at peak, 1 by week 6
//   Tics                  → mild-moderate peak 2, mostly resolve week 6
//   Cognitive/Dev         → moderate peak 3–4, gradual return
//   Sensory               → moderate peak 3, gradual
//   Behavior/Mood         → mirrors overall arc
//   Health (urinary)      → peaks week 3 (illness trigger), resolved week 5
//
// Weekly totals: 5 → 7 → 34 → 41 → 24 → 15  (Mild→Mild→Significant→Significant→Moderate→Moderate)

function ptec(
  week: number,
  scores: {
    ocdBehaviors: number; anxiety: number; emotionalLability: number; aggression: number;
    restrictiveEating: number; sleepDisturbance: number; urinarySymptoms: number;
    sensorySensitivities: number; tics: number; handwritingRegression: number;
    academicDecline: number; personalityChange: number;
  },
  note: string,
): PTECLog {
  // midpoint of each week (days-ago): 38, 31, 24, 17, 10, 3
  const midpoints = [38, 31, 24, 17, 10, 3];
  const weekStart = mondayOf(midpoints[week - 1]);
  return {
    id: `demo-ptec-w${week}`,
    weekStartDate: weekStart,
    date: addDays(weekStart, 4), // Friday of the same week
    scores,
    totalScore: computePTECTotal(scores),
    notes: note,
  };
}

export const DEMO_PTEC_LOGS: PTECLog[] = [
  // ── Week 1 · Stable baseline (total 5 — Mild) ─────────────────────────────
  ptec(1,
    { ocdBehaviors: 1, anxiety: 1, emotionalLability: 1, aggression: 0,
      restrictiveEating: 0, sleepDisturbance: 1, urinarySymptoms: 0,
      sensorySensitivities: 1, tics: 0, handwritingRegression: 0,
      academicDecline: 0, personalityChange: 0 },
    "Avery seems okay this week, a few rough mornings but manageable",
  ),

  // ── Week 2 · Stable, slight rigidity emerging (total 7 — Mild) ───────────
  ptec(2,
    { ocdBehaviors: 1, anxiety: 1, emotionalLability: 1, aggression: 0,
      restrictiveEating: 0, sleepDisturbance: 1, urinarySymptoms: 0,
      sensorySensitivities: 1, tics: 1, handwritingRegression: 0,
      academicDecline: 0, personalityChange: 1 },
    "Starting to notice more rigidity around routines, keeping an eye on it",
  ),

  // ── Week 3 · Flare onset + possible illness trigger (total 34 — Significant)
  ptec(3,
    { ocdBehaviors: 4, anxiety: 4, emotionalLability: 3, aggression: 3,
      restrictiveEating: 2, sleepDisturbance: 3, urinarySymptoms: 2,
      sensorySensitivities: 3, tics: 2, handwritingRegression: 2,
      academicDecline: 3, personalityChange: 3 },
    "OCD rituals around bedtime taking 2 hours, we are all depleted",
  ),

  // ── Week 4 · Peak flare (total 41 — Significant) ─────────────────────────
  ptec(4,
    { ocdBehaviors: 5, anxiety: 5, emotionalLability: 4, aggression: 4,
      restrictiveEating: 2, sleepDisturbance: 4, urinarySymptoms: 1,
      sensorySensitivities: 3, tics: 2, handwritingRegression: 3,
      academicDecline: 4, personalityChange: 4 },
    "Called the doctor, symptoms are getting worse not better. Stayed home from school again. Third day this week.",
  ),

  // ── Week 5 · Early recovery — sleep returns first (total 24 — Moderate) ──
  ptec(5,
    { ocdBehaviors: 4, anxiety: 4, emotionalLability: 2, aggression: 2,
      restrictiveEating: 2, sleepDisturbance: 1, urinarySymptoms: 0,
      sensorySensitivities: 2, tics: 1, handwritingRegression: 2,
      academicDecline: 2, personalityChange: 2 },
    "Slept through the night for the first time in three weeks, feel cautiously hopeful",
  ),

  // ── Week 6 · Continuing recovery — OCD/anxiety still elevated (total 15 — Moderate)
  ptec(6,
    { ocdBehaviors: 3, anxiety: 3, emotionalLability: 1, aggression: 1,
      restrictiveEating: 1, sleepDisturbance: 1, urinarySymptoms: 0,
      sensorySensitivities: 1, tics: 1, handwritingRegression: 1,
      academicDecline: 1, personalityChange: 1 },
    "Saw a glimmer of our real kid today, small win. Still not fully back but improving",
  ),
];

// ── Parent wellbeing check-ins — 90 days, emotional arc matching child symptom timeline ──

export const DEMO_WELLBEING_LOGS: WellbeingLog[] = [
  // ── Phase 1: Days 1–20 (daysAgo 89–70) — 60%, struggling but managing ──────
  { id: "dw-89", date: daysAgo(89), holding: 2, stress: 2, connected: 1, hardDay: false,
    notes: "I don't recognize my child anymore. It's been three weeks of this and I keep thinking I'm missing something obvious." },
  { id: "dw-87", date: daysAgo(87), holding: 3, stress: 2, connected: 1, hardDay: false },
  { id: "dw-86", date: daysAgo(86), holding: 2, stress: 2, connected: 2, hardDay: false },
  { id: "dw-84", date: daysAgo(84), holding: 2, stress: 3, connected: 1, hardDay: false },
  { id: "dw-82", date: daysAgo(82), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-80", date: daysAgo(80), holding: 2, stress: 2, connected: 1, hardDay: false,
    notes: "Another sleepless night. Sat with them for two hours. Called the pediatrician again — still no answers." },
  { id: "dw-78", date: daysAgo(78), holding: 3, stress: 2, connected: 2, hardDay: false },
  { id: "dw-76", date: daysAgo(76), holding: 2, stress: 2, connected: 1, hardDay: false },
  { id: "dw-74", date: daysAgo(74), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-72", date: daysAgo(72), holding: 2, stress: 2, connected: 2, hardDay: false },
  { id: "dw-71", date: daysAgo(71), holding: 3, stress: 3, connected: 1, hardDay: false,
    notes: "Starting to research this myself. Pediatrician finally suggested a specialist. Six week wait." },
  { id: "dw-70", date: daysAgo(70), holding: 2, stress: 2, connected: 2, hardDay: false },
  // ── Phase 2: Days 21–April 22 (daysAgo 69–28) — 70%, drifting 2–3, rare 4 ─
  { id: "dw-69", date: daysAgo(69), holding: 2, stress: 3, connected: 2, hardDay: false },
  { id: "dw-68", date: daysAgo(68), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-66", date: daysAgo(66), holding: 4, stress: 3, connected: 2, hardDay: false,
    notes: "Good call with my sister tonight. She just said 'you're doing everything right.' I needed that more than she knows." },
  { id: "dw-65", date: daysAgo(65), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-63", date: daysAgo(63), holding: 2, stress: 2, connected: 2, hardDay: false },
  { id: "dw-62", date: daysAgo(62), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-60", date: daysAgo(60), holding: 2, stress: 2, connected: 2, hardDay: false },
  { id: "dw-59", date: daysAgo(59), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-57", date: daysAgo(57), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-56", date: daysAgo(56), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-54", date: daysAgo(54), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-53", date: daysAgo(53), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-51", date: daysAgo(51), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-50", date: daysAgo(50), holding: 3, stress: 3, connected: 3, hardDay: false },
  { id: "dw-48", date: daysAgo(48), holding: 2, stress: 3, connected: 2, hardDay: false },
  { id: "dw-47", date: daysAgo(47), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-45", date: daysAgo(45), holding: 2, stress: 2, connected: 3, hardDay: false,
    notes: "I keep a notebook in my purse now with everything I notice. Date, time, what happened, what they ate, who they were around. I never thought I'd be this person." },
  { id: "dw-44", date: daysAgo(44), holding: 3, stress: 3, connected: 2, hardDay: false },
  { id: "dw-42", date: daysAgo(42), holding: 4, stress: 4, connected: 3, hardDay: false },
  { id: "dw-41", date: daysAgo(41), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-39", date: daysAgo(39), holding: 3, stress: 3, connected: 3, hardDay: false },
  { id: "dw-38", date: daysAgo(38), holding: 2, stress: 3, connected: 2, hardDay: false },
  { id: "dw-36", date: daysAgo(36), holding: 3, stress: 3, connected: 3, hardDay: false,
    notes: "Read about another family whose child fully recovered after 18 months. I screenshot it and look at it when things get bad." },
  { id: "dw-35", date: daysAgo(35), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-33", date: daysAgo(33), holding: 3, stress: 3, connected: 3, hardDay: false },
  { id: "dw-32", date: daysAgo(32), holding: 2, stress: 3, connected: 3, hardDay: false },
  { id: "dw-30", date: daysAgo(30), holding: 3, stress: 3, connected: 3, hardDay: false },
  { id: "dw-29", date: daysAgo(29), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-28", date: daysAgo(28), holding: 3, stress: 3, connected: 3, hardDay: false },
  // ── April 23–May 1 (daysAgo 27–19) — crisis, scores 1–2, hard days ──────────
  { id: "dw-27", date: daysAgo(27), holding: 1, stress: 1, connected: 2, hardDay: true,
    notes: "Day 4 of almost no sleep. Making mistakes at work. Can't tell anyone why." },
  { id: "dw-26", date: daysAgo(26), holding: 2, stress: 1, connected: 2, hardDay: true,
    notes: "Doctor appt tomorrow. Spent 2 hrs tonight organizing the tracker data into something I can actually show her. Terrified she won't take it seriously." },
  { id: "dw-25", date: daysAgo(25), holding: 1, stress: 1, connected: 2, hardDay: true },
  { id: "dw-24", date: daysAgo(24), holding: 1, stress: 1, connected: 2, hardDay: true,
    notes: "Avery had a moment today around 3pm where they just seemed like themselves. It lasted maybe 20 minutes. I sat on the floor of the bathroom afterward and cried." },
  { id: "dw-23", date: daysAgo(23), holding: 2, stress: 1, connected: 2, hardDay: true },
  { id: "dw-21", date: daysAgo(21), holding: 1, stress: 1, connected: 2, hardDay: true,
    notes: "My husband and I haven't really talked in two weeks. We're both just surviving." },
  { id: "dw-20", date: daysAgo(20), holding: 2, stress: 1, connected: 2, hardDay: true },
  { id: "dw-19", date: daysAgo(19), holding: 1, stress: 2, connected: 2, hardDay: true,
    notes: "Starting to wonder if I need to talk to someone. Not sure I have the bandwidth to even do that." },
  // ── May 2–8 (daysAgo 18–12) — uncertainty, brief lifts then back down ────────
  { id: "dw-18", date: daysAgo(18), holding: 3, stress: 2, connected: 3, hardDay: false,
    notes: "maybe? hard to tell. had one good hour this afternoon. don't want to get my hopes up" },
  { id: "dw-17", date: daysAgo(17), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-16", date: daysAgo(16), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-15", date: daysAgo(15), holding: 3, stress: 3, connected: 3, hardDay: false },
  { id: "dw-14", date: daysAgo(14), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-13", date: daysAgo(13), holding: 2, stress: 2, connected: 3, hardDay: false,
    notes: "Still watching every little thing. But slept 6 hours last night which honestly felt like a miracle." },
  { id: "dw-12", date: daysAgo(12), holding: 3, stress: 3, connected: 3, hardDay: false },
  // ── May 9–15 (daysAgo 11–5) — gradual uptick, cautious relief ──────────────
  { id: "dw-11", date: daysAgo(11), holding: 3, stress: 3, connected: 3, hardDay: false,
    notes: "starting to breathe again. slowly." },
  { id: "dw-10", date: daysAgo(10), holding: 2, stress: 2, connected: 3, hardDay: false },
  { id: "dw-8",  date: daysAgo(8),  holding: 3, stress: 3, connected: 4, hardDay: false },
  { id: "dw-7",  date: daysAgo(7),  holding: 3, stress: 3, connected: 3, hardDay: false },
  { id: "dw-6",  date: daysAgo(6),  holding: 3, stress: 3, connected: 4, hardDay: false },
  { id: "dw-5",  date: daysAgo(5),  holding: 3, stress: 3, connected: 3, hardDay: false },
  // ── May 16–19 (daysAgo 4–1) — better stretch, reconnection ─────────────────
  { id: "dw-4",  date: daysAgo(4),  holding: 4, stress: 4, connected: 4, hardDay: false,
    notes: "Three good days in a row. I keep waiting for the other shoe to drop but trying to be present in the good moments." },
  { id: "dw-2",  date: daysAgo(2),  holding: 3, stress: 3, connected: 4, hardDay: false,
    notes: "Found a PANS parent group online. Read through posts for hours. Not alone anymore. These people understand in a way no one else can." },
  { id: "dw-1",  date: daysAgo(1),  holding: 3, stress: 3, connected: 4, hardDay: false },
];

// ── Hope board — pre-saved affirmation indices ────────────────────────────────
// Indices into AFFIRMATIONS array in lib/affirmations.ts:
//   3 → "The fact that you are tracking, advocating, and fighting for answers is extraordinary parenting."
//   5 → "You did not cause this. You cannot always control it. But you are doing everything right."
//   6 → "Recovery is not linear, but it is real, and it happens every day for PANS families."
export const DEMO_HOPEBOARD_INDICES: number[] = [3, 5, 6];

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO-SPECIFIC DEMO DATA
// Four independent persona pathways for the demo scenario picker.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Exploring scenario — Sam, age 8 ───────────────────────────────────────────

export const DEMO_EXPLORING_BASELINE: ChildBaseline = {
  childName: "Sam",
  childAge: "8",
  description:
    "Sam is usually an easygoing, imaginative kid who loves drawing and playing outside. At baseline she is calm, sleeps well, and doing well in second grade.",
  sleepHours: "10",
  appetite: "Good — eats most things without fuss",
  activityLevel: "moderate",
  socialBehavior: "Shy at first but warms up quickly. Has one close best friend from school.",
  schoolPerformance: "On track — reading at grade level, strong in art. No behavioral concerns before now.",
  behavioralNotes:
    "No previous psychiatric history. Mild seasonal allergies. Otherwise very healthy. The sudden change began about three weeks ago.",
  lastUpdated: daysAgo(25),
};

// ── In-crisis scenario — Riley, age 7 ────────────────────────────────────────

export const DEMO_IN_CRISIS_BASELINE: ChildBaseline = {
  childName: "Riley",
  childAge: "7",
  description:
    "Riley is usually easygoing and imaginative. Three weeks ago she changed almost overnight — severe OCD around contamination, uncontrollable anxiety, and rage episodes unlike anything we have seen from her. We are in the middle of it right now.",
  sleepHours: "10",
  appetite: "Barely eating during the flare",
  activityLevel: "moderate",
  socialBehavior: "Isolated during flare — refusing to see friends.",
  schoolPerformance: "Missed several days this week. School is aware something is wrong.",
  behavioralNotes:
    "First flare. No prior psychiatric history. Had a sore throat about a week before symptoms started. Pediatrician visit scheduled for tomorrow.",
  lastUpdated: daysAgo(7),
};

// ── Exploring scenario — empty logs, no meds ─────────────────────────────────

export const DEMO_EXPLORING_LOGS: SymptomLog[] = [];
export const DEMO_EXPLORING_MEDICATIONS: Medication[] = [];
export const DEMO_EXPLORING_MED_LIBRARY: MedLibraryItem[] = [];

// ── In-crisis scenario — 3 days of severe logs ────────────────────────────────

export const DEMO_IN_CRISIS_LOGS: SymptomLog[] = [
  {
    id: "dc-6",
    date: daysAgo(6),
    ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 1, cognition: 1,
    notes:
      "First flare. Started Monday. Sore throat last week at school. The OCD is mostly around contamination — washing hands over and over, terrified to touch things. We had no idea this was coming.",
  },
  {
    id: "dc-4",
    date: daysAgo(4),
    ocd: 4, anxiety: 4, rage: 4, tics: 2, sleep: 1, cognition: 1,
  },
  {
    id: "dc-1",
    date: daysAgo(1),
    ocd: 4, anxiety: 3, rage: 3, tics: 2, sleep: 1, cognition: 2,
    notes:
      "Slightly less rage today but OCD around hand-washing is constant. Riley cried for an hour this morning because she touched the doorknob. This is not our child.",
  },
];

export const DEMO_IN_CRISIS_MEDICATIONS: Medication[] = [];
export const DEMO_IN_CRISIS_MED_LIBRARY: MedLibraryItem[] = [];

// ── Multi-child scenario — Mia (age 9) + Theo (age 6) ────────────────────────

export const DEMO_MULTI_CHILD_MIA_BASELINE: ChildBaseline = {
  childName: "Mia",
  childAge: "9",
  description:
    "Mia is usually bright, curious, and loves reading and gymnastics. At baseline she's chatty, sleeps well, and is a strong student. Her PANDAS diagnosis came after a strep infection 18 months ago.",
  sleepHours: "9",
  appetite: "Good — loves fruit and pasta, picky about vegetables",
  activityLevel: "moderate",
  socialBehavior: "Very social — has a close friend group and loves sleepovers.",
  schoolPerformance: "Strong student, reads above grade level. Teachers describe her as engaged and kind.",
  behavioralNotes:
    "PANDAS diagnosis confirmed 18 months ago. On prophylactic antibiotics. Has had two prior flares, both triggered by strep. Currently in a flare — started two weeks ago after school strep exposure.",
  lastUpdated: daysAgo(3),
};

export const DEMO_MULTI_CHILD_THEO_BASELINE: ChildBaseline = {
  childName: "Theo",
  childAge: "6",
  description:
    "Theo is usually a gentle, imaginative kid who loves trains and building things. He has been mostly typical developmentally. About three weeks ago we started noticing new motor tics and sudden separation anxiety that seem out of nowhere.",
  sleepHours: "10",
  appetite: "Good — eating normally",
  activityLevel: "moderate",
  socialBehavior: "Somewhat shy. Plays well with one or two kids at a time. Lately clingy at school drop-off.",
  schoolPerformance: "Doing fine academically. Teacher has noted new separation anxiety at morning drop-off.",
  behavioralNotes:
    "No prior psychiatric history. Had a strep throat confirmed by rapid test six weeks ago, treated with amoxicillin. New motor tics (eye blinking, shoulder shrug) and sudden separation anxiety began about three weeks ago — two to three weeks after the strep. Pediatrician visit next week.",
  lastUpdated: daysAgo(5),
};

// ── Mia's 21-day symptom logs — flare peaking around day 7 ───────────────────
// Pattern: stable baseline → onset → peak at daysAgo(7) → resolving now

export const DEMO_MULTI_CHILD_LOGS: SymptomLog[] = [
  // Pre-flare (daysAgo 20-15)
  { id: "dm-20", date: daysAgo(20), child_id: "demo-child-mia", ocd: 2, anxiety: 1, rage: 1, tics: 1, sleep: 4, cognition: 4 },
  { id: "dm-18", date: daysAgo(18), child_id: "demo-child-mia", ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 4, cognition: 4 },
  { id: "dm-16", date: daysAgo(16), child_id: "demo-child-mia", ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 3 },
  // Building (daysAgo 14-8)
  { id: "dm-14", date: daysAgo(14), child_id: "demo-child-mia", ocd: 3, anxiety: 3, rage: 2, tics: 1, sleep: 3, cognition: 3 },
  { id: "dm-12", date: daysAgo(12), child_id: "demo-child-mia", ocd: 4, anxiety: 3, rage: 3, tics: 2, sleep: 2, cognition: 2 },
  { id: "dm-10", date: daysAgo(10), child_id: "demo-child-mia", ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 2, cognition: 2 },
  { id: "dm-8",  date: daysAgo(8),  child_id: "demo-child-mia", ocd: 5, anxiety: 4, rage: 4, tics: 2, sleep: 1, cognition: 2 },
  // Peak — day 7 (OCD 5, anxiety 4, rage 4)
  {
    id: "dm-7", date: daysAgo(7), child_id: "demo-child-mia",
    ocd: 5, anxiety: 4, rage: 4, tics: 2, sleep: 1, cognition: 1,
    notes: "Strep exposure at school two weeks ago. Started antibiotics Monday.",
  },
  // Resolving (daysAgo 6-1)
  { id: "dm-6", date: daysAgo(6),  child_id: "demo-child-mia", ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 2, cognition: 2 },
  { id: "dm-5", date: daysAgo(5),  child_id: "demo-child-mia", ocd: 4, anxiety: 3, rage: 3, tics: 2, sleep: 2, cognition: 2 },
  { id: "dm-4", date: daysAgo(4),  child_id: "demo-child-mia", ocd: 3, anxiety: 3, rage: 2, tics: 1, sleep: 2, cognition: 3 },
  { id: "dm-3", date: daysAgo(3),  child_id: "demo-child-mia", ocd: 3, anxiety: 3, rage: 2, tics: 1, sleep: 3, cognition: 3 },
  { id: "dm-2", date: daysAgo(2),  child_id: "demo-child-mia", ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 3, cognition: 3 },
  { id: "dm-1", date: daysAgo(1),  child_id: "demo-child-mia", ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 4, cognition: 4 },
];

// Theo has no symptom logs (still in exploring/suspected stage)

// ── Multi-child scenario: distinct medications, med library, milestones, triggers

export const DEMO_MULTI_CHILD_MEDICATIONS: Medication[] = [
  // Mia — diagnosed 18 months ago, currently on prophylactic antibiotic
  {
    id: "dmc-med-1",
    child_id: "demo-child-mia",
    name: "Augmentin",
    dose: "500mg",
    frequency: "twice",
    type: "antibiotic",
    startDate: daysAgo(180),
    endDate: null,
    prescribingDoctor: "Dr. Chen",
    courseType: "prophylactic",
    notes: "Prophylactic — Mia has been on this since her PANDAS diagnosis 18 months ago.",
  },
  {
    id: "dmc-med-2",
    child_id: "demo-child-mia",
    name: "Ibuprofen",
    dose: "200mg",
    frequency: "as_needed",
    type: "other",
    startDate: daysAgo(180),
    endDate: null,
    notes: "As-needed during flares — helps reduce inflammation.",
  },
  {
    id: "dmc-med-3",
    child_id: "demo-child-mia",
    name: "Culturelle Probiotic",
    dose: "1 capsule",
    frequency: "once",
    type: "supplement",
    startDate: daysAgo(180),
    endDate: null,
    notes: "Gut support during long-term antibiotic therapy.",
  },
  // Theo — completed 10-day amoxicillin course; motor tics appeared 2–3 weeks after strep
  {
    id: "dmc-med-4",
    child_id: "demo-child-theo",
    name: "Amoxicillin",
    dose: "250mg",
    frequency: "twice",
    type: "antibiotic",
    startDate: daysAgo(51),
    endDate: daysAgo(41),
    prescribingDoctor: "Dr. Patel",
    courseType: "treatment",
    courseDays: 10,
    notes: "10-day course for confirmed strep throat. Completed. Motor tics appeared 2–3 weeks after infection.",
  },
];

export const DEMO_MULTI_CHILD_MED_LIBRARY: MedLibraryItem[] = [
  { id: "dmc-lib-1", child_id: "demo-child-mia", name: "Augmentin", dosage: "500mg", frequency: "twice" },
  { id: "dmc-lib-2", child_id: "demo-child-mia", name: "Ibuprofen", dosage: "200mg", frequency: "as_needed" },
  { id: "dmc-lib-3", child_id: "demo-child-mia", name: "Culturelle Probiotic", dosage: "1 capsule", frequency: "once" },
  { id: "dmc-lib-4", child_id: "demo-child-theo", name: "Amoxicillin", dosage: "250mg", frequency: "twice" },
];

export const DEMO_MULTI_CHILD_MILESTONES: Milestone[] = [
  // Mia
  {
    id: "dmc-ms-1",
    child_id: "demo-child-mia",
    date: daysAgo(-7),
    title: "Mia — PANDAS Immunologist Follow-up",
    type: "appointment",
    notes: "Follow-up with Dr. Chen to review current flare severity and discuss IVIG as a next step.",
    updatedAt: daysAgo(5),
  },
  {
    id: "dmc-ms-2",
    child_id: "demo-child-mia",
    date: daysAgo(14),
    title: "Mia — Strep Exposure Confirmed at School",
    type: "other",
    notes: "Teacher confirmed strep circulating in Mia's class. Flare symptoms began within 48 hours.",
    updatedAt: daysAgo(14),
  },
  {
    id: "dmc-ms-3",
    child_id: "demo-child-mia",
    date: daysAgo(180),
    title: "Mia — PANDAS Diagnosis",
    type: "appointment",
    notes: "Dr. Chen confirmed PANDAS. Started prophylactic Augmentin; referred to pediatric immunologist.",
    updatedAt: daysAgo(180),
  },
  // Theo
  {
    id: "dmc-ms-4",
    child_id: "demo-child-theo",
    date: daysAgo(-5),
    title: "Theo — Pediatrician (PANS Evaluation)",
    type: "appointment",
    notes: "First appointment to discuss new motor tics and separation anxiety. Will request ASO and anti-DNase B titers.",
    updatedAt: daysAgo(4),
  },
  {
    id: "dmc-ms-5",
    child_id: "demo-child-theo",
    date: daysAgo(20),
    title: "Theo — First Motor Tics Noticed",
    type: "other",
    notes: "Eye blinking and shoulder shrug tics appeared suddenly. New separation anxiety at school drop-off.",
    updatedAt: daysAgo(20),
  },
  {
    id: "dmc-ms-6",
    child_id: "demo-child-theo",
    date: daysAgo(41),
    title: "Theo — Strep Throat, Amoxicillin Started",
    type: "medication_change",
    notes: "Rapid strep positive. Dr. Patel prescribed 10-day amoxicillin. Tics began 2–3 weeks later.",
    updatedAt: daysAgo(41),
  },
];

export const DEMO_MULTI_CHILD_TRIGGERS: TriggerEntry[] = [
  // Mia
  {
    id: "dmc-tr-1",
    child_id: "demo-child-mia",
    category: "strep_exposure",
    date: daysAgo(14),
    notes: "Strep confirmed in Mia's classroom. Flare symptoms started within 2 days. Augmentin dose temporarily increased.",
    severity: "high",
    updatedAt: daysAgo(14),
  },
  {
    id: "dmc-tr-2",
    child_id: "demo-child-mia",
    category: "poor_sleep",
    date: daysAgo(5),
    notes: "Three nights of broken sleep during the flare — waking at 2–3am with anxiety.",
    severity: "medium",
    updatedAt: daysAgo(5),
  },
  // Theo
  {
    id: "dmc-tr-3",
    child_id: "demo-child-theo",
    category: "child_illness",
    date: daysAgo(42),
    notes: "Confirmed strep throat — rapid test positive. Treated with 10-day amoxicillin. New tics appeared 2–3 weeks after.",
    severity: "high",
    updatedAt: daysAgo(42),
  },
  {
    id: "dmc-tr-4",
    child_id: "demo-child-theo",
    category: "high_stress",
    date: daysAgo(18),
    notes: "Classroom teacher change. Theo was visibly distressed at drop-off for several days.",
    severity: "medium",
    updatedAt: daysAgo(18),
  },
];

// ── Journey states per scenario ───────────────────────────────────────────────

export const DEMO_JOURNEY_STATES: Record<"exploring" | "in_crisis" | "tracking" | "multi_child", JourneyState> = {
  exploring: {
    user_id: "demo",
    journey_stage: "exploring",
    journey_stage_set_at: daysAgo(3) + "T12:00:00.000Z",
    onboarding_completed: true,
    created_at: daysAgo(3) + "T12:00:00.000Z",
    updated_at: daysAgo(3) + "T12:00:00.000Z",
  },
  in_crisis: {
    user_id: "demo",
    journey_stage: "in_crisis",
    journey_stage_set_at: daysAgo(7) + "T12:00:00.000Z",
    onboarding_completed: true,
    created_at: daysAgo(7) + "T12:00:00.000Z",
    updated_at: daysAgo(7) + "T12:00:00.000Z",
  },
  tracking: {
    user_id: "demo",
    journey_stage: "tracking",
    journey_stage_set_at: daysAgo(120) + "T12:00:00.000Z",
    onboarding_completed: true,
    created_at: daysAgo(120) + "T12:00:00.000Z",
    updated_at: daysAgo(120) + "T12:00:00.000Z",
  },
  multi_child: {
    user_id: "demo",
    journey_stage: "tracking",
    journey_stage_set_at: daysAgo(180) + "T12:00:00.000Z",
    onboarding_completed: true,
    created_at: daysAgo(180) + "T12:00:00.000Z",
    updated_at: daysAgo(1) + "T12:00:00.000Z",
  },
};

// ── Report history seeds ──────────────────────────────────────────────────────

export const DEMO_REPORT_HISTORY: Record<"exploring" | "in_crisis" | "tracking" | "multi_child", ReportHistoryItem[]> = {
  exploring: [
    {
      id: "demo-rh-ex-1",
      variant: "first_appointment",
      visitDate: daysAgo(0),
      generatedAt: new Date().toISOString(),
      childName: "Sam",
    },
  ],
  in_crisis: [
    {
      id: "demo-rh-ic-1",
      variant: "first_appointment",
      visitDate: daysAgo(0),
      generatedAt: new Date().toISOString(),
      childName: "Riley",
    },
  ],
  tracking: [
    {
      id: "demo-rh-tr-1",
      variant: "follow_up",
      visitDate: daysAgo(14),
      generatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      childName: "Avery",
    },
  ],
  multi_child: [
    {
      id: "demo-rh-mc-1",
      variant: "follow_up",
      visitDate: daysAgo(14),
      generatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      childName: "Mia",
    },
    {
      id: "demo-rh-mc-2",
      variant: "follow_up",
      visitDate: daysAgo(45),
      generatedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      childName: "Mia",
    },
  ],
};

// ── Lab Results (tracking scenario: Avery's ASO trend Oct–Jan) ────────────────

export const DEMO_LAB_RESULTS: LabResult[] = [
  {
    id: "demo-lab-1",
    child_id: "demo-child-avery",
    date: "2025-10-15",
    test_name: "ASO",
    result_value: 800,
    result_unit: "IU/mL",
    reference_range: "< 200",
    lab_name: "Quest Diagnostics",
    notes: "Elevated — starting prophylactic amoxicillin",
    updatedAt: "2025-10-15T12:00:00.000Z",
  },
  {
    id: "demo-lab-2",
    child_id: "demo-child-avery",
    date: "2025-11-26",
    test_name: "ASO",
    result_value: 450,
    result_unit: "IU/mL",
    reference_range: "< 200",
    lab_name: "Quest Diagnostics",
    notes: "6 weeks on amoxicillin — trending down",
    updatedAt: "2025-11-26T12:00:00.000Z",
  },
  {
    id: "demo-lab-3",
    child_id: "demo-child-avery",
    date: "2026-01-21",
    test_name: "ASO",
    result_value: 210,
    result_unit: "IU/mL",
    reference_range: "< 200",
    lab_name: "Quest Diagnostics",
    notes: "Near normal — continuing prophylactic dose",
    updatedAt: "2026-01-21T12:00:00.000Z",
  },
];

// ── Demo Screener Results ─────────────────────────────────────────────────────

export const DEMO_SCREENER_RESULTS: Array<{
  id: string;
  user_id: string;
  child_id: string | null;
  answers: Record<string, unknown>;
  result_bucket: string;
  created_at: string;
  updated_at: string;
}> = [
  {
    id: "demo-screener-1",
    user_id: "demo",
    child_id: "demo-child-avery",
    answers: {
      ageAtOnset: "9",
      suddenOnset: "yes",
      symptomStartDate: "2025-10-01",
      ocdSymptoms: "yes",
      ocdDescription: "Repeated hand washing, contamination fears, checking rituals",
      foodRestriction: "yes",
      foodDescription: "Refuses most foods — only eating 4–5 safe foods",
      accompanyingSymptoms: [
        "Anxiety (new or sharply worsened)",
        "Irritability, aggression, or oppositional behavior",
        "Sleep disturbance",
        "Handwriting deterioration or loss of fine motor skills",
        "Tics (motor or vocal, new or worsened)",
      ],
      illnesses: ["Strep throat (in a sibling or household member)"],
      otherIllnessDescription: "",
      householdSick: "yes",
      alternativeDiagnosis: "no",
      alternativeDiagnosisDescription: "",
    },
    result_bucket: "strong_match",
    created_at: "2025-10-10T08:00:00.000Z",
    updated_at: "2025-10-10T08:00:00.000Z",
  },
  // ── Exploring: Sam (suspected, just started tracking) ────────────────────
  {
    id: "demo-screener-2",
    user_id: "demo",
    child_id: "demo-child-sam",
    answers: {
      ageAtOnset: "8",
      suddenOnset: "yes",
      symptomStartDate: daysAgo(10),
      ocdSymptoms: "no",
      foodRestriction: "no",
      accompanyingSymptoms: [
        "Anxiety (new or sharply worsened)",
        "Separation anxiety (new or dramatically worse)",
        "Sensory sensitivities (sound, light, clothing textures)",
      ],
      illnesses: ["Strep throat (my child had it)"],
      otherIllnessDescription: "Sore throat and low-grade fever about ten days ago — no strep test done.",
      householdSick: "no",
      alternativeDiagnosis: "no",
      alternativeDiagnosisDescription: "",
    },
    result_bucket: "possible_match",
    created_at: daysAgo(3) + "T09:00:00.000Z",
    updated_at: daysAgo(3) + "T09:00:00.000Z",
  },
  // ── In-crisis: Riley (undiagnosed, acute first flare) ────────────────────
  {
    id: "demo-screener-3",
    user_id: "demo",
    child_id: "demo-child-riley",
    answers: {
      ageAtOnset: "7",
      suddenOnset: "yes",
      symptomStartDate: daysAgo(7),
      ocdSymptoms: "yes",
      ocdDescription: "Contamination OCD — washing hands repeatedly, terrified to touch surfaces",
      foodRestriction: "yes",
      foodDescription: "Barely eating during the flare — refuses most foods",
      accompanyingSymptoms: [
        "Anxiety (new or sharply worsened)",
        "Irritability, aggression, or oppositional behavior",
        "Sleep disturbance",
        "Separation anxiety (new or dramatically worse)",
        "Urinary symptoms (frequency, urgency, or regression)",
      ],
      illnesses: ["Strep throat (in a sibling or household member)"],
      otherIllnessDescription: "Maya (sibling) had confirmed strep the week before Riley's symptoms started.",
      householdSick: "yes",
      alternativeDiagnosis: "no",
      alternativeDiagnosisDescription: "",
    },
    result_bucket: "strong_match",
    created_at: daysAgo(6) + "T21:00:00.000Z",
    updated_at: daysAgo(6) + "T21:00:00.000Z",
  },
  // ── Multi-child: Mia (diagnosed) ─────────────────────────────────────────
  {
    id: "demo-screener-4",
    user_id: "demo",
    child_id: "demo-child-mia",
    answers: {
      ageAtOnset: "7",
      suddenOnset: "yes",
      symptomStartDate: daysAgo(548),
      ocdSymptoms: "yes",
      ocdDescription: "Intrusive thoughts, compulsive reassurance-seeking, feared contamination",
      foodRestriction: "yes",
      foodDescription: "Dropped to 3–4 safe foods during first flare",
      accompanyingSymptoms: [
        "Anxiety (new or sharply worsened)",
        "Irritability, aggression, or oppositional behavior",
        "Sleep disturbance",
        "Tics (motor or vocal, new or worsened)",
        "Handwriting deterioration or loss of fine motor skills",
      ],
      illnesses: ["Strep throat (my child had it)", "Strep throat (in a sibling or household member)"],
      otherIllnessDescription: "",
      householdSick: "yes",
      alternativeDiagnosis: "no",
      alternativeDiagnosisDescription: "",
    },
    result_bucket: "strong_match",
    created_at: daysAgo(545) + "T10:00:00.000Z",
    updated_at: daysAgo(545) + "T10:00:00.000Z",
  },
  // ── Multi-child: Theo (suspected, exploring) ──────────────────────────────
  {
    id: "demo-screener-5",
    user_id: "demo",
    child_id: "demo-child-theo",
    answers: {
      ageAtOnset: "6",
      suddenOnset: "yes",
      symptomStartDate: daysAgo(20),
      ocdSymptoms: "no",
      foodRestriction: "no",
      accompanyingSymptoms: [
        "Tics (motor or vocal, new or worsened)",
        "Separation anxiety (new or dramatically worse)",
        "Anxiety (new or sharply worsened)",
      ],
      illnesses: ["Strep throat (my child had it)"],
      otherIllnessDescription: "Confirmed strep throat 6 weeks ago, treated with amoxicillin. New tics appeared 2–3 weeks later.",
      householdSick: "no",
      alternativeDiagnosis: "no",
      alternativeDiagnosisDescription: "",
    },
    result_bucket: "possible_match",
    created_at: daysAgo(18) + "T14:00:00.000Z",
    updated_at: daysAgo(18) + "T14:00:00.000Z",
  },
];

// ── Milestones per scenario ────────────────────────────────────────────────────

export const DEMO_MILESTONES: Record<"exploring" | "in_crisis" | "tracking" | "multi_child", Milestone[]> = {
  // Sam (suspected, 3 days of tracking — just starting out)
  exploring: [
    {
      id: "demo-ms-ex-1",
      date: daysAgo(3),
      title: "First symptoms logged",
      type: "other",
      notes: "Started tracking Sam's sudden behavior changes — new separation anxiety and sensory sensitivity. Noticed roughly 10 days ago.",
      updatedAt: daysAgo(3),
    },
    {
      id: "demo-ms-ex-2",
      date: daysAgo(-5),
      title: "Pediatrician — first visit about symptoms",
      type: "appointment",
      notes: "Upcoming appointment to discuss the sudden behavioral changes. Planning to ask about PANS/PANDAS and request strep titers.",
      updatedAt: daysAgo(1),
    },
  ],
  // Riley (undiagnosed, 7 days into acute first flare)
  in_crisis: [
    {
      id: "demo-ms-ic-1",
      date: daysAgo(10),
      title: "Sore throat and fever — possible trigger",
      type: "other",
      notes: "Riley had a sore throat and low-grade fever for two days. Sibling Maya had confirmed strep the week before. No strep test done for Riley yet.",
      updatedAt: daysAgo(10),
    },
    {
      id: "demo-ms-ic-2",
      date: daysAgo(7),
      title: "First severe neuropsychiatric symptoms",
      type: "other",
      notes: "Sudden-onset contamination OCD, uncontrollable anxiety, and rage episodes unlike anything we have seen. This is not our child.",
      updatedAt: daysAgo(7),
    },
    {
      id: "demo-ms-ic-3",
      date: daysAgo(-1),
      title: "Pediatrician — urgent evaluation",
      type: "appointment",
      notes: "Scheduled for tomorrow. Bringing symptom log and printed notes. Will ask about PANS/PANDAS, strep titers, and referral to specialist.",
      updatedAt: daysAgo(1),
    },
  ],
  // Avery (diagnosed 180 days ago, currently recovering from flare)
  tracking: [
    {
      id: "demo-ms-tr-1",
      date: daysAgo(180),
      title: "PANDAS Diagnosis — Dr. Chen",
      type: "appointment",
      notes: "PANDAS confirmed. Elevated ASO titers, sudden-onset OCD and anxiety after strep infection. Started prophylactic Augmentin and referred to pediatric immunologist.",
      updatedAt: daysAgo(180),
    },
    {
      id: "demo-ms-tr-2",
      date: daysAgo(180),
      title: "Started prophylactic Augmentin",
      type: "medication_change",
      notes: "500mg twice daily. Dr. Chen recommending long-term prophylaxis given severity of first episode.",
      updatedAt: daysAgo(180),
    },
    {
      id: "demo-ms-tr-3",
      date: daysAgo(60),
      title: "First symptom-free week",
      type: "other",
      notes: "Seven consecutive days with all scores at 1 or below. Avery went to a friend's sleepover for the first time since diagnosis. Cautiously celebrating.",
      updatedAt: daysAgo(60),
    },
    {
      id: "demo-ms-tr-4",
      date: daysAgo(27),
      title: "Strep exposure at school — flare onset",
      type: "other",
      notes: "Teacher confirmed strep circulating in Avery's classroom. Escalating symptoms started within 48 hours. Called Dr. Chen.",
      updatedAt: daysAgo(27),
    },
    {
      id: "demo-ms-tr-5",
      date: daysAgo(-5),
      title: "Dr. Chen follow-up",
      type: "appointment",
      notes: "Scheduled for next week to review the current flare, discuss whether the prophylactic dose is still adequate, and talk through next steps.",
      updatedAt: daysAgo(3),
    },
  ],
  multi_child: DEMO_MULTI_CHILD_MILESTONES,
};

// ── Triggers per scenario ──────────────────────────────────────────────────────

export const DEMO_TRIGGERS: Record<"exploring" | "in_crisis" | "tracking" | "multi_child", TriggerEntry[]> = {
  // Sam (suspected — recent illness + stress)
  exploring: [
    {
      id: "demo-tr-ex-1",
      category: "child_illness",
      date: daysAgo(10),
      notes: "Sam had a sore throat and low-grade fever for two days. No strep test done. New anxiety and sensory symptoms started 3–4 days after.",
      severity: "medium",
      updatedAt: daysAgo(10),
    },
    {
      id: "demo-tr-ex-2",
      category: "high_stress",
      date: daysAgo(20),
      notes: "Back to school after break — always a hard transition for Sam. More clingy and rigid than usual at drop-off.",
      severity: "low",
      updatedAt: daysAgo(20),
    },
  ],
  // Riley (in crisis — sibling strep → first flare)
  in_crisis: [
    {
      id: "demo-tr-ic-1",
      category: "strep_exposure",
      date: daysAgo(14),
      notes: "Sibling Maya had confirmed strep throat (rapid test positive). Maya was treated with amoxicillin. Riley's severe neuropsychiatric symptoms began about a week later.",
      severity: "high",
      updatedAt: daysAgo(14),
    },
    {
      id: "demo-tr-ic-2",
      category: "child_illness",
      date: daysAgo(10),
      notes: "Riley had a sore throat and fever for two days — possible secondary strep infection. No rapid test done at the time.",
      severity: "high",
      updatedAt: daysAgo(10),
    },
  ],
  // Avery (tracking — strep exposure triggered 6-week flare)
  tracking: [
    {
      id: "demo-tr-tr-1",
      category: "strep_exposure",
      date: daysAgo(27),
      notes: "Strep confirmed in Avery's classroom. Flare symptoms began escalating within 48 hours. Dr. Chen advised temporarily increasing Augmentin dose.",
      severity: "high",
      updatedAt: daysAgo(27),
    },
    {
      id: "demo-tr-tr-2",
      category: "poor_sleep",
      date: daysAgo(17),
      notes: "Five consecutive nights of broken sleep during peak flare — waking at 2–3am with anxiety and OCD rituals that could last over an hour.",
      severity: "medium",
      updatedAt: daysAgo(17),
    },
    {
      id: "demo-tr-tr-3",
      category: "high_stress",
      date: daysAgo(35),
      notes: "State testing week at school. Avery was already mildly elevated and the extra pressure worsened checking behaviors and morning rigidity.",
      severity: "low",
      updatedAt: daysAgo(35),
    },
  ],
  multi_child: DEMO_MULTI_CHILD_TRIGGERS,
};

// ── Lab results per scenario ───────────────────────────────────────────────────
// exploring: intentionally empty — Sam is a suspected child who started tracking
// 3 days ago. No labs have been ordered yet. This is a realistic reflection of
// the early exploring stage, not an oversight.

export const DEMO_ALL_LAB_RESULTS: Record<"exploring" | "in_crisis" | "tracking" | "multi_child", LabResult[]> = {
  exploring: [],
  // Riley (in_crisis): one urgent ASO titer ordered by the pediatrician after
  // the sibling's confirmed strep; result came back elevated.
  in_crisis: [
    {
      id: "demo-lab-ic-1",
      child_id: "demo-child-riley",
      date: daysAgo(3),
      test_name: "ASO",
      result_value: 680,
      result_unit: "IU/mL",
      reference_range: "< 200",
      lab_name: "Urgent Care Lab",
      notes: "Ordered after sudden neuropsychiatric symptom onset following sibling strep exposure. Result elevated — discussing with pediatrician at tomorrow's appointment.",
      updatedAt: daysAgo(3) + "T12:00:00.000Z",
    },
  ],
  tracking: DEMO_LAB_RESULTS,
  // Mia (diagnosed 18 months ago) + Theo (recent strep, suspected)
  multi_child: [
    {
      id: "demo-lab-mc-1",
      child_id: "demo-child-mia",
      date: daysAgo(548),
      test_name: "ASO",
      result_value: 920,
      result_unit: "IU/mL",
      reference_range: "< 200",
      lab_name: "Quest Diagnostics",
      notes: "Initial titer at PANDAS diagnosis — significantly elevated. Started prophylactic Augmentin same day.",
      updatedAt: daysAgo(548) + "T12:00:00.000Z",
    },
    {
      id: "demo-lab-mc-2",
      child_id: "demo-child-mia",
      date: daysAgo(360),
      test_name: "ASO",
      result_value: 310,
      result_unit: "IU/mL",
      reference_range: "< 200",
      lab_name: "Quest Diagnostics",
      notes: "6-month follow-up on prophylactic antibiotics — trending down but still above normal.",
      updatedAt: daysAgo(360) + "T12:00:00.000Z",
    },
    {
      id: "demo-lab-mc-3",
      child_id: "demo-child-mia",
      date: daysAgo(12),
      test_name: "ASO",
      result_value: 480,
      result_unit: "IU/mL",
      reference_range: "< 200",
      lab_name: "Quest Diagnostics",
      notes: "Ordered during current flare after strep classroom exposure. Elevated again — consistent with prior flare pattern.",
      updatedAt: daysAgo(12) + "T12:00:00.000Z",
    },
    {
      id: "demo-lab-mc-4",
      child_id: "demo-child-theo",
      date: daysAgo(45),
      test_name: "ASO",
      result_value: 580,
      result_unit: "IU/mL",
      reference_range: "< 200",
      lab_name: "Quest Diagnostics",
      notes: "Ordered by Dr. Patel after confirmed strep. Elevated. New motor tics appeared 2–3 weeks after infection. Discussing PANS at next visit.",
      updatedAt: daysAgo(45) + "T12:00:00.000Z",
    },
  ],
};

// ── Household health per scenario ─────────────────────────────────────────────

export const DEMO_HOUSEHOLD_HEALTH: Record<"exploring" | "in_crisis" | "tracking" | "multi_child", HouseholdIllness[]> = {
  // Sam: sibling had a sore throat the week before Sam's symptoms appeared
  exploring: [
    {
      id: "demo-hh-ex-1",
      memberName: "Jake (sibling)",
      illnessType: "Sore throat",
      startDate: daysAgo(14),
      endDate: daysAgo(10),
      notes: "Low-grade fever and sore throat. No strep test done. Sam's behavioral symptoms started about a week later.",
      updatedAt: daysAgo(14) + "T12:00:00.000Z",
    },
  ],
  // Riley: sibling had confirmed strep — suspected trigger for first flare
  in_crisis: [
    {
      id: "demo-hh-ic-1",
      memberName: "Maya (sibling)",
      illnessType: "Strep throat (confirmed)",
      startDate: daysAgo(14),
      endDate: daysAgo(9),
      notes: "Rapid strep positive at pediatrician's office. Treated with amoxicillin for 10 days. Riley's severe symptoms began approximately one week later.",
      updatedAt: daysAgo(14) + "T12:00:00.000Z",
    },
  ],
  // Avery: sibling had a sore throat days before the strep classroom exposure
  tracking: [
    {
      id: "demo-hh-tr-1",
      memberName: "Jordan (sibling)",
      illnessType: "Cold / sore throat",
      startDate: daysAgo(32),
      endDate: daysAgo(27),
      notes: "Sore throat and runny nose. No strep test — assumed viral. Avery's symptoms escalated around the same time strep was confirmed at school.",
      updatedAt: daysAgo(32) + "T12:00:00.000Z",
    },
  ],
  // Mia + Theo: Theo's confirmed strep + Mia's school strep exposure
  multi_child: [
    {
      id: "demo-hh-mc-1",
      memberName: "Theo",
      illnessType: "Strep throat (confirmed)",
      startDate: daysAgo(51),
      endDate: daysAgo(41),
      notes: "Rapid strep positive at Dr. Patel's office. Treated with 10-day amoxicillin. New motor tics appeared 2–3 weeks after infection.",
      updatedAt: daysAgo(51) + "T12:00:00.000Z",
    },
    {
      id: "demo-hh-mc-2",
      memberName: "Mia (school exposure)",
      illnessType: "Strep exposure",
      startDate: daysAgo(14),
      notes: "Strep confirmed circulating in Mia's classroom. Mia's flare symptoms started within 48 hours of exposure.",
      updatedAt: daysAgo(14) + "T12:00:00.000Z",
    },
  ],
};
