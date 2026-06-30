import { ReactNode, lazy, Suspense, useEffect, useRef, useState } from "react";
import { track, identifyUser, identifyAsDemo, enableSurveys } from "@/lib/analytics";
import { Switch, Route, Router as WouterRouter, useLocation, Link } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk, useAuth } from "@/hooks/useSupabaseAuth";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { openExternal } from "@/lib/platform";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { OtpFlow } from "@/components/OtpFlow";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Activity, Mail } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import LogEntry from "@/pages/LogEntry";
import MedLibrary from "@/pages/MedLibrary";
import PrintSummary from "@/pages/PrintSummary";
const ExportData = lazy(() => import("@/pages/ExportData"));
import OnboardingStart from "@/pages/OnboardingStart";
import OnboardingAddChild from "@/pages/OnboardingAddChild";
import SettingsChildren from "@/pages/SettingsChildren";
import Learn from "@/pages/Learn";
import LearnOverview from "@/pages/learn/Overview";
import LearnSuddenOnset from "@/pages/learn/SuddenOnset";
import LearnCriteria from "@/pages/learn/Criteria";
import LearnRedFlags from "@/pages/learn/RedFlags";
import LearnGlossary from "@/pages/learn/Glossary";
import LearnFindProvider from "@/pages/learn/FindProvider";
import LearnSelfCheck from "@/pages/learn/SelfCheck";
import RightNow from "@/pages/RightNow";
import RightNowReframe from "@/pages/right-now/Reframe";
import RightNowToday from "@/pages/right-now/Today";
import RightNowDeEscalation from "@/pages/right-now/DeEscalation";
import RightNowERGuide from "@/pages/right-now/ERGuide";
import Advocate from "@/pages/Advocate";
import AdvocateReports from "@/pages/advocate/Reports";
import AdvocateScripts from "@/pages/advocate/Scripts";
import ChildSwitcher from "@/components/ChildSwitcher";
import AdvocateSchool from "@/pages/advocate/School";
import AdvocateProviders from "@/pages/advocate/Providers";
import Reports from "@/pages/Reports";
import Intro from "@/pages/Intro";
import MilestonesPage from "@/pages/Milestones";
import Sidebar from "@/components/layout/Sidebar";
import Timeline from "@/pages/Timeline";
import Baseline from "@/pages/Baseline";
import PTECCheckin from "@/pages/PTECCheckin";
import TriggerLogPage from "@/pages/TriggerLog";
import Medications from "@/pages/Medications";
import Labs from "@/pages/Labs";
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
import DemoPicker from "@/pages/DemoPicker";
import Landing from "@/pages/Landing";
import ScreenerPage from "@/pages/ScreenerPage";
import ScreenerResults from "@/pages/ScreenerResults";
import AppScreener from "@/pages/AppScreener";
import AppScreenerResult from "@/pages/AppScreenerResult";
import InstallPrompt from "@/components/InstallPrompt";
import OfflineBanner from "@/components/OfflineBanner";
import { getOnboardingComplete } from "@/hooks/useAppSettings";
import { useJourneyState } from "@/hooks/useJourneyState";
import { useChildren } from "@/hooks/useChildren";
import { useActiveChild } from "@/hooks/useActiveChild";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import SetupWizard, { SETUP_WIZARD_FLAG, getWizardKey } from "@/components/SetupWizard";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function authCallbackUrl(): string {
  return `${window.location.origin}${basePath}/auth/callback`;
}

const NO_SIDEBAR_ROUTES = ["/print", "/about", "/onboarding", "/sign-in", "/sign-up", "/demo/pick", "/auth"];

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

