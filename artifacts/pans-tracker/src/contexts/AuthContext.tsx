// Thin compatibility wrapper — auth is now handled by Clerk.
// Components that call useAuth() continue to work unchanged.

import { ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";
import { DEMO_KEY } from "@/contexts/DemoContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AuthContextType {
  user: { id: string } | null;
  loading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
}

// AuthProvider is now a passthrough — ClerkProvider in App.tsx handles auth state
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth(): AuthContextType {
  const { user, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const isDemoMode = localStorage.getItem(DEMO_KEY) === "1";

  return {
    user: isDemoMode ? null : (user ? { id: user.id } : null),
    loading: isDemoMode ? false : !isLoaded,
    isGuest: isDemoMode,
    signOut: async () => {
      await clerkSignOut({
        redirectUrl: `${window.location.origin}${basePath}/sign-in`,
      });
    },
    enterGuestMode: () => {},
  };
}
