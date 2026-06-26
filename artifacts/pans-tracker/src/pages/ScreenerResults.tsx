import { useEffect, useState } from "react";
import { Link } from "wouter";
import { SCREENER_RESULT_KEY, type ScreenerResult } from "./ScreenerPage";
import ScreenerResultsPage from "@/components/ScreenerResultsPage";

export default function ScreenerResults() {
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SCREENER_RESULT_KEY);
      if (raw) setResult(JSON.parse(raw) as ScreenerResult);
    } catch {}
    setLoaded(true);
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

      <main>
        {!loaded ? null : result ? (
          <ScreenerResultsPage
            answers={result.answers}
            resultBucket={result.resultBucket}
            mode="anonymous"
          />
        ) : (
          <div className="max-w-2xl mx-auto px-5 py-20 text-center space-y-4">
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

      <footer className="border-t border-border/40 mt-8">
        <div className="max-w-2xl mx-auto px-5 py-6 flex flex-wrap gap-4 items-center justify-between text-xs text-muted-foreground">
          <p>This screener is for informational purposes only and is not a medical diagnosis.</p>
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
