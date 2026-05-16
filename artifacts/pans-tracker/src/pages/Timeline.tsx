import { useState, useMemo } from "react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, Activity, Pill, FileText, AlertCircle } from "lucide-react";
import {
  computeDailyScore,
  getHeatColor,
  getHeatLabel,
  computeFlareHistory,
} from "@/lib/flare";
import { SymptomLog, FREQUENCY_LABELS } from "@/lib/types";
import { CATEGORIES } from "@/components/charts/SymptomChart";

const HEAT_LEGEND = [
  { label: "No log", color: "", empty: true },
  { label: "Mild (0–8)", color: "#86efac" },
  { label: "Moderate (9–16)", color: "#fde68a" },
  { label: "Significant (17–22)", color: "#fdba74" },
  { label: "Severe (23–30)", color: "#f87171" },
];

function DayDetail({
  log,
  date,
  medLibrary,
  onClose,
}: {
  log: SymptomLog | null;
  date: string;
  medLibrary: ReturnType<typeof useMedLibrary>["medLibrary"];
  onClose: () => void;
}) {
  const d = parseISO(date);
  const score = log ? computeDailyScore(log) : 0;
  const color = getHeatColor(score, !!log);
  const label = getHeatLabel(score, !!log);
  const takenMeds = log?.medicationsTaken
    ?.map((id) => medLibrary.find((m) => m.id === id))
    .filter(Boolean) ?? [];

  return (
    <Card className="border-border shadow-sm mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-base font-semibold"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {format(d, "EEEE, MMMM d, yyyy")}
          </CardTitle>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Close
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {!log ? (
          <p className="text-sm text-muted-foreground">No log recorded for this day.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total score:</span>
              <span className="text-sm font-bold" style={{ color: color || "inherit" }}>
                {score}/30
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: color || "#d1d5db" }}
              >
                {label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const val = log[cat.key as keyof SymptomLog] as number;
                return (
                  <div key={cat.key} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs text-muted-foreground flex-1">
                      {cat.label}:
                    </span>
                    <span className="text-xs font-semibold text-foreground">{val}</span>
                  </div>
                );
              })}
            </div>

            {takenMeds.length > 0 && (
              <div className="flex items-start gap-2 pt-2 border-t border-border">
                <Pill className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {takenMeds.map(
                    (m) =>
                      m && (
                        <div key={m.id}>
                          <span className="font-medium text-foreground">{m.name}</span>{" "}
                          {m.dosage} · {FREQUENCY_LABELS[m.frequency]}
                        </div>
                      )
                  )}
                </div>
              </div>
            )}

            {log.notes && (
              <div className="flex items-start gap-2 pt-2 border-t border-border">
                <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">{log.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MonthGrid({
  year,
  month,
  logMap,
  onDayClick,
  selectedDate,
}: {
  year: number;
  month: number;
  logMap: Map<string, SymptomLog>;
  onDayClick: (date: string) => void;
  selectedDate: string | null;
}) {
  const firstDay = startOfMonth(new Date(year, month));
  const lastDay = endOfMonth(firstDay);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startPad = getDay(firstDay); // 0 = Sun
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div>
      <h3
        className="text-sm font-semibold text-foreground mb-2 px-1"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {format(firstDay, "MMMM yyyy")}
      </h3>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const ds = format(day, "yyyy-MM-dd");
          const log = logMap.get(ds);
          const score = log ? computeDailyScore(log) : 0;
          const color = getHeatColor(score, !!log);
          const isToday = ds === today;
          const isSelected = ds === selectedDate;

          return (
            <button
              key={ds}
              onClick={() => onDayClick(ds)}
              title={`${format(day, "MMM d")} — ${getHeatLabel(score, !!log)}`}
              className={`relative flex flex-col items-center justify-center rounded-md aspect-square text-[10px] font-medium transition-all ${
                isSelected
                  ? "ring-2 ring-primary ring-offset-1"
                  : "hover:opacity-80"
              } ${isToday ? "ring-1 ring-primary" : ""}`}
              style={{
                backgroundColor: color || "hsl(var(--muted)/0.4)",
                color: color ? "#1f2937" : "hsl(var(--muted-foreground))",
              }}
            >
              {format(day, "d")}
              {log?.notes && (
                <span
                  className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-indigo-400"
                  title="Has notes"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Timeline() {
  const { logs } = useSymptomLogs();
  const { medLibrary } = useMedLibrary();
  const { baseline } = useChildBaseline();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const logMap = useMemo(
    () => new Map(logs.map((l) => [l.date, l])),
    [logs]
  );

  const months = useMemo(() => {
    const today = new Date();
    const result: { year: number; month: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return result;
  }, []);

  const flareHistory = useMemo(() => computeFlareHistory(logs), [logs]);

  const selectedLog = selectedDate ? logMap.get(selectedDate) ?? null : null;

  const name = baseline?.childName?.trim();

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <CalendarRange className="inline w-5 h-5 mr-2 mb-0.5 text-primary" />
          Symptom Timeline
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {name
            ? `A heat-map of ${name}'s symptom patterns over time`
            : "A heat-map of symptom patterns over time"}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {HEAT_LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: item.color || undefined,
                border: item.empty ? "1px dashed hsl(var(--border))" : undefined,
              }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-xs text-muted-foreground">Has note</span>
        </div>
      </div>

      {/* Calendar heat map */}
      {logs.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <CalendarRange className="w-10 h-10 mb-3 opacity-25" />
            <p className="text-sm font-medium">No logs yet</p>
            <p className="text-xs mt-1">
              Start logging daily symptoms and your timeline will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {months.map(({ year, month }) => (
                <MonthGrid
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  logMap={logMap}
                  onDayClick={(d) =>
                    setSelectedDate((prev) => (prev === d ? null : d))
                  }
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
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* Flare history */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base font-semibold flex items-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Possible Flare Periods
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Days where scores were 30%+ above the prior 7-day average for 2+ consecutive days.
            These are patterns to share with your doctor, not diagnoses.
          </p>
        </CardHeader>
        <CardContent>
          {flareHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No flare patterns detected in your logged data yet.
            </p>
          ) : (
            <div className="space-y-2">
              {flareHistory.map((fp, i) => {
                const start = parseISO(fp.startDate);
                const end = parseISO(fp.endDate);
                const intensity =
                  fp.peakScore >= 23
                    ? "Severe"
                    : fp.peakScore >= 17
                    ? "Significant"
                    : fp.peakScore >= 9
                    ? "Moderate"
                    : "Mild";
                const intensityColor =
                  fp.peakScore >= 23
                    ? "#f87171"
                    : fp.peakScore >= 17
                    ? "#fdba74"
                    : fp.peakScore >= 9
                    ? "#fde68a"
                    : "#86efac";

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/20"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: intensityColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {format(start, "MMM d")}
                        {fp.startDate !== fp.endDate
                          ? ` – ${format(end, "MMM d, yyyy")}`
                          : `, ${format(start, "yyyy")}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fp.durationDays} day{fp.durationDays !== 1 ? "s" : ""} ·{" "}
                        Peak score {fp.peakScore}/30
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                      style={{ backgroundColor: intensityColor, color: "#1f2937" }}
                    >
                      {intensity}
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
