/**
 * Typed API client for PANS tracker server.
 * Uses Clerk session tokens for authentication.
 * All calls are fire-and-forget safe — errors are silently caught by callers.
 */

import type {
  SymptomLog, Medication, MedLibraryItem, Milestone, ChildBaseline,
  PTECLog, FlareEvent, TriggerEntry, HouseholdIllness, WellbeingLog,
} from './types';

const BASE = '/api/data';

export function createApiClient(getToken: () => Promise<string | null>) {
  async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) throw new Error(`API ${method} ${path}: ${res.status}`);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    // ── Symptom Logs ─────────────────────────────────────────────────────────
    logs: {
      getAll: () => req<SymptomLog[]>('GET', '/logs'),
      save: (log: SymptomLog) => req<void>('POST', '/logs', log),
      delete: (id: string) => req<void>('DELETE', `/logs/${id}`),
    },

    // ── Medications ──────────────────────────────────────────────────────────
    medications: {
      getAll: () => req<Medication[]>('GET', '/medications'),
      save: (med: Medication) => req<void>('POST', '/medications', med),
      delete: (id: string) => req<void>('DELETE', `/medications/${id}`),
    },

    // ── Medication Library ───────────────────────────────────────────────────
    medLibrary: {
      getAll: () => req<MedLibraryItem[]>('GET', '/medlibrary'),
      save: (item: MedLibraryItem) => req<void>('POST', '/medlibrary', item),
      delete: (id: string) => req<void>('DELETE', `/medlibrary/${id}`),
    },

    // ── Milestones ───────────────────────────────────────────────────────────
    milestones: {
      getAll: () => req<Milestone[]>('GET', '/milestones'),
      save: (item: Milestone) => req<void>('POST', '/milestones', item),
      delete: (id: string) => req<void>('DELETE', `/milestones/${id}`),
    },

    // ── Child Baseline ───────────────────────────────────────────────────────
    baseline: {
      get: () => req<ChildBaseline | null>('GET', '/baseline'),
      save: (data: ChildBaseline) => req<void>('PUT', '/baseline', data),
    },

    // ── PTEC Logs ────────────────────────────────────────────────────────────
    ptec: {
      getAll: () => req<PTECLog[]>('GET', '/ptec'),
      save: (log: PTECLog) => req<void>('POST', '/ptec', log),
      delete: (id: string) => req<void>('DELETE', `/ptec/${id}`),
    },

    // ── Flare History ────────────────────────────────────────────────────────
    flares: {
      getAll: () => req<FlareEvent[]>('GET', '/flares'),
      save: (event: FlareEvent) => req<void>('POST', '/flares', event),
    },

    // ── Trigger Log ──────────────────────────────────────────────────────────
    triggers: {
      getAll: () => req<TriggerEntry[]>('GET', '/triggers'),
      save: (entry: TriggerEntry) => req<void>('POST', '/triggers', entry),
      delete: (id: string) => req<void>('DELETE', `/triggers/${id}`),
    },

    // ── Household Health ─────────────────────────────────────────────────────
    household: {
      getAll: () => req<HouseholdIllness[]>('GET', '/household'),
      save: (item: HouseholdIllness) => req<void>('POST', '/household', item),
      delete: (id: string) => req<void>('DELETE', `/household/${id}`),
    },

    // ── Wellbeing Logs ───────────────────────────────────────────────────────
    wellbeing: {
      getAll: () => req<WellbeingLog[]>('GET', '/wellbeing'),
      save: (log: WellbeingLog) => req<void>('POST', '/wellbeing', log),
      delete: (id: string) => req<void>('DELETE', `/wellbeing/${id}`),
    },

    // ── Account deletion ─────────────────────────────────────────────────────
    account: {
      deleteAll: () => req<void>('DELETE', '/all'),
    },

    // ── Bulk sync (localStorage → server migration) ──────────────────────────
    sync: (payload: {
      logs?: SymptomLog[];
      medications?: Medication[];
      medLibrary?: MedLibraryItem[];
      milestones?: Milestone[];
      baseline?: ChildBaseline | null;
      ptecLogs?: PTECLog[];
      flares?: FlareEvent[];
      triggers?: TriggerEntry[];
      household?: HouseholdIllness[];
      wellbeing?: WellbeingLog[];
    }) => req<{ ok: boolean; errors: string[] }>('POST', '/sync', payload),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
