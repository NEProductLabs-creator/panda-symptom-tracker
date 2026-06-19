import { Link } from "wouter";
import { LifeBuoy, RefreshCw, ClipboardCheck, Wind, AlertTriangle, ChevronRight } from "lucide-react";
import { useActiveChild } from "@/hooks/useActiveChild";

// ─── Sub-section definitions ──────────────────────────────────────────────────

const SECTIONS = [
  {
    href: "/right-now/reframe",
    icon: RefreshCw,
    title: "It's the PANDAS, not your child",
    description:
      "What is happening in the brain during a flare — and why the child you love is still there underneath it.",
  },
  {
    href: "/right-now/today",
    icon: ClipboardCheck,
    title: "What to do today",
    description:
      "Five concrete steps for the next 24 hours. Check each one off as you go.",
  },
  {
    href: "/right-now/de-escalation",
    icon: Wind,
    title: "De-escalation in the moment",
    description:
      "When an OCD spiral or rage episode is happening right now — what helps, and what to avoid.",
  },
  {
    href: "/right-now/er-guide",
    icon: AlertTriangle,
    title: "Should we go to the ER?",
    description:
      "Clear criteria for when to go, what to bring, and exactly what to say at intake.",
  },
];

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function RightNow() {
  const activeChild = useActiveChild();
  const childName = activeChild?.name?.trim();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-5 py-12">

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
          style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
        >
          <LifeBuoy className="w-6 h-6" style={{ color: "var(--terracotta)" }} />
        </div>

        {/* Heading — large for panic readability */}
        <h1
          className="text-[32px] font-bold text-foreground leading-snug mb-4"
          style={{ fontFamily: "Newsreader, serif" }}
        >
          We are right here with you{childName ? ` and ${childName}` : ""}.
        </h1>

        <p className="text-[17px] text-muted-foreground leading-[1.75] mb-10 max-w-md">
          If this is your first flare, or your worst one yet, you are in the right place.
          What you are seeing is real, and there are things you can do right now — starting
          in the next hour. Take one step at a time.
        </p>

        {/* Section cards */}
        <div className="flex flex-col gap-3">
          {SECTIONS.map(({ href, icon: Icon, title, description }) => (
            <Link key={href} href={href}>
              <div className="group flex items-start gap-4 p-5 bg-card rounded-2xl border-2 border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary/10"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.08)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "var(--terracotta)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-[15px] text-foreground leading-snug"
                    style={{ fontFamily: "Newsreader, serif" }}
                  >
                    {title}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    {description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-10 opacity-60 leading-relaxed">
          Written by parents who have been through this.<br />
          You are not navigating this alone.
        </p>
      </div>
    </div>
  );
}
