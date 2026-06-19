import { useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Siren, LineChart, ChevronRight } from "lucide-react";
import { useDemoContext, type DemoScenario } from "@/contexts/DemoContext";
import { track } from "@/lib/analytics";
import { DEMO_KEY } from "@/contexts/DemoContext";

const SCENARIOS: {
  id: DemoScenario;
  icon: React.ElementType;
  title: string;
  tag: string;
  description: string;
  lands: string;
}[] = [
  {
    id: "exploring",
    icon: Search,
    title: "Just starting out: we think something is wrong",
    tag: "Exploring",
    description:
      "A parent who noticed a sudden change three weeks ago and is trying to understand what PANS and PANDAS is. No symptom logs yet — they have not started daily tracking. Lands on the Learn section.",
    lands: "→ Lands on /learn",
  },
  {
    id: "in_crisis",
    icon: Siren,
    title: "In the middle of a first flare",
    tag: "In crisis",
    description:
      "Three days of severe symptom logs. The first two checklist items on 'What to do today' are already checked. Lands on the Right Now section.",
    lands: "→ Lands on /right-now",
  },
  {
    id: "tracking",
    icon: LineChart,
    title: "Tracking a known diagnosis",
    tag: "Tracking",
    description:
      "Six weeks of realistic PANDAS symptom data — a stable stretch, a flare, and a recovery. Medications, PTEC check-ins, and milestones. Lands on the Dashboard.",
    lands: "→ Lands on Dashboard",
  },
];

export default function DemoPicker() {
  const { isDemoMode, selectScenario } = useDemoContext();
  const [, navigate] = useLocation();

  // Guard: only accessible in demo mode
  useEffect(() => {
    if (!isDemoMode && localStorage.getItem(DEMO_KEY) !== "1") {
      navigate("/sign-in");
    }
  }, [isDemoMode, navigate]);

  useEffect(() => {
    track("demo_scenario_action", { scenario: null, action: "picker_viewed" });
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[480px] space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <span className="inline-block text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
            Demo mode
          </span>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            Pick a demo to explore
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each scenario loads realistic data for a different point in the PANS/PANDAS journey.
            Switching resets to that scenario's data.
          </p>
        </div>

        {/* Scenario cards */}
        <div className="space-y-3">
          {SCENARIOS.map(({ id, icon: Icon, title, tag, description, lands }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                track("demo_scenario_action", { scenario: id, action: "card_clicked" });
                selectScenario(id);
              }}
              className="w-full text-left group flex items-start gap-4 p-5 bg-card rounded-xl border border-border hover:border-violet-300 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                <Icon className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold tracking-wide uppercase text-violet-600">
                    {tag}
                  </span>
                </div>
                <p className="text-[14px] font-semibold text-foreground leading-snug mb-1">
                  {title}
                </p>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  {description}
                </p>
                <p className="text-[11.5px] text-violet-500 mt-2 font-medium">{lands}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-violet-600 transition-colors" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground opacity-70">
          No account needed. Data is simulated — nothing is saved.
        </p>
      </div>
    </div>
  );
}
