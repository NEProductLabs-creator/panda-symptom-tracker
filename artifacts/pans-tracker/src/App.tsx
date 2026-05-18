import { ReactNode, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Activity } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import LogEntry from "@/pages/LogEntry";
import MedLibrary from "@/pages/MedLibrary";
import PrintSummary from "@/pages/PrintSummary";
import ExportPDF from "@/pages/ExportPDF";
import Intro from "@/pages/Intro";
import MilestonesPage from "@/pages/Milestones";
import Sidebar from "@/components/layout/Sidebar";
import Timeline from "@/pages/Timeline";
import Baseline from "@/pages/Baseline";
import PTECCheckin from "@/pages/PTECCheckin";
import TriggerLogPage from "@/pages/TriggerLog";
import Medications from "@/pages/Medications";
import SchoolHub from "@/pages/SchoolHub";
import WellbeingCheckin from "@/pages/WellbeingCheckin";
import HopeBoard from "@/pages/HopeBoard";
import Onboarding from "@/pages/Onboarding";
import Settings from "@/pages/Settings";
import AuthPage from "@/pages/AuthPage";
import AuthCallback from "@/pages/AuthCallback";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getOnboardingComplete } from "@/hooks/useAppSettings";

const queryClient = new QueryClient();

const NO_SIDEBAR_ROUTES = ["/print", "/about", "/onboarding", "/auth", "/auth/callback"];

// ─── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md animate-pulse">
          <Activity className="w-6 h-6 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────────

function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isGuest } = useAuth();

  if (NO_SIDEBAR_ROUTES.includes(location)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-60 min-h-screen">
        {/* Pushes content below the fixed mobile header + Dynamic Island safe area */}
        <div
          className="md:hidden"
          style={{ height: "calc(env(safe-area-inset-top) + 3.5rem)" }}
        />
        {/* GUEST MODE BANNER — remove this block when launching with auth required */}
        {isGuest && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4">
            <p className="text-xs text-amber-800 leading-snug">
              Demo mode — data is stored on this device only
            </p>
            <Link
              href="/auth"
              className="text-xs font-semibold text-amber-900 hover:underline whitespace-nowrap"
            >
              Create account →
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

// ─── Router ────────────────────────────────────────────────────────────────────

function Router() {
  const { user, loading, isGuest } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    const authRoutes = ["/auth", "/auth/callback"];

    // Not logged in and not a guest → send to auth screen
    if (!user && !isGuest && !authRoutes.includes(location)) {
      navigate("/auth");
      return;
    }

    // Guest landed on the auth screen → onboarding first, then app
    if (isGuest && location === "/auth") {
      navigate(getOnboardingComplete() ? "/" : "/onboarding");
      return;
    }

    // Logged in but still on the auth screen → route based on onboarding state
    if (user && location === "/auth") {
      const supabaseDone = user.user_metadata?.onboarding_complete;
      const localDone = getOnboardingComplete();
      navigate(supabaseDone || localDone ? "/" : "/onboarding");
    }
  }, [user, loading, isGuest, location]);

  if (loading) return <LoadingScreen />;

  // Show nothing while the redirect fires (avoids flash of protected content)
  const authRoutes = ["/auth", "/auth/callback"];
  if (!user && !isGuest && !authRoutes.includes(location)) return <LoadingScreen />;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/log" component={LogEntry} />
        <Route path="/library" component={MedLibrary} />
        <Route path="/print" component={PrintSummary} />
        <Route path="/export" component={ExportPDF} />
        <Route path="/milestones" component={MilestonesPage} />
        <Route path="/ptec" component={PTECCheckin} />
        <Route path="/timeline" component={Timeline} />
        <Route path="/baseline" component={Baseline} />
        <Route path="/triggers" component={TriggerLogPage} />
        <Route path="/medications" component={Medications} />
        <Route path="/school" component={SchoolHub} />
        <Route path="/wellbeing" component={WellbeingCheckin} />
        <Route path="/hope" component={HopeBoard} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/settings" component={Settings} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/about" component={Intro} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
