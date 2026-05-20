import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Activity, ClipboardList, TrendingUp, Stethoscope, ArrowRight } from "lucide-react";

const VISITED_KEY = "pans_tracker_visited";

export function markVisited() {
  localStorage.setItem(VISITED_KEY, "1");
}

export function hasVisited() {
  return !!localStorage.getItem(VISITED_KEY);
}

function WhyCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 p-5 rounded-2xl bg-white/60 border border-border/60 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground leading-tight" style={{ fontFamily: "Fraunces, serif" }}>
          {title}
        </p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export default function Intro() {
  const [, navigate] = useLocation();

  function handleGetStarted() {
    markVisited();
    navigate("/log");
  }

  function handleGoToDashboard() {
    markVisited();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-lg space-y-8">

        {/* Logo + name */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <Activity className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1
              className="text-3xl font-bold text-foreground leading-tight"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              PANS &amp; PANDAS Tracker
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Your daily symptom journal</p>
          </div>
        </div>

        {/* What is PANS/PANDAS */}
        <div className="rounded-2xl bg-primary/5 border border-primary/15 px-6 py-5 space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">What is PANS / PANDAS?</p>
          <p className="text-sm text-foreground leading-relaxed">
            <strong>PANS</strong> (Pediatric Acute-onset Neuropsychiatric Syndrome) and{" "}
            <strong>PANDAS</strong> (Pediatric Autoimmune Neuropsychiatric Disorders Associated
            with Streptococcal infections) are conditions where a child's immune response
            triggers sudden, severe neuropsychiatric symptoms — including OCD, anxiety, tics,
            rage, and cognitive changes.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Symptoms often fluctuate in flares, making them difficult to describe and easy to
            underestimate between appointments.
          </p>
        </div>

        {/* Why tracking matters */}
        <div className="space-y-3">
          <p
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1"
          >
            Why daily tracking matters
          </p>

          <WhyCard
            icon={ClipboardList}
            title="Capture what memory misses"
            body="Day-to-day symptom scores give you an accurate record, so you're not trying to reconstruct months of history during a 20-minute appointment."
          />

          <WhyCard
            icon={TrendingUp}
            title="Reveal patterns over time"
            body="Trends, triggers, and cycles only become visible across weeks of data — things like worsening after illness, or improvement after a medication change."
          />

          <WhyCard
            icon={Stethoscope}
            title="Help your doctor make better decisions"
            body="Detailed logs help clinicians confirm or rule out a diagnosis, evaluate whether a treatment is working, and make dosage or protocol adjustments based on real data — not guesswork."
          />
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 pt-1">
          <Button size="lg" onClick={handleGetStarted} className="w-full gap-2 text-base h-12">
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Button>
          <button
            type="button"
            onClick={handleGoToDashboard}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-1"
          >
            Take me to the dashboard
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground pb-2">
          Data syncs to your account and is accessible from any device.
        </p>
      </div>
    </div>
  );
}
