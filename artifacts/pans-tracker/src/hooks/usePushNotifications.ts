import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";

const REMINDER_TIME_KEY = "push_reminder_time";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

export function usePushNotifications() {
  const { getToken } = useAuth();

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  const isSupported =
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "serviceWorker" in navigator &&
    !!vapidKey;

  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inactivityEnabled, setInactivityEnabled] = useState(true);
  const [reminderTime, setReminderTimeState] = useState(
    () => localStorage.getItem(REMINDER_TIME_KEY) ?? "20:00",
  );

  // Check current subscription status on mount
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsEnabled(!!sub))
      .catch(() => {});
  }, [isSupported]);

  const enable = useCallback(
    async (
      time: string = reminderTime,
      inactivity: boolean = inactivityEnabled,
    ): Promise<void> => {
      if (!vapidKey) throw new Error("VITE_VAPID_PUBLIC_KEY not configured");
      setIsLoading(true);
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        const json = sub.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };

        const token = await getToken();
        const res = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
            reminderTime: time,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            inactivityNudge: inactivity,
          }),
        });

        if (!res.ok) throw new Error(`Subscribe failed: ${res.status}`);

        setIsEnabled(true);
        setReminderTimeState(time);
        setInactivityEnabled(inactivity);
        localStorage.setItem(REMINDER_TIME_KEY, time);
      } finally {
        setIsLoading(false);
      }
    },
    [vapidKey, getToken, reminderTime, inactivityEnabled],
  );

  const disable = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      const token = await getToken();
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const setReminderTime = useCallback(
    async (time: string): Promise<void> => {
      if (isEnabled) {
        await enable(time, inactivityEnabled);
      } else {
        setReminderTimeState(time);
        localStorage.setItem(REMINDER_TIME_KEY, time);
      }
    },
    [isEnabled, enable, inactivityEnabled],
  );

  const setInactivityNudge = useCallback(
    async (enabled: boolean): Promise<void> => {
      if (isEnabled) {
        await enable(reminderTime, enabled);
      } else {
        setInactivityEnabled(enabled);
      }
    },
    [isEnabled, enable, reminderTime],
  );

  return {
    isSupported,
    isEnabled,
    isLoading,
    inactivityEnabled,
    reminderTime,
    enable,
    disable,
    setReminderTime,
    setInactivityNudge,
  };
}
