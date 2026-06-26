import { useEffect, useState } from "react";
import { Link } from "wouter";
import { SCREENER_RESULT_KEY, type ScreenerResult } from "./ScreenerPage";

export default function ScreenerResults() {
  const [result, setResult] = useState<ScreenerResult | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SCREENER_RESULT_KEY);
      if (raw) setResult(JSON.parse(raw) as ScreenerResult);
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Slim public nav */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
          >
            <span
              className="text-base font-semibold leading-none"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              PANS &amp; PANDAS
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5 hidden sm:inline">
              Companion
            </span>
          </Link>
          <Link
            href="/sign-up"
            className="text-sm text-primary hover:underline underline-offset-4"
          >
            Create free account
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-10 space-y-8">
        {result ? (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Screener results
              </p>
              <h1
                className="text-3xl font-semibold text-foreground"
                style={{ fontFamily: "Fraunces, Georgia, serif" }}
              >
                {result.resultBucket === "strong_match" && "Symptoms are consistent with PANS/PANDAS"}
                {result.resultBucket === "partial_match" && "Some symptoms align with PANS/PANDAS"}
                {result.resultBucket === "no_match" && "Symptoms don't clearly match PANS/PANDAS"}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This is a preliminary screening tool, not a medical diagnosis. Please share
                these results with your child's doctor.
              </p>
            </div>

            {/* Raw answers — placeholder until results page is built */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Your answers (raw)</h2>
              <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                {JSON.stringify(result.answers, null, 2)}
              </pre>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Create free account to track symptoms
              </Link>
              <Link
                href="/screener"
                className="inline-flex h-11 items-center rounded-xl border border-border bg-background px-5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Retake screener
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-4 text-center py-20">
            <p className="text-muted-foreground">No screener results found.</p>
            <Link
              href="/screener"
              className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Take the screener
            </Link>
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 mt-16">
        <div className="max-w-2xl mx-auto px-5 py-6 flex flex-wrap gap-4 items-center justify-between text-xs text-muted-foreground">
          <p>
            This screener is for informational purposes only and is not a
            medical diagnosis.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
