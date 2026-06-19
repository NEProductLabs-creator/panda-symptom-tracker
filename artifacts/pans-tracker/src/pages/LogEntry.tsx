import { useState, useEffect, useRef } from "react";
import { format, subDays, addDays, parseISO } from "date-fns";
import { Link } from "wouter";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { useActiveChild } from "@/hooks/useActiveChild";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ClipboardList, BookOpen, Pill, ChevronLeft, ChevronRight } from "lucide-react";
import { SymptomLog, FREQUENCY_LABELS } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CATEGORIES = [
  { key: "ocd",       label: "OCD Behaviors",        inverted: false },
  { key: "anxiety",   label: "Anxiety",              inverted: false },
  { key: "rage",      label: "Rage / Dysregulation", inverted: false },
  { key: "tics",      label: "Tics",                 inverted: false },
  { key: "sleep",     label: "Sleep Quality",        inverted: true  },
  { key: "cognition", label: "School / Cognition",   inverted: true  },
] as const;

const today = format(new Date(), "yyyy-MM-dd");


function ScoreBubble({ value, active, onClick, label }: { value: number; active: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-11 w-11 min-h-[44px] min-w-[44px] rounded-full text-sm font-semibold transition-all flex flex-col items-center justify-center border-2 ${
        active
          ? "border-transparent shadow-sm scale-105 text-white"
          : "border-border bg-transparent text-muted-foreground hover:border-muted-foreground/40"
      }`}
      style={active ? { backgroundColor: "var(--terracotta)" } : undefined}
    >
      <span className="leading-none">{value}</span>
      {label && (
        <span className="text-[9px] leading-none mt-0.5 font-medium opacity-75">{label}</span>
      )}
    </button>
  );
}

function ScoreBadge({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const colors = ["bg-slate-100 text-slate-400", "bg-green-100 text-green-700", "bg-lime-100 text-lime-700", "bg-yellow-100 text-yellow-700", "bg-orange-100 text-orange-700", "bg-red-100 text-red-700"];
  const invertedColors = ["bg-red-100 text-red-700", "bg-orange-100 text-orange-700", "bg-yellow-100 text-yellow-700", "bg-lime-100 text-lime-700", "bg-green-100 text-green-700", "bg-emerald-100 text-emerald-700"];
  const palette = inverted ? invertedColors : colors;
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${palette[value] ?? ""}`}>
      {value}
    </span>
  );
}

