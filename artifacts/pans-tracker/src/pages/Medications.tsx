import { useState, useMemo } from "react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { useMedications } from "@/hooks/useMedications";
import {
  Medication,
  MedicationType,
  FrequencyOption,
  CourseType,
  MissedDose,
  FREQUENCY_LABELS,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Pill,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const today = format(new Date(), "yyyy-MM-dd");

const MED_TYPE_LABELS: Record<MedicationType, string> = {
  antibiotic: "Antibiotic",
  ssri: "SSRI",
  supplement: "Supplement",
  ivig: "IVIG",
  steroid: "Steroid",
  other: "Other",
};

const MED_TYPE_COLORS: Record<MedicationType, string> = {
  antibiotic: "bg-blue-100 text-blue-700 border-blue-200",
  ssri: "bg-purple-100 text-purple-700 border-purple-200",
  supplement: "bg-green-100 text-green-700 border-green-200",
  ivig: "bg-orange-100 text-orange-700 border-orange-200",
  steroid: "bg-yellow-100 text-yellow-700 border-yellow-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

const emptyForm = {
  name: "",
  dose: "",
  frequency: "once" as FrequencyOption,
  type: "antibiotic" as MedicationType,
  prescribingDoctor: "",
  courseType: "treatment" as CourseType,
  courseDays: "",
  startDate: today,
  endDate: "",
  supplyDays: "",
  notes: "",
};

function isActiveMed(med: Medication) {
  return !med.endDate || med.endDate >= today;
}

// ─── Treatment Progress Bar ───────────────────────────────────────────────────

function TreatmentProgress({ med }: { med: Medication }) {
  if (med.courseType !== "treatment" || !med.courseDays || !isActiveMed(med)) return null;

  const daysSinceStart = Math.max(
    1,
    differenceInDays(parseISO(today), parseISO(med.startDate)) + 1
  );
  const total = med.courseDays;
  const remaining = Math.max(0, total - daysSinceStart);
  const pct = Math.min(100, (daysSinceStart / total) * 100);

  const barColor =
    remaining === 0 ? "#86efac" : remaining <= 2 ? "#f87171" : "#60a5fa";

  return (
    <div className="mt-2.5 space-y-1">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          Day {Math.min(daysSinceStart, total)} of {total}
        </span>{" "}
        —{" "}
        {remaining === 0
          ? "Course complete"
          : `${remaining} day${remaining !== 1 ? "s" : ""} remaining`}
      </p>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

// ─── Missed Doses Section ─────────────────────────────────────────────────────

function MissedDosesSection({
  med,
  onAdd,
  onDelete,
}: {
  med: Medication;
  onAdd: (medId: string, missed: MissedDose) => void;
  onDelete: (medId: string, doseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formDate, setFormDate] = useState(today);
  const [formNote, setFormNote] = useState("");

  const missed = med.missedDoses ?? [];

  function handleAdd() {
    if (!formDate) return;
    onAdd(med.id, {
      id: `missed-${Date.now()}`,
      date: formDate,
      note: formNote.trim() || undefined,
    });
    setFormDate(today);
    setFormNote("");
  }

  return (
    <div className="mt-2.5 pt-2.5 border-t border-border/40">
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Clock className="w-3 h-3" />
        {missed.length > 0
          ? `${missed.length} missed dose${missed.length !== 1 ? "s" : ""} logged`
          : "Log a missed dose"}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="mt-2.5 space-y-3">
          {/* Inline add form */}
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Date missed
              </p>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Note (optional)
              </p>
              <Input
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="e.g. forgot during travel"
                className="h-8 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleAdd}>
              Add
            </Button>
          </div>

          {/* Existing missed doses */}
          {missed.length > 0 && (
            <div className="space-y-1">
              {[...missed]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {format(parseISO(d.date + "T12:00:00"), "MMM d")}
                    </span>
                    {d.note && <span>— {d.note}</span>}
                    <button
                      onClick={() => onDelete(med.id, d.id)}
                      className="ml-auto text-muted-foreground/50 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Med Card ─────────────────────────────────────────────────────────────────

function MedCard({
  med,
  onEdit,
  onDelete,
  onAddMissedDose,
  onDeleteMissedDose,
  showMissedDoses,
}: {
  med: Medication;
  onEdit: (med: Medication) => void;
  onDelete: (id: string) => void;
  onAddMissedDose: (medId: string, missed: MissedDose) => void;
  onDeleteMissedDose: (medId: string, doseId: string) => void;
  showMissedDoses: boolean;
}) {
  const active = isActiveMed(med);
  const refillSoon = med.supplyDays !== undefined && med.supplyDays <= 7 && active;

  return (
    <div
      className="p-4 rounded-xl border border-border bg-card"
      data-testid={`med-card-${med.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <Pill className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: name + type badge + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm leading-tight">{med.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {med.dose}
                {med.frequency && (
                  <span className="text-muted-foreground/70">
                    {" "}· {FREQUENCY_LABELS[med.frequency]}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${MED_TYPE_COLORS[med.type]}`}
              >
                {MED_TYPE_LABELS[med.type]}
              </span>
              {med.courseType && (
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-slate-100 text-slate-600 border-slate-200">
                  {med.courseType === "prophylactic" ? "Prophylactic" : "Treatment"}
                </span>
              )}
            </div>
          </div>

          {/* Doctor + Date range */}
          <div className="mt-1.5 space-y-0.5">
            {med.prescribingDoctor && (
              <p className="text-xs text-muted-foreground">
                Dr. {med.prescribingDoctor}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {format(parseISO(med.startDate + "T12:00:00"), "MMM d, yyyy")}
              {" — "}
              {med.endDate ? (
                format(parseISO(med.endDate + "T12:00:00"), "MMM d, yyyy")
              ) : (
                <span className="text-primary font-medium">Ongoing</span>
              )}
            </p>
          </div>

          {/* Treatment progress bar */}
          <TreatmentProgress med={med} />

          {/* Supply / Refill */}
          {med.supplyDays !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              {refillSoon ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3 h-3" />
                  Refill soon — {med.supplyDays} day{med.supplyDays !== 1 ? "s" : ""} left
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Supply: {med.supplyDays} day{med.supplyDays !== 1 ? "s" : ""} on hand
                </span>
              )}
            </div>
          )}

          {/* Notes */}
          {med.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed border-l-2 border-border pl-2">
              {med.notes}
            </p>
          )}

          {/* Missed doses */}
          {showMissedDoses && (
            <MissedDosesSection
              med={med}
              onAdd={onAddMissedDose}
              onDelete={onDeleteMissedDose}
            />
          )}
        </div>

        {/* Edit / Delete */}
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(med)}
            data-testid={`button-edit-med-${med.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-destructive"
                data-testid={`button-delete-med-${med.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this medication?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {med.name} from your records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(med.id)}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Medications() {
  const { medications, addMedication, deleteMedication, addMissedDose, deleteMissedDose } =
    useMedications();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [showHistory, setShowHistory] = useState(false);

  // ── Derived lists ───────────────────────────────────────────────────────────
  const active = useMemo(
    () => medications.filter(isActiveMed).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [medications]
  );
  const past = useMemo(
    () =>
      medications
        .filter((m) => !isActiveMed(m))
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [medications]
  );

  // ── Alert: refill soon ──────────────────────────────────────────────────────
  const refillAlerts = useMemo(
    () => active.filter((m) => m.supplyDays !== undefined && m.supplyDays <= 7),
    [active]
  );

  // ── Alert: prophylactic ended with no replacement ───────────────────────────
  const prophylacticEndedAlerts = useMemo(() => {
    return medications.filter((m) => {
      if (!m.endDate || m.courseType !== "prophylactic") return false;
      const daysSince = differenceInDays(parseISO(today), parseISO(m.endDate));
      if (daysSince < 0 || daysSince > 7) return false;
      const hasReplacement = medications.some(
        (other) =>
          other.id !== m.id &&
          other.courseType === "prophylactic" &&
          other.type === "antibiotic" &&
          isActiveMed(other) &&
          differenceInDays(parseISO(other.startDate), parseISO(m.endDate!)) <= 3
      );
      return !hasReplacement;
    });
  }, [medications]);

  // ── Dialog helpers ──────────────────────────────────────────────────────────
  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(med: Medication) {
    setEditing(med);
    setForm({
      name: med.name,
      dose: med.dose,
      frequency: med.frequency ?? "once",
      type: med.type,
      prescribingDoctor: med.prescribingDoctor ?? "",
      courseType: med.courseType ?? "treatment",
      courseDays: med.courseDays?.toString() ?? "",
      startDate: med.startDate,
      endDate: med.endDate ?? "",
      supplyDays: med.supplyDays?.toString() ?? "",
      notes: med.notes ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  }

  function validate() {
    const e: Partial<Record<string, string>> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.dose.trim()) e.dose = "Dose is required";
    if (!form.startDate) e.startDate = "Start date is required";
    if (
      form.courseType === "treatment" &&
      form.courseDays &&
      (isNaN(Number(form.courseDays)) || Number(form.courseDays) < 1)
    ) {
      e.courseDays = "Enter a valid number of days";
    }
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    // Compute endDate: for treatment courses with courseDays, derive it from startDate
    let endDate: string | null = null;
    if (form.courseType === "treatment") {
      if (form.courseDays && Number(form.courseDays) > 0) {
        endDate = format(
          addDays(parseISO(form.startDate), Number(form.courseDays) - 1),
          "yyyy-MM-dd"
        );
      } else if (form.endDate) {
        endDate = form.endDate;
      }
    } else {
      endDate = form.endDate || null;
    }

    const med: Medication = {
      id: editing?.id ?? `med-${Date.now()}`,
      name: form.name.trim(),
      dose: form.dose.trim(),
      frequency: form.frequency,
      type: form.type,
      startDate: form.startDate,
      endDate,
      prescribingDoctor: form.prescribingDoctor.trim() || undefined,
      courseType: form.courseType,
      courseDays: form.courseDays ? Number(form.courseDays) : undefined,
      supplyDays: form.supplyDays ? Number(form.supplyDays) : undefined,
      notes: form.notes.trim() || undefined,
      missedDoses: editing?.missedDoses ?? [],
    };
    try {
      addMedication(med);
      setDialogOpen(false);
      toast({ title: editing ? "Medication updated" : "Medication added", variant: "success" });
    } catch {
      toast({ title: "Couldn't save — please try again", variant: "destructive" });
    }
  }

  // Computed end date preview for treatment courses
  const computedEndDate = useMemo(() => {
    if (
      form.courseType === "treatment" &&
      form.courseDays &&
      Number(form.courseDays) > 0 &&
      form.startDate
    ) {
      return format(
        addDays(parseISO(form.startDate), Number(form.courseDays) - 1),
        "MMM d, yyyy"
      );
    }
    return null;
  }, [form.courseType, form.courseDays, form.startDate]);

  // ── History timeline ────────────────────────────────────────────────────────
  const history = useMemo(
    () => [...medications].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [medications]
  );

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Medications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track treatments, courses, and daily schedules
          </p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-medication" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Medication
        </Button>
      </div>

      {/* ── Alert banners ─────────────────────────────────────────────────────── */}

      {refillAlerts.map((med) => (
        <div
          key={`refill-${med.id}`}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{med.name}</span> has{" "}
            {med.supplyDays} day{med.supplyDays !== 1 ? "s" : ""} of supply remaining. Time to
            request a refill.
          </p>
        </div>
      ))}

      {prophylacticEndedAlerts.map((med) => (
        <div
          key={`ended-${med.id}`}
          className="flex items-start gap-3 px-4 py-3 rounded-xl border border-sky-200 bg-sky-50"
        >
          <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-sky-800 leading-relaxed">
            It looks like <span className="font-semibold">{med.name}</span> has ended. Remember to
            follow up with your doctor if a new course was planned.
          </p>
        </div>
      ))}

      {/* ── Active medications ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border text-center text-muted-foreground">
            <Pill className="w-7 h-7 mb-2 opacity-30" />
            <p className="text-sm">No active medications</p>
            <p className="text-xs mt-1">Add a medication to see it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((med) => (
              <MedCard
                key={med.id}
                med={med}
                onEdit={openEdit}
                onDelete={(id) => {
                  deleteMedication(id);
                  toast({ title: "Medication removed" });
                }}
                onAddMissedDose={addMissedDose}
                onDeleteMissedDose={deleteMissedDose}
                showMissedDoses
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Past medications ──────────────────────────────────────────────────── */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Past ({past.length})
          </h2>
          <div className="space-y-2 opacity-70">
            {past.map((med) => (
              <MedCard
                key={med.id}
                med={med}
                onEdit={openEdit}
                onDelete={(id) => {
                  deleteMedication(id);
                  toast({ title: "Medication removed" });
                }}
                onAddMissedDose={addMissedDose}
                onDeleteMissedDose={deleteMissedDose}
                showMissedDoses={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Medication History Timeline ───────────────────────────────────────── */}
      {medications.length > 0 && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle
              className="text-base font-semibold"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Medication History
            </CardTitle>
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? "Hide" : "Show all"}
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </CardHeader>
          {showHistory && (
            <CardContent className="pt-0 pb-4">
              <div className="relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-4 pl-6">
                  {history.map((med) => {
                    const isPast = !isActiveMed(med);
                    return (
                      <div key={med.id} className="relative">
                        {/* Dot */}
                        <div
                          className="absolute -left-[18px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background"
                          style={{
                            backgroundColor: isPast ? "#d1d5db" : "#3b82f6",
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {med.name}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${MED_TYPE_COLORS[med.type]}`}
                            >
                              {MED_TYPE_LABELS[med.type]}
                            </span>
                            {isPast && (
                              <span className="text-xs text-muted-foreground">(ended)</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {med.dose}
                            {med.frequency && ` · ${FREQUENCY_LABELS[med.frequency]}`}
                            {med.prescribingDoctor && ` · Dr. ${med.prescribingDoctor}`}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {format(parseISO(med.startDate + "T12:00:00"), "MMM d, yyyy")}
                            {med.endDate &&
                              ` → ${format(parseISO(med.endDate + "T12:00:00"), "MMM d, yyyy")}`}
                            {med.courseDays && ` (${med.courseDays}-day course)`}
                          </p>
                          {med.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {med.notes}
                            </p>
                          )}
                          {(med.missedDoses?.length ?? 0) > 0 && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                              {med.missedDoses!.length} missed dose
                              {med.missedDoses!.length !== 1 ? "s" : ""} logged
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Add / Edit dialog ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-testid="dialog-medication"
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Fraunces, serif" }}>
              {editing ? "Edit Medication" : "Add Medication"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Medication Name
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Augmentin, Azithromycin, Zoloft"
                data-testid="input-med-name"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Dose + Frequency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Dose</Label>
                <Input
                  value={form.dose}
                  onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
                  placeholder="e.g. 500mg, 1 tsp"
                  data-testid="input-med-dose"
                />
                {errors.dose && <p className="text-xs text-destructive">{errors.dose}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Frequency
                </Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as FrequencyOption }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(FREQUENCY_LABELS) as [FrequencyOption, string][]).map(
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

            {/* Type + Prescribing Doctor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as MedicationType }))}
                >
                  <SelectTrigger data-testid="select-med-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MED_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Prescribing Doctor
                </Label>
                <Input
                  value={form.prescribingDoctor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, prescribingDoctor: e.target.value }))
                  }
                  placeholder="e.g. Dr. Smith"
                />
              </div>
            </div>

            {/* Course Type */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Course Type
              </Label>
              <div className="flex gap-2">
                {(
                  [
                    { value: "prophylactic", label: "Prophylactic (ongoing)" },
                    { value: "treatment", label: "Treatment course" },
                  ] as { value: CourseType; label: string }[]
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, courseType: value }))}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      form.courseType === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start date + course length or end date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  data-testid="input-med-start"
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate}</p>
                )}
              </div>

              {form.courseType === "treatment" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Course Length (days)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={form.courseDays}
                    onChange={(e) => setForm((f) => ({ ...f, courseDays: e.target.value }))}
                    placeholder="e.g. 14"
                    data-testid="input-med-course-days"
                  />
                  {computedEndDate && (
                    <p className="text-[11px] text-muted-foreground">
                      Ends {computedEndDate}
                    </p>
                  )}
                  {errors.courseDays && (
                    <p className="text-xs text-destructive">{errors.courseDays}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    End Date (if stopping)
                  </Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    data-testid="input-med-end"
                  />
                  <p className="text-[11px] text-muted-foreground">Leave blank for ongoing</p>
                </div>
              )}
            </div>

            {/* Supply on hand */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Supply on Hand (days) — optional
              </Label>
              <Input
                type="number"
                min="0"
                value={form.supplyDays}
                onChange={(e) => setForm((f) => ({ ...f, supplyDays: e.target.value }))}
                placeholder="e.g. 14"
                data-testid="input-med-supply"
              />
              <p className="text-[11px] text-muted-foreground">
                A refill reminder will appear when 7 or fewer days remain.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Started this antibiotic on day 1, noticed improvement by day 4"
                className="resize-none h-20 text-sm"
                data-testid="input-med-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-medication">
              {editing ? "Update" : "Add Medication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
