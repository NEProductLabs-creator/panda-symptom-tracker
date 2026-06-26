import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import ScreenerWizard, {
  type ScreenerAnswers,
  type ResultBucket,
} from "@/components/ScreenerWizard";
import { track } from "@/lib/analytics";

const DRAFT_KEY = "screener_draft";
export const SCREENER_RESULT_KEY = "screener_result";

export interface ScreenerResult {
  answers: ScreenerAnswers;
  resultBucket: ResultBucket;
}

// Demo answers that produce a "strong_match" result
const DEMO_ANSWERS: ScreenerAnswers = {
  ageAtOnset: "8",
  suddenOnset: "yes",
  symptomStartDate: "2024-01-15",
  ocdSymptoms: "yes",
  ocdDescription: "Repeated hand washing, contamination fears, fear of being dirty",
  foodRestriction: "no",
  foodDescription: "",
  accompanyingSymptoms: [
    "Anxiety (new or sharply worsened)",
    "Irritability, aggression, or oppositional behavior",
    "Sleep disturbance",
    "Behavioral or developmental regression (acting younger)",
  ],
  illnesses: ["Strep throat (confirmed by test)"],
  otherIllnessDescription: "",
  householdSick: "no",
  alternativeDiagnosis: "no",
  alternativeDiagnosisDescription: "",
};

function hasDraft(): boolean {
  try {
    return !!sessionStorage.getItem(DRAFT_KEY);
  } catch {
    return false;
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

// ─── Draft resume prompt ───────────────────────────────────────────────────────

function DraftPrompt({
  onResume,
  onStartOver,
}: {
  onResume: () => void;
  onStartOver: () => void;
}) {
  return (
    <div className="mb-8 rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-sm font-medium text-foreground mb-3">
        You have an unfinished screener saved. Resume where you left off?
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onResume}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Resume where I left off
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="h-9 rounded-lg border border-border bg-background px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ScreenerPage() {
  const [, navigate] = useLocation();

  const isDemo =
    new URLSearchParams(window.location.search).get("demo") === "1";

  // Evaluate draft once on mount (before any renders change sessionStorage)
  const [draftPresent] = useState(() => !isDemo && hasDraft());
  const [wizardMode, setWizardMode] = useState<"pending" | "resume" | "fresh">(
    draftPresent ? "pending" : "fresh",
  );

  const completedRef = useRef(false);
  const maxStepRef = useRef(isDemo ? 5 : 0);

  // Fire screener_started once on mount
  useEffect(() => {
    track("screener_started", { mode: "anonymous" });
  }, []);

  // Fire screener_abandoned on page unload if not completed
  useEffect(() => {
    function handleUnload() {
      if (!completedRef.current) {
        track("screener_abandoned", {
          last_step: maxStepRef.current,
          mode: "anonymous",
        });
      }
    }
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  function handleStepChange(completedStep: number) {
    if (completedStep > maxStepRef.current) maxStepRef.current = completedStep;
    track("screener_step_completed", { step: completedStep, mode: "anonymous" });
  }

  function handleComplete(answers: ScreenerAnswers, resultBucket: ResultBucket) {
    completedRef.current = true;
    track("screener_completed", { result_bucket: resultBucket, mode: "anonymous" });
    try {
      const result: ScreenerResult = { answers, resultBucket };
      sessionStorage.setItem(SCREENER_RESULT_KEY, JSON.stringify(result));
    } catch {}
    navigate("/screener/results");
  }

  function handleResume() {
    setWizardMode("resume");
  }

  function handleStartOver() {
    clearDraft();
    setWizardMode("fresh");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Slim public nav */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
          >
            <span
              className="text-base font-semibold leading-none"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              PANS &amp; PANDAS
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5 hidden sm:inline">
              Companion
            </span>
          </Link>
          <Link
            href="/sign-up"
            className="text-sm text-primary hover:underline underline-offset-4"
          >
            Create free account
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-10">
        {wizardMode === "pending" ? (
          <DraftPrompt onResume={handleResume} onStartOver={handleStartOver} />
        ) : (
          <ScreenerWizard
            key={wizardMode}
            mode="anonymous"
            onComplete={handleComplete}
            onStepChange={handleStepChange}
            initialAnswers={isDemo ? DEMO_ANSWERS : undefined}
            initialStep={isDemo ? 5 : undefined}
          />
        )}
      </main>

      <footer className="border-t border-border/40 mt-16">
        <div className="max-w-2xl mx-auto px-5 py-6 flex flex-wrap gap-4 items-center justify-between text-xs text-muted-foreground">
          <p>
            This screener is for informational purposes only and is not a
            medical diagnosis.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
