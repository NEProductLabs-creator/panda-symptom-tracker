import { useState, useMemo } from "react";
import { format } from "date-fns";
import { PlusCircle, Pencil, Trash2, FlaskConical } from "lucide-react";
import { useLabResults } from "@/hooks/useLabResults";
import { useActiveChild } from "@/hooks/useActiveChild";
import { LabResult, LabTestName, LAB_TEST_NAMES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type FormData = {
  date: string;
  test_name: LabTestName;
  result_value: string;
  result_unit: string;
  reference_range: string;
  lab_name: string;
  notes: string;
};

function emptyForm(): FormData {
  return {
    date: format(new Date(), "yyyy-MM-dd"),
    test_name: "ASO",
    result_value: "",
    result_unit: "",
    reference_range: "",
    lab_name: "",
    notes: "",
  };
}

function fromEntry(entry: LabResult): FormData {
  return {
    date: entry.date,
    test_name: entry.test_name,
    result_value: entry.result_value != null ? String(entry.result_value) : "",
    result_unit: entry.result_unit ?? "",
    reference_range: entry.reference_range ?? "",
    lab_name: entry.lab_name ?? "",
    notes: entry.notes ?? "",
  };
}

function toPayload(form: FormData): Omit<LabResult, "id" | "child_id" | "updatedAt"> {
  return {
    date: form.date,
    test_name: form.test_name,
    result_value: form.result_value !== "" ? Number(form.result_value) : undefined,
    result_unit: form.result_unit || undefined,
    reference_range: form.reference_range || undefined,
    lab_name: form.lab_name || undefined,
    notes: form.notes || undefined,
  };
}

export default function Labs() {
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useLabResults();
  const activeChild = useActiveChild();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<LabResult | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  );

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(entry: LabResult) {
    setEditing(entry);
    setForm(fromEntry(entry));
    setFormOpen(true);
  }

  function handleSave() {
    if (!form.date || !form.test_name) return;
    if (editing) {
      updateEntry({ ...editing, ...toPayload(form) });
    } else {
      addEntry(toPayload(form));
    }
    setFormOpen(false);
  }

  function handleDelete() {
    if (deleteId) {
      deleteEntry(deleteId);
      setDeleteId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground"
            style={{ fontFamily: "Fraunces, serif", fontWeight: 400 }}
          >
            Lab Results
          </h1>
          <p
            className="text-sm text-muted-foreground mt-0.5"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            Track ASO titers, CRP, and other immune markers over time.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0" disabled={!activeChild}>
          <PlusCircle className="w-4 h-4" />
          Add Result
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <FlaskConical className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No lab results yet</p>
            <p className="text-xs text-muted-foreground/70 max-w-sm">
              Add ASO titers, CRP, and other immune markers to track trends alongside symptoms.
            </p>
            {activeChild && (
              <Button variant="outline" size="sm" onClick={openAdd} className="mt-2 gap-2">
                <PlusCircle className="w-4 h-4" />
                Add your first result
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.test_name}
                      </span>
                      {entry.result_value != null && (
                        <span className="text-base font-medium text-foreground">
                          {entry.result_value}
                          {entry.result_unit ? ` ${entry.result_unit}` : ""}
                        </span>
                      )}
                      {entry.reference_range && (
                        <span className="text-xs text-muted-foreground">
                          (ref: {entry.reference_range})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.date + "T12:00:00"), "MMM d, yyyy")}
                      </span>
                      {entry.lab_name && (
                        <span className="text-xs text-muted-foreground">
                          · {entry.lab_name}
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(entry)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(entry.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Lab Result" : "Add Lab Result"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lab-date">Date</Label>
                <Input
                  id="lab-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab-test">Test</Label>
                <Select
                  value={form.test_name}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, test_name: v as LabTestName }))
                  }
                >
                  <SelectTrigger id="lab-test">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAB_TEST_NAMES.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lab-value">Result Value</Label>
                <Input
                  id="lab-value"
                  type="number"
                  placeholder="e.g. 800"
                  value={form.result_value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, result_value: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab-unit">Unit</Label>
                <Input
                  id="lab-unit"
                  placeholder="e.g. IU/mL"
                  value={form.result_unit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, result_unit: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lab-ref">Reference Range</Label>
              <Input
                id="lab-ref"
                placeholder="e.g. < 200 IU/mL"
                value={form.reference_range}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reference_range: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lab-provider">Lab / Provider</Label>
              <Input
                id="lab-provider"
                placeholder="e.g. Quest Diagnostics"
                value={form.lab_name}
                onChange={(e) => setForm((f) => ({ ...f, lab_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lab-notes">Notes</Label>
              <Textarea
                id="lab-notes"
                placeholder="Any relevant context or observations…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.date || !form.test_name}>
              {editing ? "Save Changes" : "Add Result"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this lab result?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
