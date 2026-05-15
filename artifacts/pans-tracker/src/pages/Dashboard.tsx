import { useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedications } from "@/hooks/useMedications";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { useMilestones } from "@/hooks/useMilestones";
import SymptomChart, { CATEGORIES } from "@/components/charts/SymptomChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, TrendingUp, BookOpen, Pill } from "lucide-react";
import { SymptomLog, FREQUENCY_LABELS } from "@/lib/types";

const today = format(new Date(), "yyyy-MM-dd");
const todayDisplay = format(new Date(), "EEEE, MMMM d, yyyy");

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="flex gap-1.5" data-testid={`score-${label.toLowerCase().replace(/\s|\//g, "-")}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            data-testid={`score-btn-${label.toLowerCase().replace(/\s|\//g, "-")}-${n}`}
            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
              value === n
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { logs, addLog } = useSymptomLogs();
  const { medications } = useMedications();
  const { medLibrary } = useMedLibrary();
  const { milestones } = useMilestones();
  const { toast } = useToast();

  const existingToday = logs.find((l) => l.date === today);

  const [scores, setScores] = useState({
    ocd: existingToday?.ocd ?? 1,
    anxiety: existingToday?.anxiety ?? 1,
    rage: existingToday?.rage ?? 1,
    tics: existingToday?.tics ?? 1,
    sleep: existingToday?.sleep ?? 1,
    cognition: existingToday?.cognition ?? 1,
  });
  const [notes, setNotes] = useState(existingToday?.notes ?? "");
  const [medicationsTaken, setMedicationsTaken] = useState<string[]>(
    existingToday?.medicationsTaken ?? []
  );
  const [saved, setSaved] = useState(false);

  function toggleMed(id: string) {
    setMedicationsTaken((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function handleSave() {
    const log: SymptomLog = {
      id: existingToday?.id ?? `log-${Date.now()}`,
      date: today,
      ...scores,
      notes,
      medicationsTaken,
    };
    addLog(log);
    setSaved(true);
    toast({ title: "Log saved", description: "Today's symptoms have been recorded." });
    setTimeout(() => setSaved(false), 3000);
  }

  const activeMeds = medications.filter(
    (m) => !m.endDate || m.endDate >= today
  );

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{todayDisplay}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Logs (30 days)</p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-log-count">
              {logs.filter((l) => l.date >= format(new Date(Date.now() - 30 * 86400000), "yyyy-MM-dd")).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Active Meds</p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-active-meds">
              {activeMeds.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Today's Log</p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-today-status">
              {existingToday ? "Done" : "Pending"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
            <TrendingUp className="w-4 h-4 text-primary" />
            30-Day Symptom Trends
          </CardTitle>
          {(medications.length > 0 || medLibrary.length > 0) && (
            <p className="text-xs text-muted-foreground">
              {medications.length > 0 && "Shaded areas indicate medication periods. "}
              {medLibrary.length > 0 && "Hover a data point to see medications given that day."}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No symptom data yet.</p>
              <p className="text-xs mt-1">Log today's symptoms below to get started.</p>
            </div>
          ) : (
            <SymptomChart logs={logs} medications={medications} medLibrary={medLibrary} milestones={milestones} />
          )}
        </CardContent>
      </Card>

      {/* Today's quick log */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            {existingToday && <CheckCircle2 className="w-4 h-4 text-primary" />}
            {existingToday ? "Update Today's Log" : "Log Today's Symptoms"}
          </CardTitle>
          {existingToday && (
            <p className="text-xs text-muted-foreground">You've already logged today — update below if needed.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <ScoreInput
                key={cat.key}
                label={cat.label}
                value={scores[cat.key as keyof typeof scores]}
                onChange={(v) => setScores((s) => ({ ...s, [cat.key]: v }))}
              />
            ))}
          </div>

          {/* Medications taken today */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Medications Taken Today
              </Label>
              {medLibrary.length === 0 && (
                <Link href="/library">
                  <span className="text-xs text-primary hover:underline cursor-pointer">
                    Set up library
                  </span>
                </Link>
              )}
            </div>
            {medLibrary.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border text-muted-foreground">
                <BookOpen className="w-4 h-4 flex-shrink-0 opacity-40" />
                <p className="text-xs">
                  Add medications to your{" "}
                  <Link href="/library">
                    <span className="text-primary hover:underline cursor-pointer font-medium">Med Library</span>
                  </Link>
                  {" "}to see a checklist here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="med-checklist-today">
                {medLibrary.map((med) => (
                  <label
                    key={med.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    data-testid={`med-check-${med.id}`}
                  >
                    <Checkbox
                      checked={medicationsTaken.includes(med.id)}
                      onCheckedChange={() => toggleMed(med.id)}
                      data-testid={`checkbox-med-${med.id}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{med.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {med.dosage} · {FREQUENCY_LABELS[med.frequency]}
                      </p>
                    </div>
                    {medicationsTaken.includes(med.id) && (
                      <Pill className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations, triggers, or context for today..."
              className="resize-none h-20 text-sm"
              data-testid="input-notes"
            />
          </div>
          <Button
            onClick={handleSave}
            className="w-full sm:w-auto"
            data-testid="button-save-log"
          >
            {saved ? "Saved!" : existingToday ? "Update Log" : "Save Log"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
