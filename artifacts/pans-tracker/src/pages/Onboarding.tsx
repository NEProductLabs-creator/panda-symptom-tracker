import { useState, useEffect } from "react";
import { track } from "@/lib/analytics";
import { useLocation } from "wouter";
import {
  Heart,
  Activity,
  Star,
  Sun,
  Shield,
  User,
  ChevronRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useChildBaseline } from "@/hooks/useChildBaseline";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiagnosisOption = "pans" | "pandas" | "suspected" | "prefer_not";

const DIAGNOSIS_OPTIONS: { value: DiagnosisOption; label: string }[] = [
  { value: "pans", label: "PANS" },
  { value: "pandas", label: "PANDAS" },
  { value: "suspected", label: "Suspected / Undiagnosed" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const TOTAL_SCREENS = 6;

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 w-full max-w-sm mx-auto">
      {Array.from({ length: TOTAL_SCREENS }, (_, i) => (
        <div
          key={i}
          className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
            i < step ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Shared emotional screen layout ───────────────────────────────────────────

interface EmotionalScreenProps {
  step: number;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  headline: string;
  body: string;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children?: React.ReactNode;
}

function EmotionalScreen({
  step,
  iconBg,
  iconColor,
  icon,
  headline,
  body,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  children,
}: EmotionalScreenProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-6 pt-12">
        <ProgressBar step={step} />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center">
            <div
              className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center`}
            >
              <div className={iconColor}>{icon}</div>
            </div>
          </div>

          <div className="text-center space-y-3">
            <h1
              className="text-2xl font-bold text-foreground leading-tight"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {headline}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {body}
            </p>
          </div>

          {children}

          <Button
            className="w-full h-12 gap-2"
            onClick={onNext}
            disabled={nextDisabled}
          >
            {nextLabel}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main onboarding ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [, navigate] = useLocation();
  const { saveSettings } = useAppSettings();
  const { baseline, saveBaseline } = useChildBaseline();

  useEffect(() => { track('onboarding_started'); }, []);

  const next = () => setStep((s) => s + 1);

  // Screen 5 – privacy
  const [agreed, setAgreed] = useState(false);

  // Screen 6 – child profile
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [symptomsDate, setSymptomsDate] = useState("");
  const [diagnosis, setDiagnosis] = useState<DiagnosisOption | "">("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  async function finish() {
    setSaving(true);
    try {
      saveSettings({ onboardingComplete: true });

      if (childName) {
        const age = childDob
          ? String(
              new Date().getFullYear() - new Date(childDob).getFullYear()
            )
          : "";
        saveBaseline({
          ...(baseline ?? {
            description: "",
            sleepHours: "",
            appetite: "",
            activityLevel: "moderate" as const,
            socialBehavior: "",
            schoolPerformance: "",
            behavioralNotes: "",
          }),
          childName,
          childAge: age,
          lastUpdated: new Date().toISOString(),
        });
      }

      track('onboarding_completed');
      navigate("/");
    } finally {
      setSaving(false);
    }
  }

  // ── Screen 1: Welcome ─────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <EmotionalScreen
        step={1}
        iconBg="bg-rose-100"
        iconColor="text-rose-500"
        icon={<Heart className="w-8 h-8" />}
        headline="You're not alone."
        body="Watching your child change overnight is one of the hardest things a parent can face. This app won't have all the answers, but it will help you find them faster."
        onNext={next}
      />
    );
  }

  // ── Screen 2: What this app does ─────────────────────────────────────────

  if (step === 2) {
    return (
      <EmotionalScreen
        step={2}
        iconBg="bg-primary/10"
        iconColor="text-primary"
        icon={<Activity className="w-8 h-8" />}
        headline="Your memory, organized."
        body="PANS and PANDAS symptoms can shift day to day. This app helps you log what you're seeing, spot patterns over time, and build a clear record to share with your child's care team."
        onNext={next}
      />
    );
  }

  // ── Screen 3: You are the expert ─────────────────────────────────────────

  if (step === 3) {
    return (
      <EmotionalScreen
        step={3}
        iconBg="bg-violet-100"
        iconColor="text-violet-600"
        icon={<Star className="w-8 h-8" />}
        headline="You know your child better than anyone."
        body="Doctors rely on parent observations more than almost any other source for PANS and PANDAS. What you notice matters. This app helps you capture it."
        onNext={next}
      />
    );
  }

  // ── Screen 4: This is treatable ──────────────────────────────────────────

  if (step === 4) {
    return (
      <EmotionalScreen
        step={4}
        iconBg="bg-amber-100"
        iconColor="text-amber-500"
        icon={<Sun className="w-8 h-8" />}
        headline="This is treatable."
        body="PANS and PANDAS can feel overwhelming, but many children recover significantly with the right treatment. Families do get through this. Tracking is one of the most powerful things you can do right now."
        onNext={next}
      />
    );
  }

  // ── Screen 5: Privacy ────────────────────────────────────────────────────

  if (step === 5) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="px-6 pt-12">
          <ProgressBar step={5} />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="text-center">
              <h1
                className="text-2xl font-bold text-foreground leading-tight"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Your data belongs to you.
              </h1>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 text-xs text-muted-foreground leading-relaxed space-y-3 max-h-44 overflow-y-auto">
              <p>
                We store your information securely so you can access it from
                any device.
              </p>
              <p>
                We never sell your data, share it with third parties, or use
                it for advertising.
              </p>
              <p>You can export or delete your data at any time.</p>
              <p>
                This app is not a medical service and is not subject to HIPAA,
                but we treat your family's information with the same care we'd
                want for our own.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <button
                type="button"
                role="checkbox"
                aria-checked={agreed}
                onClick={() => setAgreed((v) => !v)}
                data-testid="privacy-agree"
                className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  agreed
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}
              >
                {agreed && (
                  <Check className="w-3 h-3 text-primary-foreground" />
                )}
              </button>
              <span className="text-sm text-foreground leading-snug">
                I understand and agree to these terms.
              </span>
            </label>

            <Button
              className="w-full h-12 gap-2"
              onClick={next}
              disabled={!agreed}
              data-testid="privacy-next"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Screen 6: Child profile ───────────────────────────────────────────────

  const canFinish = childName.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-6 pt-12">
        <ProgressBar step={6} />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center">
              <User className="w-8 h-8 text-teal-600" />
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <h1
              className="text-2xl font-bold text-foreground leading-tight"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Let's set up your child's profile.
            </h1>
            <p className="text-sm text-muted-foreground">
              You can update this any time in settings.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Child's first name
              </label>
              <Input
                placeholder="e.g. Alex"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                data-testid="onboarding-child-name"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Date of birth{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Input
                type="date"
                value={childDob}
                onChange={(e) => setChildDob(e.target.value)}
                max={today}
                data-testid="onboarding-child-dob"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Approximate date symptoms first appeared{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Input
                type="date"
                value={symptomsDate}
                onChange={(e) => setSymptomsDate(e.target.value)}
                max={today}
                data-testid="onboarding-symptoms-date"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Primary diagnosis{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <select
                value={diagnosis}
                onChange={(e) =>
                  setDiagnosis(e.target.value as DiagnosisOption | "")
                }
                data-testid="onboarding-diagnosis"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select…</option>
                {DIAGNOSIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            className="w-full h-12 gap-2"
            onClick={finish}
            disabled={!canFinish || saving}
            data-testid="onboarding-finish"
          >
            {saving ? "Saving…" : "Finish setup"}
            {!saving && <ChevronRight className="w-4 h-4" />}
          </Button>

          {!canFinish && (
            <p className="text-center text-xs text-muted-foreground">
              Enter your child's name to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
