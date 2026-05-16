import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DataPoint {
  date: string;
  score: number;
  hasLog: boolean;
}

interface Props {
  data: DataPoint[];
  height?: number;
}

function SparkTooltip({ active, payload }: any) {
  if (!active || !payload?.length || !payload[0].payload.hasLog) return null;
  const { date, score } = payload[0].payload as DataPoint;
  return (
    <div className="bg-card border border-border rounded-lg px-2 py-1 text-xs shadow-sm">
      <span className="text-muted-foreground">{date}: </span>
      <span className="font-semibold text-foreground">{score}/30</span>
    </div>
  );
}

export default function Sparkline({ data, height = 48 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 3, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Tooltip content={<SparkTooltip />} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          fill="url(#sparkGradient)"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
          isAnimationActive={false}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
