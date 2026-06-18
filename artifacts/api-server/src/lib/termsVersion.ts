/**
 * Accepted terms-of-service version strings (server copy).
 *
 * CURRENT_TERMS_VERSION is what the app presents to new users.
 * ALLOWED_VERSIONS includes older versions we still honour (e.g. if a
 * non-material wording change didn't require re-acceptance).
 *
 * Keep in sync with artifacts/pans-tracker/src/lib/termsVersion.ts.
 */
export const CURRENT_TERMS_VERSION = "2026-05-20";

export const ALLOWED_VERSIONS: readonly string[] = ["2026-05-20"];
