import { useEffect } from "react";
import { track } from "@/lib/analytics";
import LearnLayout from "./LearnLayout";
import { AlertCircle } from "lucide-react";

export default function LearnCriteria() {
  useEffect(() => {
    track("learn_section_viewed", { section: "criteria" });
  }, []);

  return (
    <LearnLayout
      title="Diagnostic criteria"
      subtitle="The clinical frameworks that clinicians use — translated into language families can understand."
    >
      {/* Disclaimer */}
      <div className="flex gap-3 p-4 rounded-xl border-2 mb-8" style={{ borderColor: "hsl(var(--primary) / 0.3)", backgroundColor: "hsl(var(--primary) / 0.05)" }}>
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--terracotta)" }} />
        <p className="text-sm text-foreground/80 leading-relaxed">
          <strong>This is for orientation only.</strong> Diagnosis is made by a clinician who
          has evaluated the child, reviewed history, and ordered appropriate tests. These
          criteria are tools for clinicians — not a checklist for self-diagnosis.
        </p>
      </div>

      <div className="space-y-10 text-[15px] leading-relaxed text-foreground/90">

        {/* PANDAS criteria */}
        <section>
          <h2
            className="text-xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            PANDAS criteria (Swedo et al., 1998)
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Developed by Dr. Susan Swedo and colleagues at the National Institutes of Health.
          </p>
          <ol className="space-y-3 list-none">
            {[
              {
                label: "OCD or a tic disorder",
                detail:
                  "The child meets criteria for obsessive-compulsive disorder or a tic disorder (such as Tourette syndrome).",
              },
              {
                label: "Pediatric onset",
                detail:
                  "Symptoms begin in childhood, typically before puberty.",
              },
              {
                label: "Abrupt or episodic course",
                detail:
                  "Symptoms appear suddenly or follow a relapsing-remitting pattern — noticeably better and noticeably worse at distinct points in time.",
              },
              {
                label: "Temporal association with Group A Strep",
                detail:
                  "Symptom onset or exacerbations are linked in time to a documented or suspected strep infection.",
              },
              {
                label: "Neurological findings",
                detail:
                  "Presence of choreiform movements (small, involuntary, dance-like movements, especially of the fingers) or motoric hyperactivity.",
              },
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.12)", color: "var(--terracotta)" }}
                >
                  {i + 1}
                </span>
                <div>
                  <span className="font-semibold">{item.label}. </span>
                  <span className="text-foreground/80">{item.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* PANS criteria */}
        <section>
          <h2
            className="text-xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            PANS criteria (PANS Research Consortium, 2012)
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            A broader framework that does not require a strep-specific trigger.
          </p>
          <ol className="space-y-3 list-none">
            {[
              {
                label: "Abrupt, dramatic onset",
                detail:
                  "Sudden, dramatic onset of OCD or severely restricted food intake. Parents and caregivers can typically identify when the change happened.",
              },
              {
                label: "Concurrent neuropsychiatric symptoms",
                detail:
                  "At least two of the following additional symptom categories are also present: anxiety; emotional lability or depression; irritability or aggression; behavioral regression; deterioration in school performance or cognitive ability; sensory or motor abnormalities; somatic symptoms including sleep disturbances or urinary changes.",
              },
              {
                label: "Not explained by another condition",
                detail:
                  "Symptoms are not better explained by a known neurological or medical disorder.",
              },
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.12)", color: "var(--terracotta)" }}
                >
                  {i + 1}
                </span>
                <div>
                  <span className="font-semibold">{item.label}. </span>
                  <span className="text-foreground/80">{item.detail}</span>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-muted-foreground">
            Note: the PANS framework intentionally does not specify a trigger, because research
            has documented symptom onset following many types of infections — not only strep.
          </p>
        </section>
      </div>
    </LearnLayout>
  );
}
