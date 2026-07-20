/**
 * Tests for child-scoped symptom log filtering and the localStorage merge-before-save pattern.
 *
 * Background: a past bug in useSymptomLogs caused switching the active child and saving
 * a log to silently wipe out other children's data from localStorage. The regression tests
 * below encode the exact rule that prevents this bug.
 * See: .agents/memory/symptom-logs-child-scoping.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { filterByChild } from './childScoping';
import { storage } from './storage';
import type { SymptomLog } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// localStorage mock (vitest/node has no DOM — stub it globally)
// ─────────────────────────────────────────────────────────────────────────────

let store: Record<string, string> = {};

beforeEach(() => {
  store = {};
  vi.stubGlobal('localStorage', {
    getItem:    (k: string)           => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string)           => { delete store[k]; },
    clear:      ()                    => { Object.keys(store).forEach(k => delete store[k]); },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeLog(
  id: string,
  childId: string | undefined,
  date: string,
): SymptomLog {
  return {
    id,
    date,
    child_id: childId,
    ocd: null, anxiety: null, rage: null, tics: null, sleep: null, cognition: null,
  };
}

const logA1     = makeLog('a1',  'child-a',   '2024-06-01');
const logA2     = makeLog('a2',  'child-a',   '2024-06-02');
const logB1     = makeLog('b1',  'child-b',   '2024-06-01');
const logLegacy = makeLog('leg', undefined,    '2024-05-01'); // pre-migration: no child_id

// ─────────────────────────────────────────────────────────────────────────────
// filterByChild
// ─────────────────────────────────────────────────────────────────────────────

describe('filterByChild', () => {
  it('returns all logs unchanged when childId is null', () => {
    const logs = [logA1, logB1, logLegacy];
    expect(filterByChild(logs, null)).toEqual(logs);
  });

  it('includes logs for the active child and legacy logs (no child_id)', () => {
    const logs = [logA1, logA2, logB1, logLegacy];
    const result = filterByChild(logs, 'child-a');
    expect(result).toContainEqual(logA1);
    expect(result).toContainEqual(logA2);
    expect(result).toContainEqual(logLegacy); // legacy counts as active child
    expect(result).not.toContainEqual(logB1); // other child excluded
  });

  it('excludes logs that explicitly belong to a different child', () => {
    const result = filterByChild([logA1, logB1], 'child-b');
    expect(result).toEqual([logB1]);
  });

  it('returns an empty array when no logs match and there are no legacy logs', () => {
    expect(filterByChild([logA1], 'child-b')).toEqual([]);
  });

  it('returns all legacy logs regardless of which child is active', () => {
    const legacyLogs = [
      makeLog('leg1', undefined, '2023-01-01'),
      makeLog('leg2', undefined, '2023-01-02'),
    ];
    expect(filterByChild(legacyLogs, 'child-a')).toHaveLength(2);
    expect(filterByChild(legacyLogs, 'child-b')).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Regression: child-scoped save must never wipe other children's logs
//
// The core rule from useSymptomLogs.addLog:
//   const allLogs = storage.getLogs();
//   const otherLogs = activeChildId
//     ? allLogs.filter(l => l.child_id && l.child_id !== activeChildId)
//     : [];
//   storage.saveLogs([...otherLogs, ...nextFiltered]);
//
// This merge step is mandatory. Skipping it and saving only `nextFiltered`
// silently deletes every other child's data from localStorage.
// ─────────────────────────────────────────────────────────────────────────────

/** Mirrors the exact save pattern from useSymptomLogs.addLog / deleteLog. */
function saveWithChildPreservation(
  activeChildId: string | null,
  nextFiltered: SymptomLog[],
): void {
  const allLogs = storage.getLogs();
  const otherLogs = activeChildId
    ? allLogs.filter(l => l.child_id && l.child_id !== activeChildId)
    : [];
  storage.saveLogs([...otherLogs, ...nextFiltered]);
}

describe('child-scoped save preserves other children\'s logs (regression)', () => {
  it('saving a new log for child-a keeps child-b logs intact in localStorage', () => {
    storage.saveLogs([logA1, logB1]);

    const activeChildId = 'child-a';
    const newLog = makeLog('a3', 'child-a', '2024-06-03');
    const nextFiltered = [...filterByChild(storage.getLogs(), activeChildId), newLog];

    saveWithChildPreservation(activeChildId, nextFiltered);

    const saved = storage.getLogs().map(l => l.id);
    expect(saved).toContain('a1'); // child-a original preserved
    expect(saved).toContain('a3'); // new log written
    expect(saved).toContain('b1'); // CRITICAL: child-b must survive
  });

  it('deleting a log for child-a keeps child-b logs intact in localStorage', () => {
    storage.saveLogs([logA1, logA2, logB1]);

    const activeChildId = 'child-a';
    const nextFiltered = filterByChild(storage.getLogs(), activeChildId)
      .filter(l => l.id !== 'a1'); // simulate deleteLog

    saveWithChildPreservation(activeChildId, nextFiltered);

    const saved = storage.getLogs().map(l => l.id);
    expect(saved).not.toContain('a1'); // deleted
    expect(saved).toContain('a2');     // other child-a log kept
    expect(saved).toContain('b1');     // CRITICAL: child-b must survive
  });

  it('documents the old bug: saving only nextFiltered wipes child-b (do not do this)', () => {
    storage.saveLogs([logA1, logB1]);

    const activeChildId = 'child-a';
    const newLog = makeLog('a3', 'child-a', '2024-06-03');
    const nextFiltered = [...filterByChild(storage.getLogs(), activeChildId), newLog];

    // BUG: save the filtered subset directly — child-b gets erased
    storage.saveLogs(nextFiltered);

    const saved = storage.getLogs().map(l => l.id);
    expect(saved).not.toContain('b1'); // child-b is gone — this is what the bug looked like
  });

  it('legacy logs are preserved through an active-child save', () => {
    storage.saveLogs([logA1, logLegacy, logB1]);

    const activeChildId = 'child-a';
    const newLog = makeLog('a3', 'child-a', '2024-06-03');
    // filterByChild includes legacy logs for the active child
    const nextFiltered = [...filterByChild(storage.getLogs(), activeChildId), newLog];

    saveWithChildPreservation(activeChildId, nextFiltered);

    const saved = storage.getLogs().map(l => l.id);
    // legacy has no child_id so it is NOT in otherLogs (otherLogs filters for
    // l.child_id truthy AND !== activeChildId), meaning legacy travels with nextFiltered
    expect(saved).toContain('leg'); // legacy preserved via nextFiltered
    expect(saved).toContain('b1');  // child-b preserved via otherLogs
    expect(saved).toContain('a3');  // new log written
  });

  it('when activeChildId is null, all logs are written and no cross-child data is lost', () => {
    storage.saveLogs([logA1, logB1]);

    const activeChildId = null;
    const newLog = makeLog('new', undefined, '2024-06-05');
    const nextFiltered = [...storage.getLogs(), newLog];

    saveWithChildPreservation(activeChildId, nextFiltered);

    const saved = storage.getLogs().map(l => l.id);
    expect(saved).toContain('a1');
    expect(saved).toContain('b1');
    expect(saved).toContain('new');
  });
});
