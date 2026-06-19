import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChildren, CHILDREN_QUERY_KEY } from './useChildren';
import type { Child } from '@/lib/types';

const STORAGE_KEY = 'panstracker.activeChildId';
const EVENT_NAME = 'panstracker:activeChildChanged';

/**
 * Returns the currently active Child object.
 *
 * Resolution order:
 *   1. The child whose id matches localStorage[panstracker.activeChildId]
 *   2. The first non-archived child by sort_order (fallback / default)
 *   3. null if the children list is empty or still loading
 *
 * Reactively updates when:
 *   - The children list changes (React Query cache update)
 *   - setActiveChild() is called anywhere in the app
 */
export function useActiveChild(): Child | null {
  const { data: children } = useChildren();
  const [activeId, setActiveId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  useEffect(() => {
    function handleChange(e: Event) {
      setActiveId((e as CustomEvent<{ childId: string }>).detail.childId);
    }
    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, []);

  return useMemo(() => {
    if (!children?.length) return null;
    const found = children.find((c) => c.id === activeId);
    return found ?? children[0];
  }, [children, activeId]);
}

/**
 * Writes the active child id to localStorage and notifies all useActiveChild
 * subscribers via a custom DOM event.
 *
 * This is a plain function (not a hook) so it can be called from event
 * handlers, mutation callbacks, and non-React code.
 *
 * To also trigger a refresh of child-scoped React Query data, pass the
 * QueryClient obtained from useQueryClient() as the second argument.
 *
 * @example
 *   const qc = useQueryClient();
 *   setActiveChild(childId, qc);
 */
export function setActiveChild(childId: string, queryClient?: ReturnType<typeof useQueryClient>): void {
  localStorage.setItem(STORAGE_KEY, childId);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { childId } }));
  if (queryClient) {
    // Invalidate the children list so sort_order / name changes propagate
    queryClient.invalidateQueries({ queryKey: CHILDREN_QUERY_KEY });
  }
}
