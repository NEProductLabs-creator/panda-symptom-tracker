import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { createApiClient } from '@/lib/api';
import type { JourneyStage } from '@/lib/types';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';
import { DEMO_JOURNEY_STATES } from '@/lib/demoData';
import { useActiveChild } from './useActiveChild';
import { CHILDREN_QUERY_KEY } from './useChildren';

export const JOURNEY_STATE_KEY = ['journey-state'] as const;

export function useJourneyState() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const qc = useQueryClient();
  // journey_stage now lives on the active child (migration 010)
  const activeChild = useActiveChild();

  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const demoScenario = isDemoMode
    ? (localStorage.getItem(DEMO_SCENARIO_KEY) as 'exploring' | 'in_crisis' | 'tracking' | null)
    : null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: JOURNEY_STATE_KEY });
    qc.invalidateQueries({ queryKey: CHILDREN_QUERY_KEY });
  };

  // ── Fetch onboarding state from user_journey_state (legacy read-only) ────────
  // Journey stage is per-child as of migration 010. The user_journey_state
  // table is legacy and no longer written to — all stage mutations go through
  // api.children.update(activeChild.id, { journey_stage, journey_stage_set_at }).
  // This query survives only to read onboarding_completed for users who had it
  // set before migration 010.
  const query = useQuery({
    queryKey: JOURNEY_STATE_KEY,
    queryFn: () => api.journeyState.get(),
    enabled: !!userId && !isDemoMode,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // ── setJourneyStage — writes to the active child (migration 010) ───────────
  const stageMutation = useMutation({
    mutationFn: async (stage: JourneyStage): Promise<void> => {
      if (!activeChild) return;
      await api.children.update(activeChild.id, {
        journey_stage: stage,
        journey_stage_set_at: new Date().toISOString(),
      });
    },
    onSuccess: invalidate,
  });

  // ── completeOnboarding ─────────────────────────────────────────────────────
  const onboardingMutation = useMutation({
    mutationFn: () => api.journeyState.patch({ onboarding_completed: true }),
    onSuccess: invalidate,
  });

  // ── Demo override — return scenario journey state without API ──────────────
  if (isDemoMode && demoScenario) {
    return {
      journeyState: DEMO_JOURNEY_STATES[demoScenario],
      isLoading: false,
      isError: false,
      setJourneyStage: (_stage: JourneyStage) => {},
      completeOnboarding: () => {},
      isSettingStage: false,
      isCompletingOnboarding: false,
    };
  }

  // Merge server onboarding state with active child's journey_stage.
  // Before migration 010 runs, query.data may still carry journey_stage;
  // after migration it won't, so we always prefer activeChild.
  const journeyState = query.data
    ? {
        ...query.data,
        journey_stage: activeChild?.journey_stage ?? query.data.journey_stage ?? null,
        journey_stage_set_at:
          activeChild?.journey_stage_set_at ?? query.data.journey_stage_set_at ?? null,
      }
    : null;

  return {
    journeyState,
    isLoading: query.isLoading,
    isError: query.isError,
    setJourneyStage: (stage: JourneyStage) => stageMutation.mutate(stage),
    completeOnboarding: () => onboardingMutation.mutate(),
    isSettingStage: stageMutation.isPending,
    isCompletingOnboarding: onboardingMutation.isPending,
  };
}
