import { ReactNode, useEffect, useRef, useState } from "react";
import { track, identifyUser, identifyAsDemo, enableSurveys } from "@/lib/analytics";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useUser, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
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
import { DemoProvider, DemoBanner, useDemoContext } from "@/contexts/DemoContext";
import Landing from "@/pages/Landing";
import InstallPrompt from "@/components/InstallPrompt";
import OfflineBanner from "@/components/OfflineBanner";
import { getOnboardingComplete } from "@/hooks/useAppSettings";
import SetupWizard, { SETUP_WIZARD_FLAG } from "@/components/SetupWizard";
import { storage } from "@/lib/storage";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// REQUIRED — copy verbatim. Resolves the publishable key from the hostname.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev, auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// ─── Clerk appearance — warm muted-sage brand ─────────────────────────────────

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(16, 52%, 50%)",
    colorForeground: "hsl(27, 26%, 18%)",
    colorMutedForeground: "hsl(25, 11%, 55%)",
    colorDanger: "hsl(0, 40%, 55%)",
    colorBackground: "hsl(38, 62%, 97%)",
    colorInput: "hsl(36, 33%, 87%)",
    colorInputForeground: "hsl(27, 26%, 18%)",
    colorNeutral: "hsl(36, 33%, 87%)",
    fontFamily: "'Newsreader', Georgia, serif",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground text-xs font-semibold uppercase tracking-wide",
    footerActionLink: "text-primary font-semibold",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-xs",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-emerald-600",
    alertText: "text-foreground text-sm",
    logoBox: "flex justify-center mb-1",
    logoImage: "w-12 h-12 rounded-xl",
    socialButtonsBlockButton: "border border-border bg-white hover:bg-accent transition-colors h-11",
    formButtonPrimary: "bg-primary text-white hover:bg-primary/90 transition-colors h-11 font-semibold",
    formFieldInput: "border border-border bg-white text-foreground h-11",
    footerAction: "border-t border-border bg-transparent",
    dividerLine: "bg-border",
    alert: "border border-border rounded-xl",
    otpCodeFieldInput: "border border-border bg-white h-11",
    formFieldRow: "",
    main: "",
  },
};

const NO_SIDEBAR_ROUTES = ["/print", "/about", "/onboarding", "/sign-in", "/sign-up"];

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

// ─── Sign-in page (with View Demo button) ─────────────────────────────────────

function SignInPage() {
  const { enterDemoMode } = useDemoContext();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 gap-6">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
      <div className="w-full max-w-[440px] space-y-2 text-center">
        <div className="flex items-center gap-3">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground">Just exploring?</span>
          <div className="h-px bg-border flex-1" />
        </div>
        <button
          type="button"
          onClick={() => {
            track('demo_viewed');
            identifyAsDemo();
            enterDemoMode();
          }}
          className="text-sm font-semibold text-primary hover:underline transition-colors"
        >
          View Demo →
        </button>
        <p className="text-[11px] text-muted-foreground">
          See 6 weeks of realistic PANDAS symptom data — no account needed
        </p>
      </div>
    </div>
  );
}

function SignUpPage() {
  useEffect(() => { track('signup_started'); }, []);
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

// ─── PostHog identity + signup detection ──────────────────────────────────────

function PostHogSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    identifyUser(user.id);
    // Fire signup_completed once per session for accounts created < 5 minutes ago
    const flagKey = `signup_tracked_${user.id}`;
    const isNewAccount =
      user.createdAt instanceof Date &&
      Date.now() - user.createdAt.getTime() < 5 * 60 * 1000;
    if (isNewAccount && !sessionStorage.getItem(flagKey)) {
      sessionStorage.setItem(flagKey, '1');
      track('signup_completed');
    }
  }, [isLoaded, isSignedIn, user]);
  return null;
}

// ─── Layout ────────────────────────────────────────────────────────────────────

