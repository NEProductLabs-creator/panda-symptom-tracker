import { useState } from "react";
import { format } from "date-fns";
import { useMedications } from "@/hooks/useMedications";
import { Medication, MedicationType } from "@/lib/types";
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
import { Plus, Pencil, Trash2, Pill } from "lucide-react";

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
  type: "other" as MedicationType,
  startDate: format(new Date(), "yyyy-MM-dd"),
  endDate: "",
  notes: "",
};

export default function Medications() {
  const { medications, addMedication, deleteMedication } = useMedications();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<typeof emptyForm>>({});

  const today = format(new Date(), "yyyy-MM-dd");

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
      type: med.type,
      startDate: med.startDate,
      endDate: med.endDate ?? "",
      notes: med.notes ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  }

  function validate() {
    const e: Partial<typeof emptyForm> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.dose.trim()) e.dose = "Dose is required";
    if (!form.startDate) e.startDate = "Start date is required";
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    const med: Medication = {
      id: editing?.id ?? `med-${Date.now()}`,
      name: form.name.trim(),
      dose: form.dose.trim(),
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate || null,
      notes: form.notes.trim() || undefined,
    };
    addMedication(med);
    setDialogOpen(false);
    toast({ title: editing ? "Medication updated" : "Medication added" });
  }

  const active = medications.filter((m) => !m.endDate || m.endDate >= today);
  const past = medications.filter((m) => m.endDate && m.endDate < today);

  function MedCard({ med }: { med: Medication }) {
    const isActive = !med.endDate || med.endDate >= today;
    return (
      <div
        className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
        data-testid={`med-card-${med.id}`}
      >
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <Pill className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground text-sm">{med.name}</p>
              <p className="text-xs text-muted-foreground">{med.dose}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${MED_TYPE_COLORS[med.type]}`}>
                {MED_TYPE_LABELS[med.type]}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {format(new Date(med.startDate + "T12:00:00"), "MMM d, yyyy")}
            {" — "}
            {med.endDate
              ? format(new Date(med.endDate + "T12:00:00"), "MMM d, yyyy")
              : <span className="text-primary font-medium">Ongoing</span>}
          </p>
          {med.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">{med.notes}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-muted-foreground hover:text-foreground"
            onClick={() => openEdit(med)}
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
                <AlertDialogAction onClick={() => { deleteMedication(med.id); toast({ title: "Medication removed" }); }}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
            Medications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track current and past treatments</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-medication" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Medication
        </Button>
      </div>

      {/* Active medications */}
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
            {active.map((med) => <MedCard key={med.id} med={med} />)}
          </div>
        )}
      </section>

      {/* Past medications */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Past ({past.length})
          </h2>
          <div className="space-y-2 opacity-70">
            {past.map((med) => <MedCard key={med.id} med={med} />)}
          </div>
        </section>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-medication">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>
              {editing ? "Edit Medication" : "Add Medication"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Medication Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Augmentin, Zoloft, Fish Oil"
                data-testid="input-med-name"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
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
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  data-testid="input-med-start"
                />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">End Date (optional)</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  data-testid="input-med-end"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Dosing instructions, side effects, prescribing doctor..."
                className="resize-none h-20 text-sm"
                data-testid="input-med-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="button-save-medication">
              {editing ? "Update" : "Add Medication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
