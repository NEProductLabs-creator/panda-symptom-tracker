import { useState } from "react";
import { useLocation } from "wouter";
import { motion, type Variants, type Transition } from "framer-motion";
import { BookOpen, Zap, BarChart2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { useJourneyState } from "@/hooks/useJourneyState";
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
  const { setJourneyStage, isSettingStage } = useJourneyState();
  const [selected, setSelected] = useState<JourneyStage | null>(null);

  function handleSelect(option: JourneyOption) {
    if (isSettingStage || selected !== null) return;
    setSelected(option.stage);
    // Optimistic navigation — mutation fires in background
    setJourneyStage(option.stage);
    track("onboarding_journey_stage_selected", { stage: option.stage });
    navigate(option.destination);
  }

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
            Where are you right now?
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
