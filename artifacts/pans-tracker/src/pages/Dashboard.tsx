import { lazy, Suspense, useMemo, useState, useEffect, useRef } from "react";
import { format, subDays, parseISO, startOfWeek } from "date-fns";
import { Link } from "wouter";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedications } from "@/hooks/useMedications";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { useMilestones } from "@/hooks/useMilestones";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { usePTECLogs } from "@/hooks/usePTECLogs";
import { useChildren } from "@/hooks/useChildren";
import { useActiveChild } from "@/hooks/useActiveChild";
import { useScreenerResults } from "@/hooks/useScreenerResults";
import { track } from "@/lib/analytics";
import { CATEGORIES, getScoreColor } from "@/components/charts/SymptomChart";
const SymptomChart = lazy(() => import("@/components/charts/SymptomChart"));
import Sparkline from "@/components/charts/Sparkline";
import FlareAlert from "@/components/FlareAlert";
import DailyAffirmation from "@/components/DailyAffirmation";
import InsightsCard from "@/components/InsightsCard";
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
  UserPlus,
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
              style={{ fontFamily: "Fraunces, serif" }}
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

const DOT_BG: Record<number, string> = {
  0: 'var(--mist)',
  1: 'var(--clay-wash)',
  2: 'var(--clay-soft)',
  3: '#d68866',
  4: 'var(--clay)',
  5: 'var(--clay-deep)',
};
const DOT_COLOR: Record<number, string> = {
  0: 'var(--ink)',
  1: 'var(--ink)',
  2: 'var(--ink)',
  3: '#ffffff',
  4: '#ffffff',
  5: '#ffffff',
};