// ─── Auth form building blocks ────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function GoogleButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl() },
    });
    if (error) setLoading(false); // on success the browser redirects away
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full h-11 rounded-lg border border-border bg-white hover:bg-accent transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground disabled:opacity-60"
    >
      <GoogleIcon />
      {loading ? "Redirecting…" : label}
    </button>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="19" viewBox="0 0 814 1000" aria-hidden fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-32.8-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.5 135.4-317.5 269-317.5 70.7 0 129.5 46.4 174.8 46.4 43.4 0 112.6-49.7 192-49.7 30.5 0 108.3 2.6 168.1 87.3zm-126.5-213.4c33.3-40.8 57.3-97.1 57.3-153.4 0-7.7-.7-15.4-2-22.4-53.7 2-116.8 35.9-154.2 80.7C536.5 59.6 510.7 115 510.7 171.3c0 6.4.6 12.8 1.9 18.5 3.2.5 8.4 1.3 13.6 1.3 47.5 0 107.1-32.3 135.4-63.6z" />
    </svg>
  );
}

function AppleButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleClick() {
    setLoading(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: authCallbackUrl(),
        scopes: "name email",
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    // on success the browser navigates away — no cleanup needed
  }
  return (
    <div className="w-full space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full h-11 rounded-lg bg-[#000] hover:bg-[#1a1a1a] transition-colors text-white flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-60"
      >
        <AppleIcon />
        {loading ? "Redirecting…" : label}
      </button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}

function CredentialsForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // sign-up: duplicate-email modal
  const [showResendModal, setShowResendModal] = useState(false);
  // sign-in: "email not confirmed" inline offer
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  // shared resend state
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown() {
    setCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function doResend(emailAddr: string) {
    if (resending || cooldown > 0) return;
    setResending(true);
    try {
      await supabase.auth.resend({ type: "signup", email: emailAddr });
      setResendDone(true);
      startCooldown();
    } catch {
      // Supabase may rate-limit silently — ignore
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          // Detect unconfirmed email — offer resend instead of a raw error
          if (signInError.message.toLowerCase().includes("email not confirmed")) {
            setUnconfirmedEmail(email);
            setSubmitting(false);
            return;
          }
          setError(signInError.message);
          setSubmitting(false);
          return;
        }
        navigate("/");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authCallbackUrl() },
        });
        if (signUpError) {
          setError(signUpError.message);
          setSubmitting(false);
          return;
        }
        // Supabase returns 200 with an empty identities array when the email is
        // already registered (anti-enumeration measure). Show resend modal.
        if (data.user && (data.user.identities ?? []).length === 0) {
          setShowResendModal(true);
          setSubmitting(false);
          return;
        }
        if (data.session) {
          navigate("/");
        } else {
          setInfo(
            "Check your email to confirm your account, then come back and sign in.",
          );
          setSubmitting(false);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // ── Sign-in: unconfirmed email — show resend offer inline ─────────────────
  if (unconfirmedEmail) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-900">Email not confirmed yet</p>
          <p className="text-xs text-amber-800">
            We sent a confirmation link to{" "}
            <span className="font-semibold">{unconfirmedEmail}</span>.
            Check your inbox (and spam folder), or get a fresh link below.
          </p>
          {resendDone ? (
            <p className="text-xs font-semibold text-emerald-700">
              ✓ Verification link sent! Check your inbox.
            </p>
          ) : (
            <button
              type="button"
              disabled={resending || cooldown > 0}
              onClick={() => doResend(unconfirmedEmail)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-amber-700 text-white transition-opacity disabled:opacity-50"
            >
              {resending
                ? "Sending…"
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend verification email"}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setUnconfirmedEmail(null); setResendDone(false); setCooldown(0); }}
          className="w-full text-xs text-muted-foreground hover:underline"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
          {mode === "sign-up" && (
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
          />
        </div>
        {mode === "sign-in" && (
          <div className="flex justify-end -mt-1">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {info && <p className="text-xs text-emerald-600">{info}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {submitting
            ? mode === "sign-in"
              ? "Signing in…"
              : "Creating account…"
            : mode === "sign-in"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      {/* Duplicate-email modal (sign-up only) */}
      <Dialog open={showResendModal} onOpenChange={(open) => { setShowResendModal(open); if (!open) { setResendDone(false); setCooldown(0); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Looks like you already have an account</DialogTitle>
            <DialogDescription>
              We found an existing account for{" "}
              <span className="font-semibold text-foreground">{email}</span>.
              We'll send you a fresh verification link — check your inbox after
              clicking below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {resendDone ? (
              <p className="text-sm font-semibold text-emerald-700 text-center">
                ✓ Verification link sent! Check your inbox.
              </p>
            ) : (
              <button
                type="button"
                disabled={resending || cooldown > 0}
                onClick={() => doResend(email)}
                className="w-full h-10 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {resending
                  ? "Sending…"
                  : cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Send verification link"}
              </button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Know your password?{" "}
              <Link
                href="/sign-in"
                onClick={() => setShowResendModal(false)}
                className="text-primary hover:underline font-medium"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");

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
      {demoStep === 0 && (
        <div className="bg-white rounded-2xl w-[440px] max-w-full shadow-lg p-8 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-foreground font-bold text-xl" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to track your child's symptoms
            </p>
          </div>
          <GoogleButton label="Continue with Google" />
          <AppleButton label="Continue with Apple" />
          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px bg-border flex-1" />
          </div>
          {authMethod === "otp" ? (
            <OtpFlow mode="sign-in" onBack={() => setAuthMethod("password")} />
          ) : (
            <>
              <CredentialsForm mode="sign-in" />
              <div className="flex items-center gap-3">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px bg-border flex-1" />
              </div>
              <button
                type="button"
                onClick={() => setAuthMethod("otp")}
                className="w-full h-11 rounded-lg border border-border bg-white text-sm font-medium text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-muted-foreground" aria-hidden />
                Email me a sign-in code
              </button>
            </>
          )}
        </div>
      )}

      {demoStep === 0 && (
        <>
          {/* New user prompt — always visible */}
          <div className="w-full max-w-[440px] text-center -mt-2">
            <p className="text-sm text-muted-foreground">
              First time here?{" "}
              <Link href="/sign-up" className="font-semibold text-primary hover:underline">
                Create your account →
              </Link>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              You can sign in with email or Google.
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
                <a href="/terms" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void openExternal('/terms'); }} className="text-primary hover:underline font-medium">Terms and Conditions</a>
                {" "}and{" "}
                <a href="/privacy" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void openExternal('/privacy'); }} className="text-primary hover:underline font-medium">Privacy Policy</a>.
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
  const [agreed, setAgreed] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");

  // Skip the terms pre-step when the user already agreed (flag survives in
  // localStorage across a full-page Google OAuth redirect).
  const alreadyAgreed = !!(
    sessionStorage.getItem('pans_terms_pending') ||
    localStorage.getItem('pans_terms_pending')
  );

  const [showForm, setShowForm] = useState(alreadyAgreed);

  useEffect(() => {
    if (!showForm) track('signup_started');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinue() {
    const pending = JSON.stringify({ version: CURRENT_TERMS_VERSION, agreedAt: new Date().toISOString() });
    // Write to localStorage so the flag survives a full-page OAuth redirect
    // (Google sign-up navigates away and back, clearing sessionStorage).
    // PostHogSync records the agreement once the account session exists.
    sessionStorage.setItem('pans_terms_pending', pending);
    localStorage.setItem('pans_terms_pending', pending);
    setShowForm(true);
  }

  if (showForm) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 gap-4">
        <div className="bg-white rounded-2xl w-[440px] max-w-full shadow-lg p-8 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-foreground font-bold text-xl" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
              Create your free account
            </h1>
            <p className="text-sm text-muted-foreground">
              Private, secure, and designed for PANS &amp; PANDAS families
            </p>
          </div>
          <GoogleButton label="Sign up with Google" />
          <AppleButton label="Sign up with Apple" />
          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px bg-border flex-1" />
          </div>
          {authMethod === "otp" ? (
            <OtpFlow mode="sign-up" onBack={() => setAuthMethod("password")} />
          ) : (
            <>
              <CredentialsForm mode="sign-up" />
              <div className="flex items-center gap-3">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px bg-border flex-1" />
              </div>
              <button
                type="button"
                onClick={() => setAuthMethod("otp")}
                className="w-full h-11 rounded-lg border border-border bg-white text-sm font-medium text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-muted-foreground" aria-hidden />
                Email me a sign-in code
              </button>
            </>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
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
              <a href="/terms" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void openExternal('/terms'); }} className="text-primary hover:underline font-medium">Terms and Conditions</a>
              {" "}and{" "}
              <a href="/privacy" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void openExternal('/privacy'); }} className="text-primary hover:underline font-medium">Privacy Policy</a>.
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

// ─── Forgot-password request page ─────────────────────────────────────────────

function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { isDemoMode } = useDemoContext();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      toast({ title: "Password reset is disabled in demo mode." });
      navigate("/");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startCooldown() {
    setCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || cooldown > 0) return;
    setSubmitting(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${basePath}/auth/reset-password`,
      });
    } catch {
      // Never reveal whether the email exists — always show success
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      startCooldown();
    }
  }

  if (isDemoMode) return null;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 gap-4">
      <div className="bg-white rounded-2xl w-[440px] max-w-full shadow-lg p-8 space-y-5">
        <div className="text-center space-y-1">
          <h1
            className="text-foreground font-bold text-xl"
            style={{ fontFamily: "'Newsreader', Georgia, serif" }}
          >
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-900">Check your inbox</p>
            <p className="text-sm text-emerald-800">
              If an account exists for that email, we just sent a reset link.
              Check your inbox and spam folder.
            </p>
            {cooldown > 0 ? (
              <p className="text-xs text-emerald-700">You can send another in {cooldown}s</p>
            ) : (
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Send again
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="reset-email"
                className="text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting || cooldown > 0}
              className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting
                ? "Sending…"
                : cooldown > 0
                  ? `Try again in ${cooldown}s`
                  : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/sign-in" className="text-primary hover:underline font-medium">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Password reset completion page ───────────────────────────────────────────

function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { isDemoMode } = useDemoContext();
  const { toast } = useToast();
  // null = loading/checking, true = recovery session active, false = expired/invalid
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      toast({ title: "Password reset is disabled in demo mode." });
      navigate("/");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isDemoMode) return;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const tokenType = hashParams.get("type");

    if (tokenType !== "recovery") {
      // No recovery token in URL — expired, reused, or navigated here directly
      setSessionReady(false);
      return;
    }

    // Supabase (detectSessionInUrl: true) exchanges the recovery token and fires
    // PASSWORD_RECOVERY. Listen for the event and also check the current session
    // in case it already fired before this component mounted.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    // Fallback: if the event never fires (invalid/expired token), show expired UI
    const timer = setTimeout(() => {
      setSessionReady((prev) => (prev === null ? false : prev));
    }, 3000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match. Please try again.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (isDemoMode) return null;

  if (sessionReady === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Verifying reset link…</p>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8">
        <div className="bg-white rounded-2xl w-[440px] max-w-full shadow-lg p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-destructive text-xl" aria-hidden="true">!</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-foreground">Link expired or already used</h1>
            <p role="status" className="text-sm text-muted-foreground">
              This reset link has expired or was already used. Request a new one.
            </p>
          </div>
          <Link
            href="/auth/forgot-password"
            className="flex items-center justify-center w-full h-11 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="bg-white rounded-2xl w-[440px] max-w-full shadow-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <span className="text-emerald-600 text-xl" aria-hidden="true">✓</span>
          </div>
          <p role="status" className="text-base font-semibold text-foreground">
            Password updated. You're signed in.
          </p>
          <p className="text-sm text-muted-foreground">Taking you to the dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8">
      <div className="bg-white rounded-2xl w-[440px] max-w-full shadow-lg p-8 space-y-5">
        <div className="text-center space-y-1">
          <h1
            className="text-foreground font-bold text-xl"
            style={{ fontFamily: "'Newsreader', Georgia, serif" }}
          >
            Set a new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose something strong — at least 8 characters.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="new-password"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoComplete="new-password"
              autoFocus
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoComplete="new-password"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── PostHog identity + signup detection ──────────────────────────────────────

function PostHogSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    identifyUser(user.id);
    // Analytics-only: fire signup_completed once for freshly created accounts.
    // T&C recording is handled authoritatively by useTermsStatus (which is not
    // time-gated, so it survives Supabase's delayed email-confirmation flow).
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

  const isLearnRoute = location.startsWith("/learn");
  const isSettingsChildren = location === "/settings/children";
  const showViewingPill = !isLearnRoute && !isSettingsChildren;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 md:ml-60 min-h-screen pb-20 md:pb-0" style={{ paddingRight: "env(safe-area-inset-right)" }}>
        <div
          className="md:hidden"
          style={{ height: "calc(env(safe-area-inset-top) + 3.5rem)" }}
        />
        {isDemoMode && <DemoBanner />}
        {showViewingPill && (
          <div className="flex justify-end px-5 pt-3 pb-0">
            <ChildSwitcher variant="pill" />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

// ─── Cache invalidation when signed-in user changes ───────────────────────────

function SupabaseCacheInvalidator() {
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

const NO_WIZARD_ROUTES = ["/sign-in", "/sign-up", "/onboarding", "/print", "/about", "/screener"];

function Router() {
  const { isSignedIn, isLoaded } = useUser();
  const { isDemoMode } = useDemoContext();
  const [location, navigate] = useLocation();
  const { status: termsStatus, recordAgreement } = useTermsStatus();
  const {
    journeyState,
    isLoading: journeyStateLoading,
    isError: journeyStateError,
    isSettingStage,
    isCompletingOnboarding,
  } = useJourneyState();
  const { data: children, isLoading: childrenLoading } = useChildren();
  const activeChild = useActiveChild();
  const { baseline } = useChildBaseline();

  // ── Setup wizard — per-child gating ────────────────────────────────────────
  // Evaluate whether to show the wizard for the active child.
  // On initial render: synchronous check against the child-scoped key + baseline.
  // On child switch: useEffect re-evaluates so a newly added child with no
  // baseline triggers the wizard automatically.
  const [showWizard, setShowWizard] = useState(() => {
    if (!activeChild) return false;
    const key = getWizardKey(activeChild.id);
    // Migrate legacy global key → per-child key once
    if (localStorage.getItem(SETUP_WIZARD_FLAG) === "1") {
      localStorage.setItem(key, "1");
      localStorage.removeItem(SETUP_WIZARD_FLAG);
    }
    return localStorage.getItem(key) !== "1" && !baseline?.childName?.trim();
  });

  useEffect(() => {
    if (!activeChild) { setShowWizard(false); return; }
    const key = getWizardKey(activeChild.id);
    if (localStorage.getItem(SETUP_WIZARD_FLAG) === "1") {
      localStorage.setItem(key, "1");
      localStorage.removeItem(SETUP_WIZARD_FLAG);
    }
    setShowWizard(localStorage.getItem(key) !== "1" && !baseline?.childName?.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChild?.id, baseline?.childName]);

  // Enable PostHog surveys only once the user is authenticated or in demo mode
  useEffect(() => {
    if (isSignedIn || isDemoMode) {
      enableSurveys();
    }
  }, [isSignedIn, isDemoMode]);

  // Foreground refetch: when the tab becomes visible again, notify all data hooks
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        document.dispatchEvent(new CustomEvent('pans:foreground'));
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  useEffect(() => {
    if (!isLoaded && !isDemoMode) return;

    const publicPrefixes = ["/sign-in", "/sign-up", "/about", "/print", "/screener"];
    const isPublic = publicPrefixes.some(
      (r) => location === r || location.startsWith(r + "/"),
    );

    // Root is the landing page for unauthenticated visitors — don't redirect them
    if (!isSignedIn && !isDemoMode && !isPublic && location !== "/") {
      navigate("/sign-in");
      return;
    }

    if ((isSignedIn || isDemoMode) && location === "/sign-in") {
      navigate("/");
      return;
    }

    if (isSignedIn && location === "/sign-up") {
      navigate("/");
    }
  }, [isSignedIn, isLoaded, isDemoMode, location]);

  // Post-login landing: send users to their journey section once per session
  const postLoginLanded = useRef(false);
  useEffect(() => {
    if (!isSignedIn) { postLoginLanded.current = false; }
  }, [isSignedIn]);
  // When the active child switches, reset the landing flag so the new child's
  // journey_stage drives the next navigation (resolves from activeChild via
  // useJourneyState, which already reads activeChild.journey_stage).
  useEffect(() => {
    postLoginLanded.current = false;
  }, [activeChild?.id]);
  useEffect(() => {
    if (!isLoaded || !isSignedIn || isDemoMode) return;
    if (childrenLoading || !children?.length) return; // no children yet — gate handles it
    if (journeyStateLoading || journeyStateError || !journeyState) return;
    if (journeyState.journey_stage === null) return; // handled by journey gate
    if (postLoginLanded.current) return;
    postLoginLanded.current = true;
    if (journeyState.journey_stage === "exploring") navigate("/learn");
    else if (journeyState.journey_stage === "in_crisis") navigate("/right-now");
    // 'tracking' → stays on '/' (dashboard)
  }, [isLoaded, isSignedIn, isDemoMode, childrenLoading, children, journeyStateLoading, journeyStateError, journeyState]);

  // Onboarding gate: journey stage must be chosen before anything else.
  // Once a stage is chosen, only tracking users are gated to add a child.
  // Exploring / in_crisis users can proceed without one.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || isDemoMode) return;
    if (childrenLoading) return;
    // Don't redirect while a journey mutation is in-flight — the optimistic
    // cache update may not have landed yet, which would cause a false redirect
    // back to /onboarding/start.
    if (isSettingStage || isCompletingOnboarding) return;
    // Already on an onboarding or public route — don't loop
    const skip = ["/onboarding", "/sign-in", "/sign-up", "/about", "/print", "/screener"];
    if (skip.some((r) => location === r || location.startsWith(r + "/"))) return;
    // Wait for journey state to resolve
    if (journeyStateLoading || journeyStateError) return;
    // No journey stage yet → pick one first (regardless of children)
    if (!journeyState || journeyState.journey_stage === null) {
      navigate("/onboarding/start");
      return;
    }
    // Tracking users need at least one child to use the tracker
    if (journeyState.journey_stage === "tracking" && !children?.length) {
      navigate("/onboarding/add-child");
      return;
    }
  }, [isLoaded, isSignedIn, isDemoMode, childrenLoading, children, journeyStateLoading, journeyStateError, journeyState, isSettingStage, isCompletingOnboarding, location]);

  // Unauthenticated users at root → landing page (show LoadingScreen while Clerk initialises)
  if (!isSignedIn && !isDemoMode && location === "/") {
    if (!isLoaded) return <LoadingScreen />;
    return <Landing />;
  }

  // Unauthenticated users at /screener/* → public screener pages (no Layout/sidebar)
  if (!isSignedIn && !isDemoMode && location.startsWith("/screener")) {
    if (!isLoaded) return <LoadingScreen />;
    if (location === "/screener/results") return <ScreenerResults />;
    return <ScreenerPage />;
  }

  if (!isLoaded && !isDemoMode) return <LoadingScreen />;

  const publicPrefixes = ["/sign-in", "/sign-up", "/about", "/print", "/screener"];
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
      <Suspense fallback={<div className="p-6">Loading…</div>}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/log" component={LogEntry} />
          <Route path="/library" component={MedLibrary} />
          <Route path="/print" component={PrintSummary} />
          <Route path="/export" component={ExportData} />
          <Route path="/milestones" component={MilestonesPage} />
          <Route path="/ptec" component={PTECCheckin} />
          <Route path="/timeline" component={Timeline} />
          <Route path="/baseline" component={Baseline} />
          <Route path="/triggers" component={TriggerLogPage} />
          <Route path="/medications" component={Medications} />
          <Route path="/labs" component={Labs} />
          <Route path="/school" component={SchoolHub} />
          <Route path="/wellbeing" component={WellbeingCheckin} />
          <Route path="/hope" component={HopeBoard} />
          <Route path="/learn" component={Learn} />
          <Route path="/learn/overview" component={LearnOverview} />
          <Route path="/learn/sudden-onset" component={LearnSuddenOnset} />
          <Route path="/learn/criteria" component={LearnCriteria} />
          <Route path="/learn/red-flags" component={LearnRedFlags} />
          <Route path="/learn/glossary" component={LearnGlossary} />
          <Route path="/learn/find-provider" component={LearnFindProvider} />
          <Route path="/learn/self-check" component={LearnSelfCheck} />
          <Route path="/right-now" component={RightNow} />
          <Route path="/right-now/reframe" component={RightNowReframe} />
          <Route path="/right-now/today" component={RightNowToday} />
          <Route path="/right-now/de-escalation" component={RightNowDeEscalation} />
          <Route path="/right-now/er-guide" component={RightNowERGuide} />
          <Route path="/advocate" component={Advocate} />
          <Route path="/demo/pick" component={DemoPicker} />
          <Route path="/advocate/reports" component={AdvocateReports} />
          <Route path="/advocate/scripts" component={AdvocateScripts} />
          <Route path="/advocate/school" component={AdvocateSchool} />
          <Route path="/advocate/providers" component={AdvocateProviders} />
          <Route path="/reports" component={Reports} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/onboarding/add-child" component={OnboardingAddChild} />
          <Route path="/onboarding/start" component={OnboardingStart} />
          <Route path="/settings" component={Settings} />
          <Route path="/settings/children" component={SettingsChildren} />
          <Route path="/about" component={Intro} />
          <Route path="/screener/results/:id" component={AppScreenerResult} />
          <Route path="/screener" component={AppScreener} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

// ─── OAuth / email-confirmation callback ──────────────────────────────────────
// supabase-js (detectSessionInUrl) exchanges the code in the URL during client
// init; AuthProvider then surfaces the session. Once auth resolves, route the
// user home (success) or back to sign-in (failure).

function AuthCallback() {
  const [, navigate] = useLocation();
  const { loading, session } = useAuthContext();

  // Parse OAuth error params from the URL hash that Supabase appends on failure.
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const oauthError = hashParams.get("error_description") ?? hashParams.get("error") ?? null;

  useEffect(() => {
    if (oauthError) return; // stay on this page to show the error
    if (loading) return;
    navigate(session ? "/" : "/sign-in", { replace: true });
  }, [loading, session, navigate, oauthError]);

  if (oauthError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-destructive text-xl">!</span>
          </div>
          <h2 className="text-lg font-semibold">Sign-in failed</h2>
          <p className="text-sm text-muted-foreground">{decodeURIComponent(oauthError.replace(/\+/g, " "))}</p>
          <a href="/sign-in" className="block mt-4 text-sm text-primary underline underline-offset-4">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return <LoadingScreen />;
}

// ─── App providers ────────────────────────────────────────────────────────────

function AppProviders() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <PostHogSync />
        <SupabaseCacheInvalidator />
        <TooltipProvider>
          <DemoProvider>
            <OfflineBanner />
            <Switch>
              <Route path="/sign-in" component={SignInPage} />
              <Route path="/sign-up" component={SignUpPage} />
              {/* Password reset flow */}
              <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
              <Route path="/auth/reset-password" component={ResetPasswordPage} />
              {/* OAuth / email-confirmation redirect target */}
              <Route path="/auth/callback" component={AuthCallback} />
              {/* Public screener — no auth required */}
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
    </AuthProvider>
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
