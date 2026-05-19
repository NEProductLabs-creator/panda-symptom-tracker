import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, parseISO, isValid, getDay } from "date-fns";
import {
  SymptomLog,
  Medication,
  MedLibraryItem,
  Milestone,
  FREQUENCY_LABELS,
  MILESTONE_TYPE_LABELS,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

const CATEGORIES = [
  { key: "ocd",       label: "OCD Behaviors",         color: "hsl(140, 20%, 48%)", inverted: false, sevKey: "ocd" },
  { key: "anxiety",   label: "Anxiety",               color: "hsl(260, 15%, 58%)", inverted: false, sevKey: "anxiety" },
  { key: "rage",      label: "Rage / Dysregulation",  color: "hsl(30, 25%, 58%)",  inverted: false, sevKey: "rage" },
  { key: "tics",      label: "Tics",                  color: "hsl(200, 20%, 52%)", inverted: false, sevKey: "tics" },
  { key: "sleep",     label: "Sleep Quality",         color: "hsl(330, 15%, 58%)", inverted: true,  sevKey: "sleepSev" },
  { key: "cognition", label: "School / Cognition",    color: "hsl(180, 15%, 52%)", inverted: true,  sevKey: "cognitionSev" },
] as const;

const MED_COLORS = [
  "rgba(140, 200, 160, 0.15)",
  "rgba(180, 160, 220, 0.15)",
  "rgba(220, 180, 140, 0.15)",
  "rgba(140, 180, 210, 0.15)",
  "rgba(210, 150, 170, 0.15)",
];

export function getScoreColor(score: number): string {
  if (score <= 3) return "#22c55e";
  if (score <= 6) return "#f59e0b";
  return "#ef4444";
}

interface ChartDataPoint {
  date: string;
  label: string;
  ocd: number;
  anxiety: number;
  rage: number;
  tics: number;
  sleep: number;       // raw user value (0 = Poor, 5 = Excellent)
  cognition: number;   // raw user value (0 = Poor, 5 = Excellent)
  sleepSev: number;    // severity contribution = 5 - sleep
  cognitionSev: number;// severity contribution = 5 - cognition
  dailyScore: number;
  medicationsTaken: string[];
  note?: string;
  isToday: boolean;
  isWeekend: boolean;
  hasLog: boolean;
}

function ScoreDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.hasLog) return <g />;
  const score = payload.dailyScore as number;
  const color = getScoreColor(score);
  const r = payload.isToday ? 7 : 4;
  const noteOffset = payload.note ? 14 : 0;
  const todayOffset = noteOffset + (payload.note ? 14 : 16);

  return (
    <g>
      {payload.note && (
        <g>
          <rect
            x={cx - 7}
            y={cy - 25}
            width={14}
            height={11}
            rx={3}
            fill="#6366f1"
            opacity={0.9}
          />
          <polygon
            points={`${cx - 2},${cy - 14} ${cx + 2},${cy - 14} ${cx},${cy - 11}`}
            fill="#6366f1"
            opacity={0.9}
          />
          <text
            x={cx}
            y={cy - 17}
            textAnchor="middle"
            fontSize={7}
            fill="white"
            fontFamily="sans-serif"
          >
            ✎
          </text>
        </g>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        stroke="white"
        strokeWidth={payload.isToday ? 2.5 : 1.5}
      />
      {payload.isToday && (
        <text
          x={cx}
          y={cy - (payload.note ? 30 : 16)}
          textAnchor="middle"
          fontSize={9}
          fill={color}
          fontWeight="700"
          fontFamily="sans-serif"
        >
          Today
        </text>
      )}
    </g>
  );
}

function ScoreActiveDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
  const color = getScoreColor((payload?.dailyScore as number) ?? 0);
  return (
    <circle cx={cx} cy={cy} r={7} fill={color} stroke="white" strokeWidth={2} />
  );
}

function CustomXTick(props: any) {
  const { x, y, payload, index, visibleTicksCount } = props;
  const total = visibleTicksCount ?? 30;
  const isLast = index === total - 1;
  const show = index === 0 || index % 5 === 0 || isLast;
  if (!show) return <g />;

  const parts = (payload.value as string).split(" ");
  const dayLabel = parts[0] ?? "";
  const dateLabel = parts[1] ?? "";

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={11}
        textAnchor="middle"
        fontSize={9}
        fill={
          isLast
            ? "hsl(var(--primary))"
            : "hsl(var(--muted-foreground))"
        }
        fontWeight={isLast ? "700" : "400"}
        fontFamily="sans-serif"
      >
        {dayLabel}
      </text>
      <text
        x={0}
        y={0}
        dy={22}
        textAnchor="middle"
        fontSize={9}
        fill={
          isLast
            ? "hsl(var(--primary))"
            : "hsl(var(--muted-foreground))"
        }
        fontWeight={isLast ? "600" : "400"}
        fontFamily="sans-serif"
      >
        {dateLabel}
      </text>
    </g>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: ChartDataPoint;
  }>;
  label?: string;
  medLibrary: MedLibraryItem[];
  milestones: Milestone[];
  showIndividual: boolean;
}

