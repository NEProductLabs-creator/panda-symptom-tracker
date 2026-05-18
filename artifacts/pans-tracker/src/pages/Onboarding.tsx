import { useState } from "react";
import { useLocation } from "wouter";
import { Activity, ArrowRight, Plus, X, Heart, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { storage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiagnosisStatus = "confirmed" | "suspected" | "exploring" | "";

const DIAGNOSIS_OPTIONS: { value: DiagnosisStatus; label: string; sub: string }[] = [
  { value: "confirmed", label: "Confirmed PANS or PANDAS", sub: "We have a formal diagnosis" },
  { value: "suspected", label: "Suspected", sub: "Doctors think it's likely, still investigating" },
  { value: "exploring", label: "Still exploring", sub: "We're looking for answers" },
];

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i + 1 === step
              ? "w-6 bg-primary"
              : i + 1 < step
              ? "w-2 bg-primary/40"
              : "w-2 bg-border"
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        Step {step} of {total}
      </span>
    </div>
  );
}

// ─── Wrapper layout ────────────────────────────────────────────────────────────

function StepWrap({
  step,
  children,
  onContinue,
  continueLabel,
  canContinue,
  onSkip,
  skipLabel,
}: {
  step: number;
  children: React.ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  canContinue: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <ProgressDots step={step} total={5} />
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
            {children}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <Button
              size="lg"
              onClick={onContinue}
              disabled={!canContinue}
              className="w-full gap-2 h-12"
            >
              {continueLabel ?? "Continue"}
              <ArrowRight className="w-4 h-4" />
            </Button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                {skipLabel ?? "Skip this step"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: About your child ──────────────────────────────────────────────────

function Step1({
  onNext,
  onSkipAll,
}: {
  onNext: (data: { name: string; age: string; diagnosis: DiagnosisStatus }) => void;
  onSkipAll: () => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [diagnosis, setDiagnosis] = useState<DiagnosisStatus>("");

  return (
    <StepWrap
      step={1}
      onContinue={() => onNext({ name: name.trim(), age: age.trim(), diagnosis })}
      canContinue={name.trim().length > 0}
      onSkip={onSkipAll}
      skipLabel="Skip setup — take me to the app"
    >
      <div>
        <h1
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Tell us about your child
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          This helps us personalize the app for your family. You can change everything later.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Child's first name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emma"
            autoFocus
            data-testid="onboarding-child-name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Age
          </label>
          <Input
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g. 9"
            type="number"
            min={1}
            max={25}
            data-testid="onboarding-child-age"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Where are you in the journey?
          </label>
          {DIAGNOSIS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDiagnosis(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                diagnosis === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-accent"
              }`}
              data-testid={`diagnosis-${opt.value}`}
            >
              <p className={`text-sm font-semibold ${diagnosis === opt.value ? "text-primary" : "text-foreground"}`}>
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>
    </StepWrap>
  );
}

// ─── Step 2: Baseline ──────────────────────────────────────────────────────────

function Step2({
  childName,
  onNext,
  onSkip,
}: {
  childName: string;
  onNext: (description: string) => void;
  onSkip: () => void;
}) {
  const [desc, setDesc] = useState("");
  const name = childName || "your child";

  return (
    <StepWrap
      step={2}
      onContinue={() => onNext(desc.trim())}
      canContinue={true}
      onSkip={onSkip}
    >
      <div>
        <h1
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Who is {name} when they're well?
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          One of the most powerful things you can do right now is capture a picture of your child
          at their best — before a flare changes everything. This becomes your north star when you're
          fighting to get them back.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Describe {name} when well
        </label>
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={`e.g. "${name} loves building LEGOs for hours, laughs easily, sleeps well, and barely has any meltdowns. At school they're curious and focused. They're funny and kind and deeply empathetic."`}
          className="resize-none h-36 text-sm leading-relaxed"
          data-testid="onboarding-baseline-desc"
        />
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
        <p className="text-xs text-primary font-medium">
          You can add more detail later — sleep patterns, school performance, social behavior — from <strong>My Child</strong> in the sidebar.
        </p>
      </div>
    </StepWrap>
  );
}

// ─── Step 3: Household ────────────────────────────────────────────────────────

function Step3({
  onNext,
  onSkip,
}: {
  onNext: (members: string[]) => void;
  onSkip: () => void;
}) {
  const [members, setMembers] = useState<string[]>([]);
  const [input, setInput] = useState("");

  function addMember() {
    const v = input.trim();
    if (v && !members.includes(v)) {
      setMembers((m) => [...m, v]);
      setInput("");
    }
  }

  function removeMember(name: string) {
    setMembers((m) => m.filter((n) => n !== name));
  }

  return (
    <StepWrap
      step={3}
      onContinue={() => onNext(members)}
      canContinue={true}
      onSkip={onSkip}
    >
      <div>
        <h1
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Who's in your household?
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          When a family member gets sick, it can trigger a flare in a PANS/PANDAS child. The app
          helps you log household illnesses alongside your child's symptoms so you can spot these
          connections over time.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Family member names
        </label>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMember(); } }}
            placeholder="e.g. Mom, Dad, Jake..."
            data-testid="onboarding-member-input"
          />
          <Button type="button" variant="outline" size="icon" onClick={addMember}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {members.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {members.map((m) => (
              <div
                key={m}
                className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium"
              >
                {m}
                <button
                  type="button"
                  onClick={() => removeMember(m)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {members.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            You can add household members later from the Household Health section.
          </p>
        )}
      </div>
    </StepWrap>
  );
}

// ─── Step 4: Medications ──────────────────────────────────────────────────────

function Step4({
  childName,
  onNext,
  onSkip,
}: {
  childName: string;
  onNext: (meds: { name: string; dose: string }[]) => void;
  onSkip: () => void;
}) {
  const [meds, setMeds] = useState<{ name: string; dose: string }[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [doseInput, setDoseInput] = useState("");
  const name = childName || "your child";

  function addMed() {
    const n = nameInput.trim();
    if (!n) return;
    setMeds((prev) => [...prev, { name: n, dose: doseInput.trim() }]);
    setNameInput("");
    setDoseInput("");
  }

  function removeMed(i: number) {
    setMeds((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <StepWrap
      step={4}
      onContinue={() => onNext(meds)}
      canContinue={true}
      onSkip={onSkip}
    >
      <div>
        <h1
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Is {name} taking any medications?
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Add their current medications now and the app will track them against symptom
          patterns. You can manage the full details — dosing, prescriber, supply — from
          the Medications section.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add a medication
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Medication name"
            data-testid="onboarding-med-name"
          />
          <Input
            value={doseInput}
            onChange={(e) => setDoseInput(e.target.value)}
            placeholder="Dose (optional)"
            data-testid="onboarding-med-dose"
          />
        </div>
        <Button type="button" variant="outline" className="w-full gap-2" onClick={addMed} disabled={!nameInput.trim()}>
          <Plus className="w-4 h-4" />
          Add medication
        </Button>
      </div>

      {meds.length > 0 && (
        <div className="space-y-2">
          {meds.map((m, i) => (
            <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-accent">
              <div>
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                {m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}
              </div>
              <button type="button" onClick={() => removeMed(i)} className="text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {meds.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No medications yet. You can add them anytime from the Medications section.
        </p>
      )}
    </StepWrap>
  );
}

// ─── Step 5: Welcome ──────────────────────────────────────────────────────────

function Step5({ childName, onFinish }: { childName: string; onFinish: () => void }) {
  const name = childName || "your child";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <ProgressDots step={5} total={5} />
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #fffbeb 0%, #fef3c7 50%, #fde68a30 100%)",
              border: "1.5px solid #fcd34d",
            }}
          >
            <div className="px-7 py-8 space-y-5">
              <div className="w-12 h-12 bg-amber-200 rounded-2xl flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6 text-amber-700" />
              </div>

              <div className="text-center space-y-3">
                <h1
                  className="text-2xl font-bold text-amber-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  You are not alone.
                </h1>
                <p className="text-sm text-amber-800 leading-relaxed">
                  This app was built for families like yours. You are doing something remarkable by
                  tracking this carefully.
                </p>
                <p className="text-sm text-amber-800 leading-relaxed font-medium italic">
                  "Let us help you fight for {name}."
                </p>
              </div>

              <div className="rounded-xl bg-white/60 border border-amber-200 px-4 py-3">
                <p className="text-xs text-amber-700 font-medium mb-1">You're not in this alone.</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  The PANDAS Network connects families who have walked this exact road. Many children
                  reach full remission. There is a path through this.
                </p>
                <a
                  href="https://www.pandasnetwork.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                >
                  pandasnetwork.org
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button
              size="lg"
              onClick={onFinish}
              className="w-full gap-2 h-12 bg-primary"
              data-testid="onboarding-finish"
            >
              <CheckCircle2 className="w-4 h-4" />
              Let's get started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Onboarding component ────────────────────────────────────────────────

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [childName, setChildName] = useState("");
  const { saveSettings } = useAppSettings();
  const { baseline, saveBaseline } = useChildBaseline();

  async function finish() {
    saveSettings({ onboardingComplete: true });
    await supabase.auth.updateUser({ data: { onboarding_complete: true } });
    navigate("/");
  }

  function handleStep1(data: { name: string; age: string; diagnosis: DiagnosisStatus }) {
    setChildName(data.name);
    // Save child name/age to baseline
    saveBaseline({
      ...(baseline ?? {
        description: "",
        sleepHours: "",
        appetite: "",
        activityLevel: "moderate",
        socialBehavior: "",
        schoolPerformance: "",
        behavioralNotes: "",
        lastUpdated: new Date().toISOString(),
      }),
      childName: data.name,
      childAge: data.age,
      lastUpdated: new Date().toISOString(),
    });
    if (data.diagnosis) {
      saveSettings({ diagnosisStatus: data.diagnosis });
    }
    setStep(2);
  }

  function handleStep2(description: string) {
    if (description) {
      saveBaseline({
        ...(baseline ?? {
          childName,
          childAge: "",
          sleepHours: "",
          appetite: "",
          activityLevel: "moderate",
          socialBehavior: "",
          schoolPerformance: "",
          behavioralNotes: "",
          lastUpdated: new Date().toISOString(),
        }),
        childName,
        description,
        lastUpdated: new Date().toISOString(),
      });
    }
    setStep(3);
  }

  function handleStep3(members: string[]) {
    saveSettings({ householdMembers: members });
    setStep(4);
  }

  function handleStep4(meds: { name: string; dose: string }[]) {
    if (meds.length > 0) {
      const existing = (() => {
        try {
          const raw = localStorage.getItem("pans_tracker_medications");
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();

      const today = format(new Date(), "yyyy-MM-dd");
      const newMeds = meds.map((m) => ({
        id: `med_onboard_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: m.name,
        dose: m.dose || "",
        frequency: "once" as const,
        type: "antibiotic" as const,
        startDate: today,
        endDate: null,
        notes: "Added during setup",
      }));

      localStorage.setItem(
        "pans_tracker_medications",
        JSON.stringify([...existing, ...newMeds])
      );
    }
    setStep(5);
  }

  if (step === 1) return <Step1 onNext={handleStep1} onSkipAll={finish} />;
  if (step === 2) return <Step2 childName={childName} onNext={handleStep2} onSkip={() => setStep(3)} />;
  if (step === 3) return <Step3 onNext={handleStep3} onSkip={() => setStep(4)} />;
  if (step === 4) return <Step4 childName={childName} onNext={handleStep4} onSkip={() => setStep(5)} />;
  return <Step5 childName={childName} onFinish={finish} />;
}
