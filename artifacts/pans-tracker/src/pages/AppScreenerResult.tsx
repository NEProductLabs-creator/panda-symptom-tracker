import { Link, useRoute } from "wouter";
import { CheckCircle2, ArrowLeft, AlertTriangle, Info } from "lucide-react";
import { useScreenerResults } from "@/hooks/useScreenerResults";
import { track } from "@/lib/analytics";

const BUCKET_CONFIG = {
  strong_match: {
    label: "Strong match for PANS/PANDAS pattern",
    Icon: CheckCircle2,
    color: "var(--terracotta)",
    bg: "hsl(var(--primary) / 0.06)",
    border: "color-mix(in srgb, var(--terracotta) 35%, transparent)",
    description:
      "Your child's symptom profile closely aligns with known PANS/PANDAS presentations. Bring these results to your pediatrician or a PANS/PANDAS specialist as a starting point for a formal evaluation.",
  },
  partial_match: {
    label: "Partial match — worth investigating",
    Icon: AlertTriangle,
    color: "hsl(38, 70%, 45%)",
    bg: "hsl(38, 70%, 45% / 0.06)",
    border: "hsl(38, 70%, 45% / 0.35)",
    description:
      "Some features of your child's symptoms align with PANS/PANDAS. We recommend discussing these symptoms with your child's doctor and keeping a symptom log over the coming weeks.",
  },
  no_match: {
    label: "Low match for PANS/PANDAS pattern",
    Icon: Info,
    color: "hsl(210, 60%, 45%)",
    bg: "hsl(210, 60%, 45% / 0.06)",
    border: "hsl(210, 60%, 45% / 0.35)",
    description:
      "Based on your answers, the symptom profile doesn't strongly suggest PANS/PANDAS at this time. If symptoms persist or worsen, consult your child's doctor. You can always retake this screener as the picture changes.",
  },
};

export default function AppScreenerResult() {
  const [, params] = useRoute("/screener/results/:id");
  const id = params?.id;
  const { data: results = [], isLoading } = useScreenerResults(null);

  const result = results.find((r) => r.id === id);
  const config = result
    ? BUCKET_CONFIG[result.result_bucket as keyof typeof BUCKET_CONFIG]
    : null;

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading result…</p>
      </div>
    );
  }

  if (!result || !config) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Result not found.</p>
        <Link href="/screener">
          <span
            className="text-sm font-medium underline underline-offset-2 cursor-pointer"
            style={{ color: "var(--terracotta)" }}
          >
            Take the screener
          </span>
        </Link>
      </div>
    );
  }

  const Icon = config.Icon;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <Link href="/screener">
        <button
          type="button"
          onClick={() => track("screener_retaken", { from_result_id: id })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Take screener again
        </button>
      </Link>

      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{
          borderColor: config.border,
          backgroundColor: config.bg,
        }}
      >
        <div className="flex items-start gap-3">
          <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: config.color }} />
          <h1
            className="text-lg font-semibold text-foreground leading-snug"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {config.label}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Suggested next steps
        </p>
        <ul className="space-y-2.5 text-sm text-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--terracotta)" }}>→</span>
            <span>
              Share these results with your child's doctor or a PANS/PANDAS specialist as a
              conversation starter for a formal evaluation.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--terracotta)" }}>→</span>
            <span>
              Keep logging daily symptoms to build a documented history for appointments.{" "}
              <Link href="/log">
                <span
                  className="underline underline-offset-2 cursor-pointer"
                  style={{ color: "var(--terracotta)" }}
                >
                  Go to daily log →
                </span>
              </Link>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--terracotta)" }}>→</span>
            <Link href="/learn">
              <span
                className="underline underline-offset-2 cursor-pointer"
                style={{ color: "var(--terracotta)" }}
              >
                Learn more about PANS/PANDAS →
              </span>
            </Link>
          </li>
        </ul>
      </div>

      <p className="text-xs text-muted-foreground text-center px-4">
        This screener is a clinical reference tool, not a diagnosis. Only a qualified clinician can
        diagnose PANS or PANDAS.
      </p>
    </div>
  );
}
