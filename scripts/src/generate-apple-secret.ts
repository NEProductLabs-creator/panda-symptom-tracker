/**
 * Generates an Apple Sign In client secret JWT for use in Supabase.
 *
 * Usage:
 *   1. Set APPLE_P8_KEY as a Replit secret (paste the full .p8 file content)
 *   2. pnpm --filter @workspace/scripts run generate-apple-secret
 *
 * The output JWT is valid for 180 days. Paste it into:
 *   Supabase → Authentication → Providers → Apple → Secret Key
 */

import { createSign } from "crypto";

const TEAM_ID = "4MK37978QL";
const KEY_ID = "76785K67F7";
const CLIENT_ID = "com.panssymptomtracker.web"; // Services ID
const AUD = "https://appleid.apple.com";

const privateKey = process.env.APPLE_P8_KEY;
if (!privateKey) {
  console.error("❌  APPLE_P8_KEY environment variable is not set.");
  console.error(
    "    Add your .p8 file contents as a Replit secret named APPLE_P8_KEY.",
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
