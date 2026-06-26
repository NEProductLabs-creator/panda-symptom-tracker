import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  Users, Plus, Pencil, Archive, RotateCcw, ChevronDown, ChevronRight, X, Save,
  ClipboardCheck,
} from "lucide-react";
import { differenceInYears, differenceInMonths, parseISO, format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAllChildren,
  useUpdateChild,
  useArchiveChild,
  useUnarchiveChild,
} from "@/hooks/useChildren";
import { useActiveChild, setActiveChild } from "@/hooks/useActiveChild";
import { useScreenerResults } from "@/hooks/useScreenerResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import type { Child, DiagnosisStatus, JourneyStage } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string | null): string {
  if (!dob) return "—";
  try {
    const birth = parseISO(dob);
    const years = differenceInYears(new Date(), birth);
    if (years < 1) {
      const months = differenceInMonths(new Date(), birth);
      return `${months}mo`;
    }
    return `${years}y`;
  } catch {
    return "—";
  }
}

const DIAG_LABELS: Record<DiagnosisStatus, string> = {
  undiagnosed: "Still figuring it out",
  suspected: "Suspected",
  diagnosed: "Confirmed",
};

const STAGE_LABELS: Record<JourneyStage, string> = {
  exploring: "Exploring",
  in_crisis: "In crisis",
  tracking: "Tracking",
};

const DIAG_OPTIONS: { value: DiagnosisStatus; label: string }[] = [
  { value: "undiagnosed", label: "Still figuring it out" },
  { value: "suspected", label: "Suspected PANS / PANDAS" },
  { value: "diagnosed", label: "Confirmed diagnosis" },
];

// ─── Section card (mirrors Settings.tsx style) ────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2
          className="text-sm font-bold text-foreground"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Edit child dialog ────────────────────────────────────────────────────────

