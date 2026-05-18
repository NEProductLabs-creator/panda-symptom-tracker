import { useEffect } from "react";
import { useLocation } from "wouter";
import { Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOnboardingComplete } from "@/hooks/useAppSettings";

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Give Supabase a moment to exchange the auth code / hash from the URL
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const supabaseDone = session.user.user_metadata?.onboarding_complete;
        const localDone = getOnboardingComplete();
        navigate(supabaseDone || localDone ? "/" : "/onboarding");
      } else {
        navigate("/auth");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md animate-pulse">
          <Activity className="w-6 h-6 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
