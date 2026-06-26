import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResultBucket = "strong_match" | "partial_match" | "no_match";

export interface ScreenerAnswers {
  ageAtOnset: string;
  suddenOnset: "yes" | "no" | "not_sure" | "";
  symptomStartDate: string;
  ocdSymptoms: "yes" | "no" | "";
  ocdDescription: string;
  foodRestriction: "yes" | "no" | "";
  foodDescription: string;
  accompanyingSymptoms: string[];
  illnesses: string[];
  otherIllnessDescription: string;
  householdSick: "yes" | "no" | "not_sure" | "";
  alternativeDiagnosis: "yes" | "no" | "";
  alternativeDiagnosisDescription: string;
}

interface ScreenerWizardProps {
  mode: "anonymous" | "authenticated";
  onComplete: (answers: ScreenerAnswers, resultBucket: ResultBucket) => void;
  initialAnswers?: Partial<ScreenerAnswers>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "screener_draft";
const TOTAL_STEPS = 6;

const EMPTY_ANSWERS: ScreenerAnswers = {
  ageAtOnset: "",
  suddenOnset: "",
  symptomStartDate: "",
  ocdSymptoms: "",
  ocdDescription: "",
  foodRestriction: "",
  foodDescription: "",
  accompanyingSymptoms: [],
  illnesses: [],
  otherIllnessDescription: "",
  householdSick: "",
  alternativeDiagnosis: "",
  alternativeDiagnosisDescription: "",
};

const ACCOMPANYING_SYMPTOMS = [
  "Anxiety (new or sharply worsened)",
  "Emotional lability or depression",
  "Irritability, aggression, or oppositional behavior",
  "Behavioral or developmental regression (acting younger)",
  "School performance dropped suddenly",
  "Sensory issues (sound, light, touch sensitivity) or motor changes",
  "Sleep disturbance",
  "Urinary frequency or bedwetting (new)",
  "Handwriting changes",
  "Tics (motor or vocal)",
];

const ILLNESSES = [
  "Strep throat (confirmed by test)",
  "Sore throat",
  "Scarlet fever",
  "Sinus infection",
  "Ear infection",
  "Flu",
  "COVID",
  "Mycoplasma / walking pneumonia",
  "Other illness",
  "None that we noticed",
];

const STEP_LABELS = [
  "Onset",
  "Core symptoms",
  "Accompanying symptoms",
  "Recent illness",
  "Other diagnoses",
  "Review",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcResultBucket(a: ScreenerAnswers): ResultBucket {
  const suddenYes = a.suddenOnset === "yes";
  const hasCoreSymptom = a.ocdSymptoms === "yes" || a.foodRestriction === "yes";
  const accompanyingCount = a.accompanyingSymptoms.length;
  const noAlternative = a.alternativeDiagnosis !== "yes";

  if (suddenYes && hasCoreSymptom && accompanyingCount >= 2 && noAlternative) {
    return "strong_match";
  }

  const notSudden = a.suddenOnset === "no" || a.suddenOnset === "not_sure";
  if (notSudden && !hasCoreSymptom && accompanyingCount < 2) {
    return "no_match";
  }

  return "partial_match";
}

function isStepValid(step: number, a: ScreenerAnswers): boolean {
  switch (step) {
    case 0:
      return (
        a.ageAtOnset !== "" &&
        Number(a.ageAtOnset) >= 1 &&
        Number(a.ageAtOnset) <= 25 &&
        a.suddenOnset !== ""
      );
    case 1:
      return a.ocdSymptoms !== "" && a.foodRestriction !== "";
    case 2:
      return true;
    case 3:
      return a.householdSick !== "";
    case 4:
      return a.alternativeDiagnosis !== "";
    case 5:
      return true;
    default:
      return true;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function YesNoRadio({
  value,
  onChange,
  options = ["yes", "no"] as const,
}: {
  value: string;
  onChange: (v: string) => void;
  options?: readonly string[];
}) {
  const labels: Record<string, string> = {
    yes: "Yes",
    no: "No",
    not_sure: "Not sure",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={[
              "px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              selected
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/[0.02]",
            ].join(" ")}
            style={selected ? { borderColor: "var(--terracotta)", backgroundColor: "rgba(var(--terracotta-rgb,180,90,60),0.05)" } : undefined}
          >
            <span className="flex items-center gap-1.5">
              {selected ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--terracotta)" }} />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-border block shrink-0" />
              )}
              {labels[opt] ?? opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-foreground leading-snug">{label}</p>
      {children}
    </div>
  );
}

function CheckboxItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
      />
      <span className="text-sm text-foreground leading-snug group-hover:text-foreground/80 transition-colors">
        {label}
      </span>
    </label>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className={[
        "w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm resize-none",
        "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40",
      ].join(" ")}
    />
  );
}

// ─── Step renderers ───────────────────────────────────────────────────────────

function StepOnset({ a, set }: { a: ScreenerAnswers; set: (p: Partial<ScreenerAnswers>) => void }) {
  return (
    <div className="space-y-6">
      <Question label="How old was your child when symptoms started?">
        <input
          type="number"
          min={1}
          max={25}
          value={a.ageAtOnset}
          onChange={(e) => set({ ageAtOnset: e.target.value })}
          placeholder="Age in years (1–25)"
          className={[
            "w-full h-11 px-4 rounded-xl border bg-card text-foreground text-sm",
            "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40",
            a.ageAtOnset && (Number(a.ageAtOnset) < 1 || Number(a.ageAtOnset) > 25)
              ? "border-destructive"
              : "border-border",
          ].join(" ")}
        />
        {a.ageAtOnset && (Number(a.ageAtOnset) < 1 || Number(a.ageAtOnset) > 25) && (
          <p className="text-xs text-destructive">Please enter an age between 1 and 25.</p>
        )}
      </Question>

      <Question label="Did the symptoms appear suddenly, within a few days?">
        <YesNoRadio
          value={a.suddenOnset}
          onChange={(v) => set({ suddenOnset: v as ScreenerAnswers["suddenOnset"] })}
          options={["yes", "no", "not_sure"]}
        />
      </Question>

      <Question label="When did symptoms begin? (optional)">
        <input
          type="date"
          value={a.symptomStartDate}
          onChange={(e) => set({ symptomStartDate: e.target.value })}
          max={new Date().toISOString().split("T")[0]}
          className={[
            "w-full h-11 px-4 rounded-xl border border-border bg-card text-foreground text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary/40",
          ].join(" ")}
        />
      </Question>
    </div>
  );
}

function StepCoreSymptoms({ a, set }: { a: ScreenerAnswers; set: (p: Partial<ScreenerAnswers>) => void }) {
  const bothNo = a.ocdSymptoms === "no" && a.foodRestriction === "no";

  return (
    <div className="space-y-6">
      <Question label="Has your child developed sudden OCD-like behaviors such as intrusive thoughts, repeated rituals, or contamination fears?">
        <YesNoRadio
          value={a.ocdSymptoms}
          onChange={(v) => set({ ocdSymptoms: v as ScreenerAnswers["ocdSymptoms"] })}
        />
        {a.ocdSymptoms === "yes" && (
          <div className="mt-2">
            <Textarea
              value={a.ocdDescription}
              onChange={(v) => set({ ocdDescription: v })}
              placeholder="Briefly describe what you have seen. (optional)"
            />
          </div>
        )}
      </Question>

      <Question label="Has your child suddenly refused food or severely restricted eating?">
        <YesNoRadio
          value={a.foodRestriction}
          onChange={(v) => set({ foodRestriction: v as ScreenerAnswers["foodRestriction"] })}
        />
        {a.foodRestriction === "yes" && (
          <div className="mt-2">
            <Textarea
              value={a.foodDescription}
              onChange={(v) => set({ foodDescription: v })}
              placeholder="Briefly describe. (optional)"
            />
          </div>
        )}
      </Question>

      {bothNo && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
          PANS and PANDAS diagnostic criteria require at least one of these core symptoms. You can still complete the screener.
        </div>
      )}
    </div>
  );
}

