import { Link, useRoute } from "wouter";
import { useScreenerResults } from "@/hooks/useScreenerResults";
import { useActiveChild } from "@/hooks/useActiveChild";
import ScreenerResultsPage from "@/components/ScreenerResultsPage";
import type { ResultBucket } from "@/lib/types";

export default function AppScreenerResult() {
  const [, params] = useRoute("/screener/results/:id");
  const id = params?.id;
  const activeChild = useActiveChild();
  const { data: results = [], isLoading } = useScreenerResults(null);

  const result = results.find((r) => r.id === id);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading result…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Result not found.</p>
        <Link href="/screener">
          <span
            className="text-sm font-medium underline underline-offset-2 cursor-pointer"
            style={{ color: "var(--terracotta)" }}
          >
            Take the screener
          </span>
        </Link>
      </div>
    );
  }

  return (
    <ScreenerResultsPage
      answers={result.answers}
      resultBucket={result.result_bucket as ResultBucket}
      mode="authenticated"
      childName={activeChild?.name}
    />
  );
}
