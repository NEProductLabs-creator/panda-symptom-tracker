import { useState } from "react";
import { useLocation } from "wouter";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { storage } from "@/lib/storage";
import { ActivityLevel, MedLibraryItem, FrequencyOption } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ChevronRight, CheckCircle2, Pill, ArrowRight } from "lucide-react";

export const SETUP_WIZARD_FLAG = "pans_tracker_setup_wizard_done";

type Step = 1 | 2 | 3 | 4;

export default function SetupWizard({ onDismiss }: { onDismiss: () => void }) {
  const { saveBaseline } = useChildBaseline();
  const { saveMedLibraryItem } = useMedLibrary();
  const [, navigate] = useLocation();

  // If child info was already collected during onboarding, skip step 1
  const [step, setStep] = useState<Step>(() => {
    const b = storage.getChildBaseline();
    return b?.childName?.trim() ? 2 : 1;
  });

  // Step 1 — pre-filled from existing baseline if present
  const [childName, setChildName] = useState(() => storage.getChildBaseline()?.childName ?? "");
  const [childAge, setChildAge] = useState(() => storage.getChildBaseline()?.childAge ?? "");

  // Step 2
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");

  // Step 3 – inline med form
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState<FrequencyOption>("once");
  const [addedMeds, setAddedMeds] = useState<string[]>([]);

  function dismiss() {
    localStorage.setItem(SETUP_WIZARD_FLAG, "1");
    onDismiss();
  }

  function nextStep1(skip = false) {
    if (!skip && childName.trim()) {
      saveBaseline({
        childName: childName.trim(),
        childAge: childAge.trim(),
        description: "",
        sleepHours: "",
        appetite: "",
        activityLevel: "moderate",
        socialBehavior: "",
        schoolPerformance: "",
        behavioralNotes: "",
        lastUpdated: new Date().toISOString(),
      });
    }
    setStep(2);
  }

  function nextStep2(skip = false) {
    if (!skip) {
      const current = storage.getChildBaseline();
      if (current) {
        saveBaseline({ ...current, activityLevel, lastUpdated: new Date().toISOString() });
      } else if (childName.trim()) {
        saveBaseline({
          childName: childName.trim(),
          childAge: childAge.trim(),
          description: "",
          sleepHours: "",
          appetite: "",
          activityLevel,
          socialBehavior: "",
          schoolPerformance: "",
          behavioralNotes: "",
          lastUpdated: new Date().toISOString(),
        });
      }
    }
    setStep(3);
  }

  function addMed() {
    if (!medName.trim()) return;
    const item: MedLibraryItem = {
      id: crypto.randomUUID(),
      name: medName.trim(),
      dosage: medDosage.trim(),
      frequency: medFreq,
    };
    saveMedLibraryItem(item);
    setAddedMeds((prev) => [...prev, medName.trim()]);
    setMedName("");
    setMedDosage("");
    setMedFreq("once");
  }

  function nextStep3() {
    localStorage.setItem(SETUP_WIZARD_FLAG, "1");
    setStep(4);
  }

  const overlay =
    "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4";
  const panel =
    "w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden";

  // ── Step 4: Confirmation ───────────────────────────────────────────────────
  if (step === 4) {
    return (
      <div className={overlay}>
        <div className={panel}>
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2
                className="text-xl font-bold text-foreground"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                You're all set!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Start by logging today's symptoms. You can always update
                {childName.trim() ? ` ${childName.trim()}'s` : " your child's"} profile
                and medications any time from the sidebar.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => {
                  dismiss();
                  navigate("/log");
                }}
              >
                Log today's symptoms
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={dismiss}
              >
                Go to dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Steps 1–3 ──────────────────────────────────────────────────────────────
  return (
    <div className={overlay}>
      <div className={panel}>
        {/* Header: progress dots + close */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`rounded-full transition-all duration-300 ${
                  n === step
                    ? "w-5 h-2 bg-primary"
                    : n < step
                    ? "w-2 h-2 bg-primary/50"
                    : "w-2 h-2 bg-muted"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close setup"
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-6 space-y-5">

          {/* ── Step 1: Name & age ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="space-y-1">
                <h2
                  className="text-xl font-bold text-foreground"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  Tell us about your child
                </h2>
                <p className="text-sm text-muted-foreground">
                  This personalises the app and pre-fills their profile.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Child's first name
                  </Label>
                  <Input
                    placeholder="e.g. Jamie"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && nextStep1()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Age
                  </Label>
                  <Input
                    placeholder="e.g. 9"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value)}
                    type="number"
                    min={1}
                    max={25}
                    onKeyDown={(e) => e.key === "Enter" && nextStep1()}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button className="flex-1 gap-2" onClick={() => nextStep1()}>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => nextStep1(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Baseline activity level ────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="space-y-1">
                <h2
                  className="text-xl font-bold text-foreground"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  What's their baseline?
                </h2>
                <p className="text-sm text-muted-foreground">
                  How active is{" "}
                  {childName.trim() ? <strong>{childName.trim()}</strong> : "your child"} when
                  they're feeling like themselves?
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { level: "low" as ActivityLevel, emoji: "🐢", label: "Low" },
                    { level: "moderate" as ActivityLevel, emoji: "🚶", label: "Moderate" },
                    { level: "high" as ActivityLevel, emoji: "⚡", label: "High" },
                  ]
                ).map(({ level, emoji, label }) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setActivityLevel(level)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      activityLevel === level
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-2xl mb-1.5">{emoji}</div>
                    <p
                      className={`text-xs font-semibold ${
                        activityLevel === level ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {label}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button className="flex-1 gap-2" onClick={() => nextStep2()}>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => nextStep2(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Medications ─────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <div className="space-y-1">
                <h2
                  className="text-xl font-bold text-foreground"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  Add their medications
                </h2>
                <p className="text-sm text-muted-foreground">
                  Add what they're currently taking so you can check them off each day.
                </p>
              </div>

              {/* Already-added meds */}
              {addedMeds.length > 0 && (
                <div className="space-y-1.5">
                  {addedMeds.map((name, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20"
                    >
                      <Pill className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <p className="text-sm text-foreground flex-1">{name}</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Add form */}
              <div className="space-y-2.5 border border-border rounded-xl p-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Medication name
                  </Label>
                  <Input
                    placeholder="e.g. Amoxicillin"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addMed()}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Dosage
                    </Label>
                    <Input
                      placeholder="e.g. 500mg"
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Frequency
                    </Label>
                    <Select
                      value={medFreq}
                      onValueChange={(v) => setMedFreq(v as FrequencyOption)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Once a day</SelectItem>
                        <SelectItem value="twice">Twice a day</SelectItem>
                        <SelectItem value="three_times">3× a day</SelectItem>
                        <SelectItem value="as_needed">As needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={addMed}
                  disabled={!medName.trim()}
                >
                  <Pill className="w-3.5 h-3.5" />
                  Add medication
                </Button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button className="flex-1 gap-2" onClick={nextStep3}>
                  {addedMeds.length > 0 ? "Continue" : "Done"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <button
                  type="button"
                  onClick={nextStep3}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
