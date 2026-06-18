import { useState, useMemo, useCallback, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Settings2, User, Home, School, Plus, X, Save, CheckCircle2,
  Trash2, LogOut, Share2, Copy, Check, Link2, Bell,
} from "lucide-react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createApiClient } from "@/lib/api";
import { track } from "@/lib/analytics";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
  DialogDescription,
} from "@/components/ui/dialog";

type DiagnosisStatus = "confirmed" | "suspected" | "exploring" | "";

const DIAGNOSIS_OPTIONS: { value: DiagnosisStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmed PANS or PANDAS" },
  { value: "suspected", label: "Suspected" },
  { value: "exploring", label: "Still exploring" },
];

const LOCAL_STORAGE_KEYS = [
  "pans_tracker_symptom_logs",
  "pans_tracker_sb_migrated_v1",
  "pans_tracker_medications",
  "pans_tracker_med_library",
  "pans_tracker_milestones",
  "childBaseline",
  "ptecLog",
  "flareHistory",
  "triggerLog",
  "householdHealthLog",
  "pans_tracker_school_hub",
  "pans_tracker_wellbeing",
  "pans_tracker_hopeboard",
  "pans_tracker_settings",
  "pans_tracker_visited",
];

type ShareRecord = {
  token: string;
  expires_at: string;
  include_notes: boolean;
  revoked: boolean;
  created_at: string;
};

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
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function Settings() {
  const { settings, saveSettings } = useAppSettings();
  const { baseline, saveBaseline } = useChildBaseline();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { getToken } = useClerkAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [savedChild, setSavedChild] = useState(false);
  const [savedSchool, setSavedSchool] = useState(false);

  // Delete-account dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Child section
  const [childName, setChildName] = useState(baseline?.childName ?? "");
  const [childAge, setChildAge] = useState(baseline?.childAge ?? "");
  const [diagnosis, setDiagnosis] = useState<DiagnosisStatus>(settings.diagnosisStatus);
  const [childDesc, setChildDesc] = useState(baseline?.description ?? "");

  // Household section
  const [members, setMembers] = useState<string[]>(settings.householdMembers);
  const [memberInput, setMemberInput] = useState("");

  // School section
  const [teacherName, setTeacherName] = useState(settings.teacherName);
  const [schoolName, setSchoolName] = useState(settings.schoolName);

  // Reminders
  const push = usePushNotifications();
  const [localReminderTime, setLocalReminderTime] = useState(push.reminderTime);

  // Care Team Sharing
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [newShareExpiry, setNewShareExpiry] = useState<7 | 30 | 90>(30);
  const [newShareNotes, setNewShareNotes] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/shares", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setShares(Array.isArray(data) ? data : []);
      }
    } catch {
    } finally {
      setSharesLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadShares();
  }, [loadShares]);

  const activeShares = shares.filter(
    (s) => !s.revoked && new Date(s.expires_at) > new Date(),
  );

  function saveChild() {
    try {
      saveBaseline({
        ...(baseline ?? {
          sleepHours: "",
          appetite: "",
          activityLevel: "moderate" as const,
          socialBehavior: "",
          schoolPerformance: "",
          behavioralNotes: "",
          lastUpdated: new Date().toISOString(),
        }),
        childName,
        childAge,
        description: childDesc,
        lastUpdated: new Date().toISOString(),
      });
      saveSettings({ diagnosisStatus: diagnosis });
      setSavedChild(true);
      toast({ title: "Child profile saved", variant: "success" });
      setTimeout(() => setSavedChild(false), 1500);
    } catch {
      toast({ title: "Couldn't save — please try again", variant: "destructive" });
    }
  }

  function addMember() {
    const v = memberInput.trim();
    if (v && !members.includes(v)) {
      const next = [...members, v];
      setMembers(next);
      saveSettings({ householdMembers: next });
      setMemberInput("");
    }
  }

  function removeMember(name: string) {
    const next = members.filter((m) => m !== name);
    setMembers(next);
    saveSettings({ householdMembers: next });
  }

  function saveSchool() {
    try {
      saveSettings({ teacherName, schoolName });
      setSavedSchool(true);
      toast({ title: "School information saved", variant: "success" });
      setTimeout(() => setSavedSchool(false), 1500);
    } catch {
      toast({ title: "Couldn't save — please try again", variant: "destructive" });
    }
  }

  function openDeleteDialog() {
    setConfirmText("");
    setDeleteOpen(true);
  }

  async function handleDeleteAccount() {
    if (confirmText !== "DELETE" || deleting) return;
    setDeleting(true);
    try {
      await api.account.deleteAll();
    } catch {
      toast({
        title: "Deletion failed",
        description: "Could not delete your data from the server. Nothing has been removed — please try again.",
        variant: "destructive",
      });
      setDeleting(false);
      return;
    }
    LOCAL_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    setDeleteOpen(false);
    await signOut();
  }

  async function handleCreateShare() {
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ expiresInDays: newShareExpiry, includeNotes: newShareNotes }),
      });
      if (!res.ok) throw new Error("failed");
      const { url } = (await res.json()) as { url: string };
      setCreatedUrl(url);
      track("share_link_created");
      await loadShares();
    } catch {
      toast({ title: "Couldn't create link — please try again", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(shareToken: string) {
    try {
      const token = await getToken();
      await fetch(`/api/shares/${shareToken}/revoke`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await loadShares();
      toast({ title: "Share link revoked", variant: "success" });
    } catch {
      toast({ title: "Couldn't revoke link — please try again", variant: "destructive" });
    }
  }

  function copyShareUrl(shareToken: string) {
    const url = `${window.location.origin}/shared/${shareToken}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast({ title: "Link copied to clipboard", variant: "success" }))
      .catch(() => {});
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">Your profile and preferences</p>
        </div>
      </div>

      {/* Child profile */}
      <SectionCard icon={User} title="Your Child">
        <Field label="First name">
          <Input
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="e.g. Emma"
            autoComplete="given-name"
            data-testid="settings-child-name"
          />
        </Field>

        <Field label="Age">
          <Input
            value={childAge}
            onChange={(e) => setChildAge(e.target.value)}
            placeholder="e.g. 9"
            type="number"
            min={1}
            max={25}
          />
        </Field>

        <Field label="Where are you in the journey?">
          <div className="grid grid-cols-1 gap-2">
            {DIAGNOSIS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDiagnosis(opt.value)}
                className={`text-left px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  diagnosis === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40 text-foreground hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Who are they when well? (short description)">
          <Textarea
            value={childDesc}
            onChange={(e) => setChildDesc(e.target.value)}
            placeholder="Describe your child at their best — personality, energy, school, social life..."
            className="resize-none h-24 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            You can fill in sleep, appetite, school performance, and more from <strong>My Child</strong>.
          </p>
        </Field>

        <Button onClick={saveChild} className="w-full gap-2">
          <Save className="w-4 h-4" />
          {savedChild ? "Saved ✓" : "Save child profile"}
        </Button>
      </SectionCard>

      {/* Household */}
      <SectionCard icon={Home} title="Household Members">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Used in the Household Health log to track when family members get sick — helpful for
          identifying illness triggers.
        </p>

        <div className="flex gap-2">
          <Input
            value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMember();
              }
            }}
            placeholder="e.g. Mom, Dad, Jake..."
            data-testid="settings-member-input"
          />
          <Button type="button" variant="outline" size="icon" onClick={addMember}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {members.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div
                key={m}
                className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium"
              >
                {m}
                <button
                  type="button"
                  onClick={() => removeMember(m)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No household members added yet.</p>
        )}
      </SectionCard>

      {/* School contact */}
      <SectionCard icon={School} title="School Contact">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Used to auto-fill school communication letters in the Doctor Ready section.
        </p>

        <Field label="Teacher's name">
          <Input
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            placeholder="e.g. Ms. Johnson"
            data-testid="settings-teacher-name"
          />
        </Field>

        <Field label="School name">
          <Input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. Lincoln Elementary"
            data-testid="settings-school-name"
          />
        </Field>

        <Button onClick={saveSchool} className="w-full gap-2">
          <Save className="w-4 h-4" />
          {savedSchool ? "Saved ✓" : "Save school information"}
        </Button>
      </SectionCard>

      {/* Reminders */}
      <SectionCard icon={Bell} title="Reminders">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Get a daily push notification when it's time to log.
          Requires the app to be installed on your home screen (iOS 16.4+ or Android).
        </p>

        {!push.isSupported ? (
          <p className="text-xs text-amber-600 font-medium">
            Push notifications aren&apos;t supported on this browser. Install the app and try again.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Daily logging reminder</p>
                <p className="text-xs text-muted-foreground">
                  Notified once per day if you haven&apos;t logged yet
                </p>
              </div>
              <Switch
                checked={push.isEnabled}
                disabled={push.isLoading}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    try {
                      await push.enable(localReminderTime);
                      toast({ title: "Reminders enabled", variant: "success" });
                    } catch {
                      toast({
                        title: "Couldn't enable notifications",
                        description: "Check your browser's notification permissions.",
                        variant: "destructive",
                      });
                    }
                  } else {
                    await push.disable();
                    toast({ title: "Reminders disabled" });
                  }
                }}
              />
            </div>

            {push.isEnabled && (
              <Field label="Reminder time">
                <Input
                  type="time"
                  value={localReminderTime}
                  onChange={(e) => {
                    setLocalReminderTime(e.target.value);
                    void push.setReminderTime(e.target.value);
                  }}
                  className="max-w-[130px]"
                />
              </Field>
            )}

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Inactivity nudge</p>
                <p className="text-xs text-muted-foreground">
                  A gentle check-in after 5 days without logging
                </p>
              </div>
              <Switch
                checked={push.inactivityEnabled}
                disabled={push.isLoading || !push.isEnabled}
                onCheckedChange={(checked) => {
                  void push.setInactivityNudge(checked);
                }}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Care Team Sharing */}
      <SectionCard icon={Share2} title="Care Team Sharing">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Create a read-only link for clinicians, therapists, or care team members.
          Links expire automatically and can be revoked at any time.
        </p>

        {sharesLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : activeShares.length > 0 ? (
          <div className="space-y-2">
            {activeShares.map((share) => (
              <div
                key={share.token}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    Expires {format(parseISO(share.expires_at), "MMM d, yyyy")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {share.include_notes ? "Includes notes" : "No notes"} · Created{" "}
                    {format(parseISO(share.created_at), "MMM d")}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => copyShareUrl(share.token)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(share.token)}
                    className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 font-medium"
                  >
                    <X className="w-3 h-3" />
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No active share links.</p>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            setCreatedUrl(null);
            setCopied(false);
            setShareDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Create new share link
        </Button>
      </SectionCard>

      {/* Data + privacy */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <p className="text-sm font-semibold text-foreground">Your data syncs securely</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Logs, medications, and notes are saved to your account and sync across devices automatically.
          Your data is tied to your login — both parents can sign in and see the same records.
        </p>

        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          data-testid="settings-sign-out"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out on this device
        </button>

        <button
          type="button"
          onClick={openDeleteDialog}
          className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete my account and all data
        </button>
      </div>

      {/* Share creation dialog */}
      <Dialog
        open={shareDialogOpen}
        onOpenChange={(o) => {
          if (!creating) setShareDialogOpen(o);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Fraunces, serif" }}>
              Create share link
            </DialogTitle>
            <DialogDescription>
              Send this link to a clinician or care team member. They can view the tracker without
              creating an account.
            </DialogDescription>
          </DialogHeader>

          {createdUrl ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-xs font-mono text-foreground break-all leading-relaxed">
                  {createdUrl}
                </p>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(createdUrl).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy link"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShareDialogOpen(false)}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Expires after
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {([7, 30, 90] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewShareExpiry(d)}
                      className={`py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        newShareExpiry === d
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/40 text-foreground"
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <Checkbox
                  checked={newShareNotes}
                  onCheckedChange={(v) => setNewShareNotes(Boolean(v))}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-foreground leading-snug">
                    Include free-text notes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Symptom notes and observations will be visible to the viewer
                  </p>
                </div>
              </label>

              <Button
                className="w-full gap-2"
                onClick={handleCreateShare}
                disabled={creating}
              >
                <Link2 className="w-4 h-4" />
                {creating ? "Creating…" : "Create share link"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete-account confirmation dialog */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(o) => { if (!deleting) setDeleteOpen(o); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete all account data?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This will permanently delete every log, medication, milestone, and note
                  stored in your account. <strong className="text-foreground">This cannot be undone.</strong>
                </p>
                <p>
                  Type <span className="font-mono font-bold text-destructive">DELETE</span> below to confirm.
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={confirmText !== "DELETE" || deleting}
            >
              {deleting ? "Deleting…" : "Delete everything"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