export default function LogEntry() {
  const { logs, addLog, deleteLog } = useSymptomLogs();
  const { medLibrary } = useMedLibrary();
  const { toast } = useToast();
  const activeChild = useActiveChild();
  const childName = activeChild?.name?.trim();

  const [selectedDate, setSelectedDate] = useState(today);
  const existing = logs.find((l) => l.date === selectedDate);

  const canGoForward = selectedDate < today;
  const touchStartX = useRef<number | null>(null);

  function goBack() {
    setSelectedDate(format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd"));
  }

  function goForward() {
    const next = format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd");
    if (next <= today) setSelectedDate(next);
  }

  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const dateLabel =
    selectedDate === today
      ? "Today"
      : selectedDate === yesterday
      ? "Yesterday"
      : format(parseISO(selectedDate), "EEE, MMM d, yyyy");
  const dateSubLabel =
    selectedDate === today || selectedDate === yesterday
      ? format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")
      : null;

  const [scores, setScores] = useState<{
    ocd: number | null; anxiety: number | null; rage: number | null;
    tics: number | null; sleep: number | null; cognition: number | null;
  }>({ ocd: null, anxiety: null, rage: null, tics: null, sleep: null, cognition: null });
  const [calmDay, setCalmDay] = useState(false);
  const [notes, setNotes] = useState("");
  const [medicationsTaken, setMedicationsTaken] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Populate form when selected date changes or when Supabase data first loads
  useEffect(() => {
    const entry = logs.find((l) => l.date === selectedDate);
    setScores(
      entry
        ? { ocd: entry.ocd ?? null, anxiety: entry.anxiety ?? null, rage: entry.rage ?? null, tics: entry.tics ?? null, sleep: entry.sleep ?? null, cognition: entry.cognition ?? null }
        : { ocd: null, anxiety: null, rage: null, tics: null, sleep: null, cognition: null }
    );
    setCalmDay(entry?.calmDay ?? false);
    setNotes(entry?.notes ?? "");
    setMedicationsTaken(entry?.medicationsTaken ?? []);
  }, [selectedDate, logs]);

  function toggleMed(id: string) {
    setMedicationsTaken((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  // Enable save only when there's something meaningful to record.
  const canSave = calmDay || Object.values(scores).some((v) => v !== null);

  function handleSave() {
    try {
      const log: SymptomLog = {
        id: existing?.id ?? crypto.randomUUID(),
        date: selectedDate,
        // If calmDay, write explicit 0s so the log is distinguishable from "no data".
        // Otherwise preserve null for any category the user didn't score.
        ocd: calmDay ? 0 : scores.ocd,
        anxiety: calmDay ? 0 : scores.anxiety,
        rage: calmDay ? 0 : scores.rage,
        tics: calmDay ? 0 : scores.tics,
        sleep: calmDay ? 0 : scores.sleep,
        cognition: calmDay ? 0 : scores.cognition,
        notes,
        medicationsTaken,
        calmDay,
      };
      addLog(log);
      setSaved(true);
      toast({
        title: existing ? "Entry updated" : `Saved for ${childName ?? "your child"}.`,
        variant: "success",
      });
      setTimeout(() => setSaved(false), 1500);
    } catch {
      toast({ title: "Couldn't save — please try again", variant: "destructive" });
    }
  }

  const recent = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Fraunces, serif" }}>
          Daily Log
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quick daily check — 5 categories, takes under a minute.</p>
      </div>

      {/* Date navigator */}
      <div
        className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3 shadow-sm"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const delta = touchStartX.current - e.changedTouches[0].clientX;
          touchStartX.current = null;
          if (delta > 50) goForward();
          else if (delta < -50) goBack();
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="w-11 h-11 text-muted-foreground hover:text-foreground flex-shrink-0"
          data-testid="button-date-back"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-base font-semibold text-foreground leading-tight" style={{ fontFamily: "Fraunces, serif" }}>
            {dateLabel}
          </p>
          {dateSubLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{dateSubLabel}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={goForward}
          disabled={!canGoForward}
          className="w-11 h-11 text-muted-foreground hover:text-foreground flex-shrink-0 disabled:opacity-30"
          data-testid="button-date-forward"
          aria-label="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "Fraunces, serif" }}>
            {existing ? "Edit Entry" : "New Entry"}
            {existing && (
              <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Saved
              </span>
            )}
          </CardTitle>
          {existing && (
            <p className="text-xs text-muted-foreground">
              Pre-filled with your saved values — update and save to overwrite.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Scale legend */}
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground leading-snug">
              <span className="font-medium text-foreground/70">Symptoms</span>:&nbsp;
              <span className="font-medium text-foreground/70">0</span> = None &nbsp;→&nbsp;
              <span className="font-medium text-foreground/70">5</span> = Extreme
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              <span className="font-medium text-foreground/70">Sleep &amp; Cognition</span>:&nbsp;
              <span className="font-medium text-foreground/70">0</span> = Poor &nbsp;→&nbsp;
              <span className="font-medium text-foreground/70">5</span> = Excellent &nbsp;(higher = better)
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full touch-manipulation font-medium text-base border-2 hover:bg-primary/5"
            style={{ borderColor: '#8aa395', color: '#3d6659' }}
            onClick={() => {
              setScores({ ocd: 0, anxiety: 0, rage: 0, tics: 0, sleep: 0, cognition: 0 });
              setCalmDay(true);
            }}
            data-testid="button-calm-day"
          >
            Calm day — nothing to report
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  {cat.label}
                  {cat.inverted && (
                    <span className="normal-case text-[9px] font-medium text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full tracking-normal">
                      Higher = better
                    </span>
                  )}
                </Label>
                <div className="flex gap-1.5" data-testid={`score-${cat.key}`}>
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <ScoreBubble
                      key={n}
                      value={n}
                      active={scores[cat.key] === n}
                      onClick={() => { setScores((s) => ({ ...s, [cat.key]: n })); setCalmDay(false); }}
                      label={
                        cat.inverted
                          ? (n === 0 ? "Poor" : n === 5 ? "Excel" : undefined)
                          : (n === 0 ? "None" : n === 5 ? "Extreme" : undefined)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Medications taken checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Medications Taken Today
              </Label>
              {medLibrary.length === 0 && (
                <Link href="/library">
                  <span className="text-xs text-primary hover:underline cursor-pointer">Set up library</span>
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
                  {" "}to track which ones were given each day.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="med-checklist-log">
                {medLibrary.map((med) => (
                  <label
                    key={med.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    data-testid={`med-check-log-${med.id}`}
                  >
                    <Checkbox
                      checked={medicationsTaken.includes(med.id)}
                      onCheckedChange={() => toggleMed(med.id)}
                      data-testid={`checkbox-log-med-${med.id}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight">{med.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {med.dosage} · {FREQUENCY_LABELS[med.frequency]}
                      </p>
                    </div>
                    {medicationsTaken.includes(med.id) && (
                      <Pill className="w-3.5 h-3.5 text-primary flex-shrink-0" />
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
              placeholder="Observations, triggers, context..."
              className="resize-none h-24 text-sm"
              data-testid="input-log-notes"
            />
          </div>

          <Button onClick={handleSave} disabled={!canSave} data-testid="button-save-entry">
            {saved ? "Saved ✓" : existing ? "Update Entry" : "Save Entry"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent entries */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "Fraunces, serif" }}>
            <ClipboardList className="w-4 h-4 text-primary" />
            Recent Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ClipboardList className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No entries yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[600px] w-full text-sm" data-testid="log-table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">OCD</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Anx</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Rage</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Tics</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Sleep</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Cogn</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Meds</th>
                    <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Notes</th>
                    <th className="py-3 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((log) => {
                    const takenCount = log.medicationsTaken?.length ?? 0;
                    return (
                      <tr
                        key={log.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${selectedDate === log.date ? "bg-accent/40" : ""}`}
                        onClick={() => setSelectedDate(log.date)}
                        data-testid={`log-row-${log.date}`}
                      >
                        <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                          {format(new Date(log.date + "T12:00:00"), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 px-2 text-center"><ScoreBadge value={log.ocd ?? 0} /></td>
                        <td className="py-3 px-2 text-center"><ScoreBadge value={log.anxiety ?? 0} /></td>
                        <td className="py-3 px-2 text-center"><ScoreBadge value={log.rage ?? 0} /></td>
                        <td className="py-3 px-2 text-center"><ScoreBadge value={log.tics ?? 0} /></td>
                        <td className="py-3 px-2 text-center"><ScoreBadge value={log.sleep ?? 0} inverted /></td>
                        <td className="py-3 px-2 text-center"><ScoreBadge value={log.cognition ?? 0} inverted /></td>
                        <td className="py-3 px-2 text-center">
                          {takenCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                              <Pill className="w-3 h-3" />
                              {takenCount}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground max-w-xs truncate text-xs">
                          {log.notes || "—"}
                        </td>
                        <td className="py-3 px-3">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`button-delete-log-${log.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the log for{" "}
                                  {format(new Date(log.date + "T12:00:00"), "MMMM d, yyyy")}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    deleteLog(log.id);
                                    toast({ title: "Entry deleted" });
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
