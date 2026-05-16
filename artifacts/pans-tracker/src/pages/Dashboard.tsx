import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Link } from "wouter";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedications } from "@/hooks/useMedications";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { useMilestones } from "@/hooks/useMilestones";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import SymptomChart, { CATEGORIES, getScoreColor } from "@/components/charts/SymptomChart";
import Sparkline from "@/components/charts/Sparkline";
import FlareAlert from "@/components/FlareAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Pill,
  Activity,
  Heart,
} from "lucide-react";
import { SymptomLog, FREQUENCY_LABELS } from "@/lib/types";
import { computeDailyScore, detectCurrentFlare } from "@/lib/flare";

const today = format(new Date(), "yyyy-MM-dd");
const todayDisplay = format(new Date(), "EEEE, MMMM d, yyyy");

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-3 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium text-foreground flex-1 min-w-0 leading-tight">
        {label}
      </span>
      <div
        className="flex gap-1 flex-shrink-0"
        data-testid={`score-${label.toLowerCase().replace(/\s|\//g, "-")}`}
      >
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            data-testid={`score-btn-${label.toLowerCase().replace(/\s|\//g, "-")}-${n}`}
            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all touch-manipulation ${
              value === n
                ? "bg-primary text-primary-foreground shadow-sm scale-105"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { logs, addLog } = useSymptomLogs();
  const { medications } = useMedications();
  const { medLibrary } = useMedLibrary();
  const { milestones } = useMilestones();
  const { baseline } = useChildBaseline();
  const { toast } = useToast();

  const existingToday = logs.find((l) => l.date === today);

  const [scores, setScores] = useState({
    ocd: existingToday?.ocd ?? 0,
    anxiety: existingToday?.anxiety ?? 0,
    rage: existingToday?.rage ?? 0,
    tics: existingToday?.tics ?? 0,
    sleep: existingToday?.sleep ?? 0,
    cognition: existingToday?.cognition ?? 0,
  });
  const [notes, setNotes] = useState(existingToday?.notes ?? "");
  const [medicationsTaken, setMedicationsTaken] = useState<string[]>(
    existingToday?.medicationsTaken ?? []
  );
  const [saved, setSaved] = useState(false);
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(30);

  function toggleMed(id: string) {
    setMedicationsTaken((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function handleSave() {
    const log: SymptomLog = {
      id: existingToday?.id ?? `log-${Date.now()}`,
      date: today,
      ...scores,
      notes,
      medicationsTaken,
    };
    addLog(log);
    setSaved(true);
    toast({ title: "Log saved", description: "Today's symptoms have been recorded." });
    setTimeout(() => setSaved(false), 3000);
  }

  // Snapshot score (0–10 display scale for the badge)
  const todayRawScore = existingToday
    ? ((existingToday.ocd +
        existingToday.anxiety +
        existingToday.rage +
        existingToday.tics +
        existingToday.sleep +
        existingToday.cognition) /
        6) *
      2
    : null;
  const todayScore = todayRawScore !== null ? Math.round(todayRawScore * 10) / 10 : null;
  const todayScoreColor = todayScore !== null ? getScoreColor(todayScore) : null;
  const todayScoreLabel =
    todayScore === null ? null : todayScore <= 3 ? "Mild" : todayScore <= 6 ? "Moderate" : "Severe";

  // Raw 0–30 total for flare detection + baseline reminder threshold
  const todayTotal = existingToday ? computeDailyScore(existingToday) : 0;

  const todayMedsTaken = existingToday?.medicationsTaken?.length
    ? medLibrary.filter((m) => existingToday.medicationsTaken!.includes(m.id))
    : [];

  // Flare detection
  const flareStatus = useMemo(() => detectCurrentFlare(logs), [logs]);

  // Sparkline data: last 30 days of total scores
  const sparklineData = useMemo(() => {
    const logMap = new Map(logs.map((l) => [l.date, l]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
      const log = logMap.get(d);
      return {
        date: format(subDays(new Date(), 29 - i), "MMM d"),
        score: log ? computeDailyScore(log) : 0,
        hasLog: !!log,
      };
    });
  }, [logs]);

  const hasAnyLog = logs.length > 0;
  const childName = baseline?.childName?.trim();
  // Show baseline reminder when today's total score is high (≥15/30) and baseline exists
  const showBaselineReminder = baseline && existingToday && todayTotal >= 15;

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-4 pb-28">

      {/* Flare alert banner */}
      {flareStatus.isActive && flareStatus.startDate && (
        <FlareAlert
          childName={childName}
          startDate={flareStatus.startDate}
          consecutiveDays={flareStatus.consecutiveDays}
        />
      )}

      {/* Today's Snapshot + Sparkline */}
      <Card className="border-border shadow-sm overflow-hidden">
        <div
          className="h-1 w-full"
          style={{
            backgroundColor: todayScoreColor ?? "hsl(var(--border))",
            opacity: 0.7,
          }}
        />
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                {childName ? `${childName}'s Snapshot` : "Today's Snapshot"}
              </p>
              <p className="text-sm font-medium text-foreground">{todayDisplay}</p>

              {existingToday ? (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Daily score:</span>
                    <span className="text-sm font-bold" style={{ color: todayScoreColor ?? undefined }}>
                      {todayScore?.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({todayTotal}/30 total)
                    </span>
                  </div>
                  {todayMedsTaken.length > 0 ? (
                    <div className="flex items-start gap-2">
                      <Pill className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">
                        {todayMedsTaken.map((m) => m.name).join(", ")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Pill className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">No medications logged today</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No entry yet today</p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {todayScore !== null && todayScoreColor && todayScoreLabel ? (
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
                  style={{ backgroundColor: todayScoreColor }}
                >
                  {todayScoreLabel}
                </span>
              ) : (
                <Link href="#log-form">
                  <Button size="sm" className="text-xs h-8" data-testid="button-log-today-snapshot">
                    Log Today
                  </Button>
                </Link>
              )}
              {existingToday && (
                <CheckCircle2 className="w-4 h-4" style={{ color: todayScoreColor ?? undefined }} />
              )}
            </div>
          </div>

          {/* Sparkline — 30-day total severity trend */}
          {hasAnyLog && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">
                30-day severity trend (total 0–30)
              </p>
              <Sparkline data={sparklineData} height={44} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Baseline reminder */}
      {showBaselineReminder && (
        <Link href="/baseline">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:opacity-90 transition-opacity"
            style={{
              background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
              borderColor: "#fcd34d",
            }}
          >
            <Heart className="w-4 h-4 flex-shrink-0 fill-amber-400 text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "#92400e" }}>
                Remember your baseline
              </p>
              <p className="text-[11px] leading-snug mt-0.5" style={{ color: "#b45309" }}>
                {childName
                  ? `Tap to see who ${childName} is when they're feeling like themselves.`
                  : "Tap to see who your child is when they're feeling like themselves."}
              </p>
            </div>
            <span className="text-[11px] font-medium flex-shrink-0" style={{ color: "#d97706" }}>
              View →
            </span>
          </div>
        </Link>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Logs (30d)
            </p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-log-count">
              {
                logs.filter(
                  (l) => l.date >= format(new Date(Date.now() - 30 * 86400000), "yyyy-MM-dd")
                ).length
              }
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Active Meds
            </p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-active-meds">
              {medLibrary.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Today
            </p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-today-status">
              {existingToday ? "Done" : "Pending"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle
              className="flex items-center gap-2 text-base font-semibold"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <TrendingUp className="w-4 h-4 text-primary" />
              {chartDays}-Day Trend
            </CardTitle>
            <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    chartDays === d
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No symptom data yet.</p>
              <p className="text-xs mt-1">Log today's symptoms below to get started.</p>
            </div>
          ) : (
            <SymptomChart
              logs={logs}
              medications={medications}
              medLibrary={medLibrary}
              milestones={milestones}
              days={chartDays}
            />
          )}
        </CardContent>
      </Card>

      {/* Today's quick log */}
      <Card className="border-border shadow-sm" id="log-form">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base font-semibold flex items-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {existingToday && <CheckCircle2 className="w-4 h-4 text-primary" />}
            {existingToday ? "Update Today's Log" : "Log Today's Symptoms"}
          </CardTitle>
          {existingToday && (
            <p className="text-xs text-muted-foreground">
              You've already logged today — update below if needed.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-0 p-5 pt-0">
          <div className="divide-y-0">
            {CATEGORIES.map((cat) => (
              <ScoreInput
                key={cat.key}
                label={cat.label}
                value={scores[cat.key as keyof typeof scores]}
                onChange={(v) => setScores((s) => ({ ...s, [cat.key]: v }))}
              />
            ))}
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Medications Taken Today
              </Label>
              {medLibrary.length === 0 && (
                <Link href="/library">
                  <span className="text-xs text-primary hover:underline cursor-pointer">
                    Set up library
                  </span>
                </Link>
              )}
            </div>
            {medLibrary.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border text-muted-foreground">
                <BookOpen className="w-4 h-4 flex-shrink-0 opacity-40" />
                <p className="text-xs">
                  Add medications to your{" "}
                  <Link href="/library">
                    <span className="text-primary hover:underline cursor-pointer font-medium">
                      Med Library
                    </span>
                  </Link>{" "}
                  to see a checklist here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="med-checklist-today">
                {medLibrary.map((med) => (
                  <label
                    key={med.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors touch-manipulation"
                    data-testid={`med-check-${med.id}`}
                  >
                    <Checkbox
                      checked={medicationsTaken.includes(med.id)}
                      onCheckedChange={() => toggleMed(med.id)}
                      data-testid={`checkbox-med-${med.id}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{med.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {med.dosage} · {FREQUENCY_LABELS[med.frequency]}
                      </p>
                    </div>
                    {medicationsTaken.includes(med.id) && (
                      <Pill className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-4">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations, triggers, or context for today..."
              className="resize-none h-20 text-sm"
              data-testid="input-notes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-5 py-3 bg-background/95 backdrop-blur-sm border-t border-border md:static md:bg-transparent md:border-0 md:backdrop-blur-none md:p-0 md:pb-2">
        <div className="max-w-5xl mx-auto">
          <Button
            onClick={handleSave}
            className="w-full md:w-auto"
            size="lg"
            data-testid="button-save-log"
          >
            {saved ? "Saved!" : existingToday ? "Update Log" : "Save Today's Log"}
          </Button>
        </div>
      </div>
    </div>
  );
}
