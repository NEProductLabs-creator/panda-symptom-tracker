/**
 * Supabase JWT authentication middleware.
 *
 * Verifies Supabase-issued access tokens using the project's JWKS endpoint
 * (asymmetric signing keys) via `jose`'s createRemoteJWKSet — no shared
 * SUPABASE_JWT_SECRET is needed. The JWKS is fetched lazily and cached/rotated
 * by jose internally.
 *
 * - `attachUser` is best-effort: it sets `req.userId` when a valid token is
 *   present and otherwise passes through (used globally so rate limiting and
 *   auth-optional routes can read the user when available).
 * - `requireAuth` rejects with 401 when no authenticated user is attached.
 *
 * REQUIRED: the Supabase project must use asymmetric JWT signing keys (RS256 /
 * ES256). Enable/migrate under Supabase Dashboard → Project Settings → JWT
 * Keys. Legacy HS256 shared-secret signing has no JWKS and will not verify.
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { logger } from "../lib/logger.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const issuer = supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined;

const jwks = supabaseUrl
  ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  : null;

if (!supabaseUrl) {
  logger.warn(
    "VITE_SUPABASE_URL not set — Supabase JWT verification is disabled",
  );
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

/**
 * Best-effort: verifies the bearer token (if any) and attaches req.userId.
 * Never rejects — auth enforcement is done by requireAuth.
 */
export const attachUser: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = extractBearer(req);
  if (!token || !jwks) {
    next();
    return;
  }
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: "authenticated",
    });
    if (typeof payload.sub === "string") {
      req.userId = payload.sub;
    }
  } catch {
    // Invalid/expired token — leave req.userId unset.
  }
  next();
};

/**
 * Rejects with 401 unless a verified user is attached.
 */
export const requireAuth: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};
