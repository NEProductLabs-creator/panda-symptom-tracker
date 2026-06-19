import { format, subDays, addDays, parseISO } from "date-fns";
import { TriggerEntry, TriggerCategory, SymptomLog, Medication } from "./types";
import { computeDailyScore } from "./flare";

const WINDOW_DAYS = 7;
const INCREASE_MIN_ABSOLUTE = 2; // at least 2 pts on 0–30 scale
const INCREASE_MIN_RATIO = 1.15; // and at least 15% above baseline

export type TriggerCorrelation = {
  triggerId: string;
  triggerDate: string;
  category: TriggerCategory;
  beforeAvg: number | null;
  afterAvg: number | null;
  beforeDaysLogged: number;
  afterDaysLogged: number;
  hasEnoughData: boolean; // both windows have ≥1 day of data
  hasSignificantIncrease: boolean;
  changeAmount: number | null; // afterAvg - beforeAvg
};

export type PatternInsight = {
  hasPattern: boolean;
  message: string | null;
  totalWithData: number;
  totalWithIncrease: number;
};

function windowAvg(
  centerDate: string,
  direction: "before" | "after",
  logMap: Map<string, SymptomLog>
): { avg: number | null; count: number } {
  const center = parseISO(centerDate);
  let total = 0;
  let count = 0;
  for (let i = 1; i <= WINDOW_DAYS; i++) {
    const d = format(
      direction === "before" ? subDays(center, i) : addDays(center, i),
      "yyyy-MM-dd"
    );
    const log = logMap.get(d);
    if (log) {
      total += computeDailyScore(log);
      count++;
    }
  }
  return { avg: count > 0 ? total / count : null, count };
}

export function computeTriggerCorrelations(
  triggers: TriggerEntry[],
  logs: SymptomLog[]
): TriggerCorrelation[] {
  const logMap = new Map(logs.map((l) => [l.date, l]));

  return triggers.map((t) => {
    const before = windowAvg(t.date, "before", logMap);
    const after = windowAvg(t.date, "after", logMap);
    const hasEnoughData = before.count >= 1 && after.count >= 1;

    let hasSignificantIncrease = false;
    let changeAmount: number | null = null;

    if (before.avg !== null && after.avg !== null) {
      changeAmount = after.avg - before.avg;
      hasSignificantIncrease =
        changeAmount >= INCREASE_MIN_ABSOLUTE &&
        (before.avg === 0 || after.avg >= before.avg * INCREASE_MIN_RATIO);
    }

    return {
      triggerId: t.id,
      triggerDate: t.date,
      category: t.category,
      beforeAvg: before.avg,
      afterAvg: after.avg,
      beforeDaysLogged: before.count,
      afterDaysLogged: after.count,
      hasEnoughData,
      hasSignificantIncrease,
      changeAmount,
    };
  });
}

const CATEGORY_PLAIN: Record<TriggerCategory, string> = {
  strep_exposure: "strep exposure events",
  child_illness: "child illness events",
  household_illness: "household illness events",
  vaccination: "vaccinations",
  high_stress: "high stress events",
  dietary_change: "dietary changes",
  poor_sleep: "poor sleep periods",
  seasonal_weather: "seasonal or weather changes",
  other: "other trigger events",
};

export function computePatternInsight(
  correlations: TriggerCorrelation[]
): PatternInsight {
  const withData = correlations.filter((c) => c.hasEnoughData);
  const withIncrease = withData.filter((c) => c.hasSignificantIncrease);

  const base = {
    totalWithData: withData.length,
    totalWithIncrease: withIncrease.length,
  };

  if (withData.length < 2) {
    return { hasPattern: false, message: null, ...base };
  }

  // Count by category
  const cat: Partial<Record<TriggerCategory, { total: number; increase: number }>> = {};
  withData.forEach((c) => {
    if (!cat[c.category]) cat[c.category] = { total: 0, increase: 0 };
    cat[c.category]!.total++;
    if (c.hasSignificantIncrease) cat[c.category]!.increase++;
  });

  // Best category: most increases, must be ≥2
  let bestCat: TriggerCategory | null = null;
  let bestCount = 1;
  (Object.entries(cat) as [TriggerCategory, { total: number; increase: number }][]).forEach(
    ([k, v]) => {
      if (v.increase > bestCount) {
        bestCat = k;
        bestCount = v.increase;
      }
    }
  );

  if (bestCat) {
    const { increase, total } = cat[bestCat]!;
    return {
      hasPattern: true,
      message: `${increase} of your last ${total} ${CATEGORY_PLAIN[bestCat]} were followed by a symptom increase within 7 days.`,
      ...base,
    };
  }

  // General pattern (50%+ of all triggers correlated)
  if (withIncrease.length >= 2 && withIncrease.length >= Math.ceil(withData.length * 0.5)) {
    return {
      hasPattern: true,
      message: `${withIncrease.length} of your ${withData.length} logged triggers were followed by a symptom increase. This pattern may be worth discussing with your doctor.`,
      ...base,
    };
  }

  return { hasPattern: false, message: null, ...base };
}

// ── Per-symptom trigger insights ──────────────────────────────────────────────

export const SYMPTOM_INSIGHT_LABELS: Record<'ocd' | 'anxiety' | 'rage' | 'tics', string> = {
  ocd: 'OCD symptoms',
  anxiety: 'anxiety',
  rage: 'rage',
  tics: 'tic activity',
};

export const TRIGGER_CATEGORY_LABELS: Record<TriggerCategory, string> = {
  strep_exposure: 'Strep exposures',
  child_illness: 'Child illness events',
  household_illness: 'Household illness events',
  vaccination: 'Vaccinations',
  high_stress: 'High-stress events',
  dietary_change: 'Dietary changes',
  poor_sleep: 'Poor sleep periods',
  seasonal_weather: 'Seasonal or weather changes',
  other: 'Trigger events',
};