function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isDemoMode } = useDemoContext();

  const isNoSidebar = NO_SIDEBAR_ROUTES.some(
    (r) => location === r || location.startsWith(r + "/"),
  );
  if (isNoSidebar) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 md:ml-60 min-h-screen">
        <div
          className="md:hidden"
          style={{ height: "calc(env(safe-area-inset-top) + 3.5rem)" }}
        />
        {isDemoMode && <DemoBanner />}
        {children}
      </main>
    </div>
  );
}

// ─── Cache invalidation when signed-in user changes ───────────────────────────

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevId.current !== undefined && prevId.current !== id) qc.clear();
      prevId.current = id;
    });
  }, [addListener, qc]);
  return null;
}

// ─── Router ────────────────────────────────────────────────────────────────────

const NO_WIZARD_ROUTES = ["/sign-in", "/sign-up", "/onboarding", "/print", "/about"];

function Router() {
  const { isSignedIn, isLoaded } = useUser();
  const { isDemoMode } = useDemoContext();
  const [location, navigate] = useLocation();

  const [showWizard, setShowWizard] = useState(() => (
    localStorage.getItem(SETUP_WIZARD_FLAG) !== "1" &&
    !storage.getChildBaseline()
  ));

  // Enable PostHog surveys only once the user is authenticated or in demo mode
  useEffect(() => {
    if (isSignedIn || isDemoMode) {
      enableSurveys();
    }
  }, [isSignedIn, isDemoMode]);

  useEffect(() => {
    if (!isLoaded && !isDemoMode) return;

    const publicPrefixes = ["/sign-in", "/sign-up", "/about", "/print"];
    const isPublic = publicPrefixes.some(
      (r) => location === r || location.startsWith(r + "/"),
    );

    // Root is the landing page for unauthenticated visitors — don't redirect them
    if (!isSignedIn && !isDemoMode && !isPublic && location !== "/") {
      navigate("/sign-in");
      return;
    }

    if ((isSignedIn || isDemoMode) && location === "/sign-in") {
      navigate(getOnboardingComplete() ? "/" : "/onboarding");
      return;
    }

    if (isSignedIn && location === "/sign-up") {
      navigate("/");
    }
  }, [isSignedIn, isLoaded, isDemoMode, location]);

  // Unauthenticated users at root → landing page (show LoadingScreen while Clerk initialises)
  if (!isSignedIn && !isDemoMode && location === "/") {
    if (!isLoaded) return <LoadingScreen />;
    return <Landing />;
  }

  if (!isLoaded && !isDemoMode) return <LoadingScreen />;

  const publicPrefixes = ["/sign-in", "/sign-up", "/about", "/print"];
  const isPublic = publicPrefixes.some(
    (r) => location === r || location.startsWith(r + "/"),
  );
  if (!isSignedIn && !isDemoMode && !isPublic) return <LoadingScreen />;

  const isWizardRoute = NO_WIZARD_ROUTES.some(
    (r) => location === r || location.startsWith(r + "/"),
  );

  return (
    <Layout>
      {showWizard && !isWizardRoute && !isDemoMode && (
        <SetupWizard onDismiss={() => setShowWizard(false)} />
      )}
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
        <Route path="/about" component={Intro} />
        {/* Legacy Supabase auth routes → redirect to Clerk paths */}
        <Route path="/auth">
          <Redirect to="/sign-in" />
        </Route>
        <Route path="/auth/callback">
          <Redirect to="/sign-in" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// ─── App providers ────────────────────────────────────────────────────────────

function AppProviders() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to track your child's symptoms",
          },
        },
        signUp: {
          start: {
            title: "Create your free account",
            subtitle: "Private, secure, and designed for PANS & PANDAS families",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <PostHogSync />
        <ClerkCacheInvalidator />
        <TooltipProvider>
          <DemoProvider>
            <OfflineBanner />
            <Switch>
              {/* Clerk sign-in / sign-up — /*? matches OAuth sub-paths */}
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              {/* All other routes go through auth-guarded Router */}
              <Route component={Router} />
            </Switch>
            <Toaster />
            <InstallPrompt />
          </DemoProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppProviders />
    </WouterRouter>
  );
}

export default App;
