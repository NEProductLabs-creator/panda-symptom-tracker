---
name: Terms gate post-signup recording
description: Why post-signup terms recording must not be time-gated and must confirm server success before clearing the pending key
---

# Terms gate: recording the signup T&C agreement

The signup flow captures the user's terms agreement *before* the account/session
exists (a `pans_terms_pending` key in session+localStorage), then records it to
the server once the user is authenticated.

**Rule 1 — never time-gate the post-signup recording.**
With Supabase Auth, email/password signup may require email confirmation, so the
first authenticated session can arrive minutes or hours after the agreement was
captured. Any "is this a new account?" check based on `user.createdAt` being
within N minutes (we used 5) will silently skip recording for delayed-confirm
and OAuth signups, and the gate then bypasses forever on that device.
**Why:** Clerk completed signup in-session, so the time gate happened to work;
Supabase's deferred confirmation broke that assumption.
**How to apply:** Do terms recording in `useTermsStatus` (runs on every signed-in
mount, no time gate), not in an analytics/"new account" effect. Keep
`signup_completed` analytics time-gated if you like — that's non-critical.

**Rule 2 — only clear the pending key after the server accepts it.**
Treating the presence of `pans_terms_pending` as an unconditional, permanent
"ok" lets a transient `/api/terms/agree` failure leave the gate bypassed with no
server record. Record first; clear the pending key only on a successful response;
on failure leave the key so the next mount retries. It's fine to not *block* the
current session on a transient failure, but the key must survive for retry.
