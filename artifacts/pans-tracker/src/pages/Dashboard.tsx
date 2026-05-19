import { useMemo, useState, useEffect, useRef } from "react";
import { format, subDays, parseISO, startOfWeek } from "date-fns";
import { Link } from "wouter";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedications } from "@/hooks/useMedications";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { useMilestones } from "@/hooks/useMilestones";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { usePTECLogs } from "@/hooks/usePTECLogs";
import SymptomChart, { CATEGORIES, getScoreColor } from "@/components/charts/SymptomChart";
import Sparkline from "@/components/charts/Sparkline";
import FlareAlert from "@/components/FlareAlert";
import DailyAffirmation from "@/components/DailyAffirmation";
import MilestoneCelebration from "@/components/MilestoneCelebration";
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
  ClipboardCheck,
  ClipboardList,
  CalendarRange,
  FileText,
  HelpCircle,
  X,
} from "lucide-react";
import { SymptomLog, FREQUENCY_LABELS } from "@/lib/types";
import { computeDailyScore } from "@/lib/flare";
import { detectPTECFlare, getPTECSeverity } from "@/lib/ptec";

const today = format(new Date(), "yyyy-MM-dd");
const todayDisplay = format(new Date(), "EEEE, MMMM d, yyyy");

// ─── How It Works modal ───────────────────────────────────────────────────────

