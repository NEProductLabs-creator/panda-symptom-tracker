import express, { type Express } from "express";
import { rateLimit } from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

// ── CORS allowlist ────────────────────────────────────────────────────────────
// Priority: ALLOWED_ORIGINS env var → sensible defaults per environment.
// In production, the two known domains are always included.

function buildAllowedOrigins(): string[] {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }

  const origins: string[] = ["http://localhost:5173"];

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

// ── Clerk proxy (must be before other middleware that reads the body) ─────────

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ── Security headers (helmet) ─────────────────────────────────────────────────
// crossOriginEmbedderPolicy is disabled: it blocks cross-origin subresources
// that don't opt in, which can interfere with Clerk and Supabase.

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
        // Clerk proxy is same-origin; PostHog and Supabase are external
        connectSrc: [
          "'self'",
          "https://*.supabase.co",
          "https://us.i.posthog.com",
          "https://clerk.panssymptomtracker.com",
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

// ── Clerk auth middleware ─────────────────────────────────────────────────────

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
// keyGenerator: IP + Clerk userId when authenticated, otherwise IP alone.

function makeKeyGenerator() {
  return (req: express.Request): string => {
    const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown");
    const userId = getAuth(req).userId;
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
