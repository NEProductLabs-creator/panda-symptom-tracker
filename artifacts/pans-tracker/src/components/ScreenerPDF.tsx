// ANONYMOUS PDF: This module runs entirely in the browser. The
// childName and childDob props, when set via the anonymous results
// page expander, must not be transmitted to the server or included
// in any analytics event payload. Verify in DevTools Network tab
// that downloading the PDF produces zero outbound requests
// containing these values.

import jsPDF from "jspdf";
import type { ScreenerAnswers, ResultBucket } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScreenerPDFProps {
  answers: ScreenerAnswers;
  resultBucket: ResultBucket;
  mode: "anonymous" | "authenticated";
  /** First name only. When set via anonymous expander, never sent anywhere. */
  childName?: string;
  /** ISO date string (YYYY-MM-DD). Never sent anywhere for anonymous mode. */
  childDob?: string;
  /** Authenticated mode only — recent symptom tracking summary */
  recentTracking?: {
    avgSeverity: number;
    severeDays: number;
    topCategories: string[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOMPANYING_SYMPTOMS = [
  "Anxiety (new or sharply worsened)",
  "Emotional lability or depression",
  "Irritability, aggression, or oppositional behavior",
  "Behavioral or developmental regression (acting younger)",
  "School performance dropped suddenly",
  "Sensory issues (sound, light, touch sensitivity) or motor changes",
  "Sleep disturbance",
  "Urinary frequency or bedwetting (new)",
  "Handwriting changes",
  "Tics (motor or vocal)",
];

const BUCKET_LABEL: Record<ResultBucket, string> = {
  strong_match: "Strong Match",
  partial_match: "Partial Match",
  no_match: "No Match",
};

const BUCKET_COLOR: Record<ResultBucket, [number, number, number]> = {
  strong_match: [152, 68, 35],
  partial_match: [160, 115, 25],
  no_match: [80, 100, 140],
};

const YES_NO: Record<string, string> = {
  yes: "Yes",
  no: "No",
  not_sure: "Not sure",
  "": "Not answered",
};

const ONSET_LABEL: Record<string, string> = {
  yes: "Sudden (within a few days)",
  no: "Gradual",
  not_sure: "Unclear",
  "": "Not answered",
};

// Colors
const TERRACOTTA: [number, number, number] = [152, 68, 35];
const HEADER_BG: [number, number, number] = [50, 40, 32];
const SECTION_BG: [number, number, number] = [245, 238, 231];
const TEXT_DARK: [number, number, number] = [40, 35, 30];
const TEXT_MID: [number, number, number] = [100, 90, 82];
const TEXT_LIGHT: [number, number, number] = [155, 145, 138];
const WHITE: [number, number, number] = [255, 255, 255];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const M = 15; // left/right margin mm

function pw(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth();
}

function ph(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

/** Usable text width */
function tw(doc: jsPDF): number {
  return pw(doc) - M * 2;
}

/** Add a new page if we don't have `needed` mm left before the footer. */
function guard(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > ph(doc) - 22) {
    doc.addPage();
    return 18;
  }
  return y;
}

function setFont(doc: jsPDF, weight: "normal" | "bold" | "italic" = "normal", size = 9): void {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
}

function setColor(doc: jsPDF, rgb: [number, number, number]): void {
  doc.setTextColor(...rgb);
}

/** Draw a section header bar with left accent and label. Returns new y. */
function drawSection(doc: jsPDF, title: string, y: number): number {
  const pageW = pw(doc);
  doc.setFillColor(...SECTION_BG);
  doc.rect(M, y, pageW - M * 2, 7, "F");
  doc.setFillColor(...TERRACOTTA);
  doc.rect(M, y, 2.5, 7, "F");
  setFont(doc, "bold", 8);
  setColor(doc, TERRACOTTA);
  doc.text(title.toUpperCase(), M + 5, y + 4.9);
  return y + 9.5;
}

/** Draw a label: value row. Returns new y. */
function drawField(doc: jsPDF, label: string, value: string, y: number, labelW = 62): number {
  const textW = tw(doc) - labelW;
  setFont(doc, "bold", 8.5);
  setColor(doc, TEXT_MID);
  doc.text(label, M, y);

  setFont(doc, "normal", 8.5);
  setColor(doc, TEXT_DARK);
  const lines = doc.splitTextToSize(value || "—", textW);
  doc.text(lines, M + labelW, y);
  const lineH = 4.3;
  return y + Math.max(lines.length * lineH, 5.5);
}

/** Draw a checkbox row. Returns new y. */
function drawCheckbox(doc: jsPDF, label: string, checked: boolean, y: number, indent = 0): number {
  const boxX = M + indent;
  const boxSize = 3.2;
  const textX = boxX + boxSize + 2.5;
  const textW = tw(doc) - indent - boxSize - 4;

  setFont(doc, "normal", 8.5);
  doc.setDrawColor(130, 118, 108);
  doc.setLineWidth(0.3);
  doc.rect(boxX, y - boxSize + 0.4, boxSize, boxSize);

  if (checked) {
    setFont(doc, "bold", 7);
    setColor(doc, TERRACOTTA);
    doc.text("X", boxX + 0.6, y);
    setFont(doc, "normal", 8.5);
  }

  setColor(doc, checked ? TEXT_DARK : TEXT_LIGHT);
  const lines = doc.splitTextToSize(label, textW);
  doc.text(lines, textX, y);
  return y + lines.length * 4.5;
}

/** Draw a plain bullet. Returns new y. */
function drawBullet(doc: jsPDF, text: string, y: number, indent = 0): number {
  const textX = M + indent + 4;
  const textW = tw(doc) - indent - 4;
  setFont(doc, "normal", 8.5);
  setColor(doc, TEXT_DARK);
  doc.text("•", M + indent, y);
  const lines = doc.splitTextToSize(text, textW);
  doc.text(lines, textX, y);
  return y + lines.length * 4.5;
}

/** Draw a thin horizontal rule. */
function drawRule(doc: jsPDF, y: number): void {
  doc.setDrawColor(...SECTION_BG);
  doc.setLineWidth(0.4);
  doc.line(M, y, pw(doc) - M, y);
}

/** Format an ISO date string nicely. */
function fmtDate(iso: string): string {
  if (!iso) return "Not provided";
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

/** Compute approximate weeks since a date. */
function weeksAgo(iso: string): string {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso + "T12:00:00").getTime();
    const weeks = Math.round(diff / (7 * 24 * 3600 * 1000));
    if (weeks <= 0) return "recently";
    if (weeks === 1) return "approximately 1 week ago";
    return `approximately ${weeks} weeks ago`;
  } catch {
    return "";
  }
}

/** Draw footer reference block on all pages. */
function drawFooters(doc: jsPDF): void {
  const total = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const pageH = ph(doc);
    const pageW = pw(doc);

    // Footer separator
    doc.setDrawColor(...TERRACOTTA);
    doc.setLineWidth(0.3);
    doc.line(M, pageH - 20, pageW - M, pageH - 20);

    if (i === total) {
      // Reference block on last page
      setFont(doc, "bold", 7);
      setColor(doc, TERRACOTTA);
      doc.text("REFERENCE", M, pageH - 17);

      setFont(doc, "normal", 7);
      setColor(doc, TEXT_MID);
      doc.text("PPN Diagnostic Flowchart: pandasppn.org/flowchart", M, pageH - 13.5);
      doc.text("PPN Practitioner Directory: pandasppn.org/practitioners", M, pageH - 10.5);

      setFont(doc, "italic", 6.5);
      setColor(doc, TEXT_LIGHT);
      doc.text(
        "This summary was generated from a parent's responses to a screening questionnaire. It is not a diagnosis. Clinical evaluation is required.",
        M,
        pageH - 7.5,
        { maxWidth: pageW - M * 2 },
      );
    } else {
      setFont(doc, "normal", 7);
      setColor(doc, TEXT_LIGHT);
      doc.text(`Page ${i} of ${total}`, pageW - M, pageH - 14, { align: "right" });
    }
  }
}

// ─── Main PDF function ────────────────────────────────────────────────────────

export function generateScreenerPDF(props: ScreenerPDFProps): void {
  const { answers, resultBucket, mode, childName, childDob, recentTracking } = props;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = pw(doc);
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const todayIso = new Date().toISOString().split("T")[0];
  const bucketColor = BUCKET_COLOR[resultBucket];

  // ── HEADER BAND ──────────────────────────────────────────────────────────
  const HEADER_H = 38;
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, pageW, HEADER_H, "F");

  // Top-right app name
  setFont(doc, "normal", 7);
  setColor(doc, [180, 165, 150]);
  doc.text("PANS & PANDAS Companion", pageW - M, 9, { align: "right" });

  // Main title
  setFont(doc, "bold", 15);
  setColor(doc, WHITE);
  doc.text("PANS/PANDAS Parent Screening Summary", M, 16);

  // Sub-lines
  setFont(doc, "normal", 8);
  setColor(doc, [200, 188, 178]);
  doc.text(`Generated ${today} via PANS/PANDAS Companion`, M, 22);
  doc.text("Based on PANDAS Physicians Network (PPN) diagnostic criteria", M, 27);

  // Result badge (bottom-right of header)
  const BADGE_W = 40;
  const BADGE_H = 8;
  const BADGE_X = pageW - M - BADGE_W;
  const BADGE_Y = HEADER_H - BADGE_H - 3;
  doc.setFillColor(...bucketColor);
  doc.roundedRect(BADGE_X, BADGE_Y, BADGE_W, BADGE_H, 1.5, 1.5, "F");
  setFont(doc, "bold", 7.5);
  setColor(doc, WHITE);
  doc.text(BUCKET_LABEL[resultBucket].toUpperCase(), BADGE_X + BADGE_W / 2, BADGE_Y + 5.3, {
    align: "center",
  });

  let y = HEADER_H + 8;

  // ── PATIENT BLOCK ─────────────────────────────────────────────────────────
  const hasName = !!(childName && childName.trim());
  const hasDob = !!(childDob);

  if (hasName) {
    y = drawField(doc, "Child's name:", childName!.trim(), y);
  }
  if (hasDob) {
    y = drawField(doc, "Date of birth:", fmtDate(childDob!), y);
  }

  y = drawField(
    doc,
    hasName ? "Age at symptom onset:" : "Child's age at symptom onset:",
    answers.ageAtOnset ? `${answers.ageAtOnset} years old` : "Not provided",
    y,
  );

  const dateValue = answers.symptomStartDate
    ? `${fmtDate(answers.symptomStartDate)}  (${weeksAgo(answers.symptomStartDate)})`
    : "Not provided";
  y = drawField(doc, "Date symptoms began:", dateValue, y);
  y = drawField(doc, "Screening result:", BUCKET_LABEL[resultBucket], y);

  y += 4;
  drawRule(doc, y);
  y += 5;

  // ── ONSET SECTION ─────────────────────────────────────────────────────────
  y = guard(doc, y, 30);
  y = drawSection(doc, "Onset", y);
  y += 2;

  y = drawField(doc, "Onset pattern:", ONSET_LABEL[answers.suddenOnset] || "Not answered", y);

  const illnessItems =
    answers.illnesses.length > 0 && !answers.illnesses.includes("None that we noticed")
      ? answers.illnesses.filter((i) => i !== "None that we noticed")
      : null;

  setFont(doc, "bold", 8.5);
  setColor(doc, TEXT_MID);
  doc.text("Trigger or illness in the weeks prior:", M, y);
  y += 4.5;

  if (illnessItems && illnessItems.length > 0) {
    for (const item of illnessItems) {
      y = guard(doc, y, 8);
      y = drawBullet(doc, item, y, 2);
    }
    if (answers.otherIllnessDescription) {
      y = guard(doc, y, 8);
      setFont(doc, "italic", 8);
      setColor(doc, TEXT_MID);
      const lines = doc.splitTextToSize(`Note: ${answers.otherIllnessDescription}`, tw(doc) - 6);
      doc.text(lines, M + 6, y);
      y += lines.length * 4.2 + 1;
    }
  } else {
    setFont(doc, "normal", 8.5);
    setColor(doc, TEXT_LIGHT);
    doc.text("None reported", M + 4, y);
    y += 5;
  }

  y = drawField(
    doc,
    "Household members ill at the time:",
    YES_NO[answers.householdSick] || "Not answered",
    y,
  );

  y += 3;

  // ── CORE SYMPTOMS ─────────────────────────────────────────────────────────
  y = guard(doc, y, 30);
  y = drawSection(doc, "Core Symptoms (PPN requires at least one)", y);
  y += 2;

  y = drawCheckbox(doc, "OCD-like behaviors (intrusive thoughts, repeated rituals, contamination fears)", answers.ocdSymptoms === "yes", y);
  if (answers.ocdSymptoms === "yes" && answers.ocdDescription) {
    y = guard(doc, y, 10);
    setFont(doc, "italic", 8);
    setColor(doc, TEXT_MID);
    const dlines = doc.splitTextToSize(`Parent's description: ${answers.ocdDescription}`, tw(doc) - 10);
    doc.text(dlines, M + 10, y);
    y += dlines.length * 4 + 1.5;
  }

  y += 1.5;
  y = drawCheckbox(doc, "Severely restricted food intake or sudden food refusal", answers.foodRestriction === "yes", y);
  if (answers.foodRestriction === "yes" && answers.foodDescription) {
    y = guard(doc, y, 10);
    setFont(doc, "italic", 8);
    setColor(doc, TEXT_MID);
    const dlines = doc.splitTextToSize(`Parent's description: ${answers.foodDescription}`, tw(doc) - 10);
    doc.text(dlines, M + 10, y);
    y += dlines.length * 4 + 1.5;
  }

  y += 3;

  // ── ACCOMPANYING SYMPTOMS ─────────────────────────────────────────────────
  y = guard(doc, y, 30);
  y = drawSection(doc, "Accompanying Symptoms (PPN requires at least two)", y);
  y += 2;

  // Two-column layout for symptoms
  const colW = (tw(doc) - 6) / 2;
  const half = Math.ceil(ACCOMPANYING_SYMPTOMS.length / 2);
  const leftCol = ACCOMPANYING_SYMPTOMS.slice(0, half);
  const rightCol = ACCOMPANYING_SYMPTOMS.slice(half);
  const startY = y;
  let leftY = startY;
  let rightY = startY;

  for (const sym of leftCol) {
    leftY = guard(doc, leftY, 8);
    const checked = answers.accompanyingSymptoms.includes(sym);
    const boxSize = 3.2;
    const boxX = M;
    const textX = boxX + boxSize + 2.5;

    setFont(doc, "normal", 8);
    doc.setDrawColor(130, 118, 108);
    doc.setLineWidth(0.3);
    doc.rect(boxX, leftY - boxSize + 0.4, boxSize, boxSize);
    if (checked) {
      setFont(doc, "bold", 7);
      setColor(doc, TERRACOTTA);
      doc.text("X", boxX + 0.6, leftY);
    }
    setColor(doc, checked ? TEXT_DARK : TEXT_LIGHT);
    setFont(doc, "normal", 7.5);
    const lines = doc.splitTextToSize(sym, colW - boxSize - 3);
    doc.text(lines, textX, leftY);
    leftY += lines.length * 4 + 1;
  }

  for (const sym of rightCol) {
    rightY = guard(doc, rightY, 8);
    const checked = answers.accompanyingSymptoms.includes(sym);
    const colX = M + colW + 6;
    const boxSize = 3.2;
    const textX = colX + boxSize + 2.5;

    setFont(doc, "normal", 8);
    doc.setDrawColor(130, 118, 108);
    doc.setLineWidth(0.3);
    doc.rect(colX, rightY - boxSize + 0.4, boxSize, boxSize);
    if (checked) {
      setFont(doc, "bold", 7);
      setColor(doc, TERRACOTTA);
      doc.text("X", colX + 0.6, rightY);
    }
    setColor(doc, checked ? TEXT_DARK : TEXT_LIGHT);
    setFont(doc, "normal", 7.5);
    const lines = doc.splitTextToSize(sym, colW - boxSize - 3);
    doc.text(lines, textX, rightY);
    rightY += lines.length * 4 + 1;
  }

  y = Math.max(leftY, rightY) + 3;

  // ── RECENT TRACKING (authenticated + data present) ────────────────────────
  if (
    mode === "authenticated" &&
    recentTracking &&
    (recentTracking.avgSeverity > 0 || recentTracking.severeDays > 0)
  ) {
    y = guard(doc, y, 30);
    y = drawSection(doc, "Recent Symptom Tracking (Last 14 Days)", y);
    y += 2;
    y = drawField(
      doc,
      "Average daily severity:",
      `${recentTracking.avgSeverity.toFixed(1)} / 10`,
      y,
    );
    y = drawField(doc, "Days with severe symptoms (8+):", String(recentTracking.severeDays), y);
    if (recentTracking.topCategories.length > 0) {
      y = drawField(
        doc,
        "Most affected categories:",
        recentTracking.topCategories.slice(0, 3).join(", "),
        y,
      );
    }
    y += 3;
  }

  // ── OTHER CONDITIONS / DIAGNOSES ──────────────────────────────────────────
  y = guard(doc, y, 25);
  y = drawSection(doc, "Other Conditions or Diagnoses", y);
  y += 2;

  if (answers.alternativeDiagnosis === "yes") {
    const details = answers.alternativeDiagnosisDescription || "Not specified";
    setFont(doc, "normal", 8.5);
    setColor(doc, TEXT_DARK);
    const lines = doc.splitTextToSize(details, tw(doc));
    doc.text(lines, M, y);
    y += lines.length * 4.5;
  } else {
    setFont(doc, "normal", 8.5);
    setColor(doc, TEXT_LIGHT);
    doc.text("None reported", M, y);
    y += 5;
  }

  // ── DRAW FOOTERS ─────────────────────────────────────────────────────────
  drawFooters(doc);

  // ── SAVE / DOWNLOAD ───────────────────────────────────────────────────────
  const namePart = childName?.trim()
    ? `-${childName.trim().toLowerCase().replace(/\s+/g, "-")}`
    : "";
  const filename = `pans-screening${namePart}-${todayIso}.pdf`;
  doc.save(filename);
}
