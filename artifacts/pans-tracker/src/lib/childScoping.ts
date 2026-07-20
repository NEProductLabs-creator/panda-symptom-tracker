import type { SymptomLog } from './types';

/**
 * Filter a list of symptom logs to only include logs belonging to the given child.
 *
 * Legacy logs without a child_id (pre-migration 010) are treated as belonging to
 * the currently active child for backwards compatibility.
 *
 * @param logs    - All logs to filter
 * @param childId - The active child's ID, or null to return all logs unfiltered
 */
export function filterByChild(logs: SymptomLog[], childId: string | null): SymptomLog[] {
  if (!childId) return logs;
  return logs.filter(l => !l.child_id || l.child_id === childId);
}
