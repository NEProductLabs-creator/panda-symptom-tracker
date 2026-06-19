import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables",
  );
}

/**
 * Singleton Supabase browser client.
 *
 * Uses localStorage-backed session persistence (not cookies) with the PKCE
 * OAuth flow. This is deliberate: the app runs inside Replit's proxied preview
 * iframe and is also packaged with Capacitor, both of which make cookie-based
 * session storage unreliable. localStorage + PKCE is the modern, supported
 * pattern for SPA / native-wrapper apps and avoids the deprecated
 * @supabase/auth-helpers packages entirely.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

/**
 * Stable, module-level token getter. Returns the current access token or null.
 * Identity is constant across renders so it can be safely used in hook/memo
 * dependency arrays (mirrors Clerk's stable getToken).
 */
export async function getSupabaseToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
