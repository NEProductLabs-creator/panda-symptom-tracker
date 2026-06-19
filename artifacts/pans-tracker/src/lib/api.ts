/**
 * Typed API client for PANS tracker server.
 * Uses Supabase session tokens for authentication.
 * All calls are fire-and-forget safe — errors are silently caught by callers.
 */

import type {
  SymptomLog, Medication, MedLibraryItem, Milestone, ChildBaseline,
  PTECLog, FlareEvent, TriggerEntry, HouseholdIllness, WellbeingLog,
  JourneyState, Child, CreateChildInput, UpdateChildInput, LabResult,
} from './types';

// On the web build VITE_API_BASE_URL is empty and the Replit Deployments
// same-origin proxy routes /api/* correctly. On a Capacitor (iOS/Android)
// native build, set VITE_API_BASE_URL to the full HTTPS URL of the deployed
// API server (e.g. "https://pans-tracker.replit.app") so that absolute fetch
// URLs are used — Capacitor origins (capacitor://localhost, https://localhost)
// cannot rely on same-origin routing.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/data';

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

    // ── Journey State ─────────────────────────────────────────────────────────
    journeyState: {
      get: () => req<JourneyState>('GET', '/journey-state'),
      patch: (fields: Partial<Pick<JourneyState, 'onboarding_completed'>>) =>
        req<void>('PATCH', '/journey-state', fields),
    },

    // ── Children ──────────────────────────────────────────────────────────────
    children: {
      getAll: () => req<Child[]>('GET', '/children'),
      create: (child: CreateChildInput) => req<Child>('POST', '/children', child),
      update: (id: string, patch: UpdateChildInput) => req<Child>('PUT', `/children/${id}`, patch),
      archive: (id: string) => req<void>('DELETE', `/children/${id}`),
      getBaseline: (id: string) => req<ChildBaseline | null>('GET', `/children/${id}/baseline`),
      saveBaseline: (id: string, data: ChildBaseline) => req<void>('PUT', `/children/${id}/baseline`, data),
    },

    // ── Lab Results ──────────────────────────────────────────────────────────
    labs: {
      getAll: () => req<LabResult[]>('GET', '/labs'),
      save: (result: LabResult) => req<void>('POST', '/labs', result),
      delete: (id: string) => req<void>('DELETE', `/labs/${id}`),
    },

    // ── Right Now Checklist ──────────────────────────────────────────────────
    rightNowChecklist: {
      // child_id is required — server returns 400 without it
      save: (params: {
        date: string;
        action_key: string;
        completed: boolean;
        child_id: string;
      }) => req<{ ok: boolean }>('POST', '/right-now-checklist', params),
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
