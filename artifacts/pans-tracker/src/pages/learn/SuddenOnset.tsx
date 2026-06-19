import { useEffect } from "react";
import { track } from "@/lib/analytics";
import LearnLayout from "./LearnLayout";

export default function LearnSuddenOnset() {
  useEffect(() => {
    track("learn_section_viewed", { section: "sudden-onset" });
  }, []);

  return (
    <LearnLayout
      title="The sudden-onset hallmark"
      subtitle="Why the speed of change matters as much as the symptoms themselves."
    >
      <div className="space-y-5 text-[15px] leading-relaxed text-foreground/90">
        <p>
          The hallmark of PANS and PANDAS is not simply the severity of the symptoms — it is
          the speed of onset. Clinicians and researchers look for an abrupt, dramatic change:
          something that happened overnight, or within the span of a few days. This is not a
          gradual slide.
        </p>

        <p>
          In typical OCD or anxiety disorders, symptoms usually develop slowly. Parents notice
          their child becoming a little more anxious over weeks or months. There is rarely a
          single identifiable moment when everything changed. Therapists and psychiatrists are
          trained to expect this gradual arc.
        </p>

        <p>
          With PANS and PANDAS, parents describe it differently. <em>"She was fine on Tuesday.
          By Friday she couldn't leave the doorway without touching it three times."</em> Or:
          <em>"He woke up Saturday morning screaming about germs and hasn't been the same
          since."</em> These descriptions — specific, sudden, tied to a moment in time — are
          clinically significant. The ability to name the week, sometimes the day, is part of
          the diagnostic picture.
        </p>

        <p>
          The onset often follows or coincides with an illness. Many families look back and
          connect a strep infection, flu, ear infection, or other illness to the week everything
          changed. The infection is not always obvious — some children are asymptomatic strep
          carriers who test positive without ever feeling sick. This is why a negative throat
          culture does not rule out strep as a trigger.
        </p>

        <p>
          One more important detail: the course is often <strong>episodic</strong>. Symptoms
          may improve significantly, then flare again after another illness — sometimes within
          days of a new infection. Some families live through cycles of "much better" and "much
          worse" that seem to track with illnesses in the household. This relapsing-remitting
          pattern is itself part of the clinical picture, and tracking it over time is one of
          the most useful things you can do right now.
        </p>
      </div>
    </LearnLayout>
  );
}
