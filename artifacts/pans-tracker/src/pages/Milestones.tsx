import { useState } from "react";
import { format, parseISO, isToday, isFuture, isPast } from "date-fns";
import { useMilestones } from "@/hooks/useMilestones";
import { Milestone, MilestoneType, MILESTONE_TYPE_LABELS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  FileText,
  Pill,
  Tag,
  Plus,
  Pencil,
  Trash2,
  Flag,
  Clock,
  History,
} from "lucide-react";
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

const today = format(new Date(), "yyyy-MM-dd");

const TYPE_META: Record<
  MilestoneType,
  { icon: React.ElementType; colorClass: string; badgeClass: string }
> = {
  appointment: {
    icon: Calendar,
    colorClass: "text-blue-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  lab_results: {
    icon: FileText,
    colorClass: "text-violet-600",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
  medication_change: {
    icon: Pill,
    colorClass: "text-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  other: {
    icon: Tag,
    colorClass: "text-slate-500",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

function TypeBadge({ type }: { type: MilestoneType }) {
  const { badgeClass } = TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeClass}`}
    >
      {MILESTONE_TYPE_LABELS[type]}
    </span>
  );
}

interface MilestoneCardProps {
  ms: Milestone;
  onEdit: (ms: Milestone) => void;
  onDelete: (id: string) => void;
}

function MilestoneCard({ ms, onEdit, onDelete }: MilestoneCardProps) {
  const { icon: Icon, colorClass } = TYPE_META[ms.type];
  const isUpcoming = isFuture(parseISO(ms.date)) || isToday(parseISO(ms.date));

  return (
    <div
      className="flex items-start gap-4 px-4 py-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
      data-testid={`milestone-card-${ms.id}`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUpcoming ? "bg-primary/10" : "bg-muted"
        }`}
      >
        <Icon className={`w-4.5 h-4.5 ${isUpcoming ? colorClass : "text-muted-foreground"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground leading-tight">{ms.title}</span>
          <TypeBadge type={ms.type} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {format(parseISO(ms.date), "EEEE, MMMM d, yyyy")}
        </p>
        {ms.notes && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{ms.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(ms)}
          data-testid={`button-edit-milestone-${ms.id}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-muted-foreground hover:text-destructive"
              data-testid={`button-delete-milestone-${ms.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this milestone?</AlertDialogTitle>
              <AlertDialogDescription>
                "{ms.title}" on{" "}
                {format(parseISO(ms.date), "MMMM d, yyyy")} will be permanently
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(ms.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <Flag className="w-7 h-7 mb-2 opacity-25" />
      <p className="text-sm">No {label} milestones</p>
    </div>
  );
}

export default function Milestones() {
  const { milestones, addMilestone, updateMilestone, deleteMilestone } =
    useMilestones();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(today);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<MilestoneType>("appointment");
  const [formNotes, setFormNotes] = useState("");

  const upcoming = [...milestones]
    .filter((m) => m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = [...milestones]
    .filter((m) => m.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  function openAdd() {
    setEditId(null);
    setFormDate(today);
    setFormTitle("");
    setFormType("appointment");
    setFormNotes("");
    setShowForm(true);
  }

  function openEdit(ms: Milestone) {
    setEditId(ms.id);
    setFormDate(ms.date);
    setFormTitle(ms.title);
    setFormType(ms.type);
    setFormNotes(ms.notes ?? "");
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditId(null);
  }

  function handleSave() {
    if (!formTitle.trim()) return;
    const data = {
      date: formDate,
      title: formTitle.trim(),
      type: formType,
      notes: formNotes.trim() || undefined,
    };
    if (editId) {
      updateMilestone(editId, data);
      toast({ title: "Milestone updated" });
    } else {
      addMilestone(data);
      toast({ title: "Milestone added" });
    }
    setShowForm(false);
    setEditId(null);
  }

  function handleDelete(id: string) {
    deleteMilestone(id);
    toast({ title: "Milestone deleted" });
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Milestones
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track appointments, lab results, and key treatment events
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 flex-shrink-0" data-testid="button-add-milestone">
          <Plus className="w-4 h-4" />
          Add Milestone
        </Button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card className="border-primary/30 shadow-sm ring-1 ring-primary/20">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-base font-semibold"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {editId ? "Edit Milestone" : "New Milestone"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Title
                </Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Appointment with Dr. Smith"
                  className="text-sm"
                  data-testid="input-milestone-title"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Date
                </Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="text-sm"
                  data-testid="input-milestone-date"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Type
              </Label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as MilestoneType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="select-milestone-type"
              >
                {(Object.entries(MILESTONE_TYPE_LABELS) as [MilestoneType, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Notes / Outcome (optional)
              </Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Outcome, observations, or any relevant details..."
                className="resize-none h-20 text-sm"
                data-testid="input-milestone-notes"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!formTitle.trim()}
                data-testid="button-save-milestone"
              >
                {editId ? "Update" : "Save Milestone"}
              </Button>
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {milestones.length === 0 && !showForm ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Flag className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-base font-medium text-foreground">No milestones yet</p>
            <p className="text-sm mt-1 max-w-sm">
              Record appointments, lab results, and medication changes to see how they correlate
              with your symptom trends.
            </p>
            <Button onClick={openAdd} className="mt-5 gap-2">
              <Plus className="w-4 h-4" />
              Add your first milestone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2
                className="text-sm font-semibold text-foreground uppercase tracking-wide"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Upcoming
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {upcoming.length}
              </span>
            </div>
            {upcoming.length === 0 ? (
              <EmptySection label="upcoming" />
            ) : (
              <div className="space-y-2">
                {upcoming.map((ms) => (
                  <MilestoneCard
                    key={ms.id}
                    ms={ms}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2
                className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Past
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {past.length}
              </span>
            </div>
            {past.length === 0 ? (
              <EmptySection label="past" />
            ) : (
              <div className="space-y-2">
                {past.map((ms) => (
                  <MilestoneCard
                    key={ms.id}
                    ms={ms}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
