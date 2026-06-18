/**
 * API mutation queue with exponential-backoff retry and localStorage persistence.
 *
 * Flow:
 *  1. queueMutation() attempts the call immediately.
 *  2. On failure, retries up to 3 times with 1 s / 3 s / 9 s delays.
 *  3. If all 4 attempts fail, the payload is persisted to localStorage
 *     and a toast is shown (debounced — at most one per 10 s).
 *  4. drainQueue() is called when the browser comes back online and
 *     re-attempts every persisted entry.
 *  5. subscribe() lets React components react to queue state changes.
 */

import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueueEntry = {
  id: string;
  method: string;
  path: string;
  body?: unknown;
};

type ToastFn = (opts: { title: string; description?: string }) => void;

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = '/api/data';
const FAILED_QUEUE_KEY = 'pans_queue_failed';
const RETRY_DELAYS_MS = [1_000, 3_000, 9_000]; // delays *between* attempts
const TOAST_COOLDOWN_MS = 10_000;

// ── Module-level state (singleton) ────────────────────────────────────────────

let pendingCount = 0;
let lastToastAt = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((cb) => cb());
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadFailed(): QueueEntry[] {
  try {
    const raw = localStorage.getItem(FAILED_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueEntry[]) : [];
  } catch {
    return [];
  }
}

function saveFailed(entries: QueueEntry[]): void {
  localStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(entries));
}

function addToFailed(entry: QueueEntry): void {
  const current = loadFailed();
  if (!current.find((e) => e.id === entry.id)) {
    saveFailed([...current, entry]);
    notify();
  }
}

function removeFromFailed(id: string): void {
  const next = loadFailed().filter((e) => e.id !== id);
  saveFailed(next);
  notify();
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

type FetchResult = 'ok' | 'retryable' | 'permanent';

async function doFetch(
  entry: QueueEntry,
  getToken: () => Promise<string | null>,
): Promise<FetchResult> {
  try {
    const token = await getToken();
    const res = await fetch(`${BASE}${entry.path}`, {
      method: entry.method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(entry.body !== undefined ? { body: JSON.stringify(entry.body) } : {}),
    });
    if (res.ok || res.status === 204) return 'ok';
    // 4xx errors (bad request, 404, etc.) won't be fixed by retrying
    if (res.status < 500) return 'permanent';
    return 'retryable';
  } catch {
    // Network / fetch error — worth retrying
    return 'retryable';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Subscribe to queue state changes. Returns an unsubscribe function. */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getPendingCount(): number {
  return pendingCount;
}

export function getFailedCount(): number {
  return loadFailed().length;
}

/**
 * Queue a mutation (save or delete) with automatic retry.
 *
 * - 4 total attempts: immediate + 3 retries (1 s, 3 s, 9 s)
 * - 4xx responses are dropped immediately (no retry)
 * - If all attempts fail, the entry is persisted and a toast is shown
 *
 * Safe to fire-and-forget (no need to await the caller).
 */
export async function queueMutation(
  method: string,
  path: string,
  body: unknown | undefined,
  getToken: () => Promise<string | null>,
  toast: ToastFn,
): Promise<void> {
  const entry: QueueEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method,
    path,
    body,
  };

  pendingCount++;
  notify();

  // Initial attempt + up to 3 retries
  const totalAttempts = RETRY_DELAYS_MS.length + 1;
  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const result = await doFetch(entry, getToken);

    if (result === 'ok') {
      pendingCount--;
      notify();
      return;
    }

    if (result === 'permanent') {
      // 4xx — retrying won't help; drop silently
      pendingCount--;
      notify();
      return;
    }

    // Retryable — wait before next attempt (skip delay after last attempt)
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  // All attempts exhausted
  pendingCount--;
  addToFailed(entry);

  const now = Date.now();
  if (now - lastToastAt > TOAST_COOLDOWN_MS) {
    lastToastAt = now;
    toast({
      title: "Couldn't sync to server",
      description: "Will retry when you're back online.",
    });
  }
}

/**
 * Retry every entry in the persistent failed queue.
 * Call this when the browser reports it is back online.
 */
export async function drainQueue(getToken: () => Promise<string | null>): Promise<void> {
  const entries = loadFailed();
  if (entries.length === 0) return;

  await Promise.all(
    entries.map(async (entry) => {
      try {
        const result = await doFetch(entry, getToken);
        if (result === 'ok' || result === 'permanent') {
          removeFromFailed(entry.id);
        }
      } catch {
        // Leave in queue — will retry next time
      }
    }),
  );
}

// ── React hook ────────────────────────────────────────────────────────────────

/** Returns live pending + failed counts. Updates whenever the queue changes. */
export function useQueueStatus(): { pending: number; failed: number } {
  const [status, setStatus] = useState(() => ({
    pending: getPendingCount(),
    failed: getFailedCount(),
  }));

  useEffect(() => {
    const unsub = subscribe(() =>
      setStatus({ pending: getPendingCount(), failed: getFailedCount() }),
    );
    return unsub;
  }, []);

  return status;
}
