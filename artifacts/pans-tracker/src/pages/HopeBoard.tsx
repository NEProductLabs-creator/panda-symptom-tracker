import { useState, useEffect } from "react";
import { Heart, Sparkles, X, RefreshCw } from "lucide-react";
import { AFFIRMATIONS, getTodayAffirmationIndex } from "@/lib/affirmations";
import { useHopeBoard } from "@/hooks/useHopeBoard";
import { useToast } from "@/hooks/use-toast";
import { useActiveChild } from "@/hooks/useActiveChild";
import { useChildren } from "@/hooks/useChildren";
import ChildSwitcher from "@/components/ChildSwitcher";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Recovery stories ─────────────────────────────────────────────────────────

const STORIES = [
  {
    id: "s1",
    quote:
      "Our son was 7 when it started. Within a week he could barely leave his bedroom. Two years later — after three different antibiotic protocols and finally finding an immunologist who knew what PANS was — he is in 4th grade, playing soccer, and laughing again. The road was brutal. We made it.",
    tag: "Parent of a 9-year-old, PANS since 2021",
  },
  {
    id: "s2",
    quote:
      "My daughter had rage episodes every day for eight months. She would scream for hours and then not remember any of it. After the right antibiotic protocol and working with a specialist who understood PANS, she went back to school full time. It took 14 months, but she is mostly herself again — sweet, curious, and brave.",
    tag: "Parent of a 12-year-old, in remission",
  },
  {
    id: "s3",
    quote:
      "We spent two years being told it was anxiety, OCD, bad parenting. The day we finally got the PANS diagnosis I cried for an hour — not from sadness, but from relief. It had a name. It was treatable. Our son is now in remission and doing better than before this all started. If you are in the trenches right now: there is a path through.",
    tag: "Parent of a 10-year-old, diagnosed 2022",
  },
  {
    id: "s4",
    quote:
      "I want to be honest — it was the hardest thing our family has ever done. The isolation, the disbelief from doctors, watching your child disappear and come back and disappear again. But three years out, I can tell you that children heal. Not always completely, not always quickly — but they heal. Keep going.",
    tag: "Parent of a 15-year-old, 3 years post-onset",
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HopeBoard() {
  const { savedIndices, toggleSaved, isSaved } = useHopeBoard();
  const { toast } = useToast();
  const activeChildId = useActiveChild()?.id ?? null;
  const { data: children = [] } = useChildren();
  const todayIdx = getTodayAffirmationIndex();
  const [showAll, setShowAll] = useState(false);

  // Reset to saved-only view when the active child changes.
  useEffect(() => { setShowAll(false); }, [activeChildId]);

  function handleHeart(idx: number) {
    const wasSaved = isSaved(idx);
    toggleSaved(idx);
    if (!wasSaved) {
      toast({ title: "Saved!" });
    }
  }

  const displayIndices = showAll
    ? AFFIRMATIONS.map((_, i) => i)
    : savedIndices.length > 0
    ? savedIndices
    : [];

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div
        className="rounded-3xl px-6 py-7 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #fffbeb 0%, #fef3c7 40%, #fde68a50 100%)",
          border: "1.5px solid #fcd34d",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at top center, #fef08a40 0%, transparent 65%)",
          }}
        />
        <div className="relative">
          <div className="w-12 h-12 bg-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-amber-600" />
          </div>
          <h1
            className="text-2xl font-bold text-amber-900"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Hope Board
          </h1>
          <p className="text-sm text-amber-700 mt-1.5 leading-relaxed max-w-sm mx-auto">
            The words that have kept you going, in one place. Tap the heart on any affirmation
            to save it here.
          </p>
        </div>
      </div>

      {children.length > 1 && <ChildSwitcher variant="pill" />}

      {/* Saved affirmations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-base font-bold text-amber-900"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {savedIndices.length > 0 ? "Your Saved Affirmations" : "Affirmations"}
          </h2>
          {!showAll && savedIndices.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Browse all {AFFIRMATIONS.length}
            </button>
          )}
          {showAll && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium"
            >
              Show saved only
            </button>
          )}
        </div>

        {savedIndices.length === 0 && !showAll ? (
          <div
            className="rounded-2xl border border-amber-200 bg-amber-50/50 px-5 py-8 text-center"
          >
            <Heart className="w-8 h-8 text-amber-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-800">No saved affirmations yet</p>
            <p className="text-xs text-amber-600 mt-1 leading-relaxed max-w-xs mx-auto">
              Each day on the dashboard you'll see a fresh affirmation. Tap the heart to save
              the ones that speak to you.
            </p>
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-800 underline underline-offset-2"
            >
              Browse all {AFFIRMATIONS.length} affirmations
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {(showAll ? AFFIRMATIONS : savedIndices.map((i) => AFFIRMATIONS[i])).map(
              (text, arrIdx) => {
                const realIdx = showAll ? arrIdx : savedIndices[arrIdx];
                const saved = isSaved(realIdx);
                const isToday = realIdx === todayIdx;
                return (
                  <div
                    key={realIdx}
                    className="relative rounded-xl px-5 py-4 flex items-start gap-3"
                    style={{
                      background: saved
                        ? "linear-gradient(135deg, #fffbeb, #fef3c7)"
                        : "linear-gradient(135deg, #fafaf9, #f5f5f4)",
                      border: `1.5px solid ${saved ? "#fcd34d" : "#e7e5e4"}`,
                    }}
                  >
                    {isToday && (
                      <span className="absolute top-2.5 right-10 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                        Today
                      </span>
                    )}
                    <p
                      className={`flex-1 text-sm leading-relaxed italic ${
                        saved ? "text-amber-900" : "text-stone-600"
                      }`}
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      "{text}"
                    </p>
                    <button
                      type="button"
                      onClick={() => handleHeart(realIdx)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                        saved ? "bg-rose-100 hover:bg-rose-200" : "bg-stone-100 hover:bg-amber-100"
                      }`}
                      title={saved ? "Remove from Hope Board" : "Save to Hope Board"}
                    >
                      <Heart
                        className={`w-4 h-4 transition-all ${
                          saved ? "fill-rose-400 text-rose-400" : "text-stone-400"
                        }`}
                      />
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Recovery stories */}
      <div>
        <h2
          className="text-base font-bold text-amber-900 mb-1"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Recovery Stories
        </h2>
        <p className="text-xs text-amber-700 mb-4">
          Anonymized stories from families on the other side of this. Written in their own words.
        </p>

        <div className="space-y-4">
          {STORIES.map((story) => (
            <div
              key={story.id}
              className="rounded-2xl px-5 py-4 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #fffbeb 0%, #fef9ee 100%)",
                border: "1px solid #fde68a",
              }}
            >
              <div
                className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
                style={{ background: "linear-gradient(to bottom, #f59e0b, #fbbf24)" }}
              />
              <div className="pl-2">
                <p
                  className="text-sm leading-relaxed text-amber-950 italic mb-2"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  "{story.quote}"
                </p>
                <p className="text-[11px] text-amber-600 font-medium">— {story.tag}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="mt-5 rounded-xl px-5 py-4 text-center"
          style={{
            background: "linear-gradient(135deg, #fef3c7, #fffbeb)",
            border: "1px solid #fde68a",
          }}
        >
          <p className="text-sm font-semibold text-amber-900 mb-1">
            Your story could be someone else's lifeline.
          </p>
          <p className="text-xs text-amber-700 mb-3 leading-relaxed">
            If your child is doing better, consider sharing your journey anonymously to help
            families who are still in the hardest part.
          </p>
          <a
            href="mailto:pandstracker@example.com?subject=My%20Recovery%20Story&body=I%20would%20like%20to%20share%20my%20family%27s%20story%20anonymously%20to%20help%20other%20PANS%2FPANDAS%20families."
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-amber-200 hover:bg-amber-300 transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            Add your story to help other families
          </a>
        </div>
      </div>
    </div>
  );
}
