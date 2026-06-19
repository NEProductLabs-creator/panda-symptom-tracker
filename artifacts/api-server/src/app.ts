import express, { type Express } from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { attachUser } from "./middlewares/supabaseAuth.js";
import router from "./routes";
import { logger } from "./lib/logger";

// ── CORS allowlist ────────────────────────────────────────────────────────────
// Priority: ALLOWED_ORIGINS env var → sensible defaults per environment.
// In production, the two known domains are always included.
//
// The three Capacitor/Ionic pseudo-origins below are always included:
//   capacitor://localhost  — Capacitor on iOS (WKWebView)
//   https://localhost      — Capacitor on Android (WebView with HTTPS scheme)
//   ionic://localhost      — Ionic/Capacitor legacy Android scheme
// These are the fixed origins the OS assigns to the WebView; they never
// change and are not user-controlled, so it is safe to allowlist them.

function buildAllowedOrigins(): string[] {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }

  const origins: string[] = [
    "http://localhost:5173",
    // Capacitor (iOS), Capacitor (Android), Ionic/Capacitor legacy
    "capacitor://localhost",
    "https://localhost",
    "ionic://localhost",
  ];

  // In Replit dev, the preview is served from the Replit proxy domain(s)
  if (process.env.REPLIT_DOMAINS) {
    for (const d of process.env.REPLIT_DOMAINS.split(",")) {
      const trimmed = d.trim();
      if (trimmed) origins.push(`https://${trimmed}`);
    }
  }

  if (process.env.NODE_ENV === "production") {
    origins.push(
      "https://panssymptomtracker.com",
      "https://www.panssymptomtracker.com",
      "https://pans-tracker.replit.app",
    );
  }

  return origins;
}

const allowedOrigins = buildAllowedOrigins();
logger.info({ allowedOrigins }, "CORS allowlist");

const app: Express = express();

// ── Proxy trust ───────────────────────────────────────────────────────────────
// Replit's shared reverse proxy injects X-Forwarded-For. Without this setting,
// express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and falls back
// to the proxy's IP, making all users share one rate-limit bucket.
// `1` means trust exactly one hop of proxy (the Replit edge), so req.ip
// correctly reflects the real client IP.
app.set("trust proxy", 1);

// ── Request logging ───────────────────────────────────────────────────────────

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── Security headers (helmet) ─────────────────────────────────────────────────
// crossOriginEmbedderPolicy is disabled: it blocks cross-origin subresources
// that don't opt in, which can interfere with Supabase.

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // 'unsafe-inline' required for shadcn/ui component styles
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        // PostHog and Supabase are external
        connectSrc: [
          "'self'",
          "https://*.supabase.co",
          "https://us.i.posthog.com",
        ],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use(
  cors({
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    origin(origin, callback) {
      // No origin = server-to-server / curl / same-origin proxy — allow through
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not in allowlist`));
      }
    },
  }),
);

// ── Body parsing (64 KB hard cap) ─────────────────────────────────────────────

app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

// ── Supabase auth middleware (best-effort; attaches req.userId) ───────────────
// Must run before rate limiting so the limiter can key by authenticated user,
// and before routes whose requireAuth depends on req.userId.

app.use(attachUser);

// ── Rate limiting ─────────────────────────────────────────────────────────────
// keyGenerator: IP + Supabase userId when authenticated, otherwise IP alone.

function makeKeyGenerator() {
  return (req: express.Request): string => {
    // ipKeyGenerator normalizes IPv6 addresses so users can't bypass limits.
    const ip = ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown");
    const userId = req.userId;
    return userId ? `${ip}:${userId}` : ip;
  };
}

const rateLimitDefaults = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  keyGenerator: makeKeyGenerator(),
};

const dataLimiter = rateLimit({
  ...rateLimitDefaults,
  windowMs: 60 * 1000,
  limit: 120,
  message: { error: "Too many requests — please slow down." },
});

const termsLimiter = rateLimit({
  ...rateLimitDefaults,
  windowMs: 60 * 1000,
  limit: 10,
  message: { error: "Too many requests — please slow down." },
});

const notificationsTestLimiter = rateLimit({
  ...rateLimitDefaults,
  windowMs: 60 * 1000,
  limit: 5,
  message: { error: "Too many requests — please slow down." },
});

app.use("/api/data", dataLimiter);
app.use("/api/shares", dataLimiter);
app.use("/api/terms/agree", termsLimiter);
app.use("/api/notifications/test", notificationsTestLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/api", router);

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err: err.message }, "Unhandled error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

export default app;
