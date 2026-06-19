---
name: Minting a real Supabase JWT for e2e auth tests
description: How to get a genuine ES256-signed Supabase token when admin API + anonymous + email-confirm all block you.
---

# Getting a real Supabase JWT to test JWKS-protected routes

To verify the api-server's JWKS verification end-to-end you need a token
**signed by the project's ES256 key** (only Supabase can mint it). Common
blockers and the workaround:

- Public signup → email confirmation is ON (`mailer_autoconfirm=false`), so no
  session is returned and Supabase's built-in SMTP rate-limits (HTTP 429) after
  ~2 emails/hour.
- `signInWithPassword` needs an already-confirmed user.
- Anonymous sign-in is disabled (`anonymous_provider_disabled`).
- GoTrue admin `createUser` rejects the `sb_secret_` key (401 no_authorization).

**Workaround (clean up after!):** with `DATABASE_URL` (postgres superuser via
pooler), insert a confirmed user directly, then do a real password login:
1. `INSERT INTO auth.users (... email, encrypted_password, email_confirmed_at ...)`
   with a **bcrypt** hash (`bcryptjs.hashSync(pw,10)`), and set the token
   columns `confirmation_token, recovery_token, email_change,
   email_change_token_new, email_change_token_current, phone_change,
   phone_change_token, reauthentication_token` to `''` (empty string, NOT NULL —
   GoTrue's Go scanner 500s on NULL: "converting NULL to string is unsupported").
2. `INSERT INTO auth.identities (... provider 'email', identity_data jsonb ...)`.
3. `POST $URL/auth/v1/token?grant_type=password` (apikey = publishable key) → real
   ES256 access_token (aud=authenticated).
4. `DELETE FROM auth.users WHERE id=$1` to clean up (cascades identity + data).

Supabase rejects `@example.com` / `@test.com` as invalid signup emails; use a
plausible domain. The DB schema (auth.users token columns) is GoTrue-version
specific, so re-check columns if the insert fails.
