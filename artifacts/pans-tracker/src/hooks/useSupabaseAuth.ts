// Clerk-compatible auth hooks backed by Supabase.
//
// These mirror the call signatures of @/hooks/useSupabaseAuth's useAuth / useUser /
// useClerk so the rest of the codebase only needed an import-path swap during
// the Clerk → Supabase migration. They read reactive state from AuthContext
// and delegate token/sign-out to the Supabase client.

import { useAuthContext, type AppUser } from "@/contexts/AuthContext";
import { supabase, getSupabaseToken } from "@/lib/supabaseClient";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

async function signOutImpl(): Promise<void> {
  await supabase.auth.signOut();
  window.location.href = `${window.location.origin}${basePath}/sign-in`;
}

// ── useAuth (Clerk shape) ───────────────────────────────────────────────────
// { userId, getToken, isSignedIn, isLoaded }

export function useAuth(): {
  userId: string | null;
  getToken: () => Promise<string | null>;
  isSignedIn: boolean;
  isLoaded: boolean;
} {
  const { user, loading } = useAuthContext();
  return {
    userId: user?.id ?? null,
    getToken: getSupabaseToken,
    isSignedIn: !!user,
    isLoaded: !loading,
  };
}

// ── useUser (Clerk shape) ───────────────────────────────────────────────────
// { user, isSignedIn, isLoaded }

export function useUser(): {
  user: AppUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
} {
  const { user, loading } = useAuthContext();
  return {
    user,
    isSignedIn: !!user,
    isLoaded: !loading,
  };
}

// ── useClerk (Clerk shape) ──────────────────────────────────────────────────
// { signOut, addListener } — addListener fires on auth state changes with a
// Clerk-like resource object ({ user }) and returns an unsubscribe function.

export function useClerk(): {
  signOut: () => Promise<void>;
  addListener: (cb: (resources: { user: AppUser | null }) => void) => () => void;
} {
  return {
    signOut: signOutImpl,
    addListener: (cb) => {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user ?? null;
        cb({
          user: u
            ? {
                id: u.id,
                email: u.email ?? null,
                fullName: null,
                imageUrl: null,
                createdAt: u.created_at ? new Date(u.created_at) : null,
              }
            : null,
        });
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
