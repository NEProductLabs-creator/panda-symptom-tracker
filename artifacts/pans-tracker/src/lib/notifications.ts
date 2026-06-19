/**
 * Native push notification hook (FCM / APNs via Firebase).
 *
 * Uses @capacitor/push-notifications, which is only present in the Capacitor
 * native build — all imports are dynamic and guarded by isNative() so the web
 * bundle is unaffected.
 *
 * The hook returns the same interface as usePushNotifications so
 * SettingsNotifications can use it interchangeably.
 */

import { useState, useEffect, useCallback } from "react";
import { isNative } from "./platform";
import { useAuth } from "@/hooks/useSupabaseAuth";

// Shared with usePushNotifications so reminder time is always in sync
const REMINDER_TIME_KEY = "push_reminder_time";
// Stores the last FCM token so disable() can target the right row
const NATIVE_TOKEN_KEY = "native_push_token";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export function useNativeNotifications() {
  const { getToken } = useAuth();

  const isSupported = isNative();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reminderTime, setReminderTimeState] = useState(
    () => localStorage.getItem(REMINDER_TIME_KEY) ?? "20:00",
  );

  // ── On mount: check whether permissions are already granted ─────────────────
  useEffect(() => {
    if (!isNative()) return;
    void (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { receive } = await PushNotifications.checkPermissions();
        setIsEnabled(receive === "granted");
      } catch {
        // Permissions API unavailable — safe to ignore
      }
    })();
  }, []);

  // ── enable: request permission → register → POST token to API ──────────────
  const enable = useCallback(
    async (time: string = reminderTime): Promise<void> => {
      if (!isNative()) return;
      setIsLoading(true);
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { Capacitor } = await import("@capacitor/core");

        const { receive } = await PushNotifications.requestPermissions();
        if (receive !== "granted") throw new Error("Push permission denied");

        // Wrap the one-shot registration events in a Promise
        const fcmToken = await new Promise<string>((resolve, reject) => {
          void PushNotifications.addListener("registration", (t) => resolve(t.value));
          void PushNotifications.addListener("registrationError", (e) =>
            reject(new Error(String(e.error))),
          );
          void PushNotifications.register();
        });

        const authToken = await getToken();
        const platform = Capacitor.getPlatform() as "ios" | "android";
        const res = await fetch(`${API_BASE}/api/push/register-native`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            token: fcmToken,
            platform,
            reminder_time: time,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        if (!res.ok) throw new Error(`register-native failed: ${res.status}`);

        setIsEnabled(true);
        setReminderTimeState(time);
        localStorage.setItem(REMINDER_TIME_KEY, time);
        localStorage.setItem(NATIVE_TOKEN_KEY, fcmToken);
      } finally {
        setIsLoading(false);
      }
    },
    [reminderTime, getToken],
  );

  // ── disable: delete server-side record and mark locally disabled ────────────
  const disable = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const authToken = await getToken();
      const storedToken = localStorage.getItem(NATIVE_TOKEN_KEY);
      await fetch(`${API_BASE}/api/push/unregister-native`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ token: storedToken ?? undefined }),
      });
      setIsEnabled(false);
      localStorage.removeItem(NATIVE_TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // ── setReminderTime: re-register with new time if already enabled ───────────
  const setReminderTime = useCallback(
    async (time: string): Promise<void> => {
      if (isEnabled) {
        await enable(time);
      } else {
        setReminderTimeState(time);
        localStorage.setItem(REMINDER_TIME_KEY, time);
      }
    },
    [isEnabled, enable],
  );

  // Inactivity nudge is web-only; expose no-op for interface compatibility
  const setInactivityNudge = useCallback(async (_enabled: boolean): Promise<void> => {
    // not implemented for native
  }, []);

  return {
    isSupported,
    isEnabled,
    isLoading,
    inactivityEnabled: false as const,
    reminderTime,
    enable,
    disable,
    setReminderTime,
    setInactivityNudge,
  };
}
