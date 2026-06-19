import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { track } from "@/lib/analytics";
import AdvocateLayout from "./AdvocateLayout";
import { Button } from "@/components/ui/button";

interface Script {
  key: string;
  title: string;
  audience: string;
  body: string;
}

const SCRIPTS: Script[] = [
  {
    key: "dismiss_concerns",
    title: "If your pediatrician dismisses your concerns",
    audience: "Your child's pediatrician",
    body: `I understand that PANS and PANDAS may not be something you see often, and I appreciate you listening. I want to make sure I document today that I am raising this concern, because the change I have witnessed in my child was sudden — it happened within days, not weeks or months. Sudden-onset neuropsychiatric symptoms in a child are the hallmark of this condition, and I would like to rule it out before we attribute what we are seeing to a primary psychiatric cause.

I am asking for two specific things: a throat culture or rapid strep test today, and a blood draw for ASO and Anti-DNase B titers. Both are standard tests. The titers will give us information about recent strep exposure even if the throat culture is negative.

Will you order strep titers and a throat culture today?`,
  },
  {
    key: "neurology_referral",
    title: "Requesting a neurology or immunology referral",
    audience: "Your child's pediatrician or current provider",
    body: `We have now been managing my child's symptoms for [X weeks/months], and I would like to request a referral to a specialist who has experience with PANS and PANDAS. I am specifically interested in a referral to a pediatric neurologist or a pediatric immunologist.

My reasoning: the symptom pattern — sudden onset, OCD-like behaviors, emotional dysregulation, and the association with illness — is consistent with a neuroinflammatory process, and I want to make sure we are addressing any potential autoimmune component rather than treating only the behavioral presentation.

I believe a specialist evaluation is the appropriate next step. If you are not aware of a specialist in our area, PANDAS Physicians Network at pandasppn.org maintains a directory of PANS-literate clinicians. I am happy to provide any documentation you need to support this referral.`,
  },
  {
    key: "school_accommodations",
    title: "Asking the school for accommodations during a flare",
    audience: "Your child's teacher, counselor, or school administrator",
    body: `My child is currently experiencing a flare of their medical condition — PANS, which stands for Pediatric Acute-onset Neuropsychiatric Syndrome. During a flare, the brain is inflamed due to an abnormal immune response, and this affects their ability to regulate emotions, maintain focus, and manage anxiety. This is a neurological state, not a behavioral choice.

I am writing to request temporary accommodations while we work with our medical team to stabilize this flare:

• Extended time on assignments and tests
• Permission to leave the classroom briefly when overwhelmed, without penalty
• Reduced homework load or the option to make work up after the flare resolves
• A designated quiet space if my child needs to regulate
• Flexibility around attendance if symptoms make school attendance temporarily impossible

I expect this flare to be temporary. My child's baseline, when medically stable, is [describe child's typical academic and social functioning]. I am available to talk by phone or email any time, and I am happy to provide documentation from our medical provider.

Thank you for your care and understanding.`,
  },
  {
    key: "family_disbelief",
    title: "Talking to family members who do not believe PANS is real",
    audience: "Family members — grandparents, siblings, extended family",
    body: `I know this is hard to understand, and I know that what you are seeing might look like a parenting problem or a behavioral issue. I want to share what we have learned, because your understanding makes a real difference to us.

PANS is recognized by the National Institute of Mental Health. It stands for Pediatric Acute-onset Neuropsychiatric Syndrome. It happens when a child's immune system — often triggered by an infection — produces antibodies that attack part of the brain responsible for behavior and emotion. The result is a dramatic, sudden change in the child: obsessive thoughts, anxiety, rage episodes, or regression. This is not something my child is choosing, and it is not something we caused.

When [child's name] is in a flare, the most helpful thing you can do is:
• Stay calm and speak quietly
• Avoid power struggles — they make things worse
• Trust that we are doing everything we can medically

We are not looking for advice about discipline or diet. We are looking for love and patience while we navigate a hard medical situation. Having your support — even just your willingness to believe us — means more than I can say.`,
  },
];

function ScriptCard({ script }: { script: Script }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(script.body);
    setCopied(true);
    track("advocate_script_copied", { script_key: script.key });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-2 border-border rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2
            className="text-[17px] font-semibold text-foreground leading-snug"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            {script.title}
          </h2>
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={copy}
            className="flex-shrink-0 gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          For: {script.audience}
        </p>
        <pre className="text-[13.5px] leading-[1.75] text-foreground/80 whitespace-pre-wrap font-sans">
          {script.body}
        </pre>
      </div>
    </div>
  );
}

export default function AdvocateScripts() {
  useEffect(() => {
    track("advocate_section_viewed", { section: "scripts" });
  }, []);

  return (
    <AdvocateLayout
      title="Scripts for hard conversations"
      subtitle="Copy-ready language for the moments when you need to advocate clearly and don't have the words."
    >
      <div className="space-y-5">
        {SCRIPTS.map((s) => (
          <ScriptCard key={s.key} script={s} />
        ))}
      </div>
    </AdvocateLayout>
  );
}