function ScoreInput({
  label,
  value,
  onChange,
  isLast = false,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        padding: '14px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--rule-soft)',
      }}
    >
      <span
        style={{
          fontFamily: 'Newsreader, serif',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--ink)',
          lineHeight: '1.4',
          display: 'block',
          marginBottom: '10px',
        }}
      >
        {label}
      </span>
      <div
        className="flex items-center"
        style={{ gap: '10px' }}
        data-testid={`score-${label.toLowerCase().replace(/\s|\//g, '-')}`}
      >
        <div className="flex" style={{ gap: '6px' }}>
          {[0, 1, 2, 3, 4, 5].map((n) => {
            const selected = value === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                data-testid={`score-btn-${label.toLowerCase().replace(/\s|\//g, '-')}-${n}`}
                className="touch-manipulation h-11 w-11 min-h-[44px] min-w-[44px]"
                style={{
                  borderRadius: '50%',
                  fontSize: '14px',
                  fontFamily: 'Newsreader, serif',
                  fontWeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  background: selected ? DOT_BG[n] : 'var(--bg-subtle)',
                  color: selected ? DOT_COLOR[n] : 'var(--ink-soft)',
                  border: selected && n === 0 ? '1px solid #8aa395' : 'none',
                  outline: 'none',
                  transition: 'background 0.12s ease, color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!selected) {
                    e.currentTarget.style.background = 'var(--clay-wash)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    e.currentTarget.style.background = 'var(--bg-subtle)';
                    e.currentTarget.style.color = 'var(--ink-soft)';
                  }
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              fontFamily: 'Newsreader, serif',
              fontStyle: 'italic',
              fontSize: '12px',
              color: 'var(--ink-soft)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

type QuickScores = {
  ocd: number | null;
  anxiety: number | null;
  rage: number | null;
  tics: number | null;
  sleep: number | null;
  cognition: number | null;
};
const EMPTY_SCORES: QuickScores = { ocd: null, anxiety: null, rage: null, tics: null, sleep: null, cognition: null };
const CALM_SCORES: QuickScores = { ocd: 0, anxiety: 0, rage: 0, tics: 0, sleep: 0, cognition: 0 };

export default function Dashboard() {
  const { logs, loading, addLog } = useSymptomLogs();
  const { medications } = useMedications();
  const { medLibrary } = useMedLibrary();
  const { milestones } = useMilestones();
  const { baseline } = useChildBaseline();
  const { ptecLogs } = usePTECLogs();
  const { data: children } = useChildren();
  const activeChild = useActiveChild();
  const { data: screenerResults = [] } = useScreenerResults(activeChild?.id ?? null);
  const [screenerCardDismissed, setScreenerCardDismissed] = useState(
    () => localStorage.getItem("tip.screenerCard.dismissed") === "1",
  );
  const { toast } = useToast();

  const existingToday = logs.find((l) => l.date === today);

  const [scores, setScores] = useState<QuickScores>(EMPTY_SCORES);
  const [notes, setNotes] = useState("");
  const [medicationsTaken, setMedicationsTaken] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [calmDay, setCalmDay] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(
    () => localStorage.getItem("tip.addSecondChild.dismissed") === "1"
  );
  const [noChildBannerDismissed, setNoChildBannerDismissed] = useState(false);

  // Once Supabase data loads, pre-fill the form with today's existing entry (if any)
  const formInitialized = useRef(false);
  useEffect(() => {
    if (loading || formInitialized.current) return;
    formInitialized.current = true;
    const entry = logs.find((l) => l.date === today);
    if (entry) {
      setScores({ ocd: entry.ocd, anxiety: entry.anxiety, rage: entry.rage, tics: entry.tics, sleep: entry.sleep, cognition: entry.cognition });
      setCalmDay(entry.calmDay ?? false);
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
    try {
      const log: SymptomLog = {
        id: existingToday?.id ?? crypto.randomUUID(),
        date: today,
        ...scores,
        notes,
        medicationsTaken,
        calmDay,
      };
      addLog(log);
      setSaved(true);
      toast({ title: "Today's log saved", variant: "success" });
      setTimeout(() => setSaved(false), 1500);
    } catch {
      toast({ title: "Couldn't save — please try again", variant: "destructive" });
    }
  }

  // Snapshot score (0–10 display scale for the badge).
  // sleep and cognition use an inverted scale (higher = better), so invert them here.
  const todayRawScore = existingToday
    ? ((((existingToday.ocd ?? 0) +
        (existingToday.anxiety ?? 0) +
        (existingToday.rage ?? 0) +
        (existingToday.tics ?? 0) +
        (5 - (existingToday.sleep ?? 0)) +
        (5 - (existingToday.cognition ?? 0))) /
        6) *
      2)
    : null;
  const todayScore = todayRawScore !== null ? Math.round(todayRawScore * 10) / 10 : null;
  const todayScoreColor = todayScore !== null ? getScoreColor(todayScore) : null;
  const todayScoreLabel =
    todayScore === null ? null : todayScore <= 3 ? "Mild" : todayScore <= 6 ? "Moderate" : "Severe";

  const todayTotal = existingToday ? computeDailyScore(existingToday) : 0;

  const todayMedsTaken = existingToday?.medicationsTaken?.length
    ? medLibrary.filter((m) => existingToday.medicationsTaken!.includes(m.id))
    : [];

  // Add-second-child tip card (single-child tracking users only)
  const showAddChildTip =
    !tipDismissed &&
    (children?.length ?? 0) === 1 &&
    activeChild?.journey_stage === "tracking";

  useEffect(() => {
    if (showAddChildTip) {
      track("add_child_tip_shown");
    }
  }, [showAddChildTip]);

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
        (((l.ocd ?? 0) + (l.anxiety ?? 0) + (l.rage ?? 0) + (l.tics ?? 0) + (5 - (l.sleep ?? 0)) + (5 - (l.cognition ?? 0))) / 6) * 2,
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

      {/* No-child prompt banner */}
      {children !== undefined && children.length === 0 && !noChildBannerDismissed && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium rounded-lg">
          <span className="flex-1">Add your child to start tracking symptoms</span>
          <Link
            href="/onboarding/add-child"
            className="shrink-0 px-3 py-1.5 rounded-md bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 transition-colors"
          >
            Add Child
          </Link>
          <button
            type="button"
            onClick={() => setNoChildBannerDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 text-amber-600 hover:text-amber-800 transition-colors leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editorial page header */}
      <div className="flex items-start justify-between gap-4 pt-1 pb-2">
        <div>
          <p className="text-sm italic font-normal mb-0.5" style={{ fontFamily: "Newsreader, serif", color: "var(--terracotta)" }}>
            {format(new Date(), "EEEE")}
          </p>
          <h1 className="text-2xl font-medium text-foreground leading-tight" style={{ fontFamily: "Fraunces, serif", letterSpacing: "-0.02em", fontWeight: 400 }}>
            {childName ? `How is ${childName} doing?` : "How are they doing?"}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">How to use</span>
          </button>
          <Link href="/log">
            <Button size="sm" className="text-xs h-8 px-4" data-testid="button-log-today-header">
              Log Today
            </Button>
          </Link>
        </div>
      </div>

      {/* Affirmation card */}
      <DailyAffirmation />

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

      {/* Add second child tip */}
      {showAddChildTip && (
        <div
          className="relative flex items-start gap-3 rounded-xl border px-4 py-3"
          style={{
            borderColor: "color-mix(in srgb, var(--terracotta) 30%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--terracotta) 5%, transparent)",
          }}
        >
          <UserPlus className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--terracotta)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug">
              Tracking multiple children?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You can manage separate symptom histories for each child.{" "}
              <Link
                href="/onboarding/add-child"
                onClick={() => track("add_child_tip_clicked")}
                className="font-medium underline underline-offset-2"
                style={{ color: "var(--terracotta)" }}
              >
                Add another child
              </Link>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("tip.addSecondChild.dismissed", "1");
              setTipDismissed(true);
              track("add_child_tip_dismissed");
            }}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Screener prompt — shown when the active child has no screener result yet */}
      {activeChild && !screenerCardDismissed && screenerResults.length === 0 && (
        <div
          className="relative flex items-start gap-3 rounded-xl border px-4 py-3"
          style={{
            borderColor: "color-mix(in srgb, var(--terracotta) 30%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--terracotta) 5%, transparent)",
          }}
        >
          <ClipboardCheck
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: "var(--terracotta)" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug">
              Could this be PANS or PANDAS?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Take our 2-minute screener to see if {activeChild.name}&apos;s symptoms fit the
              pattern.{" "}
              <Link
                href="/screener?from=home_card"
                className="font-medium underline underline-offset-2"
                style={{ color: "var(--terracotta)" }}
              >
                Take the screener →
              </Link>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("tip.screenerCard.dismissed", "1");
              setScreenerCardDismissed(true);
            }}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss screener prompt"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
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
                {childName ? `${childName}'s snapshot today` : "Today's snapshot"}
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

          {!hasAnyLog && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-sm text-muted-foreground italic">
                {childName ? `No entries yet for ${childName}.` : "No entries yet."}{" "}
                Start logging to see patterns here.
              </p>
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

      <InsightsCard logs={logs} medications={medications} />

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
                  ? "text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              style={chartDays === d ? { backgroundColor: "var(--terracotta)" } : undefined}
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

      {/* Recent entries — feature-list pattern */}
      {logs.length > 0 && (() => {
        const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
        const cats = ["ocd", "anxiety", "rage", "tics", "sleep", "cognition"] as const;
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "Newsreader, serif", letterSpacing: "0.1em" }}>
                Recent Entries
              </p>
              <Link href="/log">
                <span className="text-xs hover:underline cursor-pointer" style={{ color: "var(--terracotta)" }}>
                  View all →
                </span>
              </Link>
            </div>
            <div className="border-t border-border">
              {recent.map((log) => {
                const severity = computeDailyScore(log);
                return (
                  <Link key={log.id} href="/log">
                    <div className="flex items-center gap-4 py-3.5 border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer px-1 group">
                      <div className="flex-shrink-0 w-16 text-right">
                        <p className="text-lg font-medium leading-none" style={{ fontFamily: "Fraunces, serif", color: "var(--terracotta)", fontWeight: 400 }}>
                          {format(parseISO(log.date), "d")}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5" style={{ letterSpacing: "0.12em" }}>
                          {format(parseISO(log.date), "MMM")}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {cats.map((k) => {
                          const raw = log[k] ?? 0;
                          const score = (k === "sleep" || k === "cognition") ? 5 - raw : raw;
                          const filled = score > 0;
                          return (
                            <span
                              key={k}
                              className="w-2.5 h-2.5 rounded-full border border-border transition-colors"
                              style={{
                                backgroundColor: filled ? `hsl(16 53% ${70 - score * 8}%)` : "transparent",
                                borderColor: filled ? `hsl(16 53% ${70 - score * 8}%)` : undefined,
                              }}
                              title={k}
                            />
                          );
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        {log.notes ? (
                          <p className="text-xs text-muted-foreground truncate italic" style={{ fontFamily: "Newsreader, serif" }}>
                            {log.notes}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 italic" style={{ fontFamily: "Newsreader, serif" }}>
                            No notes
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-semibold flex-shrink-0 tabular-nums" style={{ color: "var(--terracotta)" }}>
                        {severity}/30
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Symptom trend chart */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle
            className="flex items-center gap-2 text-base font-semibold"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            <TrendingUp className="w-4 h-4 text-primary" />
            {chartDays}-Day Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-center px-4">
              <p className="text-base italic text-muted-foreground leading-relaxed" style={{ fontFamily: "Newsreader, serif" }}>
                Nothing logged yet. When you're ready, we're here.
              </p>
              <Link href="/log">
                <span className="mt-4 inline-block text-sm font-medium hover:underline cursor-pointer" style={{ color: "var(--terracotta)" }}>
                  Start your first log →
                </span>
              </Link>
            </div>
          ) : (
            <Suspense fallback={<div style={{ height: 260 }} />}>
              <SymptomChart
                logs={logs}
                medications={medications}
                medLibrary={medLibrary}
                milestones={milestones}
                days={chartDays}
              />
            </Suspense>
          )}
        </CardContent>
      </Card>

      {/* Today's quick log */}
      <Card className="border-border shadow-sm" id="log-form">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle
              className="text-base font-semibold flex items-center gap-2"
              style={{ fontFamily: "Fraunces, serif" }}
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
          <div style={{ maxWidth: '720px' }}>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full mb-5 touch-manipulation font-medium text-base border-2 hover:bg-primary/5"
              style={{ borderColor: '#8aa395', color: '#3d6659' }}
              onClick={() => { setScores(CALM_SCORES); setCalmDay(true); }}
              data-testid="button-calm-day"
            >
              Calm day — nothing to report
            </Button>
            <div>
              {CATEGORIES.map((cat, idx) => (
                <ScoreInput
                  key={cat.key}
                  label={cat.label}
                  value={scores[cat.key as keyof QuickScores]}
                  onChange={(v) => { setScores((s) => ({ ...s, [cat.key]: v })); setCalmDay(false); }}
                  isLast={idx === CATEGORIES.length - 1}
                />
              ))}
            </div>
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
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-background/95 backdrop-blur-sm border-t border-border md:static md:bg-transparent md:border-0 md:backdrop-blur-none md:p-0 md:pb-2"
      >
        <div className="max-w-5xl mx-auto">
          <Button
            onClick={handleSave}
            className="w-full md:w-auto"
            size="lg"
            data-testid="button-save-log"
          >
            {saved ? "Saved ✓" : existingToday ? "Update Log" : "Save Today's Log"}
          </Button>
        </div>
      </div>
    </div>
  );
}
