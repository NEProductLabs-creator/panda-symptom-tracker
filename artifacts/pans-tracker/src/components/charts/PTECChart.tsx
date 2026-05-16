import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { PTECLog } from "@/lib/types";
import { getPTECSeverity, PTEC_ZONE_BANDS } from "@/lib/ptec";

interface Props {
  ptecLogs: PTECLog[];
}

function PTECTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { score, week, severity } = payload[0].payload;
  const sev = getPTECSeverity(score);
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-md text-sm space-y-0.5">
      <p className="text-xs text-muted-foreground font-medium">{week}</p>
      <p className="font-bold text-foreground">
        {score}
        <span className="text-muted-foreground font-normal text-xs">/72</span>
      </p>
      <span
        className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: sev.bg, color: sev.textColor, border: `1px solid ${sev.border}` }}
      >
        {sev.label}
      </span>
    </div>
  );
}

export default function PTECChart({ ptecLogs }: Props) {
  if (ptecLogs.length === 0) return null;

  const data = ptecLogs.map((log) => ({
    week: format(parseISO(log.weekStartDate), "MMM d"),
    score: log.totalScore,
    severity: getPTECSeverity(log.totalScore).label,
  }));

  const minScore = Math.max(0, Math.min(...data.map((d) => d.score)) - 5);
  const maxScore = Math.min(72, Math.max(...data.map((d) => d.score)) + 8);
  const yDomain: [number, number] = [0, Math.max(maxScore, 20)];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        {/* Severity zone backgrounds */}
        {PTEC_ZONE_BANDS.map((band) => (
          <ReferenceArea
            key={band.label}
            y1={band.y1}
            y2={Math.min(band.y2, yDomain[1])}
            fill={band.fill}
            fillOpacity={0.18}
          />
        ))}
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 72]}
          ticks={[0, 12, 30, 50, 72]}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip content={<PTECTooltip />} />
        {/* Severity threshold lines */}
        <ReferenceLine y={12} stroke="#86efac" strokeDasharray="4 2" strokeWidth={1} />
        <ReferenceLine y={30} stroke="#fde68a" strokeDasharray="4 2" strokeWidth={1} />
        <ReferenceLine y={50} stroke="#fdba74" strokeDasharray="4 2" strokeWidth={1} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
