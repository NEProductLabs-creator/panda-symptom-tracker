import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track, identifyAsDemo } from "@/lib/analytics";
import { setReportHistory } from "@/lib/reportHistory";
import { DEMO_REPORT_HISTORY, DEMO_CHILDREN } from "@/lib/demoData";
import { DEMO_CHILDREN_KEY } from "@/lib/storage";
import { useQueryClient } from "@tanstack/react-query";
import { CHILDREN_QUERY_KEY } from "@/hooks/useChildren";
import { setActiveChild } from "@/hooks/useActiveChild";

export const DEMO_KEY = "pans_tracker_demo_mode";
export const DEMO_SCENARIO_KEY = "pans_tracker_demo_scenario";
const DEMO_SWITCH_PROMPT_KEY = "pans_tracker_demo_switch_prompt_dismissed";

export type DemoScenario = "exploring" | "in_crisis" | "tracking" | "multi_child";

interface DemoContextType {
  isDemoMode: boolean;
  demoScenario: DemoScenario | null;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  selectScenario: (scenario: DemoScenario) => void;
  showSavePrompt: boolean;
  dismissSavePrompt: () => void;
  showDemoSwitchPrompt: boolean;
  dismissDemoSwitchPrompt: () => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

// ── Demo save-blocked modal ───────────────────────────────────────────────────

function DemoSavePrompt({
  onDismiss,
  onSignUp,
}: {
  onDismiss: () => void;
  onSignUp: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="p-6 space-y-4">
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Ready to save your own data?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a free account in seconds — your data stays private and secure.
              </p>
            </div>
          </div>
          <Button className="w-full" onClick={onSignUp}>
            Create a free account
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue exploring the demo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Multi-child switcher nudge (multi_child demo only, one-time) ──────────────

function DemoSwitchPrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed top-[90px] right-3 z-[150] max-w-[220px] animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg p-3 relative">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
        <p className="text-[11.5px] text-foreground leading-relaxed pr-5">
          This demo has two children.{" "}
          <span className="font-semibold" style={{ color: "var(--terracotta)" }}>
            Tap "Viewing: Mia"
          </span>{" "}
          to switch to Theo.
        </p>
      </div>
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(
    () => localStorage.getItem(DEMO_KEY) === "1"
  );
  const [demoScenario, setDemoScenario] = useState<DemoScenario | null>(
    () => (localStorage.getItem(DEMO_SCENARIO_KEY) as DemoScenario | null)
  );
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [switchPromptDismissed, setSwitchPromptDismissed] = useState(
    () => localStorage.getItem(DEMO_SWITCH_PROMPT_KEY) === "1"
  );
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const showDemoSwitchPrompt =
    isDemoMode &&
    demoScenario === "multi_child" &&
    !switchPromptDismissed;

  const dismissDemoSwitchPrompt = useCallback(() => {
    localStorage.setItem(DEMO_SWITCH_PROMPT_KEY, "1");
    setSwitchPromptDismissed(true);
  }, []);

  const enterDemoMode = useCallback(() => {
    localStorage.setItem(DEMO_KEY, "1");
    setIsDemoMode(true);
    identifyAsDemo();
    // Land on scenario picker instead of dashboard
    navigate("/demo/pick");
  }, [navigate]);

  const exitDemoMode = useCallback(() => {
    localStorage.removeItem(DEMO_KEY);
    localStorage.removeItem(DEMO_SCENARIO_KEY);
    localStorage.removeItem(DEMO_CHILDREN_KEY);
    localStorage.removeItem(DEMO_SWITCH_PROMPT_KEY);
    localStorage.removeItem("panstracker.activeChildId");
    setIsDemoMode(false);
    setDemoScenario(null);
    setSwitchPromptDismissed(false);
    qc.invalidateQueries({ queryKey: CHILDREN_QUERY_KEY });
  }, [qc]);

  const selectScenario = useCallback(
    (scenario: DemoScenario) => {
      localStorage.setItem(DEMO_SCENARIO_KEY, scenario);
      setDemoScenario(scenario);

      // Reset the switcher nudge so it shows fresh for multi_child
      localStorage.removeItem(DEMO_SWITCH_PROMPT_KEY);
      setSwitchPromptDismissed(false);

      // Seed fake children for this scenario into localStorage
      const kids = DEMO_CHILDREN[scenario];
      localStorage.setItem(DEMO_CHILDREN_KEY, JSON.stringify(kids));

      // Set the active child (first = default; Mia for multi_child)
      const firstKid = kids[0];
      if (firstKid) {
        localStorage.setItem("panstracker.activeChildId", firstKid.id);
      }

      // Invalidate children cache so useChildren re-reads from localStorage
      qc.invalidateQueries({ queryKey: CHILDREN_QUERY_KEY });

      // Seed report history for this scenario
      setReportHistory(DEMO_REPORT_HISTORY[scenario]);

      track("demo_scenario_selected", {
        scenario,
        has_multiple_children: scenario === "multi_child",
      });

      // Navigate to scenario landing page
      if (scenario === "exploring") navigate("/learn");
      else if (scenario === "in_crisis") navigate("/right-now");
      else navigate("/");
    },
    [navigate, qc],
  );

  const dismissSavePrompt = useCallback(() => setShowSavePrompt(false), []);

  useEffect(() => {
    if (showSavePrompt) track("demo_save_prompt_shown");
  }, [showSavePrompt]);

  // Hooks dispatch this event when a write is attempted in demo mode
  useEffect(() => {
    const handler = () => setShowSavePrompt(true);
    window.addEventListener("pans:demo:save", handler);
    return () => window.removeEventListener("pans:demo:save", handler);
  }, []);

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        demoScenario,
        enterDemoMode,
        exitDemoMode,
        selectScenario,
        showSavePrompt,
        dismissSavePrompt,
        showDemoSwitchPrompt,
        dismissDemoSwitchPrompt,
      }}
    >
      {children}
      {showSavePrompt && (
        <DemoSavePrompt
          onDismiss={dismissSavePrompt}
          onSignUp={() => {
            track("demo_save_prompt_converted");
            dismissSavePrompt();
            exitDemoMode();
            navigate("/sign-up");
          }}
        />
      )}
      {showDemoSwitchPrompt && (
        <DemoSwitchPrompt onDismiss={dismissDemoSwitchPrompt} />
      )}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemoContext must be used within DemoProvider");
  return ctx;
}

// ── Non-dismissable demo banner (shown on every screen in demo mode) ──────────

export function DemoBanner() {
  const { exitDemoMode } = useDemoContext();
  const [, navigate] = useLocation();

  function handleExit(to: string) {
    exitDemoMode();
    navigate(to);
  }

  return (
    <div className="bg-violet-50 border-b border-violet-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
      <p className="text-xs text-violet-800 leading-snug flex-1 min-w-0">
        You're viewing a demo.{" "}
        <Link
          href="/sign-up"
          onClick={() => { track("demo_cta_clicked"); exitDemoMode(); }}
          className="font-semibold underline underline-offset-2 hover:text-violet-900 transition-colors"
        >
          Create a free account
        </Link>{" "}
        to track your child's symptoms across all your devices.
      </p>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/demo/pick"
          className="text-xs text-violet-700 hover:text-violet-900 whitespace-nowrap font-medium transition-colors"
        >
          Try another →
        </Link>
        <button
          type="button"
          onClick={() => handleExit("/sign-in")}
          className="text-xs text-violet-700 hover:text-violet-900 whitespace-nowrap font-medium transition-colors"
        >
          ← Sign in
        </button>
      </div>
    </div>
  );
}
