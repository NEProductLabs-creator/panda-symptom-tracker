import { useState, useCallback, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Share2, Plus, Copy, Check, X, Link2 } from "lucide-react";
import { useAuth as useClerkAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SectionCard } from "./shared";
import { useChildren } from "@/hooks/useChildren";
import { useActiveChild } from "@/hooks/useActiveChild";

type ShareRecord = {
  token: string;
  expires_at: string;
  include_notes: boolean;
  revoked: boolean;
  created_at: string;
  child_id?: string | null;
};

export default function SettingsShares() {
  const { getToken } = useClerkAuth();
  const { toast } = useToast();
  const { data: children = [] } = useChildren();
  const activeChild = useActiveChild();

  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [newShareExpiry, setNewShareExpiry] = useState<7 | 30 | 90>(30);
  const [newShareNotes, setNewShareNotes] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
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

  function openCreateDialog() {
    setCreatedUrl(null);
    setCopied(false);
    // Default the picker to whichever child is currently active.
    setSelectedChildId(activeChild?.id ?? children[0]?.id ?? null);
    setShareDialogOpen(true);
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
        body: JSON.stringify({
          expiresInDays: newShareExpiry,
          includeNotes: newShareNotes,
          ...(selectedChildId ? { child_id: selectedChildId } : {}),
        }),
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
    const url = `https://panssymptomtracker.com/shared/${shareToken}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast({ title: "Link copied to clipboard", variant: "success" }))
      .catch(() => {});
  }

  // Resolve a child name from the loaded children list.
  function childName(childId: string | null | undefined): string | null {
    if (!childId) return null;
    return children.find((c) => c.id === childId)?.name ?? null;
  }

  return (
    <>
      <SectionCard icon={Share2} title="Care Team Sharing">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Create a read-only link for clinicians, therapists, or care team members.
          Links expire automatically and can be revoked at any time.
        </p>

        {sharesLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : activeShares.length > 0 ? (
          <div className="space-y-2">
            {activeShares.map((share) => {
              const name = childName(share.child_id);
              return (
                <div
                  key={share.token}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {name ? `${name} · ` : ""}Expires {format(parseISO(share.expires_at), "MMM d, yyyy")}
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
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No active share links.</p>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={openCreateDialog}
        >
          <Plus className="w-4 h-4" />
          Create new share link
        </Button>
      </SectionCard>

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
              Send this link to a clinician or care team member. They can view the record without
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
              {/* Child picker — only shown when the user has more than one child */}
              {children.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Child
                  </p>
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(children.length, 3)}, 1fr)`,
                    }}
                  >
                    {children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => setSelectedChildId(child.id)}
                        className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all truncate ${
                          selectedChildId === child.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/40 text-foreground"
                        }`}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
    </>
  );
}
