/**
 * Generates an Apple Sign In client secret JWT for use in Supabase.
 *
 * Usage:
 *   1. Set APPLE_P8_KEY as a Replit secret (paste the full .p8 file content)
 *   2. pnpm --filter @workspace/scripts run generate-apple-secret
 *
 * Paste the output JWT into:
 *   Supabase → Authentication → Providers → Apple → Secret Key
 */

import { createSign } from "crypto";

const TEAM_ID = "4MK37978QL";
const KEY_ID = "76785K67F7";
const CLIENT_ID = "com.panssymptomtracker.web";
const AUD = "https://appleid.apple.com";

let privateKey = process.env.APPLE_P8_KEY ?? "";

if (!privateKey) {
  console.error("❌  APPLE_P8_KEY secret is not set.");
  console.error("    Add it in the Replit Secrets tab, then rerun.");
  process.exit(1);
}

// Replit sometimes stores multi-line secrets with literal \\n — normalize them.
privateKey = privateKey.replace(/\\n/g, "\n");

// Verify it looks like a PEM key before trying to sign.
if (!privateKey.includes("-----BEGIN")) {
  console.error("❌  APPLE_P8_KEY does not look like a PEM private key.");
  console.error(
    "    Make sure you pasted the full .p8 file contents including the",
  );
  console.error(
    '    "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----" lines.',
  );
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // 180 days

const header = Buffer.from(
  JSON.stringify({ alg: "ES256", kid: KEY_ID }),
).toString("base64url");

const payload = Buffer.from(
  JSON.stringify({ iss: TEAM_ID, iat: now, exp, aud: AUD, sub: CLIENT_ID }),
).toString("base64url");

const signingInput = `${header}.${payload}`;

try {
  const sign = createSign("SHA256");
  sign.update(signingInput);
  sign.end();
  const signature = sign.sign(privateKey, "base64url");
  const jwt = `${signingInput}.${signature}`;

  console.log("\n✅  Apple client secret JWT (valid 180 days):\n");
  console.log(jwt);
  console.log(
    "\nPaste this into: Supabase → Authentication → Providers → Apple → Secret Key\n",
  );
  console.log(
    "Then delete the APPLE_P8_KEY secret from Replit — it is no longer needed.\n",
  );
} catch (err) {
  console.error("\n❌  Failed to sign the JWT:");
  console.error(err);
  console.error(
    "\n    Make sure APPLE_P8_KEY contains the correct AuthKey_76785K67F7.p8 contents.",
  );
  process.exit(1);
}
