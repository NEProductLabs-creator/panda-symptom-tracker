import { useState } from "react";
import { useClerk } from "@/hooks/useSupabaseAuth";
import { openExternal } from "@/lib/platform";
import { initAnalytics, ANALYTICS_CONSENT_KEY } from "@/lib/analytics";

interface Props {
  onAgree: () => Promise<void>;
}

function Checkmark() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TermsGate({ onAgree }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signOut } = useClerk();

  async function handleAgree() {
    if (!agreed || loading) return;
    setLoading(true);
    await onAgree();
    localStorage.setItem(ANALYTICS_CONSENT_KEY, '1');
    initAnalytics();
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "var(--bg-app, #fbf7ef)" }}
    >
      <div className="w-full max-w-[560px] bg-card rounded-2xl border border-border shadow-xl p-8 space-y-6">

        <div className="space-y-2">
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 500,
              fontSize: "22px",
              color: "var(--ink, #3a2d22)",
              lineHeight: 1.25,
            }}
          >
            We've updated our Terms and Conditions.
          </h1>
          <p
            style={{
              fontFamily: "'Newsreader', serif",
              fontSize: "15px",
              color: "var(--ink-soft, #6b5d52)",
              lineHeight: 1.65,
            }}
          >
            Please review and agree to the updated terms to continue using the
            PANS/PANDAS Companion.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-sm text-muted-foreground">Read the full documents before agreeing:</p>
          <div className="flex gap-6">
            <a
              href="/terms"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
              onClick={(e) => { e.preventDefault(); void openExternal('/terms'); }}
            >
              Terms and Conditions ↗
            </a>
            <a
              href="/privacy"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
              onClick={(e) => { e.preventDefault(); void openExternal('/privacy'); }}
            >
              Privacy Policy ↗
            </a>
          </div>
        </div>

        <label
          className="flex items-start gap-3 cursor-pointer select-none"
          onClick={() => setAgreed((v) => !v)}
        >
          <div className="mt-0.5 flex-shrink-0">
            <div
              className="w-4 h-4 rounded flex items-center justify-center transition-colors"
              style={{
                border: agreed ? "2px solid var(--clay, #c4623d)" : "2px solid var(--rule-soft, #ece2d0)",
                backgroundColor: agreed ? "var(--clay, #c4623d)" : "transparent",
              }}
            >
              {agreed && <Checkmark />}
            </div>
          </div>
          <span className="text-sm text-foreground leading-snug">
            I have read and agree to the updated{" "}
            <a
              href="/terms"
              rel="noopener noreferrer"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); void openExternal('/terms'); }}
              className="text-primary hover:underline font-medium"
            >
              Terms and Conditions
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              rel="noopener noreferrer"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); void openExternal('/privacy'); }}
              className="text-primary hover:underline font-medium"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleAgree}
            disabled={!agreed || loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={
              agreed && !loading
                ? { background: "var(--clay, #c4623d)", color: "#fff", cursor: "pointer" }
                : {
                    background: "var(--bg-subtle, #f5efe2)",
                    color: "var(--ink-muted, #9a8a7c)",
                    cursor: "not-allowed",
                  }
            }
          >
            {loading ? "Saving…" : "Continue to the app"}
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log out instead
          </button>
        </div>
      </div>
    </div>
  );
}
