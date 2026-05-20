import { useState } from "react";
import { format } from "date-fns";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { ChildBaseline, ActivityLevel, ACTIVITY_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Heart, Edit2, Clock, CheckCircle2, Activity } from "lucide-react";
import { computeDailyScore, getHeatColor, getHeatLabel } from "@/lib/flare";
import { CATEGORIES } from "@/components/charts/SymptomChart";
import { SymptomLog } from "@/lib/types";

const emptyForm: Omit<ChildBaseline, "lastUpdated"> = {
  childName: "",
  childAge: "",
  description: "",
  sleepHours: "",
  appetite: "",
  activityLevel: "moderate",
  socialBehavior: "",
  schoolPerformance: "",
  behavioralNotes: "",
};

function ReadonlyField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
        {label}
      </p>
      <p className="text-sm text-amber-900 leading-relaxed">{value}</p>
    </div>
  );
}

export default function Baseline() {
  const { baseline, saveBaseline } = useChildBaseline();
  const { logs } = useSymptomLogs();
  const { toast } = useToast();

  const [editing, setEditing] = useState(!baseline);
  const [form, setForm] = useState<Omit<ChildBaseline, "lastUpdated">>(
    baseline
      ? {
          childName: baseline.childName,
          childAge: baseline.childAge,
          description: baseline.description,
          sleepHours: baseline.sleepHours,
          appetite: baseline.appetite,
          activityLevel: baseline.activityLevel,
          socialBehavior: baseline.socialBehavior,
          schoolPerformance: baseline.schoolPerformance,
          behavioralNotes: baseline.behavioralNotes,
        }
      : emptyForm
  );

  const name = form.childName.trim() || baseline?.childName?.trim() || "your child";

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayLog = logs.find((l) => l.date === todayStr);
  const todayScore = todayLog ? computeDailyScore(todayLog) : null;
  const todayColor = todayScore !== null ? getHeatColor(todayScore, true) : null;
  const todayLabel = todayScore !== null ? getHeatLabel(todayScore, true) : null;

  function handleSave() {
    if (!form.childName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    saveBaseline({ ...form, lastUpdated: new Date().toISOString() });
    setEditing(false);
    toast({ title: "Baseline saved", description: `${form.childName}'s profile has been saved.` });
  }

  const f = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const warmCard = {
    background: "linear-gradient(135deg, #fffbeb 0%, #fef9ec 100%)",
    border: "1px solid #fcd34d",
  };

  return (
    <div
      className="min-h-screen p-5 md:p-8"
      style={{ background: "linear-gradient(160deg, #fffbeb 0%, #fefce8 60%, #f0fdf4 100%)" }}
    >
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center py-4">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3"
            style={{ background: "linear-gradient(135deg, #fde68a, #fbbf24)" }}
          >
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "Fraunces, serif", color: "#78350f" }}
          >
            {baseline?.childName
              ? `Who ${baseline.childName} Really Is`
              : "My Child's Baseline"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#92400e" }}>
            A picture of your child when they are feeling like themselves
          </p>
          {baseline?.lastUpdated && (
            <p className="text-xs mt-1 flex items-center justify-center gap-1" style={{ color: "#b45309" }}>
              <Clock className="w-3 h-3" />
              Last updated {format(new Date(baseline.lastUpdated), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>

        {/* View / Edit toggle */}
        {baseline && !editing && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-amber-300 hover:bg-amber-50"
              style={{ color: "#92400e" }}
              onClick={() => setEditing(true)}
            >
              <Edit2 className="w-3 h-3" />
              Update Baseline
            </Button>
          </div>
        )}

        {/* Read-only view */}
        {baseline && !editing && (
          <div className="rounded-2xl p-6 space-y-5 shadow-sm" style={warmCard}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#92400e" }}>
                Child
              </p>
              <p className="text-lg font-bold" style={{ color: "#78350f", fontFamily: "Fraunces, serif" }}>
                {baseline.childName}
                {baseline.childAge && (
                  <span className="text-sm font-normal ml-2" style={{ color: "#b45309" }}>
                    · {baseline.childAge}
                  </span>
                )}
              </p>
            </div>

            {baseline.description && (
              <div
                className="rounded-xl p-4"
                style={{ background: "#fef3c7", border: "1px solid #fde68a" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#92400e" }}>
                  When {baseline.childName} is well, they are…
                </p>
                <p className="text-sm leading-relaxed italic" style={{ color: "#78350f" }}>
                  "{baseline.description}"
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadonlyField label="Typical sleep" value={baseline.sleepHours} />
              <ReadonlyField label="Activity level" value={ACTIVITY_LABELS[baseline.activityLevel]} />
              <ReadonlyField label="Appetite & diet" value={baseline.appetite} />
              <ReadonlyField label="Social behavior" value={baseline.socialBehavior} />
              <ReadonlyField label="School & learning" value={baseline.schoolPerformance} />
              <ReadonlyField label="Behavioral notes" value={baseline.behavioralNotes} />
            </div>
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="rounded-2xl p-6 space-y-5 shadow-sm" style={warmCard}>
            <p className="text-xs leading-relaxed" style={{ color: "#92400e" }}>
              Capture who your child is when they're healthy. Update this any time they
              have a good stretch — it becomes both an emotional anchor and a clinical
              reference for your doctor.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
                  Child's Name *
                </Label>
                <Input
                  value={form.childName}
                  onChange={f("childName")}
                  placeholder="e.g. Emma"
                  className="border-amber-300 focus-visible:ring-amber-400 bg-white/70"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
                  Age
                </Label>
                <Input
                  value={form.childAge}
                  onChange={f("childAge")}
                  placeholder="e.g. 8 years old"
                  className="border-amber-300 focus-visible:ring-amber-400 bg-white/70"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
                When {name} is well, they are…
              </Label>
              <Textarea
                value={form.description}
                onChange={f("description")}
                placeholder="curious and funny, loves building Legos, talks non-stop about Minecraft, laughs easily, plays with friends after school…"
                className="border-amber-300 focus-visible:ring-amber-400 bg-white/70 resize-none h-24 text-sm"
              />
              <p className="text-[11px]" style={{ color: "#b45309" }}>
                Hints: curious · funny · loves [hobby] · sleeps through the night · eats normally · plays with friends · calm · sweet
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
                  Typical sleep hours
                </Label>
                <Input
                  value={form.sleepHours}
                  onChange={f("sleepHours")}
                  placeholder="e.g. 9–10 hours, falls asleep easily"
                  className="border-amber-300 focus-visible:ring-amber-400 bg-white/70 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
                  Activity level when well
                </Label>
                <Select
                  value={form.activityLevel}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, activityLevel: v as ActivityLevel }))
                  }
                >
                  <SelectTrigger className="border-amber-300 focus:ring-amber-400 bg-white/70 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(
                      ([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
                Appetite &amp; typical foods
              </Label>
              <Textarea
                value={form.appetite}
                onChange={f("appetite")}
                placeholder="e.g. Good appetite, eats a variety of foods, loves pasta and fruit, no food aversions"
                className="border-amber-300 focus-visible:ring-amber-400 bg-white/70 resize-none h-16 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
                Social behavior when well
              </Label>
              <Textarea
                value={form.socialBehavior}
                onChange={f("socialBehavior")}
                placeholder="e.g. Outgoing, has a close group of friends, loves playdates, comfortable in new situations"
                className="border-amber-300 focus-visible:ring-amber-400 bg-white/70 resize-none h-16 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
                School &amp; learning when well
              </Label>
              <Textarea
                value={form.schoolPerformance}
                onChange={f("schoolPerformance")}
                placeholder="e.g. Engaged, finishes homework independently, enjoys reading, no anxiety about school"
                className="border-amber-300 focus-visible:ring-amber-400 bg-white/70 resize-none h-16 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e" }}>
                Behavioral notes
              </Label>
              <Textarea
                value={form.behavioralNotes}
                onChange={f("behavioralNotes")}
                placeholder="e.g. Typical kid meltdowns but recovers quickly, responds well to calm redirection"
                className="border-amber-300 focus-visible:ring-amber-400 bg-white/70 resize-none h-16 text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                className="flex-1 gap-2"
                style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Baseline
              </Button>
              {baseline && (
                <Button
                  variant="outline"
                  onClick={() => setEditing(false)}
                  className="border-amber-300"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Baseline vs. Today */}
        {baseline && !editing && todayScore !== null && (
          <div className="rounded-2xl p-5 space-y-4 shadow-sm" style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
            border: "1px solid #bbf7d0",
          }}>
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "Fraunces, serif", color: "#14532d" }}
            >
              Baseline vs. Today
            </h2>

            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 flex-shrink-0" style={{ color: "#15803d" }} />
              <span className="text-sm" style={{ color: "#14532d" }}>
                Today's total score:
              </span>
              <span
                className="text-sm font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: todayColor || "#86efac", color: "#1f2937" }}
              >
                {todayScore}/30 · {todayLabel}
              </span>
            </div>

            {todayLog && (
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const val = todayLog[cat.key as keyof SymptomLog] as number;
                  return (
                    <div key={cat.key} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs flex-1" style={{ color: "#166534" }}>
                        {cat.label}:
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "#14532d" }}>
                        {val}/5
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              className="rounded-lg p-3 text-xs leading-relaxed italic"
              style={{ background: "#dcfce7", color: "#14532d" }}
            >
              <span className="font-semibold not-italic">When well: </span>
              {baseline.description || `${baseline.childName} is doing well — happy and themselves.`}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