function EditChildDialog({
  child,
  open,
  onClose,
}: {
  child: Child;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { mutateAsync: updateChild, isPending } = useUpdateChild();

  const [name, setName] = useState(child.name);
  const [dob, setDob] = useState(child.date_of_birth ?? "");
  const [preferNotSay, setPreferNotSay] = useState(child.date_of_birth === null);
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus>(child.diagnosis_status);
  const [nameError, setNameError] = useState("");

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Name is required.");
      return;
    }
    setNameError("");

    const changed: string[] = [];
    if (trimmedName !== child.name) changed.push("name");
    const newDob = preferNotSay ? null : (dob || null);
    if (newDob !== child.date_of_birth) changed.push("date_of_birth");
    if (diagnosisStatus !== child.diagnosis_status) changed.push("diagnosis_status");

    try {
      await updateChild({
        id: child.id,
        patch: { name: trimmedName, date_of_birth: newDob, diagnosis_status: diagnosisStatus },
      });
      if (changed.length > 0) {
        track("child_edited", { field_changed: changed.join(",") });
      }
      toast({ title: "Child profile updated", variant: "success" });
      onClose();
    } catch {
      toast({ title: "Couldn't save — please try again", variant: "destructive" });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isPending) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Fraunces, serif" }}>
            Edit {child.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              First name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(""); }}
              placeholder="e.g. Alex"
              className={nameError ? "border-destructive" : ""}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          {/* Date of birth */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date of birth{" "}
              <span className="font-normal normal-case text-muted-foreground/70">(optional)</span>
            </label>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={preferNotSay}
              max={new Date().toISOString().split("T")[0]}
              className={preferNotSay ? "opacity-40 cursor-not-allowed" : ""}
            />
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={preferNotSay}
                onChange={(e) => {
                  setPreferNotSay(e.target.checked);
                  if (e.target.checked) setDob("");
                }}
                className="rounded border-border w-4 h-4 accent-primary"
              />
              <span className="text-xs text-muted-foreground">Prefer not to say</span>
            </label>
          </div>

          {/* Diagnosis status */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Diagnosis status
            </p>
            <div className="flex flex-col gap-1.5">
              {DIAG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDiagnosisStatus(opt.value)}
                  className={[
                    "text-left px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all",
                    diagnosisStatus === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 text-foreground hover:bg-accent",
                  ].join(" ")}
                  style={
                    diagnosisStatus === opt.value
                      ? { borderColor: "var(--terracotta)", color: "var(--terracotta)", backgroundColor: "hsl(var(--primary) / 0.05)" }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSave}
              disabled={isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Child row ────────────────────────────────────────────────────────────────

function ChildRow({
  child,
  isActive,
  onEdit,
  onArchive,
}: {
  child: Child;
  isActive: boolean;
  onEdit: (c: Child) => void;
  onArchive: (c: Child) => void;
}) {
  const age = calcAge(child.date_of_birth);

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-border/40 last:border-0">
      {/* Avatar initial */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
        style={{ backgroundColor: "var(--terracotta)" }}
      >
        {child.name.charAt(0).toUpperCase()}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate" style={{ fontFamily: "Fraunces, serif" }}>
            {child.name}
          </p>
          {isActive && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
              Active
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {age !== "—" && (
            <span className="text-xs text-muted-foreground">Age: {age}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {DIAG_LABELS[child.diagnosis_status]}
          </span>
          {child.journey_stage && (
            <span className="text-xs text-muted-foreground">
              {STAGE_LABELS[child.journey_stage]}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onEdit(child)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onArchive(child)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          <Archive className="w-3 h-3" />
          Archive
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsChildren() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: allChildren, isLoading } = useAllChildren();
  const activeChild = useActiveChild();
  const { data: screenerHistory = [] } = useScreenerResults();
  const { mutateAsync: archiveChild, isPending: archiving } = useArchiveChild();
  const { mutateAsync: unarchiveChild, isPending: unarchiving } = useUnarchiveChild();

  const [editTarget, setEditTarget] = useState<Child | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Child | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const nonArchived = (allChildren ?? []).filter((c) => !c.is_archived);
  const archived = (allChildren ?? []).filter((c) => c.is_archived);

  async function handleArchive(child: Child) {
    try {
      await archiveChild(child.id);
      track("child_archived", { child_id: child.id });
      // If the archived child was active, switch to the next non-archived child
      if (activeChild?.id === child.id) {
        const next = nonArchived.find((c) => c.id !== child.id);
        if (next) setActiveChild(next.id, qc);
      }
      toast({ title: `${child.name} archived`, variant: "success" });
      setArchiveTarget(null);
    } catch {
      toast({ title: "Couldn't archive — please try again", variant: "destructive" });
    }
  }

  async function handleUnarchive(child: Child) {
    try {
      await unarchiveChild(child.id);
      track("child_unarchived", { child_id: child.id });
      toast({ title: `${child.name} unarchived`, variant: "success" });
    } catch {
      toast({ title: "Couldn't unarchive — please try again", variant: "destructive" });
    }
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Children
          </h1>
          <p className="text-sm text-muted-foreground">Manage child profiles and tracking</p>
        </div>
      </div>

      {/* Active children */}
      <SectionCard icon={Users} title="Your children">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading…</p>
        ) : nonArchived.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">No children added yet.</p>
        ) : (
          <div>
            {nonArchived.map((child) => (
              <ChildRow
                key={child.id}
                child={child}
                isActive={activeChild?.id === child.id}
                onEdit={setEditTarget}
                onArchive={setArchiveTarget}
              />
            ))}
          </div>
        )}

        {/* Add another child */}
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => navigate("/onboarding/add-child")}
          >
            <Plus className="w-4 h-4" />
            Add another child
          </Button>
        </div>
      </SectionCard>

      {/* Archived children */}
      {archived.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-muted/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 w-full px-5 py-3.5 text-left hover:bg-muted/50 transition-colors"
          >
            {showArchived ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "Fraunces, serif" }}>
              Archived ({archived.length})
            </span>
          </button>

          {showArchived && (
            <div className="px-5 pb-4 space-y-2">
              {archived.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white opacity-50"
                    style={{ backgroundColor: "var(--terracotta)" }}
                  >
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">
                      {child.name}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {DIAG_LABELS[child.diagnosis_status]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnarchive(child)}
                    disabled={unarchiving}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Unarchive
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Screening history */}
      {activeChild && (
        <SectionCard icon={ClipboardCheck} title="Screening history">
          {screenerHistory.length > 0 ? (
            <div className="space-y-2">
              {screenerHistory.map((result) => {
                const bucketLabel =
                  result.result_bucket === "strong_match"
                    ? "Strong match"
                    : result.result_bucket === "partial_match"
                      ? "Partial match"
                      : "Low match";
                return (
                  <div
                    key={result.id}
                    className="flex items-center justify-between gap-3 py-2 border-b border-border/30 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{bucketLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(result.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Link href={`/screener/results/${result.id}`}>
                      <span
                        className="text-xs font-medium underline underline-offset-2 cursor-pointer"
                        style={{ color: "var(--terracotta)" }}
                      >
                        View →
                      </span>
                    </Link>
                  </div>
                );
              })}
              <Link href="/screener?from=child_profile">
                <button
                  type="button"
                  className="mt-2 text-xs font-medium underline underline-offset-2"
                  style={{ color: "var(--terracotta)" }}
                >
                  Take screener again
                </button>
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">No screener results yet.</p>
              <Link href="/screener?from=child_profile">
                <button
                  type="button"
                  className="text-xs font-medium underline underline-offset-2"
                  style={{ color: "var(--terracotta)" }}
                >
                  Take the screener →
                </button>
              </Link>
            </div>
          )}
        </SectionCard>
      )}

      {/* Edit dialog */}
      {editTarget && (
        <EditChildDialog
          child={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Archive confirm dialog */}
      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(o) => {
          if (!o && !archiving) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "Fraunces, serif" }}>
              Archive {archiveTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Archiving {archiveTarget?.name} hides their data from views but does not delete it.
              You can unarchive anytime. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              type="button"
              onClick={() => setArchiveTarget(null)}
              disabled={archiving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => archiveTarget && handleArchive(archiveTarget)}
              disabled={archiving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "var(--terracotta)" }}
            >
              {archiving ? "Archiving…" : "Archive"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
