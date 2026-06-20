// Supabase-backed auth context.
//
// Holds the live Supabase session/user and exposes a small, normalized
// AppUser shape to the rest of the app. Clerk-compatible hooks
// (useAuth/useUser/useClerk with the Clerk call signatures) live in
// @/hooks/useSupabaseAuth and read from this context, so the bulk of the
// codebase only needed an import-path swap during the Clerk → Supabase
// migration.

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { DEMO_KEY } from "@/contexts/DemoContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Normalized app user ─────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string | null;
  fullName: string | null;
  imageUrl: string | null;
  createdAt: Date | null;
}

function toAppUser(u: SupabaseUser | null): AppUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;

  // Apple only sends the user's name on the FIRST sign-in. Cache it in
  // localStorage so subsequent sign-ins still surface the name.
  const nameKey = `pans_user_name_${u.id}`;
  let fullName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    null;
  if (fullName) {
    try { localStorage.setItem(nameKey, fullName); } catch { /* quota */ }
  } else {
    try { fullName = localStorage.getItem(nameKey); } catch { /* blocked */ }
  }

  const imageUrl =
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    null;
  return {
    id: u.id,
    email: u.email ?? null,
    fullName: fullName ?? null,
    imageUrl,
    createdAt: u.created_at ? new Date(u.created_at) : null,
  };
}

// ── Context ─────────────────────────────────────────────────────────────────

interface AuthState {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
}

const AuthStateContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: toAppUser(session?.user ?? null),
      session,
      loading,
    }),
    [session, loading],
  );

  return (
    <AuthStateContext.Provider value={value}>
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthStateContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}

// ── Legacy app-level useAuth (settings/demo shape) ──────────────────────────
// Preserves the original AuthContext.useAuth contract used by SettingsAccount.

interface AuthContextType {
  user: { id: string } | null;
  loading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
}

export function useAuth(): AuthContextType {
  const { user, loading } = useAuthContext();
  const isDemoMode = localStorage.getItem(DEMO_KEY) === "1";

  return {
    user: isDemoMode ? null : user ? { id: user.id } : null,
    loading: isDemoMode ? false : loading,
    isGuest: isDemoMode,
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = `${window.location.origin}${basePath}/sign-in`;
    },
    enterGuestMode: () => {},
  };
}
