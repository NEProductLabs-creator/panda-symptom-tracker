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

export const DEMO_KEY = "pans_tracker_demo_mode";

interface DemoContextType {
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  showSavePrompt: boolean;
  dismissSavePrompt: () => void;
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

// ── Provider ─────────────────────────────────────────────────────────────────

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(
    () => localStorage.getItem(DEMO_KEY) === "1"
  );
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [, navigate] = useLocation();

  const enterDemoMode = useCallback(() => {
    localStorage.setItem(DEMO_KEY, "1");
    setIsDemoMode(true);
    identifyAsDemo();
    navigate("/");
  }, [navigate]);

  const exitDemoMode = useCallback(() => {
    localStorage.removeItem(DEMO_KEY);
    setIsDemoMode(false);
  }, []);

  const dismissSavePrompt = useCallback(() => setShowSavePrompt(false), []);

  useEffect(() => {
    if (showSavePrompt) track('demo_save_prompt_shown');
  }, [showSavePrompt]);

  // Hooks dispatch this event when a write is attempted in demo mode
  useEffect(() => {
    const handler = () => setShowSavePrompt(true);
    window.addEventListener("pans:demo:save", handler);
    return () => window.removeEventListener("pans:demo:save", handler);
  }, []);

  return (
    <DemoContext.Provider
      value={{ isDemoMode, enterDemoMode, exitDemoMode, showSavePrompt, dismissSavePrompt }}
    >
      {children}
      {showSavePrompt && (
        <DemoSavePrompt
          onDismiss={dismissSavePrompt}
          onSignUp={() => {
            track('demo_save_prompt_converted');
            dismissSavePrompt();
            exitDemoMode();
            navigate("/sign-up");
          }}
        />
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
          onClick={() => { track('demo_cta_clicked'); exitDemoMode(); }}
          className="font-semibold underline underline-offset-2 hover:text-violet-900 transition-colors"
        >
          Create a free account
        </Link>{" "}
        to track your child's symptoms across all your devices.
      </p>
      <button
        type="button"
        onClick={() => handleExit("/sign-in")}
        className="text-xs text-violet-700 hover:text-violet-900 whitespace-nowrap font-medium transition-colors flex-shrink-0"
      >
        ← Sign in
      </button>
    </div>
  );
}
