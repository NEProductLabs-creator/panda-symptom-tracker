import { useEffect } from "react";
import { AlertTriangle, Stethoscope, MessageSquare, Package } from "lucide-react";
import { track } from "@/lib/analytics";
import RightNowLayout from "./RightNowLayout";

export default function RightNowERGuide() {
  useEffect(() => {
    track("right_now_section_viewed", { section: "er-guide" });
    track("right_now_er_guide_viewed");
  }, []);

  return (
    <RightNowLayout
      title="Should we go to the ER?"
      subtitle="How to know when the emergency room is the right call — and how to navigate it when you go."
    >
      <div className="space-y-8">

        {/* Go now section */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(220, 80, 60, 0.1)" }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: "rgb(200, 60, 40)" }} />
            </div>
            <h2
              className="text-[20px] font-semibold text-foreground"
              style={{ fontFamily: "Newsreader, serif" }}
            >
              Go now if
            </h2>
          </div>

          <ul className="space-y-3">
            {[
              "Suicidal statements with intent or a plan — not just \"I want to die\" in the abstract, but a specific statement about how or when",
              "Inability to eat or drink for 24 or more hours",
              "Severe psychotic symptoms — hallucinations, complete break from reality that is not resolving",
              "Dangerous self-harm that has caused or may cause serious injury",
              "You do not feel safe, and neither does the child",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[16px] leading-[1.75] text-foreground/85">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center"
                  style={{ borderColor: "rgb(200, 60, 40)" }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "rgb(200, 60, 40)" }}
                  />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-4 p-4 bg-muted rounded-xl text-[15px] leading-[1.7] text-muted-foreground">
            If you are not sure, err toward going. It is easier to leave an ER than to
            wish you had gone sooner.
          </div>
        </section>

        {/* What to bring */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
            >
              <Package className="w-4 h-4" style={{ color: "var(--terracotta)" }} />
            </div>
            <h2
              className="text-[20px] font-semibold text-foreground"
              style={{ fontFamily: "Newsreader, serif" }}
            >
              What to bring
            </h2>
          </div>

          <ul className="space-y-2">
            {[
              "A printed symptom log, or the app open on your phone with the timeline visible",
              "A written list of recent illnesses — dates, type, and whether strep was tested",
              "Current medications with names and doses",
              "A note with the intake phrase you want to say (see below) — you may not be able to remember it in the moment",
            ].map((item) => (
              <li key={item} className="flex gap-2.5 text-[16px] leading-[1.75] text-foreground/85">
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[10px]"
                  style={{ backgroundColor: "var(--terracotta)" }}
                />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* What to say */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
            >
              <MessageSquare className="w-4 h-4" style={{ color: "var(--terracotta)" }} />
            </div>
            <h2
              className="text-[20px] font-semibold text-foreground"
              style={{ fontFamily: "Newsreader, serif" }}
            >
              What to say at intake
            </h2>
          </div>

          <div
            className="p-5 rounded-2xl border-2"
            style={{
              borderColor: "hsl(var(--primary) / 0.3)",
              backgroundColor: "hsl(var(--primary) / 0.04)",
            }}
          >
            <p
              className="text-[17px] leading-[1.8] font-medium text-foreground"
            >
              "My child had a sudden neuropsychiatric change. I am concerned about PANS or
              PANDAS, which can mimic a psychiatric emergency. Please consider an infectious
              workup including strep titers."
            </p>
          </div>

          <p className="mt-4 text-[15px] leading-[1.7] text-muted-foreground">
            Most ER teams are not trained in PANS or PANDAS. The phrase above may prompt them
            to order bloodwork — specifically ASO and Anti-DNase B — that would otherwise be
            skipped. It also documents that you raised the possibility. Bring the phrase
            written on paper if you think you may not be able to say it calmly.
          </p>
        </section>

        {/* What the ER can and cannot do */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
            >
              <Stethoscope className="w-4 h-4" style={{ color: "var(--terracotta)" }} />
            </div>
            <h2
              className="text-[20px] font-semibold text-foreground"
              style={{ fontFamily: "Newsreader, serif" }}
            >
              What to expect
            </h2>
          </div>

          <p className="text-[16px] leading-[1.75] text-foreground/85">
            ERs can rule out immediate danger, provide sedation if needed for safety, and
            order the bloodwork that may support a future PANS diagnosis. What they cannot
            do is diagnose PANS or PANDAS — that requires follow-up with a knowledgeable
            clinician. Your goal at the ER is safety and documentation, not a diagnosis.
          </p>
          <p className="mt-3 text-[16px] leading-[1.75] text-foreground/85">
            You are the expert on your child. You have been watching this happen. Advocate
            clearly, stay calm if you can, and do not leave without requesting the strep
            titers to be run if they have not already been ordered.
          </p>
        </section>
      </div>
    </RightNowLayout>
  );
}
