import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SymptomLog, Medication } from "@/lib/types";
import {
  getTopTriggerCorrelations,
  getMedInsights,
  SYMPTOM_INSIGHT_LABELS,
  TRIGGER_CATEGORY_LABELS,
} from "@/lib/triggerCorrelation";
import { useTriggerLog } from "@/hooks/useTriggerLog";
import { DEMO_KEY } from "@/contexts/DemoContext";

interface InsightsCardProps {
  logs: SymptomLog[];
  medications: Medication[];
}

export default function InsightsCard({ logs, medications }: InsightsCardProps) {
  const isDemoMode = useMemo(() => {
    try { return localStorage.getItem(DEMO_KEY) === "1"; } catch { return false; }
  }, []);

  const { entries: triggerEntries } = useTriggerLog();

  const triggerInsights = useMemo(
    () => getTopTriggerCorrelations(logs, triggerEntries),
    [logs, triggerEntries],
  );

  const medInsights = useMemo(
    () => getMedInsights(logs, medications),
    [logs, medications],
  );

  const hasInsights = triggerInsights.length > 0 || medInsights.length > 0;

  // In demo mode with no computable insights, hide the card entirely
  if (isDemoMode && !hasInsights) return null;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle
          className="flex items-center gap-2 text-base font-semibold"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          <Lightbulb className="w-4 h-4 text-primary" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasInsights ? (
          <p
            className="text-sm text-muted-foreground italic"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            No insights yet — log for a few weeks to see patterns.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {triggerInsights.map((ins, i) => (
              <li key={`t-${i}`} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 mt-[7px] flex-shrink-0" />
                <p className="text-sm text-foreground leading-snug">
                  {TRIGGER_CATEGORY_LABELS[ins.category]} often precede{" "}
                  {SYMPTOM_INSIGHT_LABELS[ins.symptom]} spikes (avg +
                  {ins.avgDelta.toFixed(1)} over 7 days)
                </p>
              </li>
            ))}
            {medInsights.map((ins, i) => (
              <li key={`m-${i}`} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 mt-[7px] flex-shrink-0" />
                <p className="text-sm text-foreground leading-snug">
                  {ins.medName} (started{" "}
                  {format(parseISO(ins.startDate + "T12:00:00"), "MMM d")}
                  ): average severity dropped from {ins.beforeAvg.toFixed(1)} to{" "}
                  {ins.afterAvg.toFixed(1)} over 14 days
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
