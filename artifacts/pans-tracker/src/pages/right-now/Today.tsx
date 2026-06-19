import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Check } from "lucide-react";
import { track } from "@/lib/analytics";
import RightNowLayout from "./RightNowLayout";
import { cn } from "@/lib/utils";
import { DEMO_KEY, DEMO_SCENARIO_KEY } from "@/contexts/DemoContext";
import { useActiveChild } from "@/hooks/useActiveChild";

// ─── Checklist action definitions ────────────────────────────────────────────

interface Action {
  key: string;
  label: string;
  detail: string;
}

const ACTIONS: Action[] = [
  {
    key: "write_observations",
    label: "Write down what you are seeing right now",
    detail:
      "Note the date, time, and specific behaviors. Be as concrete as possible — what did you see, when did it start, how long did it last? This becomes your evidence.",
  },
  {
    key: "take_video",
    label: "Take a short video if you can",
    detail:
      "Especially useful for unusual movements, tics, or severe OCD rituals. Video is some of the most persuasive evidence you can bring to an appointment with a clinician who has not yet seen a flare.",
  },
  {
    key: "note_illness",
    label: "Note any recent illness or strep exposure",
    detail:
      "Think back four to six weeks. Was there a sore throat, an ear infection, a cold, or contact with someone who had strep? The child may have had no symptoms at all — some children are asymptomatic strep carriers.",
  },
  {
    key: "call_pediatrician",
    label: "Call your pediatrician and ask for strep titers",
    detail:
      "Request a throat culture or rapid strep test AND blood tests for ASO and Anti-DNase B titers. The blood tests are the more sensitive signal — they can show recent strep exposure even after the throat culture is negative.",
  },
  {
    key: "tell_pediatrician",
    label: 'Say the words: "I am concerned about PANS or PANDAS"',
    detail:
      '"The change was sudden — the child I am caring for went from fine to this in days. I believe something medical is happening and I would like it on the record." Naming it is advocating for it.',
  },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

async function fetchChecklist(
  getToken: () => Promise<string | null>,
  date: string,
  childId: string | null,
): Promise<Set<string>> {
  try {
    const token = await getToken();
    if (!token) return new Set();
    const params = new URLSearchParams({ date });
    if (childId) params.set("child_id", childId);
    const res = await fetch(`/api/data/right-now-checklist?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return new Set();
    const data = (await res.json()) as { action_key: string; completed: boolean }[];
    return new Set(data.filter((d) => d.completed).map((d) => d.action_key));
  } catch {
    return new Set();
  }
}

async function saveAction(
  getToken: () => Promise<string | null>,
  date: string,
  action_key: string,
  completed: boolean,
  childId: string | null,
): Promise<void> {
  try {
    const token = await getToken();
    if (!token) return;
    await fetch("/api/data/right-now-checklist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ date, action_key, completed, ...(childId ? { child_id: childId } : {}) }),
    });
  } catch {
    // best-effort
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RightNowToday() {
  const { getToken } = useAuth();
  const today = todayDate();
  const activeChild = useActiveChild();
  const activeChildId = activeChild?.id ?? null;

  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const demoScenario = isDemoMode ? localStorage.getItem(DEMO_SCENARIO_KEY) : null;

  const [completed, setCompleted] = useState<Set<string>>(() => {
    if (demoScenario === 'in_crisis') {
      return new Set(['write_observations', 'take_video']);
    }
    return new Set();
  });
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    track("right_now_section_viewed", { section: "today" });
    if (isDemoMode) return;
    fetchChecklist(getToken, today, activeChildId).then((set) => {
      setCompleted(set);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(
    async (key: string) => {
      const wasCompleted = completed.has(key);
      const next = new Set(completed);
      if (wasCompleted) {
        next.delete(key);
      } else {
        next.add(key);
        track("right_now_today_action_completed", { action: key, child_id: activeChildId });
      }
      setCompleted(next);
      void saveAction(getToken, today, key, !wasCompleted, activeChildId);
    },
    [completed, getToken, today],
  );

  const doneCount = ACTIONS.filter((a) => completed.has(a.key)).length;
  const allDone = doneCount === ACTIONS.length;

  return (
    <RightNowLayout
      title="What to do today"
      subtitle="Five steps for the next 24 hours. Tap each one to mark it done."
    >
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{doneCount} of {ACTIONS.length} done</span>
          {allDone && (
            <span className="font-medium" style={{ color: "var(--terracotta)" }}>
              Well done — that took courage.
            </span>
          )}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(doneCount / ACTIONS.length) * 100}%`,
              backgroundColor: "var(--terracotta)",
            }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {ACTIONS.map((action, idx) => {
          const done = completed.has(action.key);
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => toggle(action.key)}
              disabled={loading}
              className={cn(
                "w-full text-left flex items-start gap-4 p-5 rounded-2xl border-2 transition-all",
                done
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card hover:border-primary/30 hover:bg-primary/3",
                loading && "opacity-60 cursor-wait",
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all mt-0.5",
                  done ? "border-transparent" : "border-border",
                )}
                style={done ? { backgroundColor: "var(--terracotta)" } : undefined}
              >
                {done && <Check className="w-4 h-4 text-white" strokeWidth={2.5} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-[16px] font-semibold leading-snug transition-colors",
                    done ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground",
                  )}
                >
                  <span className="text-muted-foreground/50 text-sm font-normal mr-1.5">
                    {idx + 1}.
                  </span>
                  {action.label}
                </p>
                <p
                  className={cn(
                    "text-[14px] leading-[1.65] mt-1.5 transition-colors",
                    done ? "text-muted-foreground/60" : "text-muted-foreground",
                  )}
                >
                  {action.detail}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Date note */}
      <p className="text-xs text-muted-foreground text-center mt-6 opacity-60">
        Checklist resets each day. Today is {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.
      </p>
    </RightNowLayout>
  );
}
