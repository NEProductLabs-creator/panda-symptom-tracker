import { useEffect } from "react";
import { track } from "@/lib/analytics";
import LearnLayout from "./LearnLayout";

export default function LearnOverview() {
  useEffect(() => {
    track("learn_section_viewed", { section: "overview" });
  }, []);

  return (
    <LearnLayout
      title="What is PANS and PANDAS?"
      subtitle="Plain language for parents who are still figuring out if this is what they are dealing with."
    >
      <div className="space-y-5 text-[15px] leading-relaxed text-foreground/90">
        <p>
          If you are reading this, something has changed in the child you are caring for — and it
          probably happened fast. You may have been told it is "just anxiety" or "just a
          phase." You may have left appointments feeling dismissed, holding a referral to a
          behavioral therapist while knowing in your bones that something physical is also
          happening. You are not wrong to question.
        </p>

        <p>
          <strong>PANS</strong> stands for <strong>Pediatric Acute-onset Neuropsychiatric
          Syndrome</strong>. It is a clinical description for children who experience a sudden,
          dramatic onset of obsessive-compulsive behaviors or severely restricted food intake,
          along with other neuropsychiatric symptoms, that cannot be explained by a known
          neurological or medical disorder.
        </p>

        <p>
          <strong>PANDAS</strong> stands for <strong>Pediatric Autoimmune Neuropsychiatric
          Disorders Associated with Streptococcal Infections</strong>. PANDAS is a subset of
          PANS — meaning every PANDAS case is also a PANS case, but not every PANS case
          involves strep. In PANDAS, the trigger is Group A Streptococcal (strep) infection,
          the same bacteria responsible for strep throat.
        </p>

        <p>
          The working theory behind both conditions is that the immune system — responding to
          an infection or other trigger — produces antibodies that mistakenly attack the brain,
          specifically a region called the basal ganglia that helps regulate movement, behavior,
          and mood. This is sometimes called molecular mimicry: the antibodies that should be
          targeting the pathogen inadvertently cross-react with brain tissue.
        </p>

        <p>
          Families who understand what they may be dealing with are better equipped to document
          symptoms, communicate with providers, and advocate when the standard "wait and see"
          response is not enough. You are in the right place.
        </p>
      </div>
    </LearnLayout>
  );
}
