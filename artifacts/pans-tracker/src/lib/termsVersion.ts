/**
 * Accepted terms-of-service version strings (frontend copy).
 *
 * CURRENT_TERMS_VERSION is what the app presents to new users.
 * ALLOWED_VERSIONS mirrors the server allowlist so the UI can validate
 * before making the network call.
 *
 * Keep in sync with artifacts/api-server/src/lib/termsVersion.ts.
 */
export const CURRENT_TERMS_VERSION = "2026-05-20";

export const ALLOWED_VERSIONS: readonly string[] = ["2026-05-20"];
