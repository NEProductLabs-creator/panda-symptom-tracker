import { useEffect } from "react";
import { track } from "@/lib/analytics";
import LearnLayout from "./LearnLayout";
import { ExternalLink } from "lucide-react";
import { openExternal } from "@/lib/platform";

export default function LearnFindProvider() {
  useEffect(() => {
    track("learn_section_viewed", { section: "find-provider" });
  }, []);

  return (
    <LearnLayout
      title="Find a PANS-literate provider"
      subtitle="Most families need to advocate to find care. Here is what to look for and where to start."
    >
      <div className="space-y-8 text-[15px] leading-relaxed text-foreground/90">

        {/* Why it's hard */}
        <section>
          <h2
            className="text-lg font-semibold text-foreground mb-3"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            Why finding care is so difficult
          </h2>
          <p>
            PANS and PANDAS are not yet part of standard medical school curricula. Most
            pediatricians, emergency physicians, and even many psychiatrists and neurologists
            have had little or no training in these conditions. Families frequently hear "I've
            never seen this," or "I don't believe this is real," or receive a psychiatric
            referral that doesn't account for the possible immunological component.
          </p>
          <p className="mt-3">
            This means the work of finding care often falls on parents and caregivers —
            sometimes before they have even confirmed the diagnosis. You are not imagining the
            difficulty. It is real, and you are not alone.
          </p>
        </section>

        {/* What to look for */}
        <section>
          <h2
            className="text-lg font-semibold text-foreground mb-3"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            What to look for in a provider
          </h2>
          <ul className="space-y-2">
            {[
              "Familiarity with PANS and PANDAS as clinical entities — even if they express some skepticism, willingness to learn and engage is a good sign",
              "Willingness to order strep titers (ASO and Anti-DNase B) alongside a neuropsychiatric evaluation",
              "Experience with autoimmune or neuroinflammatory conditions in children",
              "A collaborative approach — willing to work with you and other providers rather than dismissing your concerns outright",
              "Openness to treating the infection alongside behavioral and psychiatric symptoms, rather than one without the other",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[9px]"
                  style={{ backgroundColor: "var(--terracotta)" }}
                />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Specialty types */}
        <section>
          <h2
            className="text-lg font-semibold text-foreground mb-3"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            Which specialties to consider
          </h2>
          <p>
            There is no single "correct" specialty for PANS/PANDAS — it falls across fields.
            Families have found help through integrative or functional medicine pediatricians,
            pediatric rheumatologists, immunologists, neurologists, and some psychiatrists.
            Increasingly, clinicians who trained or were mentored in PANS/PANDAS practices are
            working in general pediatrics.
          </p>
          <p className="mt-3">
            Telehealth has made it significantly more accessible to reach PANS-literate providers
            who may be located outside your area. Many families' primary PANS provider is a
            telehealth relationship.
          </p>
        </section>

        {/* PPN Directory */}
        <section>
          <h2
            className="text-lg font-semibold text-foreground mb-3"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            PANDAS Physicians Network directory
          </h2>
          <p>
            The PANDAS Physicians Network (PPN) maintains the most widely used directory of
            clinicians who are knowledgeable about PANS and PANDAS. It is the best single
            starting point for finding a provider.
          </p>
          <a
            href="https://pandasppn.org/ppnproviders/"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-5 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--terracotta)" }}
            onClick={(e) => { e.preventDefault(); void openExternal('https://pandasppn.org/ppnproviders/'); }}
          >
            Open PPN Provider Directory
            <ExternalLink className="w-4 h-4" />
          </a>
        </section>

        {/* Practical tips */}
        <section>
          <h2
            className="text-lg font-semibold text-foreground mb-3"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            Practical tips for your first appointment
          </h2>
          <ul className="space-y-2">
            {[
              "Bring a written timeline of when symptoms started, what they look like, and whether they coincided with an illness — specificity is your strongest tool",
              "Bring strep test results if you have them, or request titers at the appointment",
              "If you have been keeping a symptom log, print it or bring it on your phone",
              "Ask specifically about PANS and PANDAS by name — some providers are familiar but won't raise it unless you do",
              "It is OK to see more than one clinician or to seek a second opinion if you feel dismissed",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[9px]"
                  style={{ backgroundColor: "var(--terracotta)" }}
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </LearnLayout>
  );
}
