import { useEffect } from "react";
import { track } from "@/lib/analytics";
import RightNowLayout from "./RightNowLayout";

/** Soft mist callout — cool contrast against the warm earth palette. */
function MistQuote({ children }: { children: string }) {
  return (
    <div
      className="my-7 pl-5 py-4 border-l-4 rounded-r-xl"
      style={{
        backgroundColor: "rgba(186, 205, 220, 0.15)",
        borderColor: "rgba(148, 175, 200, 0.55)",
      }}
    >
      <p
        className="text-[17px] leading-[1.8] italic"
        style={{ color: "rgb(71, 90, 110)" }}
      >
        {children}
      </p>
    </div>
  );
}

export default function RightNowReframe() {
  useEffect(() => {
    track("right_now_section_viewed", { section: "reframe" });
  }, []);

  return (
    <RightNowLayout
      title="It's the PANDAS, not your child"
      subtitle="Understanding what is happening in the brain during a flare."
    >
      <div
        className="space-y-5 text-[17px] leading-[1.8]"
        style={{ color: "hsl(var(--foreground) / 0.88)" }}
      >
        <p>
          What you are watching is not your child. That sentence will feel strange the first
          time you read it — and then it might feel like the most important thing anyone has
          ever said to you.
        </p>

        <p>
          During a PANS or PANDAS flare, the brain is inflamed. Antibodies — the same ones
          the immune system sent to fight an infection — have crossed into the brain and are
          attacking the basal ganglia, the region that governs movement, emotional regulation,
          and habit. The compulsions, the terror, the rages: these are the sounds of a brain
          fighting an immune storm. They are symptoms of a physical illness, the same way a
          fever is a symptom of infection.
        </p>

        <MistQuote>
          "The child you know is still inside. They are not enjoying this. They are often just
          as frightened as you are."
        </MistQuote>

        <p>
          One of the hardest moments for parents is when the child they love seems completely
          unreachable. They may be repeating a ritual they cannot stop. They may be screaming
          something that makes no logical sense. They may push you away and beg you to stay at
          the same time. This is the illness talking. The child underneath it is still there —
          still capable of love, still the person you have always known.
        </p>

        <p>
          When you are in the middle of it, your nervous system is also activated. You may
          feel fear, grief, rage of your own, or a flat, dissociated calm. All of that is
          a normal response to witnessing your child in this state. It does not mean you are
          failing. It means you are human.
        </p>

        <MistQuote>
          "You do not have to fix this moment. You only have to survive it with them."
        </MistQuote>

        <p>
          When you know what is happening, something shifts. You can respond to the illness
          without responding to the behavior. You can say — out loud, to your child, and to
          yourself — "This is the PANDAS. This is not you. We are going to get through this."
          Research suggests that naming the illness, acknowledging it as a physical process,
          can reduce shame in both the child and the parent. The diagnosis does not define the
          child. The diagnosis explains a temporary state that will not last forever.
        </p>
      </div>
    </RightNowLayout>
  );
}
