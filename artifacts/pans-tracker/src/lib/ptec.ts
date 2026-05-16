import { PTECScores } from './types';

export const PTEC_CATEGORIES = [
  {
    key: 'ocdBehaviors' as keyof PTECScores,
    label: 'OCD Behaviors',
    description: 'Obsessions, compulsions, rituals',
  },
  {
    key: 'anxiety' as keyof PTECScores,
    label: 'Anxiety',
    description: 'Separation anxiety, general anxiety, panic',
  },
  {
    key: 'emotionalLability' as keyof PTECScores,
    label: 'Emotional Lability',
    description: 'Mood swings, emotional dysregulation',
  },
  {
    key: 'aggression' as keyof PTECScores,
    label: 'Aggression & Rage',
    description: 'Rage episodes, aggressive outbursts',
  },
  {
    key: 'restrictiveEating' as keyof PTECScores,
    label: 'Restrictive Eating',
    description: 'Food refusal, restricted diet, aversions',
  },
  {
    key: 'sleepDisturbance' as keyof PTECScores,
    label: 'Sleep Disturbance',
    description: 'Insomnia, night waking, nightmares',
  },
  {
    key: 'urinarySymptoms' as keyof PTECScores,
    label: 'Urinary Symptoms',
    description: 'Frequency, urgency, regression',
  },
  {
    key: 'sensorySensitivities' as keyof PTECScores,
    label: 'Sensory Sensitivities',
    description: 'Tactile, auditory, or visual sensitivities',
  },
  {
    key: 'tics' as keyof PTECScores,
    label: 'Tics',
    description: 'Motor and vocal tics',
  },
  {
    key: 'handwritingRegression' as keyof PTECScores,
    label: 'Handwriting / Fine Motor',
    description: 'Regression in writing or fine motor skills',
  },
  {
    key: 'academicDecline' as keyof PTECScores,
    label: 'Academic & Cognitive',
    description: 'Trouble concentrating, school performance decline',
  },
  {
    key: 'personalityChange' as keyof PTECScores,
    label: 'Personality Change',
    description: '"Not themselves", behavioral regression',
  },
];

export const PTEC_SCALE_LABELS: Record<number, string> = {
  0: 'Absent',
  1: 'Minimal',
  2: 'Mild',
  3: 'Moderate',
  4: 'Significant',
  5: 'Severe',
  6: 'Extreme',
};

export const DEFAULT_PTEC_SCORES: PTECScores = {
  ocdBehaviors: 0,
  anxiety: 0,
  emotionalLability: 0,
  aggression: 0,
  restrictiveEating: 0,
  sleepDisturbance: 0,
  urinarySymptoms: 0,
  sensorySensitivities: 0,
  tics: 0,
  handwritingRegression: 0,
  academicDecline: 0,
  personalityChange: 0,
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
  if (total <= 12) {
    return { label: 'Mild', color: '#16a34a', textColor: '#14532d', bg: '#f0fdf4', border: '#bbf7d0' };
  }
  if (total <= 30) {
    return { label: 'Moderate', color: '#d97706', textColor: '#78350f', bg: '#fffbeb', border: '#fcd34d' };
  }
  if (total <= 50) {
    return { label: 'Significant', color: '#ea580c', textColor: '#7c2d12', bg: '#fff7ed', border: '#fed7aa' };
  }
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
