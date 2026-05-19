import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoContext } from "@/contexts/DemoContext";
import { track } from "@/lib/analytics";

const VISIT_COUNT_KEY = "pwa_visit_count";
const DISMISSED_UNTIL_KEY = "pwa_install_dismissed_until";
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const { isDemoMode } = useDemoContext();
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (isDemoMode) return;

    const iosDevice = isIOS();
    setIos(iosDevice);

    const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? "0") + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(count));

    const dismissedUntil = localStorage.getItem(DISMISSED_UNTIL_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;

    if (count < 2) return;

    if (iosDevice) {
      setShow(true);
      track("pwa_install_prompt_shown");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
      track("pwa_install_prompt_shown");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isDemoMode]);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      track(outcome === "accepted" ? "pwa_install_accepted" : "pwa_install_dismissed");
      setDeferredPrompt(null);
    } else {
      track("pwa_install_accepted");
    }
    setShow(false);
  }

  function handleDismiss() {
    localStorage.setItem(
      DISMISSED_UNTIL_KEY,
      String(Date.now() + SEVEN_DAYS_MS)
    );
    track("pwa_install_dismissed");
    setShow(false);
  }

  if (!show) return null;

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
              ? "Tap the Share button \u{1F4E4} then \"Add to Home Screen\""
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
                onClick={handleDismiss}
              >
                Maybe Later
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
