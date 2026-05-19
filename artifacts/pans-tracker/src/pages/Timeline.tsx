import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parseISO,
  isSameMonth,
} from "date-fns";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { usePTECLogs } from "@/hooks/usePTECLogs";
import { useMilestones } from "@/hooks/useMilestones";
import { useTriggerLog } from "@/hooks/useTriggerLog";
import { useHouseholdHealth } from "@/hooks/useHouseholdHealth";
import { useWellbeingLogs } from "@/hooks/useWellbeingLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarRange,
  Activity,
  Pill,
  FileText,
  Flag,
  X,
  ClipboardCheck,
} from "lucide-react";
import {
  computeDailyScore,
  getHeatColor,
  getHeatLabel,
} from "@/lib/flare";
import {
  computePTECFlareHistory,
  getPTECSeverity,
  PTECFlarePeriod,
} from "@/lib/ptec";
import { SymptomLog, Milestone, FREQUENCY_LABELS } from "@/lib/types";
import { MedLibraryItem } from "@/lib/types";
import { CATEGORIES } from "@/components/charts/SymptomChart";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const LEGEND = [
  { label: "No log · good day", color: "#dcfce7", border: false },
  { label: "Symptom-free", color: "#bbf7d0", border: false },
  { label: "Mild (1–9)", color: "#86efac", border: false },
  { label: "Moderate (10–18)", color: "#fde68a", border: false },
  { label: "Significant (19–24)", color: "#fdba74", border: false },
  { label: "Severe (25–30)", color: "#f87171", border: false },
];

const TRIGGER_DOT_COLOR = "#8b5cf6";

// ─── Day Detail Panel ────────────────────────────────────────────────────────

interface DayDetailProps {
  log: SymptomLog | null;
  date: string;
  medLibrary: MedLibraryItem[];
  milestone: Milestone | null;
  isFlareDay: boolean;
  onClose: () => void;
}

