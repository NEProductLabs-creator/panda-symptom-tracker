import { BookOpen } from "lucide-react";
import { Link } from "wouter";

export default function Learn() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-14 bg-background">
      <div className="w-full max-w-lg text-center space-y-6">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
        >
          <BookOpen className="w-8 h-8" style={{ color: "var(--terracotta)" }} />
        </div>

        {/* Heading */}
        <div>
          <h1
            className="text-3xl font-bold text-foreground leading-tight"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Learn
          </h1>
          <span className="inline-block mt-2 text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            Coming soon
          </span>
        </div>

        {/* Description */}
        <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
          A gentle, parent-friendly guide to understanding PANS and PANDAS — what
          they are, how flares work, what symptoms to watch for, and how to
          build an effective relationship with your care team.
        </p>

        {/* Back link */}
        <Link href="/">
          <span className="inline-block text-sm font-medium transition-colors cursor-pointer" style={{ color: "var(--terracotta)" }}>
            ← Go to Dashboard
          </span>
        </Link>
      </div>
    </div>
  );
}
