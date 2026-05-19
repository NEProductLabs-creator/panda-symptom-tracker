// DEMO_DATA: update this dataset to reflect latest app features before sharing portfolio

import type { SymptomLog, ChildBaseline, Medication, MedLibraryItem } from "@/lib/types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
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
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 2, cognition: 1,
    medicationsTaken: daily,
  },
  {
    id: "dl-40", date: daysAgo(40),
    ocd: 2, anxiety: 1, rage: 1, tics: 1, sleep: 2, cognition: 1,
    medicationsTaken: daily,
  },
  {
    id: "dl-39", date: daysAgo(39),
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 2, cognition: 1,
    medicationsTaken: daily,
    notes:
      "Good day overall — Alex played soccer after school and was relaxed all evening. Hoping the stable stretch continues.",
  },
  {
    id: "dl-38", date: daysAgo(38),
    ocd: 1, anxiety: 2, rage: 1, tics: 1, sleep: 2, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-36", date: daysAgo(36),
    ocd: 2, anxiety: 1, rage: 1, tics: 1, sleep: 2, cognition: 1,
    medicationsTaken: daily,
  },
  {
    id: "dl-35", date: daysAgo(35),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 2, cognition: 2,
    medicationsTaken: daily,
    notes:
      "Some repetitive questioning before bed — asked if the front door was locked four times. Settled after reassurance.",
  },
  {
    id: "dl-34", date: daysAgo(34),
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 2, cognition: 1,
    medicationsTaken: daily,
  },
  {
    id: "dl-32", date: daysAgo(32),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 2, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-31", date: daysAgo(31),
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 2, cognition: 1,
    medicationsTaken: daily,
  },
  {
    id: "dl-29", date: daysAgo(29),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 2, cognition: 2,
    medicationsTaken: daily,
  },
  // ── Building toward flare (late week 2 / week 3 onset) ───────────────────
  {
    id: "dl-28", date: daysAgo(28),
    ocd: 2, anxiety: 2, rage: 2, tics: 1, sleep: 2, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-27", date: daysAgo(27),
    ocd: 3, anxiety: 3, rage: 2, tics: 1, sleep: 3, cognition: 2,
    medicationsTaken: daily,
    notes:
      "Meltdown before school — couldn't get dressed for 45 minutes. This is very out of character for him. Calling the doctor tomorrow.",
  },
  {
    id: "dl-26", date: daysAgo(26),
    ocd: 3, anxiety: 3, rage: 2, tics: 2, sleep: 3, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-24", date: daysAgo(24),
    ocd: 3, anxiety: 4, rage: 2, tics: 2, sleep: 3, cognition: 3,
    medicationsTaken: daily,
    notes:
      "Woke up at 2am anxious, took almost an hour to settle. Dark circles under his eyes this morning. Exhausted.",
  },
  {
    id: "dl-23", date: daysAgo(23),
    ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 3, cognition: 3,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-22", date: daysAgo(22),
    ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 4, cognition: 3,
    medicationsTaken: dailyPlusIbu,
  },
  // ── Peak flare (week 3–4) ─────────────────────────────────────────────────
  {
    id: "dl-21", date: daysAgo(21),
    ocd: 4, anxiety: 5, rage: 3, tics: 3, sleep: 4, cognition: 4,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-20", date: daysAgo(20),
    ocd: 5, anxiety: 5, rage: 4, tics: 3, sleep: 4, cognition: 4,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-19", date: daysAgo(19),
    ocd: 5, anxiety: 5, rage: 4, tics: 3, sleep: 4, cognition: 4,
    medicationsTaken: dailyPlusIbu,
    notes:
      "OCD significantly elevated — checking locks, refusing to touch the car door handle, repeating rituals. Hard day for everyone.",
  },
  {
    id: "dl-18", date: daysAgo(18),
    ocd: 5, anxiety: 5, rage: 5, tics: 3, sleep: 4, cognition: 4,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-17", date: daysAgo(17),
    ocd: 5, anxiety: 5, rage: 5, tics: 3, sleep: 4, cognition: 4,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-16", date: daysAgo(16),
    ocd: 5, anxiety: 5, rage: 5, tics: 3, sleep: 4, cognition: 4,
    medicationsTaken: dailyPlusIbu,
    notes:
      "Worst day in months. Full rage episode lasted nearly 30 minutes over something small. Called the PANDAS helpline tonight.",
  },
  {
    id: "dl-15", date: daysAgo(15),
    ocd: 4, anxiety: 5, rage: 4, tics: 3, sleep: 4, cognition: 4,
    medicationsTaken: dailyPlusIbu,
  },
  {
    id: "dl-14", date: daysAgo(14),
    ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 3, cognition: 3,
    medicationsTaken: dailyPlusIbu,
  },
  // ── Recovery (week 5–6) ───────────────────────────────────────────────────
  {
    id: "dl-13", date: daysAgo(13),
    ocd: 4, anxiety: 4, rage: 3, tics: 2, sleep: 3, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-12", date: daysAgo(12),
    ocd: 3, anxiety: 3, rage: 3, tics: 2, sleep: 3, cognition: 3,
    medicationsTaken: daily,
    notes:
      "Still not himself, but slightly calmer. Teacher emailed — Alex is struggling to focus and seems 'far away' in class.",
  },
  {
    id: "dl-11", date: daysAgo(11),
    ocd: 3, anxiety: 3, rage: 2, tics: 2, sleep: 3, cognition: 3,
    medicationsTaken: daily,
  },
  {
    id: "dl-10", date: daysAgo(10),
    ocd: 3, anxiety: 3, rage: 2, tics: 2, sleep: 3, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-9", date: daysAgo(9),
    ocd: 2, anxiety: 3, rage: 2, tics: 2, sleep: 3, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-8", date: daysAgo(8),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 2, cognition: 2,
    medicationsTaken: daily,
    notes:
      "Finished homework without a meltdown for the first time in two weeks. Ate a full dinner too. Small wins matter.",
  },
  {
    id: "dl-7", date: daysAgo(7),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 2, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-5", date: daysAgo(5),
    ocd: 2, anxiety: 2, rage: 1, tics: 1, sleep: 2, cognition: 2,
    medicationsTaken: daily,
  },
  {
    id: "dl-4", date: daysAgo(4),
    ocd: 1, anxiety: 2, rage: 1, tics: 1, sleep: 2, cognition: 1,
    medicationsTaken: daily,
    notes:
      "Much better day — laughed at his little sister's jokes at dinner for the first time in weeks. I actually cried after he went to bed.",
  },
  {
    id: "dl-2", date: daysAgo(2),
    ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 2, cognition: 1,
    medicationsTaken: daily,
  },
  {
    id: "dl-1", date: daysAgo(1),
    ocd: 1, anxiety: 2, rage: 1, tics: 1, sleep: 2, cognition: 1,
    medicationsTaken: daily,
    notes:
      "Mild OCD behaviors still present but energy and mood are returning. Cautiously optimistic. Follow-up with Dr. Chen this week.",
  },
];
