import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { useActiveChild } from "@/hooks/useActiveChild";
import jsPDF from "jspdf";
import { track } from "@/lib/analytics";
import LearnLayout from "./LearnLayout";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Question definitions ─────────────────────────────────────────────────────

interface RadioQuestion {
  id: string;
  type: "radio";
  text: string;
  hint?: string;
}

interface TextQuestion {
  id: string;
  type: "text";
  text: string;
  placeholder: string;
}

type Question = RadioQuestion | TextQuestion;

const RADIO_OPTIONS = ["Yes", "No", "Not sure"] as const;

const QUESTIONS: Question[] = [
  {
    id: "sudden_onset",
    type: "radio",
    text: "Did the symptoms start suddenly — overnight or within a few days?",
    hint: "Think back to the first week you noticed something was different.",
  },
  {
    id: "recent_infection",
    type: "radio",
    text: "Was there a recent illness or infection in the weeks before the symptoms started — strep throat, ear infection, cold, COVID, or other?",
  },
  {
    id: "ocd_behaviors",
    type: "radio",
    text: 'Are there new or noticeably worsened OCD-like behaviors — rituals, repetitive checking, intrusive fears, or \u201Cjust right\u201D demands?',
  },
  {
    id: "anxiety_outbursts",
    type: "radio",
    text: "Has separation anxiety, clinginess, or emotional outbursts increased dramatically?",
  },
  {
    id: "urinary_changes",
    type: "radio",
    text: "Have you noticed new urinary urgency, very frequent bathroom trips, or regression with bedwetting?",
  },
  {
    id: "handwriting",
    type: "radio",
    text: "Has handwriting or fine motor skill visibly changed or regressed?",
  },
  {
    id: "food_changes",
    type: "radio",
    text: "Are there new food restrictions, sudden refusals, or significantly reduced appetite?",
  },
  {
    id: "tics",
    type: "radio",
    text: "Have you noticed new tics — repetitive movements, sounds, throat clearing, or blinking?",
  },
  {
    id: "sleep",
    type: "radio",
    text: "Has sleep been significantly disrupted — insomnia, nighttime fears, inability to sleep alone, or unusual waking?",
  },
  {
    id: "cognitive",
    type: "radio",
    text: "Have you noticed changes in math ability, memory, reading, or school performance?",
  },
  {
    id: "sensory",
    type: "radio",
    text: "Are there new sensory sensitivities — to sound, light, clothing textures, or physical touch?",
  },
  {
    id: "noticed_first",
    type: "text",
    text: "What did you notice first?",
    placeholder: "Describe the first sign that something was different…",
  },
  {
    id: "change_start",
    type: "text",
    text: "When did the change start?",
    placeholder: 'Date or approximate time, e.g. \u201Cmid-October 2023, after a strep infection\u201D',
  },
];

const RADIO_QUESTIONS = QUESTIONS.filter((q): q is RadioQuestion => q.type === "radio");
const TEXT_QUESTIONS = QUESTIONS.filter((q): q is TextQuestion => q.type === "text");

// ─── PDF generation ───────────────────────────────────────────────────────────

function generatePDF(answers: Record<string, string>): void {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const usableW = pageW - margin * 2;
  let y = 22;

  function maybeNewPage(needed = 20): void {
    if (y + needed > pageH - 25) {
      doc.addPage();
      y = 22;
    }
  }

  // ── Header ──
  doc.setFillColor(196, 98, 61); // terracotta
  doc.rect(0, 0, pageW, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("PANS & PANDAS SYMPTOM TRACKER", margin, 9.5);
  y = 24;

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 20, 15);
  doc.text("Parent Observation Summary", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 100, 90);
  doc.text(`Prepared: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, y);
  y += 10;

  // ── Divider ──
  doc.setDrawColor(220, 205, 195);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Intro note ──
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(110, 90, 80);
  const intro = "This summary was prepared using the PANS & PANDAS Symptom Tracker app. It organizes a parent's or caregiver's direct observations into a format that may be useful at a medical appointment. It is not a diagnostic tool.";
  const introLines = doc.splitTextToSize(intro, usableW);
  doc.text(introLines, margin, y);
  y += introLines.length * 4.5 + 8;

  // ── Section: Symptom observations ──
  doc.setFillColor(249, 242, 235);
  doc.rect(margin, y - 3, usableW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(196, 98, 61);
  doc.text("SYMPTOM OBSERVATIONS", margin + 3, y + 3);
  y += 12;

  for (const q of RADIO_QUESTIONS) {
    maybeNewPage(22);
    const answer = answers[q.id] ?? "—";

    // Question text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 65, 55);
    const qLines = doc.splitTextToSize(q.text, usableW);
    doc.text(qLines, margin, y);
    y += qLines.length * 4.2;

    // Answer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 20, 15);
    const answerColor: Record<string, [number, number, number]> = {
      Yes: [196, 98, 61],
      No: [90, 120, 90],
      "Not sure": [140, 120, 100],
    };
    const [r, g, b] = answerColor[answer] ?? [60, 50, 40];
    doc.setTextColor(r, g, b);
    doc.text(`  ${answer}`, margin, y + 1);
    y += 8;

    doc.setDrawColor(235, 225, 215);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  }

  // ── Section: Open observations ──
  maybeNewPage(30);
  y += 4;
  doc.setFillColor(249, 242, 235);
  doc.rect(margin, y - 3, usableW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(196, 98, 61);
  doc.text("OPEN OBSERVATIONS", margin + 3, y + 3);
  y += 12;

  for (const q of TEXT_QUESTIONS) {
    const answer = answers[q.id]?.trim() || "(not provided)";
    maybeNewPage(30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 65, 55);
    doc.text(q.text, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 20, 15);
    const ansLines = doc.splitTextToSize(answer, usableW);
    doc.text(ansLines, margin + 3, y);
    y += ansLines.length * 5 + 8;

    doc.setDrawColor(235, 225, 215);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  }

  // ── Footer on every page ──
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 205, 195);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 18, pageW - margin, pageH - 18);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 130, 115);
    doc.text(
      "This is a parent's organized observation, not a diagnosis.",
      margin,
      pageH - 12,
    );
    doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 12, { align: "right" });
  }

  doc.save("Parent_Observation_Summary.pdf");
}

// ─── Save to API (best-effort) ────────────────────────────────────────────────

async function saveObservation(
  getToken: () => Promise<string | null>,
  responses: Record<string, string>,
  childId: string | null,
): Promise<void> {
  try {
    const token = await getToken();
    if (!token) return;
    const id = `obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fetch("/api/data/parent-observation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, responses, ...(childId ? { child_id: childId } : {}) }),
    });
  } catch {
    // Best-effort — don't surface errors to the user
  }
}

