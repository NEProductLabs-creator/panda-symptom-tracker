import { Link } from "wouter";
import { FileText, Megaphone, ChevronRight } from "lucide-react";

// ─── Reports landing — used as the mobile "Reports" tab destination ───────────
// Surfaces both Doctor Ready (/export) and Advocate (/advocate) in one place.

const REPORT_LINKS = [
  {
    href: "/export",
    icon: FileText,
    label: "Doctor Ready",
    description: "Export data, generate print summaries, and prepare reports for appointments.",
  },
  {
    href: "/advocate",
    icon: Megaphone,
    label: "Advocate",
    description: "Tools and language to communicate with schools, insurers, and care providers.",
  },
];

export default function Reports() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Reports &amp; Advocacy
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Everything you need for doctor visits and advocating for your child.
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {REPORT_LINKS.map(({ href, icon: Icon, label, description }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-4 p-5 bg-card rounded-2xl border-2 border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary/10"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.08)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "var(--terracotta)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-[14px] text-foreground leading-tight"
                    style={{ fontFamily: "Fraunces, serif" }}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
