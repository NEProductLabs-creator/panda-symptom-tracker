import { useEffect } from "react";
import { track } from "@/lib/analytics";
import LearnLayout from "./LearnLayout";

const TERMS = [
  {
    term: "PANS",
    definition:
      "Pediatric Acute-onset Neuropsychiatric Syndrome. An umbrella clinical description for children who experience a sudden, dramatic onset of OCD-like behaviors or severely restricted food intake, along with other neuropsychiatric symptoms, without a better neurological or medical explanation.",
  },
  {
    term: "PANDAS",
    definition:
      "Pediatric Autoimmune Neuropsychiatric Disorders Associated with Streptococcal Infections. A subset of PANS in which Group A Streptococcal (strep) infection is the identified trigger. Every PANDAS case meets PANS criteria, but PANS has a broader range of potential triggers.",
  },
  {
    term: "ASO titer",
    definition:
      "Antistreptolysin O titer. A blood test that measures antibodies the immune system produces against a toxin made by Group A Strep bacteria. An elevated ASO titer indicates a recent or ongoing strep exposure. It is often ordered together with Anti-DNase B for a more complete picture.",
  },
  {
    term: "Anti-DNase B",
    definition:
      "Antibody to DNase B (deoxyribonuclease B), another enzyme produced by Group A Strep. Anti-DNase B levels can remain elevated longer after a strep infection than ASO titers, making it a useful companion test. Together, ASO and Anti-DNase B give a broader window into recent strep activity.",
  },
  {
    term: "IVIG",
    definition:
      "Intravenous Immunoglobulin. A treatment that delivers a concentrated preparation of antibodies from donor blood, administered intravenously over several hours. In PANS and PANDAS, IVIG is thought to help modulate an overactive or misdirected immune response. It is typically considered for moderate-to-severe cases that have not responded to other treatment.",
  },
  {
    term: "Plasmapheresis",
    definition:
      "Also called therapeutic plasma exchange. A procedure in which blood is drawn, the plasma is separated and removed (along with the harmful antibodies it carries), and the blood cells are returned to the body with replacement fluids. Used in severe or IVIG-resistant PANS/PANDAS cases to rapidly reduce circulating antibodies.",
  },
  {
    term: "Autoimmune encephalitis",
    definition:
      "Inflammation of the brain caused by the immune system attacking brain tissue, neurons, or neuronal receptors. PANS and PANDAS are considered to exist on the autoimmune encephalitis spectrum. Anti-NMDA receptor encephalitis is a related and better-recognized condition.",
  },
  {
    term: "Cunningham Panel",
    definition:
      "A commercial laboratory test (offered by Moleculera Labs) that measures levels of antibodies targeting specific proteins in the basal ganglia — the region of the brain affected in PANS/PANDAS. Some clinicians use it to support a diagnosis. It is not universally accepted as definitive and is not covered by most insurance.",
  },
  {
    term: "PPN",
    definition:
      "PANDAS Physicians Network. A nonprofit organization that maintains a directory of clinicians knowledgeable about PANS and PANDAS, supports research, and provides resources for families and providers. Their provider directory is one of the most practical tools for families trying to find a diagnosis.",
  },
  {
    term: "Swedo criteria",
    definition:
      "Diagnostic criteria for PANDAS developed by Dr. Susan Swedo and colleagues at the National Institutes of Health (NIH) in 1998. These criteria — requiring OCD or tics, pediatric onset, abrupt or episodic course, temporal association with strep, and neurological findings — formed the historical foundation of the PANDAS diagnosis and continue to be widely referenced.",
  },
];

export default function LearnGlossary() {
  useEffect(() => {
    track("learn_section_viewed", { section: "glossary" });
  }, []);

  return (
    <LearnLayout
      title="Glossary"
      subtitle="Key terms that come up in appointments, research papers, and parent communities — explained in plain language."
    >
      <dl className="space-y-6">
        {TERMS.map(({ term, definition }) => (
          <div
            key={term}
            className="p-5 bg-card rounded-2xl border border-border"
          >
            <dt
              className="font-semibold text-[15px] text-foreground mb-1.5"
              style={{ fontFamily: "Newsreader, serif" }}
            >
              {term}
            </dt>
            <dd className="text-[14px] leading-relaxed text-foreground/80">
              {definition}
            </dd>
          </div>
        ))}
      </dl>
    </LearnLayout>
  );
}
