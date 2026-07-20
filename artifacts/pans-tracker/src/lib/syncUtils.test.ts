import { describe, it, expect } from 'vitest';
import { mergeById, mergeSingleton } from './syncUtils';

// ─────────────────────────────────────────────────────────────────────────────
// mergeById
// ─────────────────────────────────────────────────────────────────────────────

describe('mergeById', () => {
  it('keeps the local version when local has a newer updatedAt', () => {
    const local = [{ id: '1', value: 'local', updatedAt: '2024-01-02T00:00:00.000Z' }];
    const server = [{ id: '1', value: 'server', updatedAt: '2024-01-01T00:00:00.000Z' }];
    const { merged } = mergeById(local, server);
    expect(merged).toHaveLength(1);
    expect(merged[0].value).toBe('local');
  });

  it('keeps the server version when server has a newer updatedAt', () => {
    const local = [{ id: '1', value: 'local', updatedAt: '2024-01-01T00:00:00.000Z' }];
    const server = [{ id: '1', value: 'server', updatedAt: '2024-01-02T00:00:00.000Z' }];
    const { merged } = mergeById(local, server);
    expect(merged[0].value).toBe('server');
  });

  it('server wins on a timestamp tie', () => {
    const ts = '2024-01-01T00:00:00.000Z';
    const local = [{ id: '1', value: 'local', updatedAt: ts }];
    const server = [{ id: '1', value: 'server', updatedAt: ts }];
    const { merged } = mergeById(local, server);
    expect(merged[0].value).toBe('server');
  });

  it('local-only item appears in merged AND localOnly', () => {
    const local = [{ id: 'local-only', value: 'mine' }];
    const { merged, localOnly } = mergeById(local, []);
    expect(merged).toHaveLength(1);
    expect(localOnly).toHaveLength(1);
    expect(localOnly[0].id).toBe('local-only');
  });

  it('server-only item appears in merged but NOT in localOnly', () => {
    const server = [{ id: 'server-only', value: 'remote' }];
    const { merged, localOnly } = mergeById([], server);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('server-only');
    expect(localOnly).toHaveLength(0);
  });

  it('treats a missing updatedAt as epoch 0 — a stamped record always wins', () => {
    // local has no timestamp → ts() = 0; server is stamped → server wins
    const local = [{ id: '1', value: 'unstamped-local' }];
    const server = [{ id: '1', value: 'stamped-server', updatedAt: '2024-01-01T00:00:00.000Z' }];
    const { merged } = mergeById(local, server);
    expect(merged[0].value).toBe('stamped-server');
  });

  it('treats an invalid updatedAt string as epoch 0', () => {
    const local = [{ id: '1', value: 'bad-ts-local', updatedAt: 'not-a-date' }];
    const server = [{ id: '1', value: 'stamped-server', updatedAt: '2024-01-01T00:00:00.000Z' }];
    const { merged } = mergeById(local, server);
    expect(merged[0].value).toBe('stamped-server');
  });

  it('correctly handles a mix of shared, local-only, and server-only items', () => {
    const local = [
      { id: 'shared', val: 'local-old', updatedAt: '2024-06-01T00:00:00.000Z' },
      { id: 'local-only', val: 'local-only' },
    ];
    const server = [
      { id: 'shared', val: 'server-new', updatedAt: '2024-06-02T00:00:00.000Z' },
      { id: 'server-only', val: 'server-only' },
    ];
    const { merged, localOnly } = mergeById(local, server);

    expect(merged).toHaveLength(3);
    expect(merged.find(x => x.id === 'shared')?.val).toBe('server-new');
    expect(merged.find(x => x.id === 'local-only')).toBeDefined();
    expect(merged.find(x => x.id === 'server-only')).toBeDefined();
    expect(localOnly.map(x => x.id)).toEqual(['local-only']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mergeSingleton
// ─────────────────────────────────────────────────────────────────────────────

describe('mergeSingleton', () => {
  const KEY = 'lastUpdated' as const;

  it('returns null winner with no push when both sides are null', () => {
    const result = mergeSingleton(null, null, KEY);
    expect(result.winner).toBeNull();
    expect(result.pushToServer).toBe(false);
  });

  it('returns local with push when only local exists', () => {
    const local = { id: '1', lastUpdated: '2024-01-01T00:00:00.000Z' };
    const result = mergeSingleton(local, null, KEY);
    expect(result.winner).toBe(local);
    expect(result.pushToServer).toBe(true);
  });

  it('returns server without push when only server exists', () => {
    const server = { id: '1', lastUpdated: '2024-01-01T00:00:00.000Z' };
    const result = mergeSingleton(null, server, KEY);
    expect(result.winner).toBe(server);
    expect(result.pushToServer).toBe(false);
  });

  it('local wins and sets pushToServer=true when local is newer', () => {
    const local  = { id: '1', lastUpdated: '2024-01-02T00:00:00.000Z' };
    const server = { id: '1', lastUpdated: '2024-01-01T00:00:00.000Z' };
    const result = mergeSingleton(local, server, KEY);
    expect(result.winner).toBe(local);
    expect(result.pushToServer).toBe(true);
  });

  it('server wins and sets pushToServer=false when server is newer', () => {
    const local  = { id: '1', lastUpdated: '2024-01-01T00:00:00.000Z' };
    const server = { id: '1', lastUpdated: '2024-01-02T00:00:00.000Z' };
    const result = mergeSingleton(local, server, KEY);
    expect(result.winner).toBe(server);
    expect(result.pushToServer).toBe(false);
  });

  it('server wins on a timestamp tie', () => {
    const ts = '2024-01-01T00:00:00.000Z';
    const local  = { id: '1', lastUpdated: ts };
    const server = { id: '1', lastUpdated: ts };
    const result = mergeSingleton(local, server, KEY);
    expect(result.winner).toBe(server);
    expect(result.pushToServer).toBe(false);
  });

  it('treats missing timestamp as epoch 0 — a stamped record wins', () => {
    const local  = { id: '1' } as Record<string, unknown>; // no lastUpdated
    const server = { id: '1', lastUpdated: '2024-01-01T00:00:00.000Z' };
    const result = mergeSingleton(local, server, 'lastUpdated');
    expect(result.winner).toBe(server);
    expect(result.pushToServer).toBe(false);
  });
});
