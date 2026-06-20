/**
 * Generates an Apple Sign In client secret JWT for use in Supabase.
 *
 * Usage:
 *   1. Set APPLE_P8_KEY as a Replit secret (full .p8 file contents)
 *   2. pnpm --filter @workspace/scripts run generate-apple-secret
 *
 * Paste the output into:
 *   Supabase → Authentication → Providers → Apple → Secret Key
 */

import { createPrivateKey, createSign } from "crypto";

const TEAM_ID = "4MK37978QL";
const KEY_ID = "76785K67F7";
const CLIENT_ID = "com.panssymptomtracker.web";
const AUD = "https://appleid.apple.com";

let raw = process.env.APPLE_P8_KEY ?? "";

if (!raw) {
  console.error("❌  APPLE_P8_KEY secret is not set.");
  console.error("    Add it in the Replit Secrets tab, then rerun.");
  process.exit(1);
}

// Normalise line endings — Replit may store multi-line secrets with literal \\n
raw = raw.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

// Extract the raw base64 body — strip PEM headers/footers and all whitespace,
// then re-wrap cleanly. This handles the common case where Replit collapses
// the header and key body onto the same line when saving a multi-line secret.
const base64Body = raw
  .replace(/-----BEGIN[^-]+-----/g, "")
  .replace(/-----END[^-]+-----/g, "")
  .replace(/\s+/g, "");

const wrappedBody = base64Body.match(/.{1,64}/g)?.join("\n") ?? base64Body;
const pem = `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----`;

// Parse the key first so we get a clear error before attempting to sign.
let keyObject: ReturnType<typeof createPrivateKey>;
try {
  keyObject = createPrivateKey({ key: pem, format: "pem" });
} catch (err) {
  console.error("\n❌  Could not parse the private key.");
  console.error("    Error:", (err as Error).message);
  console.error("\n    Key starts with:", pem.slice(0, 80));
  console.error(
    "\n    Make sure APPLE_P8_KEY contains the AuthKey_76785K67F7.p8 file contents.",
  );
  console.error(
    "    Open the .p8 file in a text editor and paste everything including the",
  );
  console.error(
    '    "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----" lines.\n',
  );
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // 180 days

const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: KEY_ID })).toString("base64url");
const payload = Buffer.from(
  JSON.stringify({ iss: TEAM_ID, iat: now, exp, aud: AUD, sub: CLIENT_ID }),
).toString("base64url");
const signingInput = `${header}.${payload}`;

try {
  const sign = createSign("SHA256");
  sign.update(signingInput);
  sign.end();
  // ieee-p1363 produces the raw r||s format required by JWT ES256
  const signature = sign.sign({ key: keyObject, dsaEncoding: "ieee-p1363" }, "base64url");
  const jwt = `${signingInput}.${signature}`;

  console.log("\n✅  Apple client secret JWT (valid 180 days):\n");
  console.log(jwt);
  console.log("\nPaste into: Supabase → Authentication → Providers → Apple → Secret Key\n");
  console.log("Then delete the APPLE_P8_KEY secret from Replit — it is no longer needed.\n");
} catch (err) {
  console.error("\n❌  Signing failed:", (err as Error).message);
  process.exit(1);
}
