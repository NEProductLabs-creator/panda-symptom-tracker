import { useEffect } from "react";
import { Link } from "wouter";
import { ClipboardList, ClipboardCheck, FileDown, ArrowRight } from "lucide-react";
import { CalendarPulse } from "@/components/icons/CalendarPulse";
import { useDemoContext } from "@/contexts/DemoContext";
import { track, identifyAsDemo } from "@/lib/analytics";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3
          className="text-base font-bold text-foreground mb-1.5"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function Landing() {
  const { enterDemoMode } = useDemoContext();

  useEffect(() => {
    track("landing_page_viewed");
  }, []);

  function handleDemo() {
    identifyAsDemo();
    track("landing_cta_demo");
    enterDemoMode();
  }

  return (
    <>
      <style>{`
        @keyframes landingFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-fade { opacity: 0; animation: landingFadeUp 0.65s ease-out forwards; }
        .lp-d1 { animation-delay: 0.08s; }
        .lp-d2 { animation-delay: 0.22s; }
        .lp-d3 { animation-delay: 0.36s; }
        .lp-d4 { animation-delay: 0.50s; }
      `}</style>

      <div className="min-h-screen flex flex-col bg-background">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          className="flex flex-col items-center justify-center text-center px-5 pt-20 pb-16 relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 50% -2%, hsl(185 25% 91%), transparent)",
          }}
        >
          {/* Logo + wordmark */}
          <div className="lp-fade lp-d1 flex flex-col items-center gap-3 mb-9">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <CalendarPulse className="w-12 h-12 text-primary" />
            </div>
            <span
              className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground"
              style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
            >
              PANS &amp; PANDAS Tracker
            </span>
          </div>

          {/* Headline */}
          <h1
            className="lp-fade lp-d2 text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-foreground max-w-2xl leading-[1.14] tracking-tight mb-5"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            When your child changes overnight,{" "}
            <span style={{ color: "hsl(185, 30%, 38%)" }}>
              every detail matters.
            </span>
          </h1>

          {/* Supporting line */}
          <p className="lp-fade lp-d3 text-base sm:text-lg text-muted-foreground max-w-[420px] leading-relaxed mb-11">
            Track the symptoms. Spot the patterns. Walk into every appointment
            knowing you'll be heard.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-3 mt-8 text-center">
            <a
              href="/sign-up"
              onClick={() => track("landing_cta_create_account")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:shadow-lg hover:opacity-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ArrowRight className="w-4 h-4" />
              Start Tracking Today
            </a>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a
                href="/sign-in"
                onClick={() => track("landing_cta_login")}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Log in →
              </a>
            </p>

            {/* Tertiary / demo */}
            <button
              onClick={handleDemo}
              className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
            >
              View Demo →
            </button>
          </div>
        </section>

        {/* ── Feature sections ──────────────────────────────────────────────── */}
        <section
          className="py-20 px-5 border-t border-border/60 bg-primary/5"
        >
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-12">
            <Feature
              icon={ClipboardList}
              title="Track what matters."
              body="Log daily symptoms across every domain your care team cares about, including OCD, anxiety, sleep, appetite, mood, and focus. Spot patterns before your next appointment."
            />
            <Feature
              icon={ClipboardCheck}
              title="Built around the PTEC."
              body="Weekly check-ins follow the PANS/PANDAS Treatment Evaluation Checklist used by leading clinicians. Your data speaks the language your doctor already understands."
            />
            <Feature
              icon={FileDown}
              title="Your records, always with you."
              body="Access your child's full symptom history from any device. Export a clean summary PDF to share with your care team in one tap."
            />
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-border py-8 px-5 text-center bg-background">
          <p className="text-sm text-muted-foreground mb-4 italic">
            Built by a PANDAS family, for PANDAS families.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/sign-in"
              onClick={() => track("landing_cta_login")}
              className="text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/sign-up"
              onClick={() => track("landing_cta_create_account")}
              className="text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
