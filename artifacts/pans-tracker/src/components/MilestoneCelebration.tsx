import { X } from "lucide-react";
import { useHopeBoard } from "@/hooks/useHopeBoard";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { usePTECLogs } from "@/hooks/usePTECLogs";
import { useMemo } from "react";
import { format, subDays, parseISO } from "date-fns";
import { computeDailyScore } from "@/lib/flare";

interface Milestone {
  id: string;
  emoji: string;
  message: string;
}

function useActiveMilestones(): Milestone[] {
  const { logs } = useSymptomLogs();
  const { ptecLogs } = usePTECLogs();

  return useMemo(() => {
    const found: Milestone[] = [];
    const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    const today = format(new Date(), "yyyy-MM-dd");

    // 3 consecutive low-score days (≤9 = mild or better)
    if (sorted.length >= 3) {
      const top3 = sorted.slice(0, 3);
      if (top3.every((l) => computeDailyScore(l) <= 9)) {
        found.push({
          id: "three_good_days",
          emoji: "🌱",
          message: "3 good days in a row. Hold onto this.",
        });
      }
    }

    // Significant PTEC drop (≥15% improvement from previous check-in)
    if (ptecLogs.length >= 2) {
      const sortedPTEC = [...ptecLogs].sort((a, b) =>
        b.weekStartDate.localeCompare(a.weekStartDate)
      );
      const latest = sortedPTEC[0];
      const prev = sortedPTEC[1];
      if (prev.totalScore > 0) {
        const drop = (prev.totalScore - latest.totalScore) / prev.totalScore;
        if (drop >= 0.15) {
          found.push({
            id: `ptec_drop_${latest.weekStartDate}`,
            emoji: "📈",
            message: `Your data shows real improvement. This is progress.`,
          });
        }
      }
    }

    // Flare-free streaks — no day with score > 15 in last N days
    const flareStreaks = [
      { days: 7,   id: "flare_free_7",   emoji: "✨", min: 5,  msg: "One full week without a significant flare. That's real." },
      { days: 30,  id: "flare_free_30",  emoji: "🌙", min: 15, msg: "One month of relative calm. Your hard work is showing." },
      { days: 90,  id: "flare_free_90",  emoji: "🌟", min: 45, msg: "Three months. The progress you've made is remarkable." },
      { days: 180, id: "flare_free_180", emoji: "☀️", min: 90, msg: "Six months. You and your child have come so far." },
    ];

    for (const streak of flareStreaks) {
      const cutoff = format(subDays(new Date(), streak.days), "yyyy-MM-dd");
      const inWindow = logs.filter((l) => l.date >= cutoff && l.date <= today);
      if (inWindow.length >= streak.min && inWindow.every((l) => computeDailyScore(l) <= 15)) {
        found.push({ id: streak.id, emoji: streak.emoji, message: streak.msg });
      }
    }

    return found;
  }, [logs, ptecLogs]);
}

export default function MilestoneCelebration() {
  const { isDismissed, dismissMilestone } = useHopeBoard();
  const milestones = useActiveMilestones();
  const visible = milestones.filter((m) => !isDismissed(m.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="milestone-celebrations">
      {visible.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef9ee 100%)",
            borderColor: "#f59e0b",
          }}
          data-testid={`milestone-${m.id}`}
        >
          <span className="text-xl flex-shrink-0">{m.emoji}</span>
          <p className="flex-1 text-sm font-medium text-amber-900">{m.message}</p>
          <button
            type="button"
            onClick={() => dismissMilestone(m.id)}
            className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-amber-200 flex items-center justify-center transition-colors"
            title="Dismiss"
            data-testid={`dismiss-${m.id}`}
          >
            <X className="w-3.5 h-3.5 text-amber-600" />
          </button>
        </div>
      ))}
    </div>
  );
}
