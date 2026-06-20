import { useState } from "react";
import { useLocation } from "wouter";
import { motion, type Variants, type Transition } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useAddChild, useChildren } from "@/hooks/useChildren";
import { setActiveChild } from "@/hooks/useActiveChild";
import { track } from "@/lib/analytics";
import type { DiagnosisStatus } from "@/lib/types";

// ─── Animation variants ───────────────────────────────────────────────────────

const ITEM_TRANSITION: Transition = { duration: 0.45, ease: "easeOut" };

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0 },
};

// ─── Diagnosis status options ─────────────────────────────────────────────────

interface DiagOption {
  value: DiagnosisStatus;
  label: string;
  description: string;
}

const DIAG_OPTIONS: DiagOption[] = [
  {
    value: "undiagnosed",
    label: "Still figuring it out",
    description: "We haven't received a diagnosis yet.",
  },
  {
    value: "suspected",
    label: "We suspect PANS or PANDAS",
    description: "Symptoms match but no formal diagnosis yet.",
  },
  {
    value: "diagnosed",
    label: "Confirmed diagnosis",
    description: "A clinician has diagnosed PANS or PANDAS.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingAddChild() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { mutateAsync: addChild, isPending } = useAddChild();
  const { data: existingChildren } = useChildren();

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [preferNotSayDob, setPreferNotSayDob] = useState(false);
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus>("undiagnosed");
  const [nameError, setNameError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Please enter your child's first name.");
      return;
    }
    setNameError("");

    const id = crypto.randomUUID();
    const isFirstChild = !existingChildren?.length;

    await addChild({
      id,
      name: trimmedName,
      date_of_birth: preferNotSayDob ? null : (dob || null),
      diagnosis_status: diagnosisStatus,
      sort_order: existingChildren?.length ?? 0,
    });

    setActiveChild(id, qc);
    track("child_added", { diagnosis_status: diagnosisStatus, is_first_child: isFirstChild });
    navigate("/onboarding/start");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-14"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <motion.div
        className="w-full max-w-lg"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={fadeUp} transition={ITEM_TRANSITION} className="text-center mb-10">
          <h1
            className="text-3xl sm:text-4xl font-bold text-foreground leading-tight"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {existingChildren?.length ? "Add another child" : "Tell us about your child"}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            You can update this information anytime from Settings.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Child's first name */}
          <motion.div variants={fadeUp} transition={ITEM_TRANSITION} className="mb-6">
            <label
              htmlFor="child-name"
              className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5"
            >
              First name <span className="text-destructive">*</span>
            </label>
            <input
              id="child-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              placeholder="e.g. Alex"
              autoFocus
              className={[
                "w-full h-11 px-4 rounded-xl border bg-card text-foreground text-sm",
                "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40",
                nameError ? "border-destructive" : "border-border",
              ].join(" ")}
            />
            {nameError && (
              <p className="mt-1.5 text-xs text-destructive">{nameError}</p>
            )}
          </motion.div>

          {/* Date of birth */}
          <motion.div variants={fadeUp} transition={ITEM_TRANSITION} className="mb-6">
            <label
              htmlFor="child-dob"
              className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5"
            >
              Date of birth <span className="text-muted-foreground font-normal normal-case">(optional)</span>
            </label>
            <input
              id="child-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={preferNotSayDob}
              max={new Date().toISOString().split("T")[0]}
              className={[
                "w-full h-11 px-4 rounded-xl border bg-card text-foreground text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/40 border-border",
                preferNotSayDob ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
            />
            <label className="flex items-center gap-2 mt-2.5 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={preferNotSayDob}
                onChange={(e) => {
                  setPreferNotSayDob(e.target.checked);
                  if (e.target.checked) setDob("");
                }}
                className="rounded border-border w-4 h-4 accent-primary"
              />
              <span className="text-sm text-muted-foreground">Prefer not to say</span>
            </label>
          </motion.div>

          {/* Diagnosis status */}
          <motion.div variants={fadeUp} transition={ITEM_TRANSITION} className="mb-8">
            <p className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-3">
              Where are you with diagnosis?
            </p>
            <div className="flex flex-col gap-2.5">
              {DIAG_OPTIONS.map((opt) => {
                const isSelected = diagnosisStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDiagnosisStatus(opt.value)}
                    className={[
                      "flex items-start gap-3 text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02]",
                    ].join(" ")}
                    style={isSelected ? { borderColor: "var(--terracotta)" } : undefined}
                  >
                    <span className="mt-0.5 flex-shrink-0">
                      {isSelected ? (
                        <CheckCircle2
                          className="w-4 h-4"
                          style={{ color: "var(--terracotta)" }}
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-border block" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground leading-snug">
                        {opt.label}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Submit */}
          <motion.div variants={fadeUp} transition={ITEM_TRANSITION}>
            <button
              type="submit"
              disabled={isPending}
              className={[
                "w-full h-12 rounded-xl text-sm font-semibold text-white transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isPending ? "opacity-60 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.98]",
              ].join(" ")}
              style={{ backgroundColor: "var(--terracotta)" }}
            >
              {isPending ? "Saving…" : "Continue →"}
            </button>
          </motion.div>

          {/* Skip */}
          <motion.div variants={fadeUp} transition={ITEM_TRANSITION} className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                track("onboarding_add_child_skipped");
                navigate("/");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
