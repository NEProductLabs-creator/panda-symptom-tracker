// DEMO_DATA: update this dataset to reflect latest app features before sharing portfolio

import type { SymptomLog, ChildBaseline, Medication, MedLibraryItem, PTECLog } from "@/lib/types";
import { computePTECTotal } from "@/lib/ptec";

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

// ── Child profile ─────────────────────────────────────────────────────────────

export const DEMO_BASELINE: ChildBaseline = {
  childName: "Alex",
  childAge: "8",
  description:
    "Alex is usually curious, playful, and loves Lego and soccer. At baseline he's calm, sleeps well, and excels at school.",
  sleepHours: "9",
  appetite: "Good — eats most foods without fuss",
  activityLevel: "moderate",
  socialBehavior: "Very social. Loves playing with friends and his younger sister.",
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
    notes: "Prophylactic antibiotic — maintaining dose since PANDAS diagnosis.",
  },
  {
    id: "demo-med-2",
    name: "Ibuprofen",
    dose: "200mg",
    frequency: "as_needed",
    type: "other",
    startDate: daysAgo(180),
    endDate: null,
    notes: "As-needed for flares — anti-inflammatory effect helps reduce severity.",
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
      "Good day overall — Alex played soccer after school and was relaxed all evening. Hoping the stable stretch continues.",
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
      "Some repetitive questioning before bed — asked if the front door was locked four times. Settled after reassurance.",
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
      "Meltdown before school — couldn't get dressed for 45 minutes. This is very out of character for him. Calling the doctor tomorrow.",
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
      "Woke up at 2am anxious, took almost an hour to settle. Dark circles under his eyes this morning. Exhausted.",
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
      "OCD significantly elevated — checking locks, refusing to touch the car door handle, repeating rituals. Hard day for everyone.",
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
      "Still not himself, but slightly calmer. Teacher emailed — Alex is struggling to focus and seems 'far away' in class.",
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
      "Much better day — laughed at his little sister's jokes at dinner for the first time in weeks. I actually cried after he went to bed.",
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
    "Alex seems okay this week, a few rough mornings but manageable",
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
