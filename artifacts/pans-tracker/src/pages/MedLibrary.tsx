import { useState, useEffect } from "react";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { MedLibraryItem, FrequencyOption, FREQUENCY_LABELS } from "@/lib/types";
import MedAdherence from "@/components/MedAdherence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useActiveChild } from "@/hooks/useActiveChild";
import { useChildren } from "@/hooks/useChildren";
import ChildSwitcher from "@/components/ChildSwitcher";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";

const emptyForm = {
  name: "",
  dosage: "",
  frequency: "once" as FrequencyOption,
};

export default function MedLibrary() {
  const { medLibrary, saveMedLibraryItem, deleteMedLibraryItem } = useMedLibrary();
  const { logs } = useSymptomLogs();
  const { toast } = useToast();
  const activeChildId = useActiveChild()?.id ?? null;
  const { data: children = [] } = useChildren();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedLibraryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<typeof emptyForm>>({});

  // Close the form when the active child changes.
  useEffect(() => { setDialogOpen(false); }, [activeChildId]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(item: MedLibraryItem) {
    setEditing(item);
    setForm({ name: item.name, dosage: item.dosage, frequency: item.frequency });
    setErrors({});
    setDialogOpen(true);
  }

  function validate() {
    const e: Partial<typeof emptyForm> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.dosage.trim()) e.dosage = "Dosage is required";
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    const item: MedLibraryItem = {
      id: editing?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      frequency: form.frequency,
    };
    saveMedLibraryItem(item);
    setDialogOpen(false);
    toast({ title: editing ? "Medication updated" : "Medication added to library" });
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Fraunces, serif" }}>
            Medication Library
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Save medications to quickly check them off in the daily log
          </p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-library-med" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Medication
        </Button>
      </div>

      {children.length > 1 && <ChildSwitcher variant="pill" />}

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "Fraunces, serif" }}>
            <BookOpen className="w-4 h-4 text-primary" />
            Saved Medications ({medLibrary.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {medLibrary.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
              <BookOpen className="w-8 h-8 mb-3 opacity-25" />
              <p className="text-sm font-medium">No medications saved yet</p>
              <p className="text-xs mt-1 max-w-xs">
                Add medications here — they'll appear as a checklist in the daily log so you can quickly mark which ones were given each day.
              </p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={openAdd} data-testid="button-add-first-med">
                <Plus className="w-3.5 h-3.5" />
                Add your first medication
              </Button>
            </div>
          ) : (
            <ul data-testid="med-library-list">
              {medLibrary.map((item, i) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-4 px-5 py-4 ${i < medLibrary.length - 1 ? "border-b border-border" : ""}`}
                  data-testid={`library-item-${item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.dosage}
                      <span className="mx-1.5 opacity-40">·</span>
                      {FREQUENCY_LABELS[item.frequency]}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(item)}
                      data-testid={`button-edit-library-${item.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          data-testid={`button-delete-library-${item.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove from library?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {item.name} from your library. Past log entries that recorded this medication will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              deleteMedLibraryItem(item.id);
                              toast({ title: "Medication removed from library" });
                            }}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <MedAdherence medLibrary={medLibrary} logs={logs} />

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-library-med">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Fraunces, serif" }}>
              {editing ? "Edit Medication" : "Add to Library"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Medication Name
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Azithromycin, Zoloft, Omega-3"
                data-testid="input-library-name"
                autoFocus
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Dosage
              </Label>
              <Input
                value={form.dosage}
                onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
                placeholder="e.g. 250mg, 1 tsp, 500mg"
                data-testid="input-library-dosage"
              />
              {errors.dosage && <p className="text-xs text-destructive">{errors.dosage}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Frequency
              </Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as FrequencyOption }))}
              >
                <SelectTrigger data-testid="select-library-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(FREQUENCY_LABELS) as [FrequencyOption, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="button-save-library-med">
              {editing ? "Update" : "Add to Library"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
