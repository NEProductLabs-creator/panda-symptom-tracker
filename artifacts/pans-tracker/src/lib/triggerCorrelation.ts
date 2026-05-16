import { format, subDays, addDays, parseISO } from "date-fns";
import { TriggerEntry, TriggerCategory, SymptomLog } from "./types";
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
