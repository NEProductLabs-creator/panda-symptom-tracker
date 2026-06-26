import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import ScreenerWizard from "@/components/ScreenerWizard";
import { useActiveChild, setActiveChild } from "@/hooks/useActiveChild";
import { useChildren } from "@/hooks/useChildren";
import { useAddScreenerResult } from "@/hooks/useScreenerResults";
import { track } from "@/lib/analytics";
import { Check } from "lucide-react";
import type { ScreenerAnswers, ResultBucket } from "@/lib/types";

export default function AppScreener() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const activeChild = useActiveChild();
  const { data: children = [] } = useChildren();
  const { mutateAsync: addResult } = useAddScreenerResult();
  const completedRef = useRef(false);
  const maxStepRef = useRef(0);

  const params = new URLSearchParams(window.location.search);
  const entryPoint = params.get("from") ?? "in_app";

  useEffect(() => {
    track("screener_started", { mode: "authenticated", entry_point: entryPoint });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onUnload() {
      if (!completedRef.current) {
        track("screener_abandoned", { last_step: maxStepRef.current, mode: "authenticated" });
      }
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  function handleStepChange(step: number) {
    if (step > maxStepRef.current) maxStepRef.current = step;
    track("screener_step_completed", { step, mode: "authenticated" });
  }

  async function handleComplete(answers: ScreenerAnswers, resultBucket: ResultBucket) {
    completedRef.current = true;
    track("screener_completed", { result_bucket: resultBucket, mode: "authenticated" });
    try {
      const record = await addResult({
        childId: activeChild?.id ?? null,
        answers,
        resultBucket,
      });
      navigate(`/screener/results/${record.id}`);
    } catch {
      navigate("/screener");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: "var(--terracotta)" }}
        >
          Diagnostic screener
        </p>
        <h1
          className="text-2xl font-semibold text-foreground leading-tight"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Could this be PANS or PANDAS?
        </h1>
        {activeChild && (
          <p className="text-sm text-muted-foreground mt-1">
            Completing for:{" "}
            <span className="font-medium text-foreground">{activeChild.name}</span>
          </p>
        )}
      </div>

      {children.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Who is this screener for?
          </p>
          <div className="flex flex-wrap gap-2">
            {children.map((child) => {
              const isActive = child.id === activeChild?.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setActiveChild(child.id, qc)}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                    isActive
                      ? "text-white border-transparent"
                      : "border-border text-foreground hover:border-primary/40",
                  ].join(" ")}
                  style={
                    isActive
                      ? { backgroundColor: "var(--terracotta)" }
                      : undefined
                  }
                >
                  {isActive && <Check className="w-3.5 h-3.5" />}
                  {child.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ScreenerWizard
        key={activeChild?.id ?? "no-child"}
        mode="authenticated"
        onComplete={handleComplete}
        onStepChange={handleStepChange}
      />
    </div>
  );
}
