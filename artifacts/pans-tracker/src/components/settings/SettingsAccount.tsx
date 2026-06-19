import { useState, useMemo } from "react";
import { LogOut, Trash2, CheckCircle2 } from "lucide-react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useAuth } from "@/contexts/AuthContext";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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

// MAINTENANCE: keep this list in sync with storage.ts and the demo/notification
// hooks. Every key the app writes to localStorage must appear here so account
// deletion leaves no trace on this device.
const LOCAL_STORAGE_KEYS = [
  // ── Core data (storage.ts) ───────────────────────────────────────────────
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
  "labResults",
  // ── Active child ─────────────────────────────────────────────────────────
  "panstracker.activeChildId",
  // ── Demo mode (DemoContext / storage.ts) ─────────────────────────────────
  "pans_tracker_demo_children",
  "pans_tracker_demo_mode",
  "pans_tracker_demo_scenario",
  "pans_tracker_demo_switch_prompt_dismissed",
  // ── Terms / consent flags ─────────────────────────────────────────────────
  "pans_terms_pending",
  "pans_terms_ok",
  // ── API queue (apiQueue.ts) ───────────────────────────────────────────────
  "pans_queue_failed",
  // ── Push notifications ────────────────────────────────────────────────────
  "push_reminder_time",
];

export default function SettingsAccount() {
  const { signOut } = useAuth();
  const { getToken } = useClerkAuth();
  const { toast } = useToast();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

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
    // Clear sessionStorage so demo-mode analytics IDs and one-time signup
    // flags don't survive to the next session.
    sessionStorage.clear();
    setDeleteOpen(false);
    await signOut();
  }

  return (
    <>
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
                  stored in your account.{" "}
                  <strong className="text-foreground">This cannot be undone.</strong>
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
    </>
  );
}
