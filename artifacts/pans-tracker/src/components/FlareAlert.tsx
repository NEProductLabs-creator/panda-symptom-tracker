import { useState } from "react";
import { AlertCircle, X, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  childName?: string;
  startDate: string;
  consecutiveDays: number;
}

export default function FlareAlert({ childName, startDate, consecutiveDays }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const name = childName?.trim() || null;
  const since = format(parseISO(startDate), "MMMM d");
  const dayWord = consecutiveDays === 1 ? "day" : "days";

  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5 rounded-xl border"
      style={{
        background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
        borderColor: "#fcd34d",
      }}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
          Possible flare pattern noticed
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#b45309" }}>
          {name ? `${name}'s` : "Symptom"} scores have been elevated for{" "}
          {consecutiveDays} {dayWord} (since {since}). This pattern may suggest
          a possible flare — your log is ready to share with your doctor whenever
          you're ready.
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <FileText className="w-3 h-3" style={{ color: "#d97706" }} />
          <span className="text-[11px] font-medium" style={{ color: "#d97706" }}>
            Export PDF → to prepare your doctor summary
          </span>
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
