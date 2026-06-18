/**
 * Sync merge utilities shared by all data hooks.
 *
 * Strategy: last-write-wins by updatedAt (ISO string).
 * Missing timestamps are treated as epoch 0 so any stamped record wins.
 */

function ts(isoString?: string): number {
  if (!isoString) return 0;
  const t = Date.parse(isoString);
  return isNaN(t) ? 0 : t;
}

export type WithId = { id: string; updatedAt?: string };

/**
 * Merge local and server collections by id.
 *
 * - Both have item  → keep the version with the newer updatedAt; server wins on tie.
 * - Local-only item → include in merged AND returned in `localOnly` so the caller can push it up.
 * - Server-only item → include in merged (pull it down).
 */
export function mergeById<T extends WithId>(
  local: T[],
  server: T[],
): { merged: T[]; localOnly: T[] } {
  const serverMap = new Map(server.map((item) => [item.id, item]));
  const localMap = new Map(local.map((item) => [item.id, item]));

  const merged: T[] = [];
  const localOnly: T[] = [];

  for (const [id, localItem] of localMap) {
    const serverItem = serverMap.get(id);
    if (serverItem) {
      merged.push(
        ts(localItem.updatedAt) > ts(serverItem.updatedAt) ? localItem : serverItem,
      );
    } else {
      merged.push(localItem);
      localOnly.push(localItem);
    }
  }

  for (const [id, serverItem] of serverMap) {
    if (!localMap.has(id)) {
      merged.push(serverItem);
    }
  }

  return { merged, localOnly };
}

/**
 * Merge a singleton that carries its own timestamp under `timestampKey`.
 *
 * Returns the winning value and whether the caller should push it to the server
 * (true when local won or server was absent).
 */
export function mergeSingleton<T extends Record<string, unknown>>(
  local: T | null,
  server: T | null,
  timestampKey: keyof T,
): { winner: T | null; pushToServer: boolean } {
  if (!local && !server) return { winner: null, pushToServer: false };
  if (!local) return { winner: server, pushToServer: false };
  if (!server) return { winner: local, pushToServer: true };

  const localTime = ts(local[timestampKey] as string | undefined);
  const serverTime = ts(server[timestampKey] as string | undefined);

  return localTime > serverTime
    ? { winner: local, pushToServer: true }
    : { winner: server, pushToServer: false };
}

/** Convenience: current ISO timestamp. */
export function now(): string {
  return new Date().toISOString();
}
