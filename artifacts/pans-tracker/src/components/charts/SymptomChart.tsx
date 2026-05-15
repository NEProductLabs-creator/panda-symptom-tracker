import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, parseISO, isValid } from "date-fns";
import {
  SymptomLog,
  Medication,
  MedLibraryItem,
  Milestone,
  FREQUENCY_LABELS,
  MILESTONE_TYPE_LABELS,
} from "@/lib/types";

const CATEGORIES = [
  { key: "ocd", label: "OCD Behaviors", color: "hsl(140, 20%, 48%)" },
  { key: "anxiety", label: "Anxiety", color: "hsl(260, 15%, 58%)" },
  { key: "rage", label: "Rage / Dysregulation", color: "hsl(30, 25%, 58%)" },
  { key: "tics", label: "Tics", color: "hsl(200, 20%, 52%)" },
  { key: "sleep", label: "Sleep Quality", color: "hsl(330, 15%, 58%)" },
  { key: "cognition", label: "School / Cognition", color: "hsl(180, 15%, 52%)" },
] as const;

const MED_COLORS = [
  "rgba(140, 200, 160, 0.15)",
  "rgba(180, 160, 220, 0.15)",
  "rgba(220, 180, 140, 0.15)",
  "rgba(140, 180, 210, 0.15)",
  "rgba(210, 150, 170, 0.15)",
];

interface ChartDataPoint {
  date: string;
  label: string;
  ocd: number;
  anxiety: number;
  rage: number;
  tics: number;
  sleep: number;
  cognition: number;
  medicationsTaken: string[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: ChartDataPoint }>;
  label?: string;
  medLibrary: MedLibraryItem[];
  milestones: Milestone[];
}

function CustomTooltip({ active, payload, medLibrary, milestones }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0]?.payload;
  const takenMeds = (dataPoint?.medicationsTaken ?? [])
    .map((id) => medLibrary.find((m) => m.id === id))
    .filter((m): m is MedLibraryItem => m !== undefined);

  const milestonesOnDate = milestones.filter((ms) => ms.date === dataPoint?.date);

  return (
    <div className="bg-card border border-border rounded-xl shadow-md p-3 text-xs max-w-[230px]">
      <p className="font-semibold text-foreground mb-2">
        {dataPoint ? format(parseISO(dataPoint.date), "EEEE, MMM d") : ""}
      </p>
      <div className="space-y-1 mb-2">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground truncate">{entry.name}:</span>
            <span className="font-medium text-foreground ml-auto pl-1">{entry.value}</span>
          </div>
        ))}
      </div>

      {takenMeds.length > 0 && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Medications Given
          </p>
          <div className="space-y-1">
            {takenMeds.map((med) => (
              <div key={med.id} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span className="text-foreground leading-snug">
                  {med.name}
                  <span className="text-muted-foreground ml-1">
                    {med.dosage} · {FREQUENCY_LABELS[med.frequency]}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {milestonesOnDate.length > 0 && (
        <div className="border-t border-border pt-2 mt-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Events
          </p>
          <div className="space-y-1.5">
            {milestonesOnDate.map((ms) => (
              <div key={ms.id} className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5 flex-shrink-0 text-[10px]">◆</span>
                <div className="min-w-0">
                  <span className="text-foreground font-medium leading-snug">{ms.title}</span>
                  <span className="text-muted-foreground block text-[10px]">
                    {MILESTONE_TYPE_LABELS[ms.type]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  logs: SymptomLog[];
  medications: Medication[];
  medLibrary?: MedLibraryItem[];
  milestones?: Milestone[];
  days?: number;
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

export default function SymptomChart({
  logs,
  medications,
  medLibrary = [],
  milestones = [],
  days = 30,
}: Props) {
  const today = new Date();

  const chartData: ChartDataPoint[] = Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const log = logs.find((l) => l.date === dateStr);
    return {
      date: dateStr,
      label: format(date, "MMM d"),
      ocd: log?.ocd ?? 0,
      anxiety: log?.anxiety ?? 0,
      rage: log?.rage ?? 0,
      tics: log?.tics ?? 0,
      sleep: log?.sleep ?? 0,
      cognition: log?.cognition ?? 0,
      medicationsTaken: log?.medicationsTaken ?? [],
    };
  });

  const windowStart = format(subDays(today, days - 1), "yyyy-MM-dd");
  const windowEnd = format(today, "yyyy-MM-dd");

  const medBands = medications
    .map((med, i) => {
      const start = med.startDate > windowStart ? med.startDate : windowStart;
      const end = med.endDate
        ? med.endDate < windowEnd
          ? med.endDate
          : windowEnd
        : windowEnd;

      if (start > end) return null;

      const startLabel = isValid(parseISO(start)) ? format(parseISO(start), "MMM d") : "";
      const endLabel = isValid(parseISO(end)) ? format(parseISO(end), "MMM d") : "";

      return {
        x1: startLabel,
        x2: endLabel,
        name: med.name,
        color: MED_COLORS[i % MED_COLORS.length],
      };
    })
    .filter(Boolean) as { x1: string; x2: string; name: string; color: string }[];

  // Milestone markers within the chart window
  const milestoneMarkers = milestones
    .filter((ms) => ms.date >= windowStart && ms.date <= windowEnd)
    .map((ms) => ({
      ...ms,
      xLabel: format(parseISO(ms.date), "MMM d"),
    }));

  return (
    <div data-testid="symptom-chart">
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as TooltipProps["payload"]}
                label={props.label as string}
                medLibrary={medLibrary}
                milestones={milestones}
              />
            )}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            iconType="circle"
            iconSize={8}
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
          {CATEGORIES.map((cat) => (
            <Line
              key={cat.key}
              type="monotone"
              dataKey={cat.key}
              name={cat.label}
              stroke={cat.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend rows */}
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