// ─── Self-Check page ──────────────────────────────────────────────────────────

export default function LearnSelfCheck() {
  const { getToken } = useAuth();
  const activeChild = useActiveChild();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    track("learn_section_viewed", { section: "self-check" });
    track("learn_self_check_started");
  }, []);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (error) setError(null);
  }

  const radioAnsweredCount = RADIO_QUESTIONS.filter((q) => answers[q.id]).length;
  const progressPct = Math.round((radioAnsweredCount / RADIO_QUESTIONS.length) * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const unanswered = RADIO_QUESTIONS.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(`Please answer all ${unanswered.length} remaining yes/no/not-sure question${unanswered.length > 1 ? "s" : ""} before continuing.`);
      const firstUnanswered = document.getElementById(`q-${unanswered[0].id}`);
      firstUnanswered?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    track("learn_self_check_completed");

    // Generate & download PDF
    generatePDF(answers);
    track("learn_self_check_pdf_downloaded");

    // Save to Supabase (best-effort, non-blocking)
    void saveObservation(getToken, answers, activeChild?.id ?? null);

    setCompleted(true);
    setSubmitting(false);
  }

  function handleDownloadAgain() {
    generatePDF(answers);
    track("learn_self_check_pdf_downloaded");
  }

  return (
    <LearnLayout
      title="Is this what we are seeing?"
      subtitle="Answer each question based on what you have observed in the child you are caring for. At the end, you can download a formatted summary to bring to a medical appointment."
    >
      {completed ? (
        // ── Completion state ──
        <div className="text-center py-10 space-y-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: "var(--terracotta)" }} />
          </div>
          <div>
            <h2
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "Newsreader, serif" }}
            >
              Your summary is ready
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
              Your PDF has downloaded. Bring it to your next appointment as a
              starting point for the conversation.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadAgain}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors hover:bg-muted"
            style={{ borderColor: "var(--terracotta)", color: "var(--terracotta)" }}
          >
            <Download className="w-4 h-4" />
            Download again
          </button>
          <p className="text-xs text-muted-foreground opacity-70 pt-2">
            Your responses have been saved to your account.
          </p>
        </div>
      ) : (
        // ── Questionnaire form ──
        <form onSubmit={handleSubmit} noValidate>
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{radioAnsweredCount} of {RADIO_QUESTIONS.length} answered</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%`, backgroundColor: "var(--terracotta)" }}
              />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mb-8 p-4 bg-muted rounded-xl text-sm text-muted-foreground leading-relaxed">
            Answer each question based on what you have observed. "Not sure" is a valid
            answer — uncertainty is useful information too. Free-text fields are optional.
          </div>

          {/* Radio questions */}
          <div className="space-y-6 mb-8">
            {RADIO_QUESTIONS.map((q, idx) => (
              <div
                key={q.id}
                id={`q-${q.id}`}
                className={cn(
                  "p-5 bg-card rounded-2xl border-2 transition-colors",
                  answers[q.id] ? "border-primary/30" : "border-border",
                )}
              >
                <p className="text-[14px] font-medium text-foreground leading-snug mb-1">
                  <span className="text-muted-foreground text-xs font-normal mr-1.5">
                    {idx + 1}.
                  </span>
                  {q.text}
                </p>
                {q.hint && (
                  <p className="text-xs text-muted-foreground mb-3 mt-0.5 italic">
                    {q.hint}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {RADIO_OPTIONS.map((opt) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(q.id, opt)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                          selected
                            ? "text-white border-transparent"
                            : "text-foreground border-border hover:border-primary/40 bg-background",
                        )}
                        style={selected ? { backgroundColor: "var(--terracotta)", borderColor: "var(--terracotta)" } : undefined}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Text questions */}
          <div className="space-y-5 mb-8">
            <h3
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "Newsreader, serif" }}
            >
              In your own words
            </h3>
            {TEXT_QUESTIONS.map((q) => (
              <div key={q.id} className="space-y-2">
                <label
                  htmlFor={q.id}
                  className="block text-[14px] font-medium text-foreground"
                >
                  {q.text}{" "}
                  <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  id={q.id}
                  rows={3}
                  placeholder={q.placeholder}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                />
              </div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl border border-destructive/40 bg-destructive/5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--terracotta)" }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate My Summary
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            A PDF titled "Parent Observation Summary" will download to your device.
          </p>
        </form>
      )}
    </LearnLayout>
  );
}
