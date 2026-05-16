import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useTriggerLog } from "@/hooks/useTriggerLog";
import { useHouseholdHealth } from "@/hooks/useHouseholdHealth";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import {
  AlertCircle,
  Thermometer,
  Home,
  Shield,
  Zap,
  Coffee,
  Moon,
  Wind,
  PenLine,
  Plus,
  Trash2,
  Users,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  TriggerCategory,
  TriggerSeverity,
  TriggerEntry,
  HouseholdIllness,
} from "@/lib/types";

const today = format(new Date(), "yyyy-MM-dd");

const TRIGGER_CATEGORIES = [
  { value: "strep_exposure" as const, label: "Strep Exposure", desc: "Confirmed or suspected", Icon: AlertCircle, color: "#dc2626" },
  { value: "child_illness" as const, label: "Child Illness", desc: "Child was unwell", Icon: Thermometer, color: "#ea580c" },
  { value: "household_illness" as const, label: "Household Member Ill", desc: "Someone else in the home", Icon: Home, color: "#d97706" },
  { value: "vaccination" as const, label: "Vaccination", desc: "", Icon: Shield, color: "#0891b2" },
  { value: "high_stress" as const, label: "High Stress Event", desc: "School, family, or social", Icon: Zap, color: "#7c3aed" },
  { value: "dietary_change" as const, label: "Dietary Change", desc: "", Icon: Coffee, color: "#16a34a" },
  { value: "poor_sleep" as const, label: "Poor Sleep (3+ nights)", desc: "", Icon: Moon, color: "#6d28d9" },
  { value: "seasonal_weather" as const, label: "Seasonal / Weather", desc: "", Icon: Wind, color: "#0369a1" },
  { value: "other" as const, label: "Other", desc: "Free text", Icon: PenLine, color: "#6b7280" },
] as const;

