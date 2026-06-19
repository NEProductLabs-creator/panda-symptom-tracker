import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { useMemo } from 'react';
import { createApiClient } from '@/lib/api';
import type { CreateChildInput, UpdateChildInput } from '@/lib/types';

export const CHILDREN_QUERY_KEY = ['children'] as const;

/**
 * Returns the current user's non-archived children sorted by sort_order.
 * Uses React Query — data is kept in the RQ cache (no localStorage layer).
 */
export function useChildren() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  return useQuery({
    queryKey: CHILDREN_QUERY_KEY,
    queryFn: async () => {
      const all = await api.children.getAll();
      return all
        .filter((c) => !c.is_archived)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/** Creates a new child. Invalidates useChildren on success. */
export function useAddChild() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (child: CreateChildInput) => api.children.create(child),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHILDREN_QUERY_KEY }),
  });
}

/** Updates any fields on an existing child. Invalidates useChildren on success. */
export function useUpdateChild() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateChildInput }) =>
      api.children.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHILDREN_QUERY_KEY }),
  });
}

/**
 * Archives a child (soft-delete: sets is_archived = true).
 * Invalidates useChildren on success.
 */
export function useArchiveChild() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.children.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHILDREN_QUERY_KEY }),
  });
}

/**
 * Returns ALL children for the current user including archived ones, sorted by sort_order.
 * Used by the Children settings page where archived entries need to be shown.
 */
export function useAllChildren() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  return useQuery({
    queryKey: [...CHILDREN_QUERY_KEY, 'all'] as const,
    queryFn: async () => {
      const all = await api.children.getAll();
      return all.sort((a, b) => a.sort_order - b.sort_order);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/**
 * Unarchives a child (sets is_archived = false via update).
 * Invalidates useChildren on success.
 */
export function useUnarchiveChild() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.children.update(id, { is_archived: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHILDREN_QUERY_KEY }),
  });
}