function StepAccompanying({ a, set }: { a: ScreenerAnswers; set: (p: Partial<ScreenerAnswers>) => void }) {
  function toggle(label: string, checked: boolean) {
    const next = checked
      ? [...a.accompanyingSymptoms, label]
      : a.accompanyingSymptoms.filter((s) => s !== label);
    set({ accompanyingSymptoms: next });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Select all that apply. This step is optional.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACCOMPANYING_SYMPTOMS.map((label) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
            <CheckboxItem
              label={label}
              checked={a.accompanyingSymptoms.includes(label)}
              onChange={(v) => toggle(label, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIllness({ a, set }: { a: ScreenerAnswers; set: (p: Partial<ScreenerAnswers>) => void }) {
  function toggle(label: string, checked: boolean) {
    let next: string[];
    if (label === "None that we noticed") {
      next = checked ? ["None that we noticed"] : [];
    } else {
      const withoutNone = a.illnesses.filter((i) => i !== "None that we noticed");
      next = checked ? [...withoutNone, label] : withoutNone.filter((i) => i !== label);
    }
    set({ illnesses: next });
  }

  const hasOther = a.illnesses.includes("Other illness");

  return (
    <div className="space-y-6">
      <Question label="In the weeks before symptoms started, did your child or anyone in your household have any of the following?">
        <div className="space-y-2.5">
          {ILLNESSES.map((label) => (
            <div key={label}>
              <CheckboxItem
                label={label}
                checked={a.illnesses.includes(label)}
                onChange={(v) => toggle(label, v)}
              />
              {label === "Other illness" && hasOther && (
                <div className="mt-2 ml-7">
                  <Textarea
                    value={a.otherIllnessDescription}
                    onChange={(v) => set({ otherIllnessDescription: v })}
                    placeholder="Please describe the illness."
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Question>

      <Question label="Was anyone in the household sick around that time?">
        <YesNoRadio
          value={a.householdSick}
          onChange={(v) => set({ householdSick: v as ScreenerAnswers["householdSick"] })}
          options={["yes", "no", "not_sure"]}
        />
      </Question>
    </div>
  );
}

function StepOtherDiagnoses({ a, set }: { a: ScreenerAnswers; set: (p: Partial<ScreenerAnswers>) => void }) {
  return (
    <div className="space-y-6">
      <Question label="Has your child been diagnosed with any condition that could explain these symptoms (for example Tourette's, Sydenham chorea, lupus, autism, OCD, anxiety disorder)?">
        <YesNoRadio
          value={a.alternativeDiagnosis}
          onChange={(v) => set({ alternativeDiagnosis: v as ScreenerAnswers["alternativeDiagnosis"] })}
        />
        {a.alternativeDiagnosis === "yes" && (
          <div className="mt-2">
            <Textarea
              value={a.alternativeDiagnosisDescription}
              onChange={(v) => set({ alternativeDiagnosisDescription: v })}
              placeholder="Which one(s)? (optional)"
            />
          </div>
        )}
      </Question>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-muted-foreground shrink-0 w-44">{label}</span>
      <span className="text-foreground font-medium break-words min-w-0">{value || "—"}</span>
    </div>
  );
}

function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="text-xs text-primary hover:underline underline-offset-4 font-medium"
        >
          Edit
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

const yesNoLabel: Record<string, string> = { yes: "Yes", no: "No", not_sure: "Not sure", "": "—" };

function StepReview({ a, onEdit }: { a: ScreenerAnswers; onEdit: (step: number) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your answers, then click "See my results" below.</p>

      <ReviewSection title="Step 1 — Onset" step={0} onEdit={onEdit}>
        <ReviewRow label="Age at onset" value={a.ageAtOnset ? `${a.ageAtOnset} years` : "—"} />
        <ReviewRow label="Sudden onset" value={yesNoLabel[a.suddenOnset]} />
        <ReviewRow label="Symptom start date" value={a.symptomStartDate || "Not provided"} />
      </ReviewSection>

      <ReviewSection title="Step 2 — Core symptoms" step={1} onEdit={onEdit}>
        <ReviewRow label="OCD-like behaviors" value={yesNoLabel[a.ocdSymptoms]} />
        {a.ocdDescription && <ReviewRow label="Description" value={a.ocdDescription} />}
        <ReviewRow label="Food restriction" value={yesNoLabel[a.foodRestriction]} />
        {a.foodDescription && <ReviewRow label="Description" value={a.foodDescription} />}
      </ReviewSection>

      <ReviewSection title="Step 3 — Accompanying symptoms" step={2} onEdit={onEdit}>
        {a.accompanyingSymptoms.length > 0 ? (
          <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
            {a.accompanyingSymptoms.map((s) => <li key={s}>{s}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None selected.</p>
        )}
      </ReviewSection>

      <ReviewSection title="Step 4 — Recent illness" step={3} onEdit={onEdit}>
        {a.illnesses.length > 0 ? (
          <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
            {a.illnesses.map((i) => <li key={i}>{i}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None selected.</p>
        )}
        {a.otherIllnessDescription && (
          <ReviewRow label="Other illness details" value={a.otherIllnessDescription} />
        )}
        <ReviewRow label="Household sick" value={yesNoLabel[a.householdSick]} />
      </ReviewSection>

      <ReviewSection title="Step 5 — Other diagnoses" step={4} onEdit={onEdit}>
        <ReviewRow label="Alternative diagnosis" value={yesNoLabel[a.alternativeDiagnosis]} />
        {a.alternativeDiagnosisDescription && (
          <ReviewRow label="Details" value={a.alternativeDiagnosisDescription} />
        )}
      </ReviewSection>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScreenerWizard({ mode, onComplete, initialAnswers }: ScreenerWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ScreenerAnswers>(() => {
    if (initialAnswers) return { ...EMPTY_ANSWERS, ...initialAnswers };
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return { ...EMPTY_ANSWERS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return EMPTY_ANSWERS;
  });

  const set = useCallback((patch: Partial<ScreenerAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...patch }));
  }, []);

  // Persist to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // ignore quota errors
    }
    if (mode === "authenticated") {
      window.dispatchEvent(
        new CustomEvent("screener:progress", { detail: { step, answers } }),
      );
    }
  }, [answers, mode, step]);

  function handleNext() {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleComplete() {
    const bucket = calcResultBucket(answers);
    sessionStorage.removeItem(STORAGE_KEY);
    onComplete(answers, bucket);
  }

  const valid = isStepValid(step, answers);
  const isReview = step === TOTAL_STEPS - 1;

  const stepContent = [
    <StepOnset key="onset" a={answers} set={set} />,
    <StepCoreSymptoms key="core" a={answers} set={set} />,
    <StepAccompanying key="accompanying" a={answers} set={set} />,
    <StepIllness key="illness" a={answers} set={set} />,
    <StepOtherDiagnoses key="other" a={answers} set={set} />,
    <StepReview key="review" a={answers} onEdit={(s) => setStep(s)} />,
  ];

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pb-10">
      {/* Medical disclaimer banner */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">Screening tool only.</span>{" "}
          This is not a medical diagnosis. Only a licensed healthcare provider can diagnose PANS or PANDAS.
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span className="font-medium">{STEP_LABELS[step]}</span>
          <span>Step {step + 1} of {TOTAL_STEPS}</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
              backgroundColor: "var(--terracotta)",
            }}
          />
        </div>
      </div>

      {/* Step heading */}
      <h2
        className="text-2xl font-semibold text-foreground leading-tight"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        {STEP_LABELS[step]}
      </h2>

      {/* Step content */}
      <div>{stepContent[step]}</div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 0}
          className={[
            "h-11 px-5 rounded-xl border border-border text-sm font-semibold transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            step === 0
              ? "opacity-40 cursor-not-allowed text-muted-foreground bg-background"
              : "text-foreground bg-background hover:bg-muted/50",
          ].join(" ")}
        >
          Back
        </button>

        {isReview ? (
          <button
            type="button"
            onClick={handleComplete}
            className={[
              "flex-1 h-11 rounded-xl text-sm font-semibold text-white transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              "hover:opacity-90 active:scale-[0.98]",
            ].join(" ")}
            style={{ backgroundColor: "var(--terracotta)" }}
          >
            See my results →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!valid}
            className={[
              "flex-1 h-11 rounded-xl text-sm font-semibold text-white transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              !valid
                ? "opacity-40 cursor-not-allowed"
                : "hover:opacity-90 active:scale-[0.98]",
            ].join(" ")}
            style={{ backgroundColor: "var(--terracotta)" }}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
