import { SymptomLog } from './types';
import { format, subDays, parseISO } from 'date-fns';

export function computeDailyScore(log: SymptomLog): number {
  // Canonical score scale: 0 (none/poor) to 5 (extreme/excellent).
  // sleep and cognition use an inverted scale (higher = better),
  // so we invert them before summing to get a proper severity contribution.
  // Null means "not entered" — treated as 0 (best-case) for scoring so that
  // partial logs don't inflate the severity score unfairly.
  const ocd = log.ocd ?? 0;
  const anxiety = log.anxiety ?? 0;
  const rage = log.rage ?? 0;
  const tics = log.tics ?? 0;
  const sleep = log.sleep ?? 0;
  const cognition = log.cognition ?? 0;
  return ocd + anxiety + rage + tics + (5 - sleep) + (5 - cognition);
}

export interface FlarePeriod {
  startDate: string;
  endDate: string;
  peakScore: number;
  durationDays: number;
}

export interface FlareStatus {
  isActive: boolean;
  startDate: string | null;
  consecutiveDays: number;
  todayScore: number;
  sevenDayAvg: number;
}

function buildScoreMap(logs: SymptomLog[]): Map<string, number> {
  return new Map(logs.map((l) => [l.date, computeDailyScore(l)]));
}

function getRolling7Avg(dateStr: string, scoreMap: Map<string, number>): number {
  const scores: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = format(subDays(parseISO(dateStr), i), 'yyyy-MM-dd');
    const s = scoreMap.get(d);
    if (s !== undefined) scores.push(s);
  }
  if (scores.length < 2) return -1;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function isFlareDayFn(
  dateStr: string,
  scoreMap: Map<string, number>
): boolean {
  const score = scoreMap.get(dateStr);
  if (score === undefined || score <= 4) return false; // ignore near-zero days
  const avg = getRolling7Avg(dateStr, scoreMap);
  if (avg < 0) return false;
  return score >= avg * 1.3;
}

export function detectCurrentFlare(logs: SymptomLog[]): FlareStatus {
  if (logs.length < 3) {
    return { isActive: false, startDate: null, consecutiveDays: 0, todayScore: 0, sevenDayAvg: 0 };
  }

  const scoreMap = buildScoreMap(logs);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  let streak = 0;
  let streakStart = todayStr;

  for (let i = 0; i <= 60; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    if (isFlareDayFn(d, scoreMap)) {
      if (streak === 0 || i === streak) {
        streak++;
        streakStart = d;
      } else {
        break;
      }
    } else {
      if (i === 0) break; // today not a flare day, no active flare
      break;
    }
  }

  const todayScore = scoreMap.get(todayStr) ?? 0;
  const avg = getRolling7Avg(todayStr, scoreMap);

  return {
    isActive: streak >= 2,
    startDate: streak >= 2 ? streakStart : null,
    consecutiveDays: streak,
    todayScore,
    sevenDayAvg: avg >= 0 ? avg : 0,
  };
}

export function computeFlareHistory(logs: SymptomLog[]): FlarePeriod[] {
  if (logs.length < 3) return [];

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const scoreMap = buildScoreMap(logs);
  const periods: FlarePeriod[] = [];

  let inFlare = false;
  let flareStart = '';
  let peakScore = 0;
  let flareDays = 0;
  let consecutiveCount = 0;
  let prevWasFlare = false;

  for (const log of sorted) {
    const isFlare = isFlareDayFn(log.date, scoreMap);
    const score = computeDailyScore(log);

    if (isFlare) {
      consecutiveCount++;
      if (consecutiveCount === 2 && !inFlare) {
        inFlare = true;
        const idx = sorted.indexOf(log);
        flareStart = idx > 0 ? sorted[idx - 1].date : log.date;
        peakScore = Math.max(score, computeDailyScore(sorted[Math.max(0, sorted.indexOf(log) - 1)]));
        flareDays = 2;
      } else if (inFlare) {
        peakScore = Math.max(peakScore, score);
        flareDays++;
      }
    } else {
      if (inFlare) {
        periods.push({ startDate: flareStart, endDate: log.date, peakScore, durationDays: flareDays });
      }
      inFlare = false;
      consecutiveCount = 0;
      peakScore = 0;
      flareDays = 0;
    }
    prevWasFlare = isFlare;
  }

  if (inFlare) {
    periods.push({
      startDate: flareStart,
      endDate: format(new Date(), 'yyyy-MM-dd'),
      peakScore,
      durationDays: flareDays,
    });
  }

  return periods.reverse();
}

// Green-to-red scale. No log = light green (good day assumption).
export function getHeatColor(score: number, hasLog: boolean): string {
  if (!hasLog) return '#dcfce7'; // No log → assumed good day (light green)
  if (score === 0) return '#bbf7d0'; // Confirmed symptom-free
  if (score <= 9) return '#86efac'; // Mild (0-1 avg per symptom)
  if (score <= 18) return '#fde68a'; // Moderate (2-3 avg)
  if (score <= 24) return '#fdba74'; // Significant (4-5 avg)
  return '#f87171'; // Severe (6+ avg)
}

export function getHeatLabel(score: number, hasLog: boolean): string {
  if (!hasLog) return 'No log';
  if (score === 0) return 'Symptom-free';
  if (score <= 9) return 'Mild';
  if (score <= 18) return 'Moderate';
  if (score <= 24) return 'Significant';
  return 'Severe';
}
