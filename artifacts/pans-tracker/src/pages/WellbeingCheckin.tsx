import { useState, useMemo, useEffect } from "react";
import { format, subDays, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { useWellbeingLogs } from "@/hooks/useWellbeingLogs";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Heart, Flag, ExternalLink, CheckCircle2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const today = format(new Date(), "yyyy-MM-dd");

const Q_HOLDING_LABELS = ["Struggling", "Hanging in", "Getting by", "Doing well", "Thriving"] as const;
const Q_STRESS_LABELS  = ["Overwhelming", "Very stressful", "Getting through it", "Manageable", "Very calm"] as const;
const Q_CONNECT_LABELS = ["Pretty alone", "Mostly isolated", "Some support", "Connected", "Well-supported"] as const;

const RESOURCES = [
  {
    name: "PANDAS Network",
    tagline: "You are not alone in this.",
    desc: "Support group finder and family resources for PANS/PANDAS caregivers.",
    cta: "pandasnetwork.org",
    href: "https://www.pandasnetwork.org",
    color: "rose" as const,
  },
  {
    name: "PANS/PANDAS Parents",
    tagline: "People who truly get it.",
    desc: "A private Facebook community of parents and caregivers walking the same road.",
    cta: "Find the community",
    href: "https://www.facebook.com/groups/PANSPANDASparents",
    color: "amber" as const,
  },
  {
    name: "Crisis Text Line",
    tagline: "Available 24/7, free and confidential.",
    desc: "You don't have to be in crisis to reach out. Sometimes you just need someone to talk to.",
    cta: "Text HOME to 741741",
    href: "sms:741741",
    color: "violet" as const,
  },
];

const RESOURCE_COLORS = {
  rose:   { bg: "bg-rose-50",   border: "border-rose-200",   title: "text-rose-700",   cta: "text-rose-600"   },
  amber:  { bg: "bg-amber-50",  border: "border-amber-200",  title: "text-amber-700",  cta: "text-amber-600"  },
  violet: { bg: "bg-violet-50", border: "border-violet-200", title: "text-violet-700", cta: "text-violet-600" },
};

// ─── Rating question component ────────────────────────────────────────────────

function RatingQuestion({
  label,
  value,
  onChange,
  labels,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  labels: readonly string[];
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all ${
              value === n
                ? "bg-rose-500 text-white shadow-md scale-105"
                : "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:scale-105"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className={`text-xs font-medium min-h-[16px] transition-opacity ${value > 0 ? "opacity-100 text-rose-600" : "opacity-0"}`}>
        {value > 0 ? labels[value - 1] : ""}
      </p>
    </div>
  );
}

// ─── Custom chart tooltip ────────────────────────────────────────────────────

function WellbeingTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-rose-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{entry.value?.toFixed(1)}/5</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WellbeingCheckin() {
  const { logs: wellbeingLogs, upsertLog } = useWellbeingLogs();
  const { logs: symptomLogs } = useSymptomLogs();
  const { baseline } = useChildBaseline();
  const { toast } = useToast();

  const childName = baseline?.childName?.trim() || "your child";

  // Load today's log if it exists
  const todayLog = wellbeingLogs.find((l) => l.date === today);

  const [holding, setHolding] = useState(todayLog?.holding ?? 0);
  const [stress, setStress] = useState(todayLog?.stress ?? 0);
  const [connected, setConnected] = useState(todayLog?.connected ?? 0);
  const [notes, setNotes] = useState(todayLog?.notes ?? "");
  const [hardDay, setHardDay] = useState(todayLog?.hardDay ?? false);
  const [saved, setSaved] = useState(false);

  // Sync state if the log loads after mount
  useEffect(() => {
    if (todayLog) {
      setHolding(todayLog.holding);
      setStress(todayLog.stress);
      setConnected(todayLog.connected);
      setNotes(todayLog.notes ?? "");
      setHardDay(todayLog.hardDay);
    }
  }, []);

  const canSave = holding > 0 || stress > 0 || connected > 0 || notes.trim() || hardDay;

  function handleSave() {
    upsertLog({ date: today, holding, stress, connected, notes: notes.trim() || undefined, hardDay });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    toast({ title: "Check-in saved", description: "This is just for you." });
  }

  // ── Chart data: last 30 days ───────────────────────────────────────────────
  const chartData = useMemo(() => {
    const wMap = new Map(wellbeingLogs.map((l) => [l.date, l]));
    const sMap = new Map(symptomLogs.map((l) => [l.date, l]));

    const result: { date: string; wellbeing: number | null; child: number | null }[] = [];
    for (let i = 29; i >= 0; i--) {
      const ds = format(subDays(new Date(), i), "yyyy-MM-dd");
      const wLog = wMap.get(ds);
      const sLog = sMap.get(ds);

      const wellbeing =
        wLog && (wLog.holding > 0 || wLog.stress > 0 || wLog.connected > 0)
          ? Math.round(
              (([wLog.holding, wLog.stress, wLog.connected].filter((v) => v > 0).reduce((a, b) => a + b, 0)) /
                [wLog.holding, wLog.stress, wLog.connected].filter((v) => v > 0).length) *
                10
            ) / 10
          : null;

      const child = sLog
        ? Math.round(
            (((sLog.ocd ?? 0) + (sLog.anxiety ?? 0) + (sLog.rage ?? 0) + (sLog.tics ?? 0) + (sLog.sleep ?? 0) + (sLog.cognition ?? 0)) / 6) * 10
          ) / 10
        : null;

      if (wellbeing !== null || child !== null) {
        result.push({ date: format(parseISO(ds + "T12:00:00"), "M/d"), wellbeing, child });
      }
    }
    return result;
  }, [wellbeingLogs, symptomLogs]);

  // ── Monthly summary ───────────────────────────────────────────────────────
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
    const monthName = format(now, "MMMM yyyy");

    const wInMonth = wellbeingLogs.filter(
      (l) => l.date >= monthStart && l.date <= monthEnd
    );
    const sInMonth = symptomLogs.filter(
      (l) => l.date >= monthStart && l.date <= monthEnd
    );

    const wScores = wInMonth
      .map((l) => {
        const vals = [l.holding, l.stress, l.connected].filter((v) => v > 0);
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      })
      .filter((v) => v !== null) as number[];

    const sScores = sInMonth.map(
      (l) => ((l.ocd ?? 0) + (l.anxiety ?? 0) + (l.rage ?? 0) + (l.tics ?? 0) + (l.sleep ?? 0) + (l.cognition ?? 0)) / 6
    );

    const avgWellbeing = wScores.length > 0 ? wScores.reduce((a, b) => a + b, 0) / wScores.length : null;
    const avgChild = sScores.length > 0 ? sScores.reduce((a, b) => a + b, 0) / sScores.length : null;
    const hardDays = wInMonth.filter((l) => l.hardDay).length;

    return { monthName, avgWellbeing, avgChild, hardDays, wCount: wScores.length, sCount: sScores.length };
  }, [wellbeingLogs, symptomLogs]);

  function monthlyInsight(avgW: number | null, avgC: number | null) {
    if (avgW === null) return null;
    if (avgW <= 2 && avgC !== null && avgC >= 3)
      return "You've been carrying a heavy load this month. That matters.";
    if (avgW <= 2.5)
      return "This was a tough month. The fact you kept showing up says everything.";
    if (avgW >= 4)
      return "You had a strong month. Lean into what's working for you.";
    if (avgW >= 3.5)
      return "You're doing better than you might think.";
    return "You showed up every day you logged. That counts.";
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Heart className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Just for You
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            This space is yours alone. What you share here never mixes with {childName}'s medical record.
          </p>
        </div>
      </div>

      {/* Today's check-in */}
      <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-rose-200/60 flex items-center justify-between">
          <div>
            <p
              className="text-base font-bold text-rose-800"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              You showed up today.
            </p>
            <p className="text-xs text-rose-600 mt-0.5">
              {format(new Date(), "EEEE, MMMM d")} · This is just for you.
            </p>
          </div>
          {todayLog && (
            <span className="flex items-center gap-1 text-xs text-rose-500 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">
              <CheckCircle2 className="w-3 h-3" />
              Logged today
            </span>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">
          <RatingQuestion
            label="How are you holding up today?"
            value={holding}
            onChange={setHolding}
            labels={Q_HOLDING_LABELS}
          />
          <RatingQuestion
            label="How manageable does the stress feel at home?"
            value={stress}
            onChange={setStress}
            labels={Q_STRESS_LABELS}
          />
          <RatingQuestion
            label="How connected do you feel to support right now?"
            value={connected}
            onChange={setConnected}
            labels={Q_CONNECT_LABELS}
          />

          {/* Hard day toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setHardDay((h) => !h)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all text-left ${
                hardDay
                  ? "border-rose-400 bg-rose-100"
                  : "border-rose-200 bg-white hover:bg-rose-50"
              }`}
              data-testid="toggle-hard-day"
            >
              <Flag
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  hardDay ? "text-rose-500" : "text-rose-300"
                }`}
              />
              <div>
                <p className={`text-sm font-semibold ${hardDay ? "text-rose-700" : "text-rose-500"}`}>
                  {hardDay ? "Marked as a hard day" : "Flag as a particularly hard day"}
                </p>
                <p className="text-[11px] text-rose-400 mt-0.5">
                  Shows a small mark on the timeline so you can look back and acknowledge the hard stretches.
                </p>
              </div>
            </button>
          </div>

          {/* Private notes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
              Private notes — just for you
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thoughts, feelings, things you noticed in yourself today… This never mixes with the medical log."
              className="resize-none h-24 text-sm border-rose-200 bg-white focus-visible:ring-rose-300 placeholder:text-rose-300"
              data-testid="textarea-parent-notes"
            />
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full gap-2 transition-all ${
              saved
                ? "bg-green-600 hover:bg-green-700"
                : "bg-rose-500 hover:bg-rose-600"
            } text-white`}
            data-testid="button-save-checkin"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved — you're doing great.
              </>
            ) : (
              <>
                <Heart className="w-4 h-4" />
                {todayLog ? "Update today's check-in" : "Save today's check-in"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Trend chart */}
      {chartData.length >= 2 && (
        <Card className="border-rose-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle
              className="text-base font-semibold text-foreground"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Your wellbeing alongside {childName}'s journey
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last 30 days · Both on a 0–5 scale · Higher is better for both lines
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  interval="preserveStartEnd"
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<WellbeingTooltip />} />
                <Line
                  type="monotone"
                  dataKey="wellbeing"
                  name="Your wellbeing"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#f43f5e" }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="child"
                  name={`${childName}'s severity`}
                  stroke="#86efac"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={{ r: 3, fill: "#4ade80" }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-2 justify-center">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-rose-400 rounded-full inline-block" />
                <span className="text-[11px] text-muted-foreground">Your wellbeing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-green-300 rounded-full inline-block" style={{ backgroundImage: "repeating-linear-gradient(90deg, #86efac 0 4px, transparent 4px 6px)" }} />
                <span className="text-[11px] text-muted-foreground">{childName}'s symptom severity</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {chartData.length < 2 && wellbeingLogs.length === 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 px-5 py-6 text-center">
          <Heart className="w-7 h-7 text-rose-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-rose-700">Your trend chart will appear here</p>
          <p className="text-xs text-rose-400 mt-1">Log a few check-ins and the chart will show how you're doing over time alongside {childName}'s journey.</p>
        </div>
      )}

      {/* Monthly summary */}
      <Card className="border-amber-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle
            className="text-base font-semibold text-foreground"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {monthlySummary.monthName}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-center">
              <p className="text-2xl font-bold text-rose-600">
                {monthlySummary.avgWellbeing !== null
                  ? monthlySummary.avgWellbeing.toFixed(1)
                  : "—"}
              </p>
              <p className="text-[11px] text-rose-500 mt-0.5 font-medium">
                Your avg wellbeing / 5
              </p>
              {monthlySummary.wCount > 0 && (
                <p className="text-[10px] text-rose-400 mt-1">
                  {monthlySummary.wCount} check-in{monthlySummary.wCount !== 1 ? "s" : ""} this month
                </p>
              )}
            </div>
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {monthlySummary.avgChild !== null
                  ? monthlySummary.avgChild.toFixed(1)
                  : "—"}
              </p>
              <p className="text-[11px] text-green-600 mt-0.5 font-medium">
                {childName}'s avg severity / 5
              </p>
              {monthlySummary.sCount > 0 && (
                <p className="text-[10px] text-green-400 mt-1">
                  per symptom category
                </p>
              )}
            </div>
          </div>

          {monthlySummary.hardDays > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
              <Flag className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <p className="text-xs text-rose-600">
                You flagged <span className="font-semibold">{monthlySummary.hardDays}</span> particularly hard{" "}
                {monthlySummary.hardDays === 1 ? "day" : "days"} this month.{" "}
                <span className="text-rose-400">Those days count too.</span>
              </p>
            </div>
          )}

          {monthlyInsight(monthlySummary.avgWellbeing, monthlySummary.avgChild) && (
            <p className="text-sm text-amber-700 font-medium italic px-1">
              "{monthlyInsight(monthlySummary.avgWellbeing, monthlySummary.avgChild)}"
            </p>
          )}

          {monthlySummary.avgWellbeing === null && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Log a few check-ins this month to see your summary here.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Support resources */}
      <div>
        <p
          className="text-sm font-semibold text-foreground mb-3"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          You don't have to do this alone.
        </p>
        <div className="grid grid-cols-1 gap-3">
          {RESOURCES.map((r) => {
            const c = RESOURCE_COLORS[r.color];
            return (
              <a
                key={r.name}
                href={r.href}
                target={r.href.startsWith("sms") ? "_self" : "_blank"}
                rel="noreferrer"
                className={`flex items-start gap-4 p-4 rounded-xl border-2 ${c.bg} ${c.border} hover:opacity-90 transition-opacity no-underline`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-bold ${c.title}`}>{r.name}</p>
                    <p className={`text-xs ${c.cta} opacity-80`}>{r.tagline}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
                  <p className={`text-xs font-semibold mt-1.5 ${c.cta}`}>{r.cta}</p>
                </div>
                {!r.href.startsWith("sms") && (
                  <ExternalLink className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${c.cta}`} />
                )}
              </a>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-center text-muted-foreground pb-2">
        Everything here is stored only on your device and is never shared.
      </p>
    </div>
  );
}
