import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Link } from "wouter";

interface Props {
  childName?: string;
  ptecScore?: number;
  avgScore?: number;
}

export default function FlareAlert({ childName, ptecScore, avgScore }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const name = childName?.trim();

  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5 rounded-xl border"
      style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", borderColor: "#fcd34d" }}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
            Possible flare pattern noticed
          </p>
          {ptecScore !== undefined && avgScore !== undefined && avgScore > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d" }}>
              PTEC {ptecScore}/72 · 4-wk avg {avgScore}
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#b45309" }}>
          {name ? `${name}'s` : "This"} pattern may indicate a possible flare. Your log is ready to share with your doctor.
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <Link href="/ptec">
            <span className="text-[11px] font-medium underline underline-offset-2 cursor-pointer" style={{ color: "#d97706" }}>
              View check-in →
            </span>
          </Link>
          <Link href="/export">
            <span className="text-[11px] font-medium underline underline-offset-2 cursor-pointer" style={{ color: "#d97706" }}>
              Export for doctor →
            </span>
          </Link>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 -mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" style={{ color: "#92400e" }} />
      </button>
    </div>
  );
}
