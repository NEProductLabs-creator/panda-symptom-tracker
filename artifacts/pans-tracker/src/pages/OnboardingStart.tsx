import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, type Variants, type Transition } from "framer-motion";
import { BookOpen, Zap, BarChart2, Check, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/analytics";
import { useJourneyState } from "@/hooks/useJourneyState";
import { useActiveChild, setActiveChild } from "@/hooks/useActiveChild";
import { useChildren } from "@/hooks/useChildren";
import type { JourneyStage } from "@/lib/types";

// ─── Animation variants ───────────────────────────────────────────────────────

const ITEM_TRANSITION: Transition = { duration: 0.48, ease: "easeOut" };

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.13, delayChildren: 0.08 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ─── Journey options ──────────────────────────────────────────────────────────

interface JourneyOption {
  stage: JourneyStage;
  destination: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}

const OPTIONS: JourneyOption[] = [
  {
    stage: "exploring",
    destination: "/learn",
    icon: BookOpen,
    title: "I think something is wrong and I'm trying to understand it",
    subtitle:
      "We will help you learn what PANS and PANDAS are and organize what you are noticing.",
  },
  {
    stage: "in_crisis",
    destination: "/right-now",
    icon: Zap,
    title: "We're in the middle of a flare and I need help today",
    subtitle:
      "Concrete things to do right now, written by parents who have been there.",
  },
  {
    stage: "tracking",
    destination: "/",
    icon: BarChart2,
    title: "We have a working diagnosis and want to track symptoms",
    subtitle:
      "Daily logging, patterns over time, and reports for your care team.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingStart() {
  const [, navigate] = useLocation();
  const { setJourneyStage, completeOnboarding, isSettingStage } = useJourneyState();
  const activeChild = useActiveChild();
  const { data: children = [] } = useChildren();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<JourneyStage | null>(null);

  // Step "pick-child" is prepended when the user has multiple children so they
  // can confirm (or change) which child they're setting up before picking a stage.
  const isMultiChild = children.length > 1;
  const [step, setStep] = useState<"pick-child" | "pick-stage">(
    isMultiChild ? "pick-child" : "pick-stage"
  );
  const [pickedChildId, setPickedChildId] = useState(activeChild?.id ?? "");

  // childName reflects the active child (may update after setActiveChild fires)
  const childName = activeChild?.name ?? null;

  function confirmChildPick() {
    if (pickedChildId && pickedChildId !== activeChild?.id) {
      setActiveChild(pickedChildId, qc);
    }
    setStep("pick-stage");
  }

  function handleSelect(option: JourneyOption) {
    if (isSettingStage || selected !== null) return;
    setSelected(option.stage);
    // Optimistic navigation — both mutations fire in background
    setJourneyStage(option.stage);
    completeOnboarding();
    track("onboarding_journey_stage_selected", {
      stage: option.stage,
      child_id: activeChild?.id ?? null,
    });
    navigate(option.destination);
  }

  // ── Step 0: Pick child (multi-child only) ─────────────────────────────────
  if (step === "pick-child") {
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
          <motion.div variants={fadeUp} transition={ITEM_TRANSITION} className="text-center mb-8">
            <h1
              className="text-3xl font-bold text-foreground leading-tight"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Which child are we setting up?
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Each child has their own journey stage and symptom history.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} transition={ITEM_TRANSITION} className="space-y-3">
            {children.map((child) => {
              const isPicked = pickedChildId === child.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setPickedChildId(child.id)}
                  className={[
                    "w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border-2 text-left transition-all",
                    isPicked
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03]",
                  ].join(" ")}
                  style={isPicked ? { borderColor: "var(--terracotta)" } : undefined}
                >
                  <div>
                    <p
                      className="font-semibold text-foreground"
                      style={{ fontFamily: "Fraunces, serif" }}
                    >
                      {child.name}
                    </p>
                    {child.journey_stage && (
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        Currently: {child.journey_stage.replace("_", " ")}
                      </p>
                    )}
                  </div>
                  {isPicked && (
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: "var(--terracotta)" }} />
                  )}
                </button>
              );
            })}

            <Link href="/onboarding/add-child">
              <button
                type="button"
                className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 text-left transition-all"
              >
                <UserPlus className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <p className="text-sm font-medium text-muted-foreground">Add a new child instead</p>
              </button>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} transition={ITEM_TRANSITION} className="mt-6">
            <button
              type="button"
              onClick={confirmChildPick}
              disabled={!pickedChildId}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "var(--terracotta)" }}
            >
              Continue with {children.find((c) => c.id === pickedChildId)?.name ?? "this child"}
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── Step 1: Pick journey stage ─────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-14"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <motion.div
        className="w-full max-w-3xl"
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
            {childName
              ? `Where are you with ${childName} right now?`
              : "Where are you right now?"}
          </h1>
          <p
            className="mt-3 text-base"
            style={{ color: "hsl(var(--chart-2))" }}
          >
            There is no wrong answer. You can change this anytime.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = selected === option.stage;
            const isIdle = selected === null;

            return (
              <motion.button
                key={option.stage}
                variants={fadeUp}
                transition={ITEM_TRANSITION}
                type="button"
                onClick={() => handleSelect(option)}
                disabled={!isIdle}
                className={[
                  "group flex flex-col items-start text-left p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isActive
                    ? "border-primary bg-primary/5 shadow-md"
                    : isIdle
                      ? "border-border bg-card hover:border-primary/60 hover:bg-primary/[0.03] hover:shadow-sm"
                      : "border-border bg-card opacity-40 cursor-default",
                ].join(" ")}
                style={
                  isActive
                    ? { borderColor: "var(--terracotta)" }
                    : undefined
                }
              >
                {/* Icon */}
                <div
                  className={[
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
                    isActive
                      ? "bg-primary/15"
                      : "bg-muted group-hover:bg-primary/10",
                  ].join(" ")}
                >
                  <Icon
                    className="w-5 h-5 transition-colors"
                    style={
                      isActive
                        ? { color: "var(--terracotta)" }
                        : undefined
                    }
                  />
                </div>

                {/* Title */}
                <p
                  className={[
                    "text-[15px] font-semibold leading-snug mb-2 transition-colors",
                    isActive ? "text-foreground" : "text-foreground group-hover:text-foreground",
                  ].join(" ")}
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  {option.title}
                </p>

                {/* Subtitle */}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {option.subtitle}
                </p>

                {/* Active indicator */}
                {isActive && (
                  <div
                    className="mt-4 text-xs font-semibold"
                    style={{ color: "var(--terracotta)" }}
                  >
                    Selected ✓
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Footer note */}
        <motion.p
          variants={fadeUp}
          transition={ITEM_TRANSITION}
          className="text-center text-xs text-muted-foreground mt-8 opacity-70"
        >
          You can switch your journey stage anytime from the sidebar menu.
        </motion.p>
      </motion.div>
    </div>
  );
}