const HOW_IT_WORKS_SLIDES = [
  {
    Icon: ClipboardList,
    title: "Log Today",
    body: "Takes 60 seconds. Rate your child's symptoms daily to build a picture of their health over time.",
  },
  {
    Icon: ClipboardCheck,
    title: "Weekly Check-In",
    body: "A clinical PTEC assessment. Complete this once a week to track detailed symptom patterns for doctor visits.",
  },
  {
    Icon: CalendarRange,
    title: "Timeline",
    body: "See every day at a glance. Tap any day to review what you logged.",
  },
  {
    Icon: FileText,
    title: "Doctor Ready",
    body: "When you have an appointment coming up, generate a printable summary of your child's recent symptoms and trends.",
  },
] as const;

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const [slide, setSlide] = useState(0);
  const { Icon, title, body } = HOW_IT_WORKS_SLIDES[slide];
  const isLast = slide === HOW_IT_WORKS_SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-background rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center px-5 pt-5 pb-1">
          <div className="flex gap-1.5">
            {HOW_IT_WORKS_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === slide ? "w-5 h-2 bg-primary" : "w-2 h-2 bg-muted hover:bg-muted-foreground/40"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-7 pt-4 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <div className="space-y-2">
            <h3
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>

          <div className="flex gap-2 pt-1">
            {slide > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setSlide(slide - 1)}>
                Back
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={() => (isLast ? onClose() : setSlide(slide + 1))}
            >
              {isLast ? "Got it!" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 py-3 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium text-foreground leading-tight sm:flex-1 sm:min-w-0">
        {label}
      </span>
      <div
        className="flex gap-1 sm:flex-shrink-0"
        data-testid={`score-${label.toLowerCase().replace(/\s|\//g, "-")}`}
      >
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            data-testid={`score-btn-${label.toLowerCase().replace(/\s|\//g, "-")}-${n}`}
            className={`flex-1 sm:flex-none sm:w-10 h-10 rounded-lg text-sm font-bold transition-all touch-manipulation ${
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
  const { logs, loading, addLog } = useSymptomLogs();
  const { medications } = useMedications();
  const { medLibrary } = useMedLibrary();
  const { milestones } = useMilestones();
  const { baseline } = useChildBaseline();
  const { ptecLogs } = usePTECLogs();
  const { toast } = useToast();

  const existingToday = logs.find((l) => l.date === today);

  const [scores, setScores] = useState({ ocd: 0, anxiety: 0, rage: 0, tics: 0, sleep: 0, cognition: 0 });
  const [notes, setNotes] = useState("");
  const [medicationsTaken, setMedicationsTaken] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Once Supabase data loads, pre-fill the form with today's existing entry (if any)
  const formInitialized = useRef(false);
  useEffect(() => {
    if (loading || formInitialized.current) return;
    formInitialized.current = true;
    const entry = logs.find((l) => l.date === today);
    if (entry) {
      setScores({ ocd: entry.ocd, anxiety: entry.anxiety, rage: entry.rage, tics: entry.tics, sleep: entry.sleep, cognition: entry.cognition });
      setNotes(entry.notes ?? "");
      setMedicationsTaken(entry.medicationsTaken ?? []);
    }
  }, [loading, logs]);
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

  // Snapshot score (0–10 display scale for the badge).
  // sleep and cognition use an inverted scale (higher = better), so invert them here.
  const todayRawScore = existingToday
    ? ((existingToday.ocd +
        existingToday.anxiety +
        existingToday.rage +
        existingToday.tics +
        (5 - existingToday.sleep) +
        (5 - existingToday.cognition)) /
        6) *
      2
    : null;
  const todayScore = todayRawScore !== null ? Math.round(todayRawScore * 10) / 10 : null;
  const todayScoreColor = todayScore !== null ? getScoreColor(todayScore) : null;
  const todayScoreLabel =
    todayScore === null ? null : todayScore <= 3 ? "Mild" : todayScore <= 6 ? "Moderate" : "Severe";

  const todayTotal = existingToday ? computeDailyScore(existingToday) : 0;

  const todayMedsTaken = existingToday?.medicationsTaken?.length
    ? medLibrary.filter((m) => existingToday.medicationsTaken!.includes(m.id))
    : [];

  // PTEC-based flare detection (primary)
  const flareStatus = useMemo(() => detectPTECFlare(ptecLogs), [ptecLogs]);

  // Latest PTEC entry for snapshot display
  const latestPTEC = useMemo(
    () => [...ptecLogs].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0] ?? null,
    [ptecLogs]
  );
  const latestPTECSev = latestPTEC ? getPTECSeverity(latestPTEC.totalScore) : null;

  // Sparkline data: last 30 days of total daily scores
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

  // PTEC sparkline: last 8 weekly entries
  const ptecSparkData = useMemo(() => {
    const last8 = [...ptecLogs].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)).slice(-8);
    return last8.map((log) => ({
      date: format(parseISO(log.weekStartDate), "MMM d"),
      score: log.totalScore,
      hasLog: true,
    }));
  }, [ptecLogs]);

  // Range-filtered logs + avg severity (both driven by chartDays)
  const rangeLogs = useMemo(() => {
    const cutoff = format(subDays(new Date(), chartDays - 1), "yyyy-MM-dd");
    return logs.filter((l) => l.date >= cutoff);
  }, [logs, chartDays]);

  const avgSeverity = useMemo(() => {
    if (rangeLogs.length === 0) return null;
    const total = rangeLogs.reduce(
      (sum, l) =>
        sum +
        ((l.ocd + l.anxiety + l.rage + l.tics + (5 - l.sleep) + (5 - l.cognition)) / 6) * 2,
      0
    );
    return Math.round((total / rangeLogs.length) * 10) / 10;
  }, [rangeLogs]);

  const hasAnyLog = logs.length > 0;
  const childName = baseline?.childName?.trim();
  const showBaselineReminder = baseline && existingToday && todayTotal >= 15;

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const thisWeekPTEC = ptecLogs.find((l) => l.weekStartDate === currentWeekStart);

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-4 pb-28">

      {/* How It Works modal */}
      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}

      {/* "How to use" link + affirmation card grouped together */}
      <div className="space-y-1">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="sm:inline hidden">How to use this app</span>
            <span className="sm:hidden inline">How to use</span>
          </button>
        </div>
        <DailyAffirmation />
      </div>

      {/* Milestone celebrations */}
      <MilestoneCelebration />

      {/* PTEC-based flare alert */}
      {flareStatus.isActive && (
        <FlareAlert
          childName={childName}
          ptecScore={flareStatus.latestScore}
          avgScore={flareStatus.fourWeekAvg}
        />
      )}

      {/* Today's Snapshot + Sparklines */}
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
                <Link href="/log">
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

          {/* 30-day daily severity sparkline */}
          {hasAnyLog && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">
                30-day daily severity (0–30)
              </p>
              <Sparkline data={sparklineData} height={40} gradientId="dailySparkGradient" />
            </div>
          )}

          {/* PTEC 8-week sparkline */}
          {ptecLogs.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-border/50">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3" />
                  PTEC weekly trend (8w · 0–72)
                </p>
                {latestPTEC && latestPTECSev && (
                  <span className="text-[10px] font-semibold" style={{ color: latestPTECSev.color }}>
                    Latest: {latestPTEC.totalScore}/72 · {latestPTECSev.label}
                  </span>
                )}
              </div>
              <Sparkline
                data={ptecSparkData}
                height={36}
                color="#f59e0b"
                gradientId="ptecSparkGradient"
              />
            </div>
          )}

          {/* Weekly PTEC check-in status */}
          <div className="mt-3 pt-3 border-t border-border/50">
            {thisWeekPTEC ? (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                Weekly check-in done
              </div>
            ) : (
              <Link href="/ptec">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors cursor-pointer">
                  <ClipboardCheck className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                  Weekly PTEC check-in due — takes 3 minutes
                </div>
              </Link>
            )}
          </div>
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

      {/* Range selector — controls both stats and chart */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground font-medium">Showing data for the last:</p>
        <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setChartDays(d)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
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

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Logs ({chartDays}d)
            </p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-log-count">
              {rangeLogs.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Avg Severity
            </p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-avg-severity">
              {avgSeverity !== null ? avgSeverity.toFixed(1) : "—"}
            </p>
            {avgSeverity !== null && (
              <p className="text-[10px] text-muted-foreground mt-0.5">out of 10</p>
            )}
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

      {/* Symptom trend chart */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle
            className="flex items-center gap-2 text-base font-semibold"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <TrendingUp className="w-4 h-4 text-primary" />
            {chartDays}-Day Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No symptom data yet.</p>
              <p className="text-xs mt-1">Use the Quick Entry below or the <Link href="/log"><span className="text-primary hover:underline cursor-pointer">Log page</span></Link> to get started.</p>
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
          <div className="flex items-start justify-between gap-3">
            <CardTitle
              className="text-base font-semibold flex items-center gap-2"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {existingToday && <CheckCircle2 className="w-4 h-4 text-primary" />}
              Quick Entry
            </CardTitle>
            <Link href="/log">
              <span className="text-xs text-primary hover:underline cursor-pointer whitespace-nowrap font-medium flex-shrink-0 mt-0.5">
                Full log page →
              </span>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {existingToday
              ? "Already logged today — update below if needed."
              : "Score each symptom quickly, or use the full log page for more detail."}
          </p>
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
