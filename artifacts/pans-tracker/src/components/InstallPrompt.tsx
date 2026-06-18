import { useEffect, useState } from "react";
import { X, Download, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoContext } from "@/contexts/DemoContext";
import { track } from "@/lib/analytics";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const VISIT_COUNT_KEY = "pwa_visit_count";
const DISMISSED_UNTIL_KEY = "pwa_install_dismissed_until";
const REMINDER_NUDGE_DONE_KEY = "pwa_reminder_nudge_done";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getLogCount(): number {
  try {
    const raw = localStorage.getItem("pans_tracker_symptom_logs");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : Object.keys(parsed as object).length;
  } catch {
    return 0;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const { isDemoMode } = useDemoContext();
  const push = usePushNotifications();

  // Install prompt state
  const [showInstall, setShowInstall] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Post-install reminder nudge state
  const [showReminderNudge, setShowReminderNudge] = useState(false);
  const [nudgeLoading, setNudgeLoading] = useState(false);

  // ── Install prompt logic ──────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return;

    const iosDevice = isIOS();
    setIos(iosDevice);

    const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? "0") + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(count));

    const dismissedUntil = localStorage.getItem(DISMISSED_UNTIL_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;

    if (isInStandaloneMode()) return; // Already installed — don't show install prompt

    if (count < 2) return;

    if (iosDevice) {
      setShowInstall(true);
      track("pwa_install_prompt_shown");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
      track("pwa_install_prompt_shown");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isDemoMode]);

  // ── Reminder nudge logic ─────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return;
    if (!isInStandaloneMode()) return; // Only show after install
    if (!push.isSupported) return;
    if (push.isEnabled) return; // Already subscribed
    if (localStorage.getItem(REMINDER_NUDGE_DONE_KEY)) return; // Already asked
    if (getLogCount() < 3) return; // Not enough activity yet

    // Small delay so the page can settle
    const t = setTimeout(() => setShowReminderNudge(true), 1500);
    return () => clearTimeout(t);
  }, [isDemoMode, push.isSupported, push.isEnabled]);

  // ── Install prompt handlers ───────────────────────────────────────────────
  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      track(outcome === "accepted" ? "pwa_install_accepted" : "pwa_install_dismissed");
      setDeferredPrompt(null);
    } else {
      track("pwa_install_accepted");
    }
    setShowInstall(false);
  }

  function handleInstallDismiss() {
    localStorage.setItem(
      DISMISSED_UNTIL_KEY,
      String(Date.now() + SEVEN_DAYS_MS)
    );
    track("pwa_install_dismissed");
    setShowInstall(false);
  }

  // ── Reminder nudge handlers ───────────────────────────────────────────────
  async function handleEnableReminder() {
    setNudgeLoading(true);
    try {
      await push.enable();
      track("push_reminder_enabled_from_nudge");
      toast("Reminders enabled!");
    } catch {
      toast("Couldn't enable — check notification permissions.");
    } finally {
      setNudgeLoading(false);
      localStorage.setItem(REMINDER_NUDGE_DONE_KEY, "1");
      setShowReminderNudge(false);
    }
  }

  function handleDismissReminderNudge() {
    localStorage.setItem(REMINDER_NUDGE_DONE_KEY, "1");
    setShowReminderNudge(false);
    track("push_reminder_nudge_dismissed");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Post-install reminder nudge (higher priority than install prompt)
  if (showReminderNudge) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-border bg-background/95 backdrop-blur-sm shadow-lg px-4 py-3">
        <div className="flex items-start gap-3 max-w-lg mx-auto">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Want a daily reminder to log?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Get a notification each evening so you never miss a day.
            </p>
            <div className="flex gap-2 mt-2.5">
              <Button
                size="sm"
                className="h-7 text-xs px-3"
                onClick={handleEnableReminder}
                disabled={nudgeLoading}
              >
                {nudgeLoading ? "Enabling…" : "Yes, remind me"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-3 text-muted-foreground"
                onClick={handleDismissReminderNudge}
                disabled={nudgeLoading}
              >
                No thanks
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissReminderNudge}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
            aria-label="Dismiss reminder prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!showInstall) return null;

  // Install prompt
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-border bg-background/95 backdrop-blur-sm shadow-lg px-4 py-3">
      <div className="flex items-start gap-3 max-w-lg mx-auto">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {ios ? "Install on your home screen" : "Add to your home screen for quick access"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {ios
              ? "Tap the Share button 📤 then \"Add to Home Screen\""
              : "Opens like a native app — no browser bar, loads instantly."}
          </p>
          {!ios && (
            <div className="flex gap-2 mt-2.5">
              <Button size="sm" className="h-7 text-xs px-3" onClick={handleInstall}>
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-3 text-muted-foreground"
                onClick={handleInstallDismiss}
              >
                Maybe Later
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleInstallDismiss}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Lightweight toast helper to avoid importing the full hook
function toast(msg: string) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText =
    "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;z-index:9999;pointer-events:none;opacity:1;transition:opacity 0.3s";
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 2500);
}
