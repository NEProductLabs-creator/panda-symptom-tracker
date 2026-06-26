/**
 * ScreenerResultsPage — shared results UI for both anonymous and authenticated modes.
 *
 * Props are passed in by the thin wrapper pages (ScreenerResults.tsx and
 * AppScreenerResult.tsx). This component never touches the network; all data
 * arrives via props. The child name/DOB fields in the anonymous expander are
 * kept entirely in local state and never sent anywhere.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  TriangleAlert,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { track } from "@/lib/analytics";
import type { ScreenerAnswers, ResultBucket } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREENER_DRAFT_KEY = "screener_draft";

const YES_NO: Record<string, string> = {
  yes: "Yes",
  no: "No",
  not_sure: "Not sure",
  "": "Not answered",
};

const SECTION_NAMES = ["Onset", "Core symptoms", "Other symptoms", "Recent illness", "Other diagnoses"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CriterionItem {
  label: string;
  matched: boolean;
  detail: string;
}

interface Props {
  answers: ScreenerAnswers;
  resultBucket: ResultBucket;
  mode: "anonymous" | "authenticated";
  /** Used in footer copy ("saved to {childName}'s profile") */
  childName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeCriteria(a: ScreenerAnswers, bucket: ResultBucket): CriterionItem[] {
  const suddenYes = a.suddenOnset === "yes";
  const hasCoreSymptom = a.ocdSymptoms === "yes" || a.foodRestriction === "yes";
  const accompanyingCount = a.accompanyingSymptoms.length;
  const noAlternative = a.alternativeDiagnosis !== "yes";

  if (bucket === "strong_match") {
    return [
      {
        label: "Sudden, dramatic onset",
        matched: true,
        detail:
          "Symptoms appeared quickly — a defining feature doctors look for when considering PANS/PANDAS.",
      },
      {
        label: "Core psychiatric or behavioral symptom present",
        matched: true,
        detail:
          "OCD-like behaviors or severe food restriction are among the primary criteria, and at least one is present here.",
      },
      {
        label: "Two or more accompanying neurological symptoms",
        matched: true,
        detail: `${accompanyingCount} additional symptoms were reported (such as anxiety, tics, or sleep disruption), which supports the pattern.`,
      },
      {
        label: "No better explanation identified",
        matched: true,
        detail: "The sudden change isn't explained by another known condition, which is consistent with PANS/PANDAS.",
      },
    ];
  }

  // partial_match: compute dynamically
  return [
    {
      label: "Sudden onset",
      matched: suddenYes,
      detail: suddenYes
        ? "Symptoms appeared suddenly — a key distinguishing feature."
        : a.suddenOnset === "not_sure"
          ? "Onset timing was uncertain. Sudden onset (within 24–72 hours) is a core criterion."
          : "Symptoms appeared gradually. Sudden onset is one of the criteria that wasn't clearly met.",
    },
    {
      label: "Core psychiatric or behavioral symptom",
      matched: hasCoreSymptom,
      detail: hasCoreSymptom
        ? "At least one core symptom (OCD-like behaviors or food restriction) is present."
        : "Neither OCD-like behaviors nor food restriction were reported — these are required criteria.",
    },
    {
      label: "Multiple accompanying neurological symptoms",
      matched: accompanyingCount >= 2,
      detail:
        accompanyingCount >= 2
          ? `${accompanyingCount} accompanying symptoms were reported, which fits the pattern.`
          : accompanyingCount === 1
            ? "Only one additional symptom was reported; two or more are typically expected."
            : "No additional neurological symptoms were reported.",
    },
    {
      label: "No better diagnosis identified",
      matched: noAlternative,
      detail: noAlternative
        ? "No alternative diagnosis was indicated that would better explain the sudden change."
        : "Another diagnosis may explain these symptoms — your doctor can help sort this out.",
    },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-lg font-semibold text-foreground"
      style={{ fontFamily: "Fraunces, Georgia, serif" }}
    >
      {children}
    </h2>
  );
}

function AnswerRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "Not answered") return null;
  return (
    <div className="flex gap-3 text-sm py-1.5 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground min-w-[10rem] shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function AnswerGroup({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="text-xs font-medium underline-offset-2 hover:underline transition-colors"
          style={{ color: "var(--terracotta)" }}
        >
          Edit
        </button>
      </div>
      <div className="px-4 py-3 space-y-0">{children}</div>
    </div>
  );
}

function CriterionRow({ item }: { item: CriterionItem }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
      <div className="mt-0.5 flex-shrink-0">
        {item.matched ? (
          <CheckCircle2 className="w-4 h-4" style={{ color: "var(--terracotta)" }} />
        ) : (
          <X className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
      </div>
    </div>
  );
}

function NextStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
        style={{ backgroundColor: "var(--terracotta)" }}
      >
        {n}
      </span>
      <span className="text-sm text-foreground leading-relaxed">{children}</span>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScreenerResultsPage({ answers, resultBucket, mode, childName }: Props) {
  const [, navigate] = useLocation();

  // Anonymous-only: child name + DOB expander for PDF
  const [pdfExpanded, setPdfExpanded] = useState(false);
  const [pdfChildName, setPdfChildName] = useState("");
  const [pdfDob, setPdfDob] = useState("");

  useEffect(() => {
    track("results_page_viewed", { result_bucket: resultBucket, mode });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleEdit(step: number) {
    track("edit_section_clicked", { section: SECTION_NAMES[step], mode });
    // Pre-fill wizard draft so the user's answers are restored at the chosen step
    try {
      sessionStorage.setItem(SCREENER_DRAFT_KEY, JSON.stringify(answers));
    } catch {}
    const dest = mode === "anonymous" ? `/screener?step=${step}` : `/screener?step=${step}`;
    navigate(dest);
  }

  function handlePdfDownload() {
    track("pdf_download_clicked", {
      result_bucket: resultBucket,
      mode,
      included_name: pdfChildName.trim().length > 0,
      included_dob: pdfDob.length > 0,
    });
    // PDF generation comes in the next prompt — log the payload for the generator
    // eslint-disable-next-line no-console
    console.log("[PDF payload]", {
      resultBucket,
      answers,
      childName: pdfChildName.trim() || null,
      dateOfBirth: pdfDob || null,
    });
  }

  const criteria = resultBucket !== "no_match" ? computeCriteria(answers, resultBucket) : null;

  const isAuthenticated = mode === "authenticated";
  const appPath = (path: string) => (isAuthenticated ? path : "/sign-up");

  // ── Title / subtitle by bucket ─────────────────────────────────────────────
  const copy = {
    strong_match: {
      title: "Your answers match the pattern doctors look for in PANS or PANDAS.",
      subtitle:
        "We strongly recommend bringing this summary to your child's doctor. If your pediatrician is not familiar with PANS or PANDAS, the PPN practitioner directory can help you find one who is.",
    },
    partial_match: {
      title: "Some features match, others don't.",
      subtitle:
        "Worth a conversation with your pediatrician, especially if symptoms get worse.",
    },
    no_match: {
      title: "These symptoms don't fit the typical PANS/PANDAS picture.",
      subtitle:
        "That doesn't mean nothing is wrong. If you're worried, talk to your pediatrician.",
    },
  }[resultBucket];

  // ── "What to do next" items ────────────────────────────────────────────────
  const nextSteps: { text: React.ReactNode }[] =
    resultBucket === "strong_match"
      ? [
          { text: "Download the PDF summary and bring it to your child's next appointment." },
          { text: "If you don't have an appointment scheduled, contact your pediatrician this week." },
          {
            text: (
              <>
                Find a PANS/PANDAS-aware doctor in the{" "}
                <a
                  href="https://www.pandasppn.org/practitioners"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("find_specialist_clicked")}
                  className="underline underline-offset-2 font-medium"
                  style={{ color: "var(--terracotta)" }}
                >
                  PPN practitioner directory
                </a>
                .
              </>
            ),
          },
          {
            text: (
              <>
                Track daily symptoms in the app so your doctor sees a timeline.{" "}
                <Link
                  href={appPath("/log")}
                  className="underline underline-offset-2 font-medium"
                  style={{ color: "var(--terracotta)" }}
                >
                  {isAuthenticated ? "Go to daily log →" : "Create free account →"}
                </Link>
              </>
            ),
          },
          {
            text: (
              <>
                Visit the Care Hub for what to expect and questions to ask.{" "}
                <Link
                  href={appPath("/learn")}
                  className="underline underline-offset-2 font-medium"
                  style={{ color: "var(--terracotta)" }}
                >
                  {isAuthenticated ? "Open Care Hub →" : "Create free account →"}
                </Link>
              </>
            ),
          },
        ]
      : resultBucket === "partial_match"
        ? [
            { text: "Download the PDF summary and keep it for reference." },
            { text: "Watch for new symptoms or a worsening picture over the coming weeks." },
            { text: "If you're concerned, schedule a visit with your pediatrician to discuss." },
            {
              text: (
                <>
                  Track daily symptoms in the app to build a clearer picture.{" "}
                  <Link
                    href={appPath("/log")}
                    className="underline underline-offset-2 font-medium"
                    style={{ color: "var(--terracotta)" }}
                  >
                    {isAuthenticated ? "Go to daily log →" : "Create free account →"}
                  </Link>
                </>
              ),
            },
          ]
        : [
            {
              text: (
                <>
                  Explore other resources in the Care Hub.{" "}
                  <Link
                    href={appPath("/learn")}
                    className="underline underline-offset-2 font-medium"
                    style={{ color: "var(--terracotta)" }}
                  >
                    {isAuthenticated ? "Open Care Hub →" : "Create free account →"}
                  </Link>
                </>
              ),
            },
            { text: "If you're still worried, talk to your pediatrician." },
          ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Back / retake link at top */}
      <button
        type="button"
        onClick={() => {
          track("screener_retaken", { from: "results_top" });
          navigate("/screener");
        }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retake screener
      </button>

      {/* 1. Persistent warning banner */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3 border border-yellow-300 bg-yellow-50 text-yellow-900">
        <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-600" />
        <p className="text-sm leading-snug">
          <strong className="font-semibold">This is a screening tool, not a medical diagnosis.</strong>{" "}
          Only a licensed healthcare provider can diagnose PANS or PANDAS.
        </p>
      </div>

      {/* 2. Title + subtitle */}
      <div className="space-y-2">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--terracotta)" }}
        >
          {resultBucket === "strong_match"
            ? "Strong match"
            : resultBucket === "partial_match"
              ? "Partial match"
              : "Low match"}
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold text-foreground leading-tight"
          style={{ fontFamily: "Fraunces, Georgia, serif" }}
        >
          {copy.title}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">{copy.subtitle}</p>
      </div>

      {/* 3. What you told us */}
      <div className="space-y-4">
        <SectionHeading>What you told us</SectionHeading>

        <AnswerGroup title="Onset" step={0} onEdit={handleEdit}>
          <AnswerRow
            label="Age at onset"
            value={answers.ageAtOnset ? `${answers.ageAtOnset} years old` : ""}
          />
          <AnswerRow label="Sudden onset" value={YES_NO[answers.suddenOnset]} />
          <AnswerRow
            label="Symptom start date"
            value={answers.symptomStartDate || "Not provided"}
          />
        </AnswerGroup>

        <AnswerGroup title="Core symptoms" step={1} onEdit={handleEdit}>
          <AnswerRow label="OCD-like behaviors" value={YES_NO[answers.ocdSymptoms]} />
          {answers.ocdDescription && (
            <AnswerRow label="Description" value={answers.ocdDescription} />
          )}
          <AnswerRow label="Food restriction or refusal" value={YES_NO[answers.foodRestriction]} />
          {answers.foodDescription && (
            <AnswerRow label="Description" value={answers.foodDescription} />
          )}
        </AnswerGroup>

        <AnswerGroup title="Other symptoms" step={2} onEdit={handleEdit}>
          {answers.accompanyingSymptoms.length > 0 ? (
            <ul className="space-y-1">
              {answers.accompanyingSymptoms.map((s) => (
                <li key={s} className="text-sm text-foreground py-1 flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "var(--terracotta)" }}
                  />
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-1">None reported.</p>
          )}
        </AnswerGroup>

        <AnswerGroup title="Recent illness" step={3} onEdit={handleEdit}>
          {answers.illnesses.length > 0 ? (
            <div className="pb-2">
              <ul className="space-y-1">
                {answers.illnesses.map((i) => (
                  <li key={i} className="text-sm text-foreground py-0.5 flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "var(--terracotta)" }}
                    />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="pb-1">
              <p className="text-sm text-muted-foreground py-1">No recent illness selected.</p>
            </div>
          )}
          {answers.otherIllnessDescription && (
            <AnswerRow label="Other details" value={answers.otherIllnessDescription} />
          )}
          <AnswerRow label="Household members ill" value={YES_NO[answers.householdSick]} />
        </AnswerGroup>

        <AnswerGroup title="Other diagnoses" step={4} onEdit={handleEdit}>
          <AnswerRow
            label="Alternative diagnosis exists"
            value={YES_NO[answers.alternativeDiagnosis]}
          />
          {answers.alternativeDiagnosisDescription && (
            <AnswerRow label="Details" value={answers.alternativeDiagnosisDescription} />
          )}
        </AnswerGroup>
      </div>

      {/* 4. Criteria analysis — strong_match or partial_match only */}
      {criteria && criteria.length > 0 && (
        <div className="space-y-4">
          <SectionHeading>
            {resultBucket === "strong_match"
              ? "Why this matches"
              : "What matched and what didn't"}
          </SectionHeading>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border/30">
              {criteria.map((item) => (
                <div key={item.label} className="px-4">
                  <CriterionRow item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. What to do next */}
      <div className="space-y-4">
        <SectionHeading>What to do next</SectionHeading>
        <ol className="space-y-4">
          {nextSteps.map((step, i) => (
            <NextStep key={i} n={i + 1}>
              {step.text}
            </NextStep>
          ))}
        </ol>
      </div>

      {/* 6. Download PDF CTA — with optional child info expander (anonymous only) */}
      <div className="space-y-4">
        {mode === "anonymous" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setPdfExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>Add child's name and date of birth to the PDF</span>
              {pdfExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {pdfExpanded && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="pdf-child-name">
                    Child's first name (optional)
                  </label>
                  <input
                    id="pdf-child-name"
                    type="text"
                    value={pdfChildName}
                    onChange={(e) => setPdfChildName(e.target.value)}
                    placeholder="First name"
                    autoComplete="off"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="pdf-dob">
                    Date of birth (optional)
                  </label>
                  <input
                    id="pdf-dob"
                    type="date"
                    value={pdfDob}
                    onChange={(e) => setPdfDob(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This stays on your device. We don&apos;t receive or store this information.
                </p>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handlePdfDownload}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: "var(--terracotta)" }}
        >
          <Download className="w-4 h-4" />
          Download PDF for your doctor
        </button>
      </div>

      {/* 7. Anonymous sign-up card */}
      {mode === "anonymous" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            Save this to your child's profile so you can track symptoms over time and update this
            screening as things change. Free, takes 30 seconds.
          </p>
          <Link
            href="/sign-up"
            onClick={() => track("signup_cta_clicked_from_results")}
            className="flex w-full items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            Save and track over time
          </Link>
        </div>
      )}

      {/* 7b. Secondary CTAs */}
      <div className="flex flex-wrap gap-3">
        <a
          href="https://www.pandasppn.org/practitioners"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("find_specialist_clicked")}
          className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          Find a PANS/PANDAS specialist
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          type="button"
          onClick={() => {
            track("screener_retaken", { from: "results_bottom" });
            navigate("/screener");
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retake screener
        </button>
      </div>

      {/* 8. Footer line */}
      <p className="text-xs text-muted-foreground text-center px-4 pb-4 leading-relaxed">
        {isAuthenticated
          ? `You can retake this screener anytime as symptoms change.${childName ? ` Your answers are saved to ${childName}'s profile.` : " Your answers are saved to your child's profile."}`
          : "You can retake this screener anytime. Your answers are not stored on our servers."}
      </p>
    </div>
  );
}
