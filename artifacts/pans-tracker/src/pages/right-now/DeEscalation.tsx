import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { track } from "@/lib/analytics";
import RightNowLayout from "./RightNowLayout";
import { cn } from "@/lib/utils";

interface TipItem {
  heading: string;
  body: string;
}

interface SectionProps {
  title: string;
  tips: TipItem[];
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, tips, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-2 border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <span
          className="text-[17px] font-semibold text-foreground"
          style={{ fontFamily: "Newsreader, serif" }}
        >
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border">
          {tips.map((tip) => (
            <div key={tip.heading}>
              <p className="text-[15px] font-semibold text-foreground mb-0.5">
                {tip.heading}
              </p>
              <p className="text-[16px] leading-[1.75] text-foreground/80">
                {tip.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const OCD_TIPS: TipItem[] = [
  {
    heading: "Do not argue with the compulsion.",
    body: "Engaging with the ritual — reasoning, arguing, asking why — almost always makes it worse. The brain caught in a compulsive loop cannot be talked out of it in the moment. Let the moment pass when you can.",
  },
  {
    heading: "Lower the stakes in the environment.",
    body: "Reduce pressure in the room. Lower your voice to just above a whisper. Remove other people from the space if possible. Simplify — fewer choices, fewer demands, fewer words.",
  },
  {
    heading: "Name the PANDAS out loud.",
    body: "Say to the child, calmly: \"This is the PANDAS making you feel this way. You don't have to fight it right now.\" This can help the child locate the fear as something separate from themselves — something that is happening to them, not something they are.",
  },
  {
    heading: "Reduce sensory input.",
    body: "Turn down lights. Reduce noise — turn off the TV, close the window. Offer a weighted blanket or familiar comfort object if the child accepts it. Sensory overload amplifies the spiral.",
  },
];

const RAGE_TIPS: TipItem[] = [
  {
    heading: "Safety first.",
    body: "Ensure the child cannot injure themselves or others. Create space. Remove objects that could be thrown or used to cause harm. Your physical safety matters too.",
  },
  {
    heading: "Low stimulation, low words.",
    body: "Do not give instructions. Do not explain. Do not ask questions. Your calm, quiet presence is the most useful thing in the room. Too many words become noise that amplifies the episode.",
  },
  {
    heading: "Do not match volume.",
    body: "This is the hardest one. Whatever you are feeling — and you may be feeling a lot — a quieter voice is more effective than a louder one. Every decibel you add extends the episode.",
  },
  {
    heading: "Wait for the wave to pass.",
    body: "Rage episodes in PANS and PANDAS are neurological, not behavioral. They end. They always end. The recovery afterward can be unexpectedly tender — the child may be frightened by what happened, may not remember parts of it, and may need closeness. Be ready for that.",
  },
];

export default function RightNowDeEscalation() {
  useEffect(() => {
    track("right_now_section_viewed", { section: "de-escalation" });
  }, []);

  return (
    <RightNowLayout
      title="De-escalation in the moment"
      subtitle="When a spiral or rage episode is happening right now. Calm and grounded."
    >
      <div className="space-y-4">
        <CollapsibleSection title="OCD spirals" tips={OCD_TIPS} defaultOpen />
        <CollapsibleSection title="Rage episodes" tips={RAGE_TIPS} defaultOpen />
      </div>

      <div className="mt-8 p-5 bg-muted rounded-2xl">
        <p className="text-[15px] leading-[1.75] text-muted-foreground">
          <strong className="text-foreground">After the episode.</strong> When things are
          calm again, resist the urge to debrief immediately. Give the child time to
          recover — their nervous system has just been through something enormous. Some
          children have no memory of what happened. Others feel deep shame. Warmth and
          quiet normalcy are usually more helpful than processing or discussion.
        </p>
      </div>
    </RightNowLayout>
  );
}
