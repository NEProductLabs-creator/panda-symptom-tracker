import { PTECScores, PTECLog } from './types';
import { format, endOfWeek, parseISO } from 'date-fns';

export const PTEC_CATEGORIES = [
  { key: 'ocdBehaviors' as keyof PTECScores, label: 'OCD Behaviors', description: 'Obsessions, compulsions, rituals' },
  { key: 'anxiety' as keyof PTECScores, label: 'Anxiety', description: 'Separation anxiety, general anxiety, panic' },
  { key: 'emotionalLability' as keyof PTECScores, label: 'Emotional Lability', description: 'Mood swings, emotional dysregulation' },
  { key: 'aggression' as keyof PTECScores, label: 'Aggression & Rage', description: 'Rage episodes, aggressive outbursts' },
  { key: 'restrictiveEating' as keyof PTECScores, label: 'Restrictive Eating', description: 'Food refusal, restricted diet, aversions' },
  { key: 'sleepDisturbance' as keyof PTECScores, label: 'Sleep Disturbance', description: 'Insomnia, night waking, nightmares' },
  { key: 'urinarySymptoms' as keyof PTECScores, label: 'Urinary Symptoms', description: 'Frequency, urgency, regression' },
  { key: 'sensorySensitivities' as keyof PTECScores, label: 'Sensory Sensitivities', description: 'Tactile, auditory, or visual sensitivities' },
  { key: 'tics' as keyof PTECScores, label: 'Tics', description: 'Motor and vocal tics' },
  { key: 'handwritingRegression' as keyof PTECScores, label: 'Handwriting / Fine Motor', description: 'Regression in writing or fine motor skills' },
  { key: 'academicDecline' as keyof PTECScores, label: 'Academic & Cognitive', description: 'Trouble concentrating, school performance decline' },
  { key: 'personalityChange' as keyof PTECScores, label: 'Personality Change', description: '"Not themselves", behavioral regression' },
];

export const PTEC_SCALE_LABELS: Record<number, string> = {
  0: 'Absent', 1: 'Minimal', 2: 'Mild', 3: 'Moderate', 4: 'Significant', 5: 'Severe', 6: 'Extreme',
};

export const DEFAULT_PTEC_SCORES: PTECScores = {
  ocdBehaviors: 0, anxiety: 0, emotionalLability: 0, aggression: 0, restrictiveEating: 0,
  sleepDisturbance: 0, urinarySymptoms: 0, sensorySensitivities: 0, tics: 0,
  handwritingRegression: 0, academicDecline: 0, personalityChange: 0,
};

export function computePTECTotal(scores: PTECScores): number {
  return PTEC_CATEGORIES.reduce((sum, cat) => sum + (scores[cat.key] ?? 0), 0);
}

export interface PTECSeverity {
  label: string;
  color: string;
  textColor: string;
  bg: string;
  border: string;
}

export function getPTECSeverity(total: number): PTECSeverity {
  if (total <= 12) return { label: 'Mild', color: '#16a34a', textColor: '#14532d', bg: '#f0fdf4', border: '#bbf7d0' };
  if (total <= 30) return { label: 'Moderate', color: '#d97706', textColor: '#78350f', bg: '#fffbeb', border: '#fcd34d' };
  if (total <= 50) return { label: 'Significant', color: '#ea580c', textColor: '#7c2d12', bg: '#fff7ed', border: '#fed7aa' };
  return { label: 'Severe', color: '#dc2626', textColor: '#7f1d1d', bg: '#fef2f2', border: '#fecaca' };
}

export const PTEC_ZONE_BANDS = [
  { y1: 0, y2: 12, fill: '#86efac', label: 'Mild' },
  { y1: 12, y2: 30, fill: '#fde68a', label: 'Moderate' },
  { y1: 30, y2: 50, fill: '#fdba74', label: 'Significant' },
  { y1: 50, y2: 72, fill: '#f87171', label: 'Severe' },
];

