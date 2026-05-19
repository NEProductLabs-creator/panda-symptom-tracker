import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  parseISO,
  subWeeks,
} from "date-fns";
import { usePTECLogs } from "@/hooks/usePTECLogs";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import {
  PTEC_CATEGORIES,
  PTEC_SCALE_LABELS,
  DEFAULT_PTEC_SCORES,
  computePTECTotal,
  getPTECSeverity,
  PTEC_DISCLAIMER,
} from "@/lib/ptec";
import { PTECScores, PTECLog } from "@/lib/types";
import PTECChart from "@/components/charts/PTECChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Info,
  TrendingUp,
  Trash2,
  HelpCircle,
} from "lucide-react";

function getWeekStart(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}
function getWeekEnd(date: Date): string {
  return format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function PTECScoreRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const sev = getPTECSeverity(value);
  return (
    <div className="py-4 sm:py-3.5 border-b border-border/50 last:border-0">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap"
          style={{ backgroundColor: sev.bg, color: sev.textColor, border: `1px solid ${sev.border}` }}
        >
          {value} — {PTEC_SCALE_LABELS[value]}
        </span>
      </div>
      {/* On mobile: 4-col grid (wraps to 4+3); on sm+: all 7 in one row */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-1">
        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`min-h-[44px] sm:min-h-0 sm:py-1.5 rounded-lg text-xs font-bold transition-all touch-manipulation flex flex-col items-center justify-center ${
              value === n
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <span className="leading-none">{n}</span>
            {(n === 0 || n === 3 || n === 6) && (
              <span className="text-[9px] leading-none mt-0.5 font-medium opacity-70">
                {n === 0 ? "None" : n === 3 ? "Mod" : "Max"}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PTECCheckin() {
  const { ptecLogs, addOrUpdateLog, deleteLog, getLogForWeek } = usePTECLogs();
  const { baseline } = useChildBaseline();
  const { toast } = useToast();

  const [anchorDate, setAnchorDate] = useState(new Date());
  const weekStart = getWeekStart(anchorDate);
  const weekEnd = getWeekEnd(anchorDate);
  const existingEntry = getLogForWeek(weekStart);

  const [scores, setScores] = useState<PTECScores>(
    existingEntry?.scores ?? { ...DEFAULT_PTEC_SCORES }
  );
  const [notes, setNotes] = useState(existingEntry?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const total = computePTECTotal(scores);
  const severity = getPTECSeverity(total);

  const childName = baseline?.childName?.trim();
  const thisWeekLabel = `${format(parseISO(weekStart), "MMM d")} – ${format(
    parseISO(weekEnd),
    "MMM d, yyyy"
  )}`;

  function goWeek(direction: -1 | 1) {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + direction * 7);
    const nextStart = getWeekStart(next);
    setAnchorDate(next);
    const entry = getLogForWeek(nextStart);
    setScores(entry?.scores ?? { ...DEFAULT_PTEC_SCORES });
    setNotes(entry?.notes ?? "");
    setSaved(false);
  }

  function updateScore(key: keyof PTECScores, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    try {
      const log: PTECLog = {
        id: existingEntry?.id ?? `ptec-${Date.now()}`,
        weekStartDate: weekStart,
        date: format(new Date(), "yyyy-MM-dd"),
        scores,
        totalScore: total,
        notes,
      };
      addOrUpdateLog(log);
      setSaved(true);
      toast({
        title: "Check-in saved",
        description: `Week of ${thisWeekLabel} recorded. Total: ${total}/72 (${severity.label})`,
        variant: "success",
      });
      setTimeout(() => setSaved(false), 1500);
    } catch {
      toast({ title: "Couldn't save — please try again", variant: "destructive" });
    }
  }

  function handleDelete() {
    if (!existingEntry) return;
    deleteLog(existingEntry.id);
    setScores({ ...DEFAULT_PTEC_SCORES });
    setNotes("");
    setSaved(false);
    toast({ title: "Entry deleted" });
  }

  const isCurrentWeek = weekStart === getWeekStart(new Date());
  const sortedHistory = useMemo(
    () => [...ptecLogs].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)),
    [ptecLogs]
  );

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground flex items-center gap-2"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Weekly Check-in
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Full PTEC assessment — complete once a week for doctor-visit-ready data.
          {childName ? ` Tracking ${childName}.` : ""}
        </p>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => goWeek(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{thisWeekLabel}</p>
          {isCurrentWeek && (
            <p className="text-xs text-primary font-medium">Current week</p>
          )}
          {existingEntry && !isCurrentWeek && (
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 justify-center">
              <CheckCircle2 className="w-3 h-3" />
              Logged
            </p>
          )}
        </div>
        <button
          onClick={() => goWeek(1)}
          disabled={isCurrentWeek}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Score scale legend — sticky; collapsible on mobile, always visible on desktop */}
      <div className="sticky top-0 z-10 -mx-5 md:-mx-8 px-5 md:px-8 py-2.5 bg-background border-b border-border/60">
        {/* Mobile: single line with toggle */}
        <div className="flex items-center justify-between sm:hidden">
          <span className="text-xs text-muted-foreground font-medium">
            Score scale: <span className="text-foreground font-semibold">0</span> = None →{" "}
            <span className="text-foreground font-semibold">6</span> = Extreme
          </span>
          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary font-medium ml-3 flex-shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showLegend ? "Hide" : "Details"}
          </button>
        </div>
        {/* Mobile expanded detail */}
        {showLegend && (
          <div className="sm:hidden flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-border/40">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <span key={n} className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{n}</span> = {PTEC_SCALE_LABELS[n]}
              </span>
            ))}
          </div>
        )}
        {/* Desktop: always visible full legend */}
        <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1">
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{n}</span> = {PTEC_SCALE_LABELS[n]}
            </span>
          ))}
        </div>
      </div>

      {/* Symptom form */}
      <Card className="border-border shadow-sm">
        <CardContent className="pt-4 px-5 pb-0">
          {PTEC_CATEGORIES.map((cat) => (
            <PTECScoreRow
              key={cat.key}
              label={cat.label}
              description={cat.description}
              value={scores[cat.key]}
              onChange={(v) => updateScore(cat.key, v)}
            />
          ))}
        </CardContent>

        {/* Live total score */}
        <div
          className="mx-5 my-4 flex items-center gap-4 px-5 py-4 rounded-xl"
          style={{ background: severity.bg, border: `1.5px solid ${severity.border}` }}
        >
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: severity.textColor, opacity: 0.7 }}>
              Total PTEC Score
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-4xl font-bold" style={{ color: severity.textColor }}>
                {total}
              </span>
              <span className="text-sm font-medium" style={{ color: severity.textColor, opacity: 0.6 }}>
                / 72
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span
              className="text-lg font-bold block"
              style={{ color: severity.color }}
            >
              {severity.label}
            </span>
            <p className="text-xs mt-0.5" style={{ color: severity.textColor, opacity: 0.6 }}>
              {total <= 12 ? "0–12" : total <= 30 ? "13–30" : total <= 50 ? "31–50" : "51–72"}
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="px-5 pb-5 space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Notes (optional)
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            placeholder="Any context, triggers, or observations this week…"
            className="resize-none h-20 text-sm"
          />
        </div>
      </Card>

      {/* Save + Delete */}
      <div className="flex gap-3">
        <Button onClick={handleSave} className="flex-1 gap-2" size="lg">
          <CheckCircle2 className="w-4 h-4" />
          {saved ? "Saved ✓" : existingEntry ? "Update This Week" : "Save Check-in"}
        </Button>
        {existingEntry && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleDelete}
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-muted/50 border border-border">
        <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
          {PTEC_DISCLAIMER}
        </p>
      </div>

      {/* PTEC Score History Chart */}
      {ptecLogs.length > 1 && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle
              className="text-base font-semibold flex items-center gap-2"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <TrendingUp className="w-4 h-4 text-primary" />
              Score History
            </CardTitle>
            <div className="flex flex-wrap gap-3 mt-1">
              {[
                { label: "Mild", color: "#86efac", range: "0–12" },
                { label: "Moderate", color: "#fde68a", range: "13–30" },
                { label: "Significant", color: "#fdba74", range: "31–50" },
                { label: "Severe", color: "#f87171", range: "51–72" },
              ].map((z) => (
                <div key={z.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.color }} />
                  <span className="text-xs text-muted-foreground">
                    {z.label} ({z.range})
                  </span>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <PTECChart ptecLogs={ptecLogs} />
          </CardContent>
        </Card>
      )}

      {/* Past entries list */}
      {sortedHistory.length > 0 && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Past Entries
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <div className="divide-y divide-border">
              {sortedHistory.map((log) => {
                const sev = getPTECSeverity(log.totalScore);
                const isThisWeek = log.weekStartDate === weekStart;
                const topSymptoms = PTEC_CATEGORIES.filter(
                  (c) => log.scores[c.key] >= 3
                )
                  .sort((a, b) => log.scores[b.key] - log.scores[a.key])
                  .slice(0, 3);

                return (
                  <button
                    key={log.id}
                    onClick={() => {
                      setAnchorDate(parseISO(log.weekStartDate));
                      setScores({ ...log.scores });
                      setNotes(log.notes ?? "");
                      setSaved(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full text-left px-5 py-3.5 hover:bg-muted/40 transition-colors ${
                      isThisWeek ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          Week of {format(parseISO(log.weekStartDate), "MMM d, yyyy")}
                          {isThisWeek && (
                            <span className="ml-2 text-xs text-primary font-semibold">
                              Current
                            </span>
                          )}
                        </p>
                        {topSymptoms.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Notable: {topSymptoms.map((c) => c.label).join(", ")}
                          </p>
                        )}
                        {log.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate italic">
                            "{log.notes}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-base font-bold text-foreground">
                          {log.totalScore}
                        </span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: sev.bg,
                            color: sev.textColor,
                            border: `1px solid ${sev.border}`,
                          }}
                        >
                          {sev.label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
