import { useEffect } from "react";
import { ExternalLink, MapPin, Info } from "lucide-react";
import { track } from "@/lib/analytics";
import AdvocateLayout from "./AdvocateLayout";
import { Button } from "@/components/ui/button";

export default function AdvocateProviders() {
  useEffect(() => {
    track("advocate_section_viewed", { section: "providers" });
  }, []);

  return (
    <AdvocateLayout
      title="Provider directory"
      subtitle="Finding a PANS-literate clinician can meaningfully change outcomes."
    >
      <div className="space-y-6">

        {/* Main link card */}
        <div
          className="p-6 rounded-2xl border-2"
          style={{
            borderColor: "hsl(var(--primary) / 0.3)",
            backgroundColor: "hsl(var(--primary) / 0.04)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
            >
              <MapPin className="w-5 h-5" style={{ color: "var(--terracotta)" }} />
            </div>
            <div>
              <p
                className="font-semibold text-[16px] text-foreground"
                style={{ fontFamily: "Newsreader, serif" }}
              >
                PANDAS Physicians Network Directory
              </p>
              <p className="text-xs text-muted-foreground">pandasppn.org</p>
            </div>
          </div>
          <p className="text-[15px] leading-[1.7] text-foreground/80 mb-5">
            The PANDAS Physicians Network (PPN) maintains the most comprehensive public
            directory of clinicians who have self-identified as knowledgeable about PANS and
            PANDAS. The directory includes physicians, nurse practitioners, and therapists
            across the United States and internationally.
          </p>
          <a
            href="https://pandasppn.org/ppnproviders/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="gap-2" style={{ backgroundColor: "var(--terracotta)", color: "#fff" }}>
              <ExternalLink className="w-4 h-4" />
              Open provider directory
            </Button>
          </a>
        </div>

        {/* Tips for finding a provider */}
        <div className="space-y-4">
          <h2
            className="text-[17px] font-semibold text-foreground"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            What to look for in a provider
          </h2>

          {[
            {
              heading: "PANS/PANDAS experience",
              body: 'Ask directly: "Have you diagnosed and treated PANS or PANDAS before?" A yes — or an honest "I am familiar but not a specialist" — is more useful than vague reassurance.',
            },
            {
              heading: "Willingness to order titers",
              body: "Any provider willing to order ASO and Anti-DNase B titers and consider an immunological workup is a step forward, even if they are not a PANS specialist.",
            },
            {
              heading: "Specialty: immunology or neurology",
              body: "Pediatric immunologists and pediatric neurologists are often the most helpful specialists for treatment beyond antibiotics. If your pediatrician is supportive, ask for a referral.",
            },
            {
              heading: "Telehealth options",
              body: "Many PANS-literate clinicians now offer telehealth. If you are in a geographic area without local expertise, this can dramatically expand your options.",
            },
          ].map((item) => (
            <div key={item.heading} className="flex gap-3">
              <div
                className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[9px]"
                style={{ backgroundColor: "var(--terracotta)" }}
              />
              <div>
                <p className="text-[15px] font-semibold text-foreground">{item.heading}</p>
                <p className="text-[14px] leading-[1.7] text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Callout */}
        <div className="flex gap-3 p-4 bg-muted rounded-xl">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[13.5px] leading-[1.65] text-muted-foreground">
            The PPN directory is maintained by clinicians who have voluntarily listed themselves
            and does not constitute an endorsement. Always verify credentials and availability
            before scheduling.
          </p>
        </div>
      </div>
    </AdvocateLayout>
  );
}