function DayDetail({ log, date, medLibrary, milestone, isFlareDay, onClose }: DayDetailProps) {
  const d = parseISO(date);
  const score = log ? computeDailyScore(log) : 0;
  const color = getHeatColor(score, !!log);
  const label = getHeatLabel(score, !!log);
  const takenMeds = log?.medicationsTaken
    ?.map((id) => medLibrary.find((m) => m.id === id))
    .filter(Boolean) as MedLibraryItem[] ?? [];

  return (
    <Card className="border-border shadow-md overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {format(d, "EEEE")}
            </p>
            <CardTitle
              className="text-lg font-bold leading-tight mt-0.5"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {format(d, "MMMM d, yyyy")}
            </CardTitle>
            {isFlareDay && (
              <p className="text-[11px] mt-1 font-medium" style={{ color: "#ea580c" }}>
                ⚑ Possible flare period (PTEC-based)
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {log && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: color, color: "#1f2937" }}
              >
                {score}/30 · {label}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-5">
        {/* Milestone */}
        {milestone && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
            style={{ background: "#fffbeb", border: "1px solid #fcd34d" }}
          >
            <Flag className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">{milestone.title}</p>
              {milestone.notes && (
                <p className="text-[11px] text-amber-700 mt-0.5">{milestone.notes}</p>
              )}
            </div>
          </div>
        )}

        {!log ? (
          <div className="text-center py-4">
            <div
              className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: "#dcfce7" }}
            >
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-foreground">No entry for this day</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xs mx-auto">
              Days without a log are shown as green — assumed to be good days.
            </p>
          </div>
        ) : (
          <>
            {/* Symptom grid */}
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const val = log[cat.key as keyof SymptomLog] as number;
                // For inverted fields (higher = better), flip the severity color logic
                const isBad = cat.inverted ? val <= 1 : val >= 4;
                const isMid = cat.inverted ? val <= 3 : val >= 2;
                return (
                  <div key={cat.key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                      {cat.label}
                    </span>
                    <span
                      className="text-xs font-bold ml-auto"
                      style={{ color: isBad ? "#ea580c" : isMid ? "#d97706" : "#16a34a" }}
                    >
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Medications */}
            {takenMeds.length > 0 && (
              <div className="flex items-start gap-2 pt-2 border-t border-border/60">
                <Pill className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {takenMeds.map((m) => (
                    <div key={m.id}>
                      <span className="font-medium text-foreground">{m.name}</span>
                      {" "}{m.dosage} · {FREQUENCY_LABELS[m.frequency]}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {log.notes && (
              <div className="flex items-start gap-2 pt-2 border-t border-border/60">
                <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">{log.notes}</p>
              </div>
            )}

            {!takenMeds.length && !log.notes && (
              <p className="text-xs text-muted-foreground italic text-center pt-1">
                No medications or notes recorded.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Month Grid ───────────────────────────────────────────────────────────────

interface MonthGridProps {
  year: number;
  month: number;
  logMap: Map<string, SymptomLog>;
  milestoneDays: Map<string, Milestone>;
  flareDays: Set<string>;
  triggerDays: Set<string>;
  hardDays: Set<string>;
  onDayClick: (date: string) => void;
  selectedDate: string | null;
}

function MonthGrid({
  year,
  month,
  logMap,
  milestoneDays,
  hardDays,
  flareDays,
  triggerDays,
  onDayClick,
  selectedDate,
}: MonthGridProps) {
  const firstDay = startOfMonth(new Date(year, month));
  const lastDay = endOfMonth(firstDay);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startPad = getDay(firstDay);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="select-none">
      <h3
        className="text-sm font-semibold text-foreground mb-2"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {format(firstDay, "MMMM yyyy")}
      </h3>
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] text-muted-foreground font-medium py-0.5"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const ds = format(day, "yyyy-MM-dd");
          const log = logMap.get(ds);
          const score = log ? computeDailyScore(log) : 0;
          const color = getHeatColor(score, !!log);
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          const hasMilestone = milestoneDays.has(ds);
          const isFlareDay = flareDays.has(ds);
          const isTriggerDay = triggerDays.has(ds);
          const isHardDay = hardDays.has(ds);
          const hasNotes = !!log?.notes;

          return (
            <button
              key={ds}
              onClick={() => onDayClick(ds)}
              title={`${format(day, "EEEE, MMM d")} — ${getHeatLabel(score, !!log)}`}
              className={`relative aspect-square rounded-[5px] text-[9px] font-semibold transition-all flex items-start justify-start p-0.5 touch-manipulation ${
                isSelected
                  ? "ring-2 ring-primary ring-offset-1 scale-110 z-10"
                  : "hover:scale-105 hover:z-10"
              } ${isToday ? "ring-1 ring-primary" : ""}`}
              style={{
                backgroundColor: color,
                color: "#374151",
              }}
            >
              <span className="leading-none opacity-70">{format(day, "d")}</span>

              {/* Top-right: milestone and flare indicators */}
              {(hasMilestone || isFlareDay) && (
                <div className="absolute top-0.5 right-0.5 flex flex-col gap-px">
                  {hasMilestone && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "#f59e0b" }}
                      title="Milestone"
                    />
                  )}
                  {isFlareDay && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "#f97316" }}
                      title="Possible flare period"
                    />
                  )}
                </div>
              )}

              {/* Bottom-left: trigger dot */}
              {isTriggerDay && (
                <span
                  className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: TRIGGER_DOT_COLOR }}
                  title="Trigger logged"
                />
              )}

              {/* Bottom-right: notes dot */}
              {hasNotes && (
                <span
                  className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full"
                  style={{ backgroundColor: "#818cf8" }}
                  title="Has notes"
                />
              )}

              {/* Bottom-center: hard parent day */}
              {isHardDay && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "#fb7185" }}
                  title="Hard parent day"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Timeline() {
  const { logs } = useSymptomLogs();
  const { medLibrary } = useMedLibrary();
  const { baseline } = useChildBaseline();
  const { ptecLogs } = usePTECLogs();
  const { milestones } = useMilestones();
  const { entries: triggerEntries } = useTriggerLog();
  const { illnesses: householdIllnesses } = useHouseholdHealth();
  const { logs: wellbeingLogs } = useWellbeingLogs();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const hardDaySet = useMemo(
    () => new Set(wellbeingLogs.filter((l) => l.hardDay).map((l) => l.date)),
    [wellbeingLogs]
  );

  const logMap = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);

  const milestoneDays = useMemo(
    () => new Map(milestones.map((m) => [m.date, m])),
    [milestones]
  );

  // Compute trigger days (trigger entries + household illness date ranges)
  const triggerDays = useMemo(() => {
    const days = new Set<string>();
    triggerEntries.forEach((t) => days.add(t.date));
    householdIllnesses.forEach((h) => {
      if (h.endDate) {
        eachDayOfInterval({ start: parseISO(h.startDate), end: parseISO(h.endDate) }).forEach((d) =>
          days.add(format(d, "yyyy-MM-dd"))
        );
      } else {
        days.add(h.startDate);
      }
    });
    return days;
  }, [triggerEntries, householdIllnesses]);

  // Compute flare days from PTEC periods
  const { flareDays, ptecFlareHistory } = useMemo(() => {
    const periods = computePTECFlareHistory(ptecLogs);
    const days = new Set<string>();
    periods.forEach((period) => {
      eachDayOfInterval({
        start: parseISO(period.startDate),
        end: parseISO(period.endDate),
      }).forEach((d) => days.add(format(d, "yyyy-MM-dd")));
    });
    return { flareDays: days, ptecFlareHistory: periods };
  }, [ptecLogs]);

  // Months to display: from earliest log or 6 months back, up to today
  const months = useMemo(() => {
    const today = new Date();
    const result: { year: number; month: number }[] = [];
    const monthCount = Math.min(
      12,
      Math.max(
        6,
        logs.length > 0
          ? (() => {
              const earliest = logs.reduce((a, b) => (a.date < b.date ? a : b)).date;
              const diff =
                (today.getFullYear() - parseISO(earliest).getFullYear()) * 12 +
                (today.getMonth() - parseISO(earliest).getMonth());
              return diff + 1;
            })()
          : 6
      )
    );
    for (let i = 0; i < monthCount; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return result;
  }, [logs]);

  // Summary stats
  const stats = useMemo(() => {
    const totalLogged = logs.length;
    const goodDays = logs.filter((l) => computeDailyScore(l) <= 9).length;
    const peakScore =
      logs.length > 0
        ? Math.max(...logs.map((l) => computeDailyScore(l)))
        : 0;
    return { totalLogged, goodDays, peakScore };
  }, [logs]);

  const selectedLog = selectedDate ? logMap.get(selectedDate) ?? null : null;
  const selectedMilestone = selectedDate ? milestoneDays.get(selectedDate) ?? null : null;
  const selectedIsFlareDay = selectedDate ? flareDays.has(selectedDate) : false;
  const name = baseline?.childName?.trim();

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground flex items-center gap-2"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <CalendarRange className="w-5 h-5 text-primary" />
          {name ? `${name}'s Timeline` : "Symptom Timeline"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Daily symptom heat map · click any day for details
        </p>
      </div>

      {/* Summary stats row */}
      {logs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center px-3 py-2.5 rounded-xl bg-muted/40 border border-border">
            <p className="text-xl font-bold text-foreground">{stats.totalLogged}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Days logged</p>
          </div>
          <div className="text-center px-3 py-2.5 rounded-xl border" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <p className="text-xl font-bold" style={{ color: "#16a34a" }}>{stats.goodDays}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#15803d" }}>Good / mild days</p>
          </div>
          <div
            className="text-center px-3 py-2.5 rounded-xl border"
            style={{
              background: stats.peakScore >= 25 ? "#fef2f2" : stats.peakScore >= 19 ? "#fff7ed" : "#fefce8",
              borderColor: stats.peakScore >= 25 ? "#fecaca" : stats.peakScore >= 19 ? "#fed7aa" : "#fde68a",
            }}
          >
            <p
              className="text-xl font-bold"
              style={{
                color: stats.peakScore >= 25 ? "#dc2626" : stats.peakScore >= 19 ? "#ea580c" : "#ca8a04",
              }}
            >
              {stats.peakScore}/30
            </p>
            <p
              className="text-[11px] mt-0.5"
              style={{
                color: stats.peakScore >= 25 ? "#b91c1c" : stats.peakScore >= 19 ? "#c2410c" : "#a16207",
              }}
            >
              Peak score
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#f59e0b" }} />
          <span className="text-xs text-muted-foreground">Milestone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#f97316" }} />
          <span className="text-xs text-muted-foreground">Possible flare week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TRIGGER_DOT_COLOR }} />
          <span className="text-xs text-muted-foreground">Trigger event</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#818cf8" }} />
          <span className="text-xs text-muted-foreground">Has note</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#fb7185" }} />
          <span className="text-xs text-muted-foreground">Hard parent day</span>
        </div>
      </div>

      {/* Calendar heat map */}
      {logs.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <CalendarRange className="w-10 h-10 mb-3 opacity-25" />
            <p className="text-sm font-medium">No logs yet</p>
            <p className="text-xs mt-1 max-w-xs leading-relaxed">
              Start logging daily symptoms and your timeline will appear here. Days you don't log are shown as green.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
          <CardContent className="pt-5 pb-5 px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {months.map(({ year, month }) => (
                <MonthGrid
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  logMap={logMap}
                  milestoneDays={milestoneDays}
                  flareDays={flareDays}
                  triggerDays={triggerDays}
                  hardDays={hardDaySet}
                  onDayClick={(d) => setSelectedDate((prev) => (prev === d ? null : d))}
                  selectedDate={selectedDate}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day detail panel */}
      {selectedDate && (
        <DayDetail
          log={selectedLog}
          date={selectedDate}
          medLibrary={medLibrary}
          milestone={selectedMilestone}
          isFlareDay={selectedIsFlareDay}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* PTEC-based flare history */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base font-semibold flex items-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <ClipboardCheck className="w-4 h-4 text-amber-500" />
            Possible Flare Periods
          </CardTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Weeks where PTEC score was 30%+ above the prior 4-week average for 2+ consecutive weeks.
            These patterns are for sharing with your doctor — not a diagnosis.
          </p>
        </CardHeader>
        <CardContent>
          {ptecLogs.length < 3 ? (
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              Complete 3 or more weekly check-ins to see if any flare patterns emerge.
            </p>
          ) : ptecFlareHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No flare patterns detected in your weekly check-in data yet.
            </p>
          ) : (
            <div className="space-y-2">
              {ptecFlareHistory.map((fp, i) => {
                const sev = getPTECSeverity(fp.peakScore);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg border"
                    style={{ background: sev.bg, borderColor: sev.border }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sev.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: sev.textColor }}>
                        {format(parseISO(fp.startDate), "MMM d")}
                        {fp.startDate !== fp.endDate
                          ? ` – ${format(parseISO(fp.endDate), "MMM d, yyyy")}`
                          : `, ${format(parseISO(fp.startDate), "yyyy")}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: sev.textColor, opacity: 0.75 }}>
                        {fp.weekCount} week{fp.weekCount !== 1 ? "s" : ""} · Peak PTEC score {fp.peakScore}/72
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}
                    >
                      {sev.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