const BEHAVIORAL_SYMPTOMS = ['ocd', 'anxiety', 'rage', 'tics'] as const;
type BehavioralSymptom = (typeof BEHAVIORAL_SYMPTOMS)[number];

export type TriggerInsightLine = {
  category: TriggerCategory;
  symptom: BehavioralSymptom;
  avgDelta: number; // mean delta on 0–5 per-symptom scale
  count: number;    // number of triggers in this category
};

/**
 * Groups triggers by category, then finds which behavioral symptom
 * shows the largest mean increase in the 7-day window after each trigger.
 * Returns up to 2 insights sorted by avgDelta descending.
 */
export function getTopTriggerCorrelations(
  logs: SymptomLog[],
  triggers: TriggerEntry[],
): TriggerInsightLine[] {
  if (logs.length < 10 || triggers.length < 2) return [];

  const logMap = new Map(logs.map((l) => [l.date, l]));
  const MIN_DELTA = 1.0;
  const MIN_WITH_DATA = 2;

  const byCategory = new Map<TriggerCategory, TriggerEntry[]>();
  for (const t of triggers) {
    const arr = byCategory.get(t.category) ?? [];
    arr.push(t);
    byCategory.set(t.category, arr);
  }

  const insights: TriggerInsightLine[] = [];

  for (const [category, catTriggers] of byCategory) {
    if (catTriggers.length < 2) continue;

    const deltas: Record<BehavioralSymptom, number[]> = {
      ocd: [], anxiety: [], rage: [], tics: [],
    };

    for (const t of catTriggers) {
      const center = parseISO(t.date);

      for (const sym of BEHAVIORAL_SYMPTOMS) {
        const before: number[] = [];
        const after: number[] = [];

        for (let i = 1; i <= WINDOW_DAYS; i++) {
          const bd = format(subDays(center, i), 'yyyy-MM-dd');
          const ad = format(addDays(center, i), 'yyyy-MM-dd');
          const bLog = logMap.get(bd);
          const aLog = logMap.get(ad);
          if (bLog && bLog[sym] !== null) before.push(bLog[sym] as number);
          if (aLog && aLog[sym] !== null) after.push(aLog[sym] as number);
        }

        if (before.length >= 1 && after.length >= 1) {
          const ba = before.reduce((a, b) => a + b, 0) / before.length;
          const aa = after.reduce((a, b) => a + b, 0) / after.length;
          deltas[sym].push(aa - ba);
        }
      }
    }

    let bestSym: BehavioralSymptom | null = null;
    let bestDelta = MIN_DELTA;

    for (const sym of BEHAVIORAL_SYMPTOMS) {
      const d = deltas[sym];
      if (d.length < MIN_WITH_DATA) continue;
      const mean = d.reduce((a, b) => a + b, 0) / d.length;
      if (mean > bestDelta) { bestDelta = mean; bestSym = sym; }
    }

    if (bestSym !== null) {
      insights.push({ category, symptom: bestSym, avgDelta: bestDelta, count: catTriggers.length });
    }
  }

  return insights.sort((a, b) => b.avgDelta - a.avgDelta).slice(0, 2);
}

// ── Medication before/after insights ─────────────────────────────────────────

export type MedInsightLine = {
  medName: string;
  startDate: string; // YYYY-MM-DD
  beforeAvg: number; // mean per-symptom severity (0–5) in 14 days before
  afterAvg: number;  // mean per-symptom severity (0–5) in 14 days after
  improvement: number; // beforeAvg - afterAvg (positive = got better)
};

const MED_WINDOW = 14;
const MED_MIN_LOGS = 3;
const MED_MIN_IMPROVEMENT = 1.0;

/**
 * For each medication with a startDate, computes average daily severity
 * (computeDailyScore / 6, giving a 0–5 scale) in the 14 days before and after.
 * Returns up to 1 result for the medication with the greatest improvement.
 */
export function getMedInsights(
  logs: SymptomLog[],
  medications: Medication[],
): MedInsightLine[] {
  if (logs.length < MED_MIN_LOGS * 2) return [];

  const logMap = new Map(logs.map((l) => [l.date, l]));
  const results: MedInsightLine[] = [];

  for (const med of medications) {
    if (!med.startDate) continue;
    const center = parseISO(med.startDate);

    const beforeVals: number[] = [];
    const afterVals: number[] = [];

    for (let i = 1; i <= MED_WINDOW; i++) {
      const bd = format(subDays(center, i), 'yyyy-MM-dd');
      const ad = format(addDays(center, i), 'yyyy-MM-dd');
      const bLog = logMap.get(bd);
      const aLog = logMap.get(ad);
      if (bLog) beforeVals.push(computeDailyScore(bLog) / 6);
      if (aLog) afterVals.push(computeDailyScore(aLog) / 6);
    }

    if (beforeVals.length < MED_MIN_LOGS || afterVals.length < MED_MIN_LOGS) continue;

    const beforeAvg = beforeVals.reduce((a, b) => a + b, 0) / beforeVals.length;
    const afterAvg = afterVals.reduce((a, b) => a + b, 0) / afterVals.length;
    const improvement = beforeAvg - afterAvg;

    if (improvement >= MED_MIN_IMPROVEMENT) {
      results.push({ medName: med.name, startDate: med.startDate, beforeAvg, afterAvg, improvement });
    }
  }

  return results.sort((a, b) => b.improvement - a.improvement).slice(0, 1);
}
