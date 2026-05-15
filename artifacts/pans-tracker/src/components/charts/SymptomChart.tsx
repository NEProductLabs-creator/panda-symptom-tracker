import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, parseISO, isValid } from "date-fns";
import { SymptomLog, Medication } from "@/lib/types";

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

interface Props {
  logs: SymptomLog[];
  medications: Medication[];
  days?: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-md p-3 text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function SymptomChart({ logs, medications, days = 30 }: Props) {
  const today = new Date();

  const chartData = Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const log = logs.find((l) => l.date === dateStr);
    return {
      date: dateStr,
      label: format(date, "MMM d"),
      ocd: log?.ocd ?? null,
      anxiety: log?.anxiety ?? null,
      rage: log?.rage ?? null,
      tics: log?.tics ?? null,
      sleep: log?.sleep ?? null,
      cognition: log?.cognition ?? null,
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

  return (
    <div data-testid="symptom-chart">
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
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
      {medBands.length > 0 && (
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
        </div>
      )}
    </div>
  );
}

export { CATEGORIES };
