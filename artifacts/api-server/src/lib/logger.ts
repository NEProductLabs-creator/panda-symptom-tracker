import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      // Auth / session tokens
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      // PII that may appear in request bodies
      "req.body.email",
      "req.body.notes",
      // Supabase row payload – the `data` column stores full user records
      "req.body.data",
      // Any top-level log object key called `data` (catches ad-hoc log calls)
      "*.data",
    ],
    censor: "[REDACTED]",
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});

// ── Helper: extract a stable, non-PII error code from an unknown thrown value.
// Use this instead of passing raw Supabase error objects to logger.error().
export function errCode(e: unknown): string {
  if (e == null) return "NULL_ERROR";
  if (typeof e === "object") {
    const obj = e as Record<string, unknown>;
    // Supabase PostgrestError: { code, message, details, hint }
    if (typeof obj["code"] === "string" && obj["code"]) return obj["code"];
    // Standard JS Error
    if (obj instanceof Error) return obj.message.slice(0, 120);
  }
  if (typeof e === "string") return e.slice(0, 120);
  return "UNKNOWN_ERROR";
}
