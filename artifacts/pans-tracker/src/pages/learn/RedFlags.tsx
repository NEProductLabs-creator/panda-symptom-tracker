import { useEffect } from "react";
import { track } from "@/lib/analytics";
import LearnLayout from "./LearnLayout";

const RED_FLAG_GROUPS = [
  {
    heading: "Behavioral and emotional",
    flags: [
      "Sudden severe OCD or compulsive rituals — checking, counting, repeating phrases, arranging objects",
      "Intense new separation anxiety or extreme fear of being alone",
      "Rage episodes or aggression that are dramatically out of proportion to the situation",
      "Emotional lability — cycling rapidly between sadness, fear, and anger within minutes",
      "Personality change that feels like someone else is inhabiting your child",
    ],
  },
  {
    heading: "Physical and functional",
    flags: [
      "New urinary urgency, very frequent bathroom trips, or regression to bedwetting",
      "Handwriting that has noticeably changed, become smaller, or regressed",
      "New food restriction, sudden refusal of foods they previously accepted, or severely reduced appetite",
      "New motor or vocal tics — repetitive movements, blinking, throat clearing, sniffing, or sounds",
    ],
  },
  {
    heading: "Cognitive and sensory",
    flags: [
      "Math ability, reading, or memory that has noticeably declined",
      "New sensory sensitivities — to loud sounds, bright lights, clothing textures, or physical touch",
      "Difficulty organizing thoughts, completing sentences, or following instructions they previously managed easily",
    ],
  },
  {
    heading: "Sleep",
    flags: [
      "Insomnia or significant difficulty falling or staying asleep",
      "Nighttime fears or terror that are new or dramatically worse",
      "Inability to sleep alone after months or years of doing so",
      "Unusual waking in the night with distress",
    ],
  },
];

export default function LearnRedFlags() {
  useEffect(() => {
    track("learn_section_viewed", { section: "red-flags" });
  }, []);

  return (
    <LearnLayout
      title="Red flag symptoms"
      subtitle="Signs to watch for and document before your first appointment. The more specifically you can describe when each appeared, the more useful your observations will be."
    >
      <div className="space-y-8">
        {RED_FLAG_GROUPS.map(({ heading, flags }) => (
          <section key={heading}>
            <h2
              className="text-lg font-semibold text-foreground mb-3"
              style={{ fontFamily: "Newsreader, serif" }}
            >
              {heading}
            </h2>
            <ul className="space-y-2">
              {flags.map((flag) => (
                <li key={flag} className="flex gap-2.5 text-[15px] leading-relaxed text-foreground/85">
                  <span
                    className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[9px]"
                    style={{ backgroundColor: "var(--terracotta)" }}
                  />
                  {flag}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="mt-6 p-4 bg-muted rounded-xl text-sm text-muted-foreground leading-relaxed">
          <strong>A note on documentation.</strong> If you are seeing several of these signs,
          start keeping a simple log — date, what you observed, and whether anything else was
          happening (illness, stress, a change in routine). The Daily Log in this app is built
          for exactly that. Specificity matters when you are talking to a clinician who may not
          yet be familiar with PANS or PANDAS.
        </div>
      </div>
    </LearnLayout>
  );
}
