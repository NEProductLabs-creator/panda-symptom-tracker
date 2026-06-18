import { ReactNode, useEffect, useRef, useState } from "react";
import { track, identifyUser, identifyAsDemo, enableSurveys } from "@/lib/analytics";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect, Link } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useUser, useClerk, useAuth, useSignUp } from "@clerk/react";
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
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import SharedView from "@/pages/SharedView";
import TermsGate from "@/pages/TermsGate";
import { useTermsStatus } from "@/hooks/useTermsStatus";
import { CURRENT_TERMS_VERSION } from "@/lib/termsVersion";
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

// ─── Sign-in page (with two-step View Demo flow) ──────────────────────────────

function SignInPage() {
  const { enterDemoMode } = useDemoContext();
  const [demoStep, setDemoStep] = useState<0 | 1 | 2>(0);
  const [demoEmail, setDemoEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [demoAgreed, setDemoAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleDemoClick() {
    track('demo_viewed');
    setDemoStep(1);
  }

  function handleEmailContinue() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(demoEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setDemoStep(2);
  }

  async function handleDemoAgree() {
    if (!demoAgreed || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/terms/agree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoEmail,
          terms_version: CURRENT_TERMS_VERSION,
          context: 'demo',
        }),
      });
    } catch { /* best-effort */ }
    identifyAsDemo();
    enterDemoMode();
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 gap-6">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />

      {demoStep === 0 && (
        <>
          {/* New user prompt — shown outside the Clerk card so it's always visible */}
          <div className="w-full max-w-[440px] text-center -mt-2">
            <p className="text-sm text-muted-foreground">
              First time here?{" "}
              <Link href="/sign-up" className="font-semibold text-primary hover:underline">
                Create your account →
              </Link>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Google sign-in only works once you've signed up first.
            </p>
          </div>

          <div className="w-full max-w-[440px] space-y-2 text-center">
            <div className="flex items-center gap-3">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground">Just exploring?</span>
              <div className="h-px bg-border flex-1" />
            </div>
            <button
              type="button"
              onClick={handleDemoClick}
              className="text-sm font-semibold text-primary hover:underline transition-colors"
            >
              View Demo →
            </button>
            <p className="text-[11px] text-muted-foreground">
              See 6 weeks of realistic PANDAS symptom data — no account needed
            </p>
          </div>
        </>
      )}

      {demoStep === 1 && (
        <div className="w-full max-w-[440px] space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">Demo access</span>
            <div className="h-px bg-border flex-1" />
          </div>
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="demo-email">
                Your email address
              </label>
              <input
                id="demo-email"
                type="email"
                value={demoEmail}
                onChange={(e) => { setDemoEmail(e.target.value); setEmailError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailContinue()}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              <p className="text-[11px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                We ask for your email to keep demo access fair and to contact you if anything important changes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleEmailContinue}
              className="w-full py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--clay)', color: '#fff', cursor: 'pointer' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {demoStep === 2 && (
        <div className="w-full max-w-[440px] space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">Demo access</span>
            <div className="h-px bg-border flex-1" />
          </div>
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                Continuing as {demoEmail}
              </span>
              <button
                type="button"
                onClick={() => { setDemoStep(1); setDemoAgreed(false); }}
                className="text-xs text-primary hover:underline"
              >
                Change
              </button>
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none" onClick={() => setDemoAgreed((v) => !v)}>
              <div className="mt-0.5 flex-shrink-0">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center transition-colors"
                  style={{
                    border: demoAgreed ? '2px solid var(--clay)' : '2px solid var(--rule-soft)',
                    backgroundColor: demoAgreed ? 'var(--clay)' : 'transparent',
                  }}
                >
                  {demoAgreed && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-foreground leading-snug">
                I have read and agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline font-medium">Terms and Conditions</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline font-medium">Privacy Policy</a>.
              </span>
            </label>
            <button
              type="button"
              onClick={handleDemoAgree}
              disabled={!demoAgreed || submitting}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                demoAgreed && !submitting
                  ? { background: 'var(--clay)', color: '#fff', cursor: 'pointer' }
                  : { background: 'var(--bg-subtle)', color: 'var(--ink-muted)', cursor: 'not-allowed' }
              }
            >
              {submitting ? 'Starting demo…' : 'Enter Demo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SignUpPage() {
  const [location] = useLocation();
  // In Clerk v6 the hook returns the resource directly (a signal value), not {signUp, isLoaded}
  const signUpResource = useSignUp();
  const [agreed, setAgreed] = useState(false);

  // Skip the pre-step and go straight to the Clerk form when:
  // 1. We're on a sub-path like /sign-up/sso-callback (Google OAuth callback after redirect)
  // 2. The user already agreed before the OAuth redirect (flag survives in localStorage)
  // 3. Clerk has a pending OAuth transfer from sign-in (no account found for Google user) —
  //    signUp.status is set by Clerk when it transfers the Google session here automatically.
  //    Terms are captured post-creation by the TermsGate in Router.
  const isOAuthCallback = location !== '/sign-up';
  const alreadyAgreed = !!(
    sessionStorage.getItem('pans_terms_pending') ||
    localStorage.getItem('pans_terms_pending')
  );
  // signUpResource is the SignUp object directly in Clerk v6; a non-null status means Clerk has
  // a pending session (e.g., from an OAuth transfer when Google sign-in finds no account).
  const hasClerkTransfer = signUpResource != null && (signUpResource as { status?: string | null }).status != null;

  const [showClerkForm, setShowClerkForm] = useState(
    isOAuthCallback || alreadyAgreed
  );
  // Latched true when the user arrives via a Clerk OAuth transfer (no account found on sign-in).
  // Stored in state so it stays true after the form renders and the signal clears.
  const [arrivedViaTransfer, setArrivedViaTransfer] = useState(false);

  // When Clerk has a pending OAuth transfer, skip the terms pre-step and go
  // straight to <SignUp> so Clerk can complete the account creation.
  useEffect(() => {
    if (hasClerkTransfer && !showClerkForm) {
      setArrivedViaTransfer(true);
      setShowClerkForm(true);
    }
  }, [hasClerkTransfer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showClerkForm) track('signup_started');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinue() {
    const pending = JSON.stringify({ version: CURRENT_TERMS_VERSION, agreedAt: new Date().toISOString() });
    // Write to localStorage so the flag survives a full-page OAuth redirect
    // (Google sign-up navigates away and back, clearing sessionStorage)
    sessionStorage.setItem('pans_terms_pending', pending);
    localStorage.setItem('pans_terms_pending', pending);
    setShowClerkForm(true);
  }

  if (showClerkForm) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 gap-4">
        {arrivedViaTransfer && (
          <div className="w-full max-w-[440px] rounded-xl border border-border bg-card px-4 py-3 flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5" aria-hidden>👋</span>
            <p className="text-sm text-foreground leading-snug">
              <span className="font-semibold">We didn't find an account for this Google address.</span>{" "}
              Let's get you set up!
            </p>
          </div>
        )}
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 gap-6">
      <div className="w-full max-w-[440px] space-y-6">
        <div className="text-center space-y-1">
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: '24px', color: 'var(--ink)' }}>
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Before we get started, please review our terms.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <label className="flex items-start gap-3 cursor-pointer select-none" onClick={() => setAgreed((v) => !v)}>
            <div className="mt-0.5 flex-shrink-0">
              <div
                className="w-4 h-4 rounded flex items-center justify-center transition-colors"
                style={{
                  border: agreed ? '2px solid var(--clay)' : '2px solid var(--rule-soft)',
                  backgroundColor: agreed ? 'var(--clay)' : 'transparent',
                }}
              >
                {agreed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-foreground leading-snug">
              I have read and agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline font-medium">Terms and Conditions</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline font-medium">Privacy Policy</a>.
            </span>
          </label>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!agreed}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={
              agreed
                ? { background: 'var(--clay)', color: '#fff', cursor: 'pointer' }
                : { background: 'var(--bg-subtle)', color: 'var(--ink-muted)', cursor: 'not-allowed' }
            }
          >
            Continue to create account
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

// ─── PostHog identity + signup detection ──────────────────────────────────────

function PostHogSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    identifyUser(user.id);
    const flagKey = `signup_tracked_${user.id}`;
    const isNewAccount =
      user.createdAt instanceof Date &&
      Date.now() - user.createdAt.getTime() < 5 * 60 * 1000;
    if (isNewAccount && !sessionStorage.getItem(flagKey)) {
      sessionStorage.setItem(flagKey, '1');
      track('signup_completed');
      // Record the T&C agreement captured during the signup pre-step.
      // Check both sessionStorage and localStorage — Google OAuth clears
      // sessionStorage during the redirect, so localStorage is the fallback.
      const pending = sessionStorage.getItem('pans_terms_pending') ?? localStorage.getItem('pans_terms_pending');
      if (pending) {
        try {
          const { version } = JSON.parse(pending) as { version: string };
          const email = user.emailAddresses?.[0]?.emailAddress;
          getToken().then((token) => {
            fetch('/api/terms/agree', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ email, terms_version: version, context: 'signup' }),
            }).catch(() => {});
            sessionStorage.setItem('pans_terms_ok', version);
          }).catch(() => {});
          sessionStorage.removeItem('pans_terms_pending');
          localStorage.removeItem('pans_terms_pending');
        } catch { /* ignore */ }
      }
    }
  }, [isLoaded, isSignedIn, user, getToken]);
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
  const { status: termsStatus, recordAgreement } = useTermsStatus();

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

  // Block authenticated users who haven't agreed to the current T&C version
  if (isSignedIn && !isDemoMode && !isPublic && termsStatus === 'needs-agreement') {
    return <TermsGate onAgree={recordAgreement} />;
  }

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
              {/* Public pages — no auth required */}
              <Route path="/privacy" component={Privacy} />
              <Route path="/terms" component={Terms} />
              <Route path="/shared/:token" component={SharedView} />
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
