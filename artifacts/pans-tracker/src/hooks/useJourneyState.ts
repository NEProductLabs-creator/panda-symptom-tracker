import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { createApiClient } from '@/lib/api';
import type { JourneyStage } from '@/lib/types';

export const JOURNEY_STATE_KEY = ['journey-state'] as const;

export function useJourneyState() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: JOURNEY_STATE_KEY });

  // ── Fetch (auto-creates row on first call) ─────────────────────────────────
  const query = useQuery({
    queryKey: JOURNEY_STATE_KEY,
    queryFn: () => api.journeyState.get(),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // treat as fresh for 5 min to avoid redundant fetches
    retry: 2,
  });

  // ── setJourneyStage ────────────────────────────────────────────────────────
  const stageMutation = useMutation({
    mutationFn: (stage: JourneyStage) =>
      api.journeyState.patch({
        journey_stage: stage,
        journey_stage_set_at: new Date().toISOString(),
      }),
    onSuccess: invalidate,
  });

  // ── completeOnboarding ────────────────────────────────────────────────────
  const onboardingMutation = useMutation({
    mutationFn: () => api.journeyState.patch({ onboarding_completed: true }),
    onSuccess: invalidate,
  });

  return {
    journeyState: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    setJourneyStage: (stage: JourneyStage) => stageMutation.mutate(stage),
    completeOnboarding: () => onboardingMutation.mutate(),
    isSettingStage: stageMutation.isPending,
    isCompletingOnboarding: onboardingMutation.isPending,
  };
}
