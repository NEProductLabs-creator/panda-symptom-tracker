import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useSupabaseAuth";
import { createApiClient } from "@/lib/api";
import { useActiveChild } from "@/hooks/useActiveChild";
import { DEMO_SCREENER_RESULTS } from "@/lib/demoData";
import type { ScreenerResultRecord, ScreenerAnswers, ResultBucket } from "@/lib/types";

const DEMO_KEY = "pans_tracker_demo_mode";

/**
 * Fetch screener results for the current user, optionally filtered by child.
 * Pass childId=null explicitly to get ALL results regardless of active child.
 * Omit childId to default to the currently active child.
 */
export function useScreenerResults(childId?: string | null) {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const activeChild = useActiveChild();
  const isDemoMode = localStorage.getItem(DEMO_KEY) === "1";

  // undefined → use active child; null → no filter (all results)
  const resolvedChildId = childId !== undefined ? childId : (activeChild?.id ?? null);

  return useQuery({
    queryKey: ["screener-results", userId ?? "demo", resolvedChildId],
    queryFn: async (): Promise<ScreenerResultRecord[]> => {
      if (isDemoMode) {
        const all = DEMO_SCREENER_RESULTS as unknown as ScreenerResultRecord[];
        return resolvedChildId ? all.filter((r) => r.child_id === resolvedChildId) : all;
      }
      if (!userId) return [];
      return api.screenerResults.getAll(resolvedChildId ?? undefined);
    },
    enabled: !!userId || isDemoMode,
    staleTime: 30_000,
  });
}

export function useAddScreenerResult() {
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const qc = useQueryClient();
  const isDemoMode = localStorage.getItem(DEMO_KEY) === "1";

  return useMutation({
    mutationFn: async (input: {
      childId: string | null;
      answers: ScreenerAnswers;
      resultBucket: ResultBucket;
    }): Promise<{ id: string; child_id: string | null; result_bucket: string; created_at: string }> => {
      if (isDemoMode) {
        return {
          id: "demo-new",
          child_id: input.childId,
          result_bucket: input.resultBucket,
          created_at: new Date().toISOString(),
        };
      }
      return api.screenerResults.create({
        child_id: input.childId,
        answers: input.answers,
        result_bucket: input.resultBucket,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screener-results"] });
    },
  });
}