function CustomTooltip({
  active,
  payload,
  medLibrary,
  milestones,
  showIndividual,
}: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const dataPoint = payload[0]?.payload;
  if (!dataPoint?.hasLog) return null;

  const takenMeds = (dataPoint.medicationsTaken ?? [])
    .map((id) => medLibrary.find((m) => m.id === id))
    .filter((m): m is MedLibraryItem => m !== undefined);
  const milestonesOnDate = milestones.filter(
    (ms) => ms.date === dataPoint.date
  );
  const score = dataPoint.dailyScore;
  const scoreColor = getScoreColor(score);

  return (
    <div className="bg-card border border-border rounded-xl shadow-md p-3 text-xs max-w-[240px]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="font-semibold text-foreground">
          {format(parseISO(dataPoint.date), "EEE, MMM d")}
        </p>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: scoreColor }}
        >
          {score.toFixed(1)}
        </span>
      </div>

      {showIndividual && (
        <div className="space-y-1 mb-2 border-b border-border pb-2">
          {CATEGORIES.map((cat) => {
            const rawVal = dataPoint[cat.key as keyof ChartDataPoint] as number;
            return (
              <div key={cat.key} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-muted-foreground flex-1 truncate">
                  {cat.label}:
                </span>
                <span className="font-medium text-foreground">
                  {rawVal}
                  {cat.inverted && (
                    <span className="text-[9px] text-muted-foreground ml-0.5">↑</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {dataPoint.note && (
        <div className="mb-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/15">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-0.5">
            Note
          </p>
          <p className="text-foreground leading-snug">{dataPoint.note}</p>
        </div>
      )}

      {takenMeds.length > 0 && (
        <div className="border-t border-border pt-2 mt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Meds Given
          </p>
          {takenMeds.map((med) => (
            <div key={med.id} className="flex items-start gap-1.5 mb-0.5">
              <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span className="text-foreground">
                {med.name}{" "}
                <span className="text-muted-foreground">{med.dosage}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {milestonesOnDate.length > 0 && (
        <div className="border-t border-border pt-2 mt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Events
          </p>
          {milestonesOnDate.map((ms) => (
            <div key={ms.id} className="flex items-start gap-1.5 mb-0.5">
              <span className="text-primary text-[10px] mt-0.5 flex-shrink-0">
                ◆
              </span>
              <div className="min-w-0">
                <span className="text-foreground font-medium leading-snug">
                  {ms.title}
                </span>
                <span className="text-muted-foreground block text-[10px]">
                  {MILESTONE_TYPE_LABELS[ms.type]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MilestoneMarker(props: any) {
  const { viewBox } = props;
  if (!viewBox) return null;
  const cx = viewBox.x as number;
  const cy = (viewBox.y as number) + 10;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="hsl(var(--primary))"
        fillOpacity={0.85}
        stroke="white"
        strokeWidth={1.5}
      />
    </g>
  );
}

interface Props {
  logs: SymptomLog[];
  medications: Medication[];
  medLibrary?: MedLibraryItem[];
  milestones?: Milestone[];
  days?: number;
}

export default function SymptomChart({
  logs,
  medications,
  medLibrary = [],
  milestones = [],
  days = 30,
}: Props) {
  const [showIndividual, setShowIndividual] = useState(false);
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const chartData: ChartDataPoint[] = Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const log = logs.find((l) => l.date === dateStr);
    const dayOfWeek = getDay(date);
    const ocd = log?.ocd ?? 0;
    const anxiety = log?.anxiety ?? 0;
    const rage = log?.rage ?? 0;
    const tics = log?.tics ?? 0;
    const sleep = log?.sleep ?? 0;
    const cognition = log?.cognition ?? 0;
    // sleep/cognition are inverted scales (higher = better), so invert for severity
    const sleepSev = log ? (5 - sleep) : 0;
    const cognitionSev = log ? (5 - cognition) : 0;
    const rawAvg = log
      ? (ocd + anxiety + rage + tics + sleepSev + cognitionSev) / 6
      : 0;
    const dailyScore = Math.round(rawAvg * 20) / 10;

    return {
      date: dateStr,
      label: format(date, "EEE M/d"),
      ocd,
      anxiety,
      rage,
      tics,
      sleep,
      cognition,
      sleepSev,
      cognitionSev,
      dailyScore,
      medicationsTaken: log?.medicationsTaken ?? [],
      note: log?.notes || undefined,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      hasLog: !!log,
    };
  });

  const windowStart = format(subDays(today, days - 1), "yyyy-MM-dd");
  const windowEnd = todayStr;

  const medBands = medications
    .map((med, i) => {
      const start = med.startDate > windowStart ? med.startDate : windowStart;
      const end = med.endDate
        ? med.endDate < windowEnd
          ? med.endDate
          : windowEnd
        : windowEnd;
      if (start > end) return null;
      const startLabel = isValid(parseISO(start))
        ? format(parseISO(start), "EEE M/d")
        : "";
      const endLabel = isValid(parseISO(end))
        ? format(parseISO(end), "EEE M/d")
        : "";
      return {
        x1: startLabel,
        x2: endLabel,
        name: med.name,
        color: MED_COLORS[i % MED_COLORS.length],
      };
    })
    .filter(Boolean) as {
    x1: string;
    x2: string;
    name: string;
    color: string;
  }[];

  const milestoneMarkers = milestones
    .filter((ms) => ms.date >= windowStart && ms.date <= windowEnd)
    .map((ms) => ({
      ...ms,
      xLabel: format(parseISO(ms.date), "EEE M/d"),
    }));

  const weekendBands = chartData.filter((d) => d.isWeekend);

  return (
    <div data-testid="symptom-chart">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>0–3 mild</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500 ml-1" />
            <span>4–6 mod</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ml-1" />
            <span>7–10 severe</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-7 px-2.5 flex-shrink-0"
          onClick={() => setShowIndividual((v) => !v)}
        >
          {showIndividual ? (
            <EyeOff className="w-3 h-3" />
          ) : (
            <Eye className="w-3 h-3" />
          )}
          {showIndividual ? "Hide symptoms" : "Show symptoms"}
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 24, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />

          {weekendBands.map((d) => (
            <ReferenceArea
              key={d.date}
              x1={d.label}
              x2={d.label}
              fill="rgba(0,0,0,0.025)"
            />
          ))}

          <XAxis
            dataKey="label"
            tick={<CustomXTick />}
            tickLine={false}
            axisLine={false}
            interval={0}
            height={36}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={28}
            label={{
              value: "Daily Score (0–10)",
              angle: -90,
              position: "insideLeft",
              offset: 12,
              style: {
                fontSize: 9,
                fill: "hsl(var(--muted-foreground))",
                textAnchor: "middle",
              },
            }}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={
                  props.payload as TooltipProps["payload"]
                }
                label={props.label as string}
                medLibrary={medLibrary}
                milestones={milestones}
                showIndividual={showIndividual}
              />
            )}
          />

          {medBands.map((band, i) => (
            <ReferenceArea
              key={i}
              x1={band.x1}
              x2={band.x2}
              fill={band.color}
              label={{
                value: band.name,
                position: "insideTop",
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
          ))}

          {milestoneMarkers.map((ms) => (
            <ReferenceLine
              key={ms.id}
              x={ms.xLabel}
              stroke="hsl(var(--primary))"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              strokeOpacity={0.55}
              label={<MilestoneMarker />}
            />
          ))}

          {showIndividual &&
            CATEGORIES.map((cat) => (
              <Line
                key={cat.key}
                type="monotone"
                dataKey={cat.sevKey}
                name={cat.label}
                stroke={cat.color}
                strokeWidth={1.5}
                strokeOpacity={0.45}
                dot={false}
                activeDot={false}
                connectNulls={false}
                legendType="none"
              />
            ))}

          <Line
            type="monotone"
            dataKey="dailyScore"
            name="Daily Score"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2.5}
            strokeOpacity={0.7}
            dot={<ScoreDot />}
            activeDot={<ScoreActiveDot />}
            connectNulls={false}
            legendType="none"
          />
        </LineChart>
      </ResponsiveContainer>

      {(medBands.length > 0 || milestoneMarkers.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {medications.map((med, i) => (
            <span
              key={med.id}
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-border"
              style={{ backgroundColor: MED_COLORS[i % MED_COLORS.length] }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground opacity-60" />
              {med.name}
            </span>
          ))}
          {milestoneMarkers.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-border bg-primary/5">
              <span className="w-2 h-2 rounded-full bg-primary opacity-80" />
              Milestone
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { CATEGORIES };
