/**
 * Firebase Cloud Messaging helper.
 *
 * Initialised lazily on first use so the import is safe when
 * FIREBASE_SERVICE_ACCOUNT_JSON is not yet set (dev / CI without Firebase).
 *
 * The firebase-admin package is marked external in build.mjs and loaded from
 * node_modules at runtime — it is never bundled by esbuild.
 */

import { logger, errCode } from "./logger.js";

// Lazily resolved messaging instance — null until first call to getMessaging().
let _messaging: import("firebase-admin/messaging").Messaging | null = null;

/** Returns the Messaging singleton, initialising Firebase Admin on first call. */
function getMessaging(): import("firebase-admin/messaging").Messaging {
  if (_messaging) return _messaging;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");

  // Dynamic import keeps the top-level import free so startup doesn't fail
  // in environments where the secret is absent.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admin = require("firebase-admin") as typeof import("firebase-admin");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getMessaging: gm } = require("firebase-admin/messaging") as typeof import("firebase-admin/messaging");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw) as Parameters<typeof admin.credential.cert>[0]),
    });
  }

  _messaging = gm();
  return _messaging;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to a single FCM/APNs device token.
 * Throws if Firebase Admin is not configured or the send fails.
 */
export async function sendPush(token: string, payload: PushPayload): Promise<void> {
  const messaging = getMessaging();
  await messaging.send({
    token,
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
    apns: {
      payload: { aps: { sound: "default", badge: 1 } },
    },
    android: {
      priority: "high",
    },
  });
}

/**
 * Returns true if FIREBASE_SERVICE_ACCOUNT_JSON is present, so callers can
 * skip the native send loop gracefully instead of throwing.
 */
export function isFcmConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
}

export { logger, errCode };