export const PTEC_DISCLAIMER =
  'This scoring tool is based on the PTEC developed by the Neuroimmune Foundation and is intended for personal tracking only, not diagnosis.';

// ─── Flare detection (PTEC-based) ────────────────────────────────────────────

export interface PTECFlareStatus {
  isActive: boolean;
  latestWeekStart: string | null;
  latestScore: number;
  fourWeekAvg: number;
  percentAbove: number;
}

export function detectPTECFlare(ptecLogs: PTECLog[]): PTECFlareStatus {
  const empty: PTECFlareStatus = {
    isActive: false, latestWeekStart: null, latestScore: 0, fourWeekAvg: 0, percentAbove: 0,
  };
  if (ptecLogs.length < 3) return empty;

  const sorted = [...ptecLogs].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  const latest = sorted[sorted.length - 1];
  const prev = sorted.slice(Math.max(0, sorted.length - 5), sorted.length - 1); // up to 4 prev weeks

  if (prev.length < 2) {
    return { ...empty, latestWeekStart: latest.weekStartDate, latestScore: latest.totalScore };
  }

  const avg = prev.reduce((s, e) => s + e.totalScore, 0) / prev.length;
  const isActive = latest.totalScore > 12 && avg > 0 && latest.totalScore >= avg * 1.3;
  const percentAbove = avg > 0 ? Math.round(((latest.totalScore - avg) / avg) * 100) : 0;

  return {
    isActive,
    latestWeekStart: latest.weekStartDate,
    latestScore: latest.totalScore,
    fourWeekAvg: Math.round(avg * 10) / 10,
    percentAbove,
  };
}

export interface PTECFlarePeriod {
  startDate: string; // YYYY-MM-DD (Monday of first flare week)
  endDate: string;   // YYYY-MM-DD (Sunday of last flare week)
  peakScore: number;
  weekCount: number;
}

export function computePTECFlareHistory(ptecLogs: PTECLog[]): PTECFlarePeriod[] {
  if (ptecLogs.length < 3) return [];

  const sorted = [...ptecLogs].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  const periods: PTECFlarePeriod[] = [];

  let inFlare = false;
  let flareStart = '';
  let peakScore = 0;
  let weekCount = 0;
  let consecutiveCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];
    const prevEntries = sorted.slice(Math.max(0, i - 4), i);

    if (prevEntries.length < 2) {
      consecutiveCount = 0;
      continue;
    }

    const avg = prevEntries.reduce((s, e) => s + e.totalScore, 0) / prevEntries.length;
    const isFlareWeek = log.totalScore > 12 && avg > 0 && log.totalScore >= avg * 1.3;

    if (isFlareWeek) {
      consecutiveCount++;
      if (consecutiveCount === 2 && !inFlare) {
        inFlare = true;
        flareStart = sorted[i - 1].weekStartDate;
        peakScore = Math.max(log.totalScore, sorted[i - 1].totalScore);
        weekCount = 2;
      } else if (inFlare) {
        peakScore = Math.max(peakScore, log.totalScore);
        weekCount++;
      }
    } else {
      if (inFlare && i > 0) {
        const lastFlareEnd = endOfWeek(parseISO(sorted[i - 1].weekStartDate), { weekStartsOn: 1 });
        periods.push({ startDate: flareStart, endDate: format(lastFlareEnd, 'yyyy-MM-dd'), peakScore, weekCount });
      }
      inFlare = false;
      consecutiveCount = 0;
      peakScore = 0;
      weekCount = 0;
    }
  }

  if (inFlare) {
    const last = sorted[sorted.length - 1];
    const lastFlareEnd = endOfWeek(parseISO(last.weekStartDate), { weekStartsOn: 1 });
    periods.push({ startDate: flareStart, endDate: format(lastFlareEnd, 'yyyy-MM-dd'), peakScore, weekCount });
  }

  return periods.reverse();
}
