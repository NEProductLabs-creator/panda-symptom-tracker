import { Link } from "wouter";
import {
  BookOpen,
  Zap,
  ClipboardList,
  AlertTriangle,
  BookMarked,
  MapPin,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  {
    href: "/learn/overview",
    icon: BookOpen,
    title: "What is PANS and PANDAS?",
    description:
      "What these conditions are, why they matter, and why parents often know before doctors do.",
  },
  {
    href: "/learn/sudden-onset",
    icon: Zap,
    title: "The sudden-onset hallmark",
    description:
      "The overnight change that parents describe as their first signal something was wrong.",
  },
  {
    href: "/learn/criteria",
    icon: ClipboardList,
    title: "Diagnostic criteria",
    description:
      "The clinical frameworks that clinicians use — explained in plain language.",
  },
  {
    href: "/learn/red-flags",
    icon: AlertTriangle,
    title: "Red flag symptoms",
    description:
      "Signs to watch for and document before your first appointment.",
  },
  {
    href: "/learn/glossary",
    icon: BookMarked,
    title: "Glossary",
    description:
      "Key terms — from ASO titers to IVIG — explained without jargon.",
  },
  {
    href: "/learn/find-provider",
    icon: MapPin,
    title: "Find a PANS-literate provider",
    description:
      "How to find a clinician who takes PANS and PANDAS seriously.",
  },
  {
    href: "https://pandassupport.com/screener",
    icon: ClipboardCheck,
    title: "Is it PANDAS? Take the screener",
    description:
      "A free 2-minute screener based on PPN diagnostic criteria. Opens on PANDAS Support — no account needed.",
    external: true,
  },
];

// ─── Hub landing page ─────────────────────────────────────────────────────────

export default function Learn() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="mb-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
            style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
          >
            <BookOpen className="w-6 h-6" style={{ color: "var(--terracotta)" }} />
          </div>
          <h1
            className="text-4xl font-bold text-foreground leading-tight"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            Learn
          </h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-xl">
            For families who are trying to understand what might be happening.
            Everything here is written in plain language, parent to parent.
          </p>
        </div>

        {/* Section cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map(({ href, icon: Icon, title, description, external }) => {
            const card = (
              <div className="group flex items-start gap-4 p-5 bg-card rounded-2xl border-2 border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer h-full">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary/10"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.08)" }}
                >
                  <Icon
                    className="w-5 h-5 transition-colors"
                    style={{ color: "var(--terracotta)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-[14px] text-foreground leading-snug"
                    style={{ fontFamily: "Newsreader, serif" }}
                  >
                    {title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
              </div>
            );
            if (external) {
              return (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer">
                  {card}
                </a>
              );
            }
            return <Link key={href} href={href}>{card}</Link>;
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-10 opacity-70">
          Content is written for orientation only. Diagnosis is made by a clinician.
        </p>
      </div>
    </div>
  );
}
