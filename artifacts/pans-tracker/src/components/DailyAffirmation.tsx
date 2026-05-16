import { Heart } from "lucide-react";
import { AFFIRMATIONS, getTodayAffirmationIndex } from "@/lib/affirmations";
import { useHopeBoard } from "@/hooks/useHopeBoard";
import { useToast } from "@/hooks/use-toast";

export default function DailyAffirmation() {
  const { toggleSaved, isSaved } = useHopeBoard();
  const { toast } = useToast();
  const idx = getTodayAffirmationIndex();
  const text = AFFIRMATIONS[idx];
  const saved = isSaved(idx);

  function handleHeart() {
    toggleSaved(idx);
    if (!saved) {
      toast({ title: "Saved to Hope Board", description: "Find it anytime under Hope Board." });
    }
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden px-5 py-4 flex items-start gap-3"
      style={{
        background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a40 100%)",
        border: "1.5px solid #fcd34d",
      }}
      data-testid="daily-affirmation"
    >
      {/* Sunrise glow accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top left, #fef08a30 0%, transparent 60%)",
        }}
      />

      <div className="flex-1 min-w-0 relative">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1.5">
          Affirmation of the Day
        </p>
        <p
          className="text-sm leading-relaxed text-amber-900 font-medium italic"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          "{text}"
        </p>
      </div>

      <button
        type="button"
        onClick={handleHeart}
        className={`flex-shrink-0 relative w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
          saved ? "bg-rose-100" : "bg-amber-100 hover:bg-amber-200"
        }`}
        title={saved ? "Saved to Hope Board" : "Save to Hope Board"}
        data-testid="affirmation-heart"
      >
        <Heart
          className={`w-4 h-4 transition-all ${
            saved ? "fill-rose-400 text-rose-400" : "text-amber-400"
          }`}
        />
      </button>
    </div>
  );
}