const SEVERITY_META: Record<TriggerSeverity, { label: string; color: string; bg: string; border: string }> = {
  low: { label: "Low", color: "#15803d", bg: "#f0fdf4", border: "#86efac" },
  medium: { label: "Medium", color: "#b45309", bg: "#fffbeb", border: "#fcd34d" },
  high: { label: "High", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
};

function getCategoryMeta(cat: TriggerCategory) {
  return TRIGGER_CATEGORIES.find((c) => c.value === cat) ?? TRIGGER_CATEGORIES[TRIGGER_CATEGORIES.length - 1];
}

type MergedItem =
  | { kind: "trigger"; entry: TriggerEntry; date: string }
  | { kind: "household"; illness: HouseholdIllness; date: string };

export default function TriggerLog() {
  const { entries, addEntry, deleteEntry } = useTriggerLog();
  const { illnesses, addIllness, deleteIllness } = useHouseholdHealth();
  const { baseline } = useChildBaseline();
  const { toast } = useToast();

  // Trigger form state
  const [category, setCategory] = useState<TriggerCategory | "">("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [severity, setSeverity] = useState<TriggerSeverity>("medium");
  const [memberName, setMemberName] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  // Household health form state
  const [showHHForm, setShowHHForm] = useState(false);
  const [hhMemberName, setHhMemberName] = useState("");
  const [hhIllnessType, setHhIllnessType] = useState("");
  const [hhStartDate, setHhStartDate] = useState(today);
  const [hhEndDate, setHhEndDate] = useState("");
  const [hhNotes, setHhNotes] = useState("");

  const childName = baseline?.childName?.trim();

  // Merged timeline: triggers + household illnesses sorted newest-first
  const mergedItems = useMemo<MergedItem[]>(() => {
    const items: MergedItem[] = [
      ...entries.map((e) => ({ kind: "trigger" as const, entry: e, date: e.date })),
      ...illnesses.map((h) => ({ kind: "household" as const, illness: h, date: h.startDate })),
    ];
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, illnesses]);

  function handleSaveTrigger() {
    if (!category) return;
    const entry: TriggerEntry = {
      id: `trigger-${Date.now()}`,
      category: category as TriggerCategory,
      date,
      notes,
      severity,
      householdMemberName: category === "household_illness" ? memberName || undefined : undefined,
      customCategory: category === "other" ? customCategory || undefined : undefined,
    };
    addEntry(entry);
    setCategory("");
    setNotes("");
    setSeverity("medium");
    setMemberName("");
    setCustomCategory("");
    setDate(today);
    toast({
      title: "Trigger saved",
      description: `${getCategoryMeta(category as TriggerCategory).label} · ${format(parseISO(date), "MMM d, yyyy")}`,
    });
  }

  function handleSaveHHIllness() {
    if (!hhMemberName.trim() || !hhIllnessType.trim()) return;
    const illness: HouseholdIllness = {
      id: `hh-${Date.now()}`,
      memberName: hhMemberName.trim(),
      illnessType: hhIllnessType.trim(),
      startDate: hhStartDate,
      endDate: hhEndDate || undefined,
      notes: hhNotes.trim() || undefined,
    };
    addIllness(illness);
    setHhMemberName("");
    setHhIllnessType("");
    setHhStartDate(today);
    setHhEndDate("");
    setHhNotes("");
    setShowHHForm(false);
    toast({
      title: "Illness logged",
      description: `${illness.memberName} · ${illness.illnessType}`,
    });
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-24">

      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground flex items-center gap-2"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <Zap className="w-5 h-5 text-primary" />
          Trigger Log
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {childName
            ? `Track events that may have preceded ${childName}'s symptoms`
            : "Track events that may have triggered or preceded symptoms"}
        </p>
      </div>

      {/* ── Log a Trigger ────────────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
            Log a Trigger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Category selector */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Category <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {TRIGGER_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all touch-manipulation"
                    style={
                      isSelected
                        ? { background: `${cat.color}12`, borderColor: cat.color }
                        : { borderColor: "hsl(var(--border))" }
                    }
                  >
                    <cat.Icon
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: isSelected ? cat.color : "hsl(var(--muted-foreground))" }}
                    />
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium leading-tight"
                        style={{ color: isSelected ? cat.color : "hsl(var(--foreground))" }}
                      >
                        {cat.label}
                      </p>
                      {cat.desc && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{cat.desc}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional: household member name */}
          {category === "household_illness" && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Household Member Name
              </Label>
              <Input
                placeholder="e.g. Dad, Emma, Grandma…"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
            </div>
          )}

          {/* Conditional: custom description */}
          {category === "other" && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Describe the Trigger
              </Label>
              <Input
                placeholder="e.g. Birthday party, school trip, new pet…"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}

          {/* Date + Severity row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Date
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Severity of Concern
              </Label>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as TriggerSeverity[]).map((sev) => {
                  const meta = SEVERITY_META[sev];
                  const isSelected = severity === sev;
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all touch-manipulation"
                      style={
                        isSelected
                          ? { background: meta.bg, color: meta.color, border: `1.5px solid ${meta.border}` }
                          : {
                              background: "hsl(var(--muted))",
                              color: "hsl(var(--muted-foreground))",
                              border: "1.5px solid transparent",
                            }
                      }
                    >
                      {sev}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Notes (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context or observations about this trigger…"
              className="resize-none h-20 text-sm"
            />
          </div>

          <Button
            onClick={handleSaveTrigger}
            disabled={!category}
            className="w-full gap-2"
            size="lg"
          >
            <Plus className="w-4 h-4" />
            Save Trigger
          </Button>
        </CardContent>
      </Card>

      {/* ── Household Health Log ─────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle
                className="text-base font-semibold flex items-center gap-2"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Users className="w-4 h-4 text-primary" />
                Household Health Log
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Log illnesses for all household members — they appear in the trigger timeline automatically.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHHForm(!showHHForm)}
              className="flex-shrink-0 gap-1 text-xs h-8 mt-0.5"
            >
              {showHHForm ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {showHHForm ? "Cancel" : "Add"}
            </Button>
          </div>
        </CardHeader>

        {/* Inline form */}
        {showHHForm && (
          <div className="px-5 pt-4 pb-5 mt-3 border-t border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Member Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Dad, Emma…"
                  value={hhMemberName}
                  onChange={(e) => setHhMemberName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Illness Type <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Cold, strep, flu…"
                  value={hhIllnessType}
                  onChange={(e) => setHhIllnessType(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={hhStartDate}
                  onChange={(e) => setHhStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  End Date (optional)
                </Label>
                <Input
                  type="date"
                  value={hhEndDate}
                  onChange={(e) => setHhEndDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Notes (optional)
              </Label>
              <Input
                placeholder="e.g. Tested positive for strep…"
                value={hhNotes}
                onChange={(e) => setHhNotes(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSaveHHIllness}
              disabled={!hhMemberName || !hhIllnessType}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Save Illness
            </Button>
          </div>
        )}

        <CardContent className={`pt-3 px-0 pb-2 ${showHHForm ? "" : "pt-4"}`}>
          {illnesses.length === 0 ? (
            <p className="text-sm text-muted-foreground italic px-5 py-2">
              No household illnesses logged yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {illnesses.map((h) => (
                <div key={h.id} className="flex items-start gap-3 px-5 py-3">
                  <Home className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {h.memberName}{" "}
                      <span className="font-normal text-muted-foreground">— {h.illnessType}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(h.startDate), "MMM d")}
                      {h.endDate
                        ? ` – ${format(parseISO(h.endDate), "MMM d, yyyy")}`
                        : " · Ongoing"}
                    </p>
                    {h.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{h.notes}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteIllness(h.id)}
                    className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Trigger Timeline ─────────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
            Trigger Timeline
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            All logged triggers and household illnesses, newest first. Trigger dates are also marked on the symptom heat map.
          </p>
        </CardHeader>
        <CardContent className="pt-0 px-0 pb-1">
          {mergedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground px-5">
              <Zap className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">No triggers logged yet</p>
              <p className="text-xs mt-1 leading-relaxed max-w-xs">
                Use the form above to log events that may have preceded symptoms.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {mergedItems.map((item) => {
                if (item.kind === "trigger") {
                  const { entry } = item;
                  const catMeta = getCategoryMeta(entry.category);
                  const sevMeta = SEVERITY_META[entry.severity];
                  return (
                    <div key={entry.id} className="flex items-start gap-3 px-5 py-4">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${catMeta.color}14` }}
                      >
                        <catMeta.Icon className="w-4 h-4" style={{ color: catMeta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {catMeta.label}
                              {entry.householdMemberName && (
                                <span className="font-normal text-muted-foreground ml-1">
                                  ({entry.householdMemberName})
                                </span>
                              )}
                            </p>
                            {entry.customCategory && (
                              <p className="text-xs text-muted-foreground mt-0.5">{entry.customCategory}</p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="flex-shrink-0 opacity-30 hover:opacity-80 transition-opacity mt-0.5"
                            aria-label="Delete trigger"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(entry.date), "EEEE, MMMM d, yyyy")}
                          </p>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: sevMeta.bg,
                              color: sevMeta.color,
                              border: `1px solid ${sevMeta.border}`,
                            }}
                          >
                            {sevMeta.label} concern
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-foreground mt-1.5 leading-relaxed border-l-2 border-border pl-2">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  const { illness } = item;
                  return (
                    <div
                      key={illness.id}
                      className="flex items-start gap-3 px-5 py-4"
                      style={{ background: "hsl(var(--muted)/0.3)" }}
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-100">
                        <Home className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {illness.memberName}
                            <span className="font-normal text-muted-foreground ml-1.5">
                              · {illness.illnessType}
                            </span>
                          </p>
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fcd34d" }}
                          >
                            Household
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(illness.startDate), "MMM d")}
                          {illness.endDate
                            ? ` – ${format(parseISO(illness.endDate), "MMM d, yyyy")}`
                            : " · Ongoing"}
                        </p>
                        {illness.notes && (
                          <p className="text-xs text-foreground mt-1.5 leading-relaxed border-l-2 border-border pl-2">
                            {illness.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
