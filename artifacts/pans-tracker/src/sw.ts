/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// ── Precaching ────────────────────────────────────────────────────────────────
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ── Runtime caching ───────────────────────────────────────────────────────────

// Supabase API: network-first with 10s timeout
registerRoute(
  ({ url }) => url.hostname.includes("supabase.co"),
  new NetworkFirst({
    cacheName: "supabase-api",
    networkTimeoutSeconds: 10,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

// JS / CSS / fonts: cache-first (long TTL)
registerRoute(
  ({ request }) =>
    ["style", "script", "worker", "font"].includes(request.destination),
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Images: cache-first
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "image-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  const data =
    (event.data?.json() as {
      title?: string;
      body?: string;
      url?: string;
    } | null) ?? {};

  const title = data.title ?? "PANS Tracker";
  const body = data.body ?? "Time to log today's symptoms.";
  const scope = self.registration.scope;
  const targetUrl = data.url ? new URL(data.url, scope).href : scope;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: new URL("icons/icon-192x192.png", scope).href,
      badge: new URL("icons/icon-72x72.png", scope).href,
      tag: "pans-reminder",
      data: { url: targetUrl },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data as { url?: string } | undefined)?.url ??
    self.registration.scope;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) =>
          c.url.startsWith(self.registration.scope),
        );
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      }),
  );
});
