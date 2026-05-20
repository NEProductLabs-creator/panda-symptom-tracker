import { useState, useMemo } from "react";
import { track } from "@/lib/analytics";
import { format, parseISO, subDays, differenceInDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedications } from "@/hooks/useMedications";
import { useMilestones } from "@/hooks/useMilestones";
import { usePTECLogs } from "@/hooks/usePTECLogs";
import { useTriggerLog } from "@/hooks/useTriggerLog";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  FileDown,
  ClipboardCopy,
  History,
  CalendarRange,
  Flag,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { MILESTONE_TYPE_LABELS, FREQUENCY_LABELS, TriggerCategory } from "@/lib/types";
import { PTECLog, SymptomLog } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const today = format(new Date(), "yyyy-MM-dd");

type RangeMode = "since_appointment" | "custom" | "all";

const CAT_KEYS = ["ocd", "anxiety", "rage", "tics", "sleep", "cognition"] as const;
const CAT_LABELS: Record<(typeof CAT_KEYS)[number], string> = {
  ocd: "OCD / Intrusive Thoughts",
  anxiety: "Anxiety",
  rage: "Rage / Irritability",
  tics: "Tics",
  sleep: "Sleep Quality (5 = excellent)",
  cognition: "Cognitive / Focus (5 = excellent)",
};

const TRIGGER_LABELS: Record<TriggerCategory, string> = {
  strep_exposure: "Strep Exposure",
  child_illness: "Child Illness",
  household_illness: "Household Illness",
  vaccination: "Vaccination",
  high_stress: "High Stress Event",
  dietary_change: "Dietary Change",
  poor_sleep: "Poor Sleep",
  seasonal_weather: "Seasonal / Weather",
  other: "Other",
};

const HEAD_COLOR: [number, number, number] = [55, 78, 55];
const ACCENT: [number, number, number] = [74, 103, 74];

// ─── Helper functions ─────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return format(parseISO(d + "T12:00:00"), "MMM d, yyyy");
}

function fmtShort(d: string) {
  return format(parseISO(d + "T12:00:00"), "M/d");
}

function dailyScore(log: SymptomLog) {
  // sleep and cognition are inverted (higher = better), so invert for severity total
  return (log.ocd ?? 0) + (log.anxiety ?? 0) + (log.rage ?? 0) + (log.tics ?? 0) + (5 - (log.sleep ?? 0)) + (5 - (log.cognition ?? 0));
}

function sectionHeader(doc: jsPDF, title: string, y: number, margin: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...HEAD_COLOR);
  doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), margin + 3, y + 4.8);
  doc.setTextColor(0);
  return y + 9;
}

function maybeNewPage(doc: jsPDF, y: number, needed = 40): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - needed) {
    doc.addPage();
    return 18;
  }
  return y;
}

// ─── PTEC Line Chart ──────────────────────────────────────────────────────────

function drawPTECChart(
  doc: jsPDF,
  ptecData: PTECLog[],
  startY: number,
  margin: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const chartH = 46;
  const chartW = pageWidth - margin * 2;
  const padL = 18;
  const padR = 6;
  const padT = 6;
  const padB = 14;

  const cLeft = margin + padL;
  const cRight = margin + chartW - padR;
  const cTop = startY + padT;
  const cBottom = startY + chartH - padB;
  const cW = cRight - cLeft;
  const cH = cBottom - cTop;
  const maxScore = 72;

  // Background
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, startY, chartW, chartH, "F");
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(margin, startY, chartW, chartH, "S");

  // Gridlines + Y labels at 0, 18, 36, 54, 72
  [0, 18, 36, 54, 72].forEach((score) => {
    const yy = cBottom - (score / maxScore) * cH;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(cLeft, yy, cRight, yy);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(140);
    doc.text(score.toString(), cLeft - 2, yy + 1.5, { align: "right" });
  });

  if (ptecData.length === 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.text(
      "No weekly check-ins recorded in this date range.",
      margin + chartW / 2,
      startY + chartH / 2 + 1,
      { align: "center" }
    );
    doc.setTextColor(0);
    return startY + chartH + 5;
  }

  const n = ptecData.length;

  // Line
  if (n >= 2) {
    doc.setLineWidth(1.2);
    doc.setDrawColor(...ACCENT);
    for (let i = 1; i < n; i++) {
      const x1 = cLeft + ((i - 1) / (n - 1)) * cW;
      const y1 = cBottom - (ptecData[i - 1].totalScore / maxScore) * cH;
      const x2 = cLeft + (i / (n - 1)) * cW;
      const y2 = cBottom - (ptecData[i].totalScore / maxScore) * cH;
      doc.line(x1, y1, x2, y2);
    }
  }

  // Dots + labels
  ptecData.forEach((p, i) => {
    const x = n === 1 ? cLeft + cW / 2 : cLeft + (i / (n - 1)) * cW;
    const yy = cBottom - (p.totalScore / maxScore) * cH;

    const dotRgb: [number, number, number] =
      p.totalScore > 54
        ? [220, 38, 38]
        : p.totalScore > 36
        ? [234, 88, 12]
        : p.totalScore > 18
        ? [161, 98, 7]
        : [22, 101, 52];

    doc.setFillColor(...dotRgb);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.circle(x, yy, 2, "FD");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dotRgb);
    doc.text(p.totalScore.toString(), x, yy - 4, { align: "center" });

    if (n <= 10 || i % Math.ceil(n / 10) === 0) {
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(fmtShort(p.weekStartDate), x, cBottom + 7, { align: "center" });
    }
  });

  // Y-axis label
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140);
  doc.text("PTEC (0–72)", margin, startY + chartH / 2, {
    angle: 90,
    align: "center",
  });

  doc.setTextColor(0);
  return startY + chartH + 5;
}

// ─── Clipboard text ───────────────────────────────────────────────────────────

function buildClipboardText(opts: {
  childName: string;
  childAge: string;
  effectiveStart: string;
  effectiveEnd: string;
  comparison: { text: string; trend: string } | null;
  catStats: { label: string; avg: number; worst: number }[];
  filteredPTEC: PTECLog[];
  filteredMeds: ReturnType<typeof useMedications>["medications"];
  filteredTriggers: ReturnType<typeof useTriggerLog>["entries"];
  filteredMilestones: ReturnType<typeof useMilestones>["milestones"];
  top3Days: SymptomLog[];
  parentNotes: string;
}): string {
  const {
    childName,
    childAge,
    effectiveStart,
    effectiveEnd,
    comparison,
    catStats,
    filteredPTEC,
    filteredMeds,
    filteredTriggers,
    filteredMilestones,
    top3Days,
    parentNotes,
  } = opts;

  const lines: string[] = [];
  const hr = "─".repeat(50);

  lines.push("PANS & PANDAS SYMPTOM REPORT");
  if (childName) lines.push(`Patient: ${childName}${childAge ? `, Age ${childAge}` : ""}`);
  lines.push(
    `Period: ${fmtDate(effectiveStart)} – ${fmtDate(effectiveEnd)}`
  );
  lines.push(`Generated: ${format(new Date(), "MMMM d, yyyy")}`);
  lines.push(hr);

  if (comparison) {
    lines.push("PERIOD OVERVIEW");
    lines.push(comparison.text);
    lines.push(hr);
  }

  lines.push("SYMPTOM CATEGORY AVERAGES (logged days, scale 1–5)");
  catStats.forEach(({ label, avg, worst }) => {
    lines.push(
      `  ${label.padEnd(28)} avg ${avg.toFixed(1)}/5   worst ${worst}/5`
    );
  });
  lines.push(hr);

  if (filteredPTEC.length > 0) {
    lines.push("WEEKLY CHECK-IN (PTEC) SCORES  [max 72]");
    filteredPTEC.forEach((p) => {
      lines.push(`  ${fmtDate(p.weekStartDate)} — ${p.totalScore}/72`);
    });
    lines.push(hr);
  }

  const activeMeds = filteredMeds.filter(
    (m) => !m.endDate || m.endDate >= effectiveEnd
  );
  const pastMeds = filteredMeds.filter(
    (m) => m.endDate && m.endDate < effectiveEnd
  );

  if (filteredMeds.length > 0) {
    if (activeMeds.length > 0) {
      lines.push("CURRENT MEDICATIONS");
      activeMeds.forEach((m) => {
        const freq = m.frequency ? FREQUENCY_LABELS[m.frequency] : null;
        const dr = m.prescribingDoctor ? `Dr. ${m.prescribingDoctor}` : null;
        lines.push(
          `  • ${m.name} ${m.dose}${freq ? `, ${freq}` : ""}${dr ? ` — ${dr}` : ""} (started ${fmtDate(m.startDate)})`
        );
      });
    }
    if (pastMeds.length > 0) {
      lines.push("PAST MEDICATIONS (this period)");
      pastMeds.forEach((m) => {
        lines.push(
          `  • ${m.name} ${m.dose} (${fmtDate(m.startDate)} – ${m.endDate ? fmtDate(m.endDate) : "ongoing"})`
        );
      });
    }
    lines.push(hr);
  }

  if (filteredTriggers.length > 0) {
    lines.push("TRIGGERS LOGGED");
    filteredTriggers.forEach((t) => {
      const sev = t.severity.charAt(0).toUpperCase() + t.severity.slice(1);
      lines.push(
        `  • ${fmtDate(t.date)} — ${TRIGGER_LABELS[t.category]} (${sev})${t.notes ? `: ${t.notes}` : ""}`
      );
    });
    lines.push(hr);
  }

  if (filteredMilestones.length > 0) {
    lines.push("MILESTONES");
    filteredMilestones.forEach((m) => {
      lines.push(
        `  • ${fmtDate(m.date)} — ${MILESTONE_TYPE_LABELS[m.type]}: ${m.title}${m.notes ? ` (${m.notes})` : ""}`
      );
    });
    lines.push(hr);
  }

  if (top3Days.length > 0) {
    lines.push("HIGHEST SEVERITY DAYS");
    top3Days.forEach((log, i) => {
      lines.push(
        `  ${i + 1}. ${fmtDate(log.date)} — total ${dailyScore(log)}/30`
      );
      if (log.notes) lines.push(`     Notes: ${log.notes}`);
    });
    lines.push(hr);
  }

  if (parentNotes.trim()) {
    lines.push("PARENT / CAREGIVER NOTES");
    lines.push(parentNotes.trim());
    lines.push(hr);
  }

  return lines.join("\n");
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExportPDF() {
  const { logs } = useSymptomLogs();
  const { medications } = useMedications();
  const { milestones } = useMilestones();
  const { ptecLogs } = usePTECLogs();
  const { entries: triggerEntries } = useTriggerLog();
  const { baseline } = useChildBaseline();
  const { toast } = useToast();

  const [rangeMode, setRangeMode] = useState<RangeMode>("since_appointment");
  const [customStart, setCustomStart] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [customEnd, setCustomEnd] = useState(today);
  const [parentNotes, setParentNotes] = useState("");

  // Last doctor appointment for default range
  const lastApptDate = useMemo(() => {
    const appts = milestones
      .filter((m) => m.type === "appointment")
      .sort((a, b) => b.date.localeCompare(a.date));
    return appts[0]?.date ?? null;
  }, [milestones]);

  const effectiveStart = useMemo(() => {
    if (rangeMode === "all") return logs[0]?.date ?? today;
    if (rangeMode === "since_appointment")
      return lastApptDate ?? format(subDays(new Date(), 30), "yyyy-MM-dd");
    return customStart;
  }, [rangeMode, customStart, lastApptDate, logs]);

  const effectiveEnd = rangeMode === "custom" ? customEnd : today;

  // Filtered data
  const filteredLogs = useMemo(
    () =>
      [...logs]
        .filter(
          (l) =>
            rangeMode === "all" ||
            (l.date >= effectiveStart && l.date <= effectiveEnd)
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [logs, rangeMode, effectiveStart, effectiveEnd]
  );

  const filteredPTEC = useMemo(
    () =>
      [...ptecLogs]
        .filter(
          (p) =>
            rangeMode === "all" ||
            (p.weekStartDate >= effectiveStart &&
              p.weekStartDate <= effectiveEnd)
        )
        .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)),
    [ptecLogs, rangeMode, effectiveStart, effectiveEnd]
  );

  const filteredMeds = useMemo(
    () =>
      medications.filter((m) => {
        if (rangeMode === "all") return true;
        const end = m.endDate ?? "9999-99-99";
        return m.startDate <= effectiveEnd && end >= effectiveStart;
      }),
    [medications, rangeMode, effectiveStart, effectiveEnd]
  );

  const filteredTriggers = useMemo(
    () =>
      [...triggerEntries]
        .filter(
          (t) =>
            rangeMode === "all" ||
            (t.date >= effectiveStart && t.date <= effectiveEnd)
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [triggerEntries, rangeMode, effectiveStart, effectiveEnd]
  );

  const filteredMilestones = useMemo(
    () =>
      [...milestones]
        .filter(
          (m) =>
            rangeMode === "all" ||
            (m.date >= effectiveStart && m.date <= effectiveEnd)
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [milestones, rangeMode, effectiveStart, effectiveEnd]
  );

  // Symptom category averages + worst
  const catStats = useMemo(
    () =>
      CAT_KEYS.map((cat) => {
        const vals = filteredLogs.map((l) => l[cat] ?? 0);
        const nonZero = vals.filter((v) => v > 0);
        const avg =
          nonZero.length > 0
            ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length
            : 0;
        const worst = Math.max(...vals, 0);
        return {
          cat,
          label: CAT_LABELS[cat],
          avg: Math.round(avg * 10) / 10,
          worst,
        };
      }),
    [filteredLogs]
  );

  // Top 3 highest-severity days
  const top3Days = useMemo(
    () =>
      [...filteredLogs]
        .sort((a, b) => dailyScore(b) - dailyScore(a))
        .slice(0, 3),
    [filteredLogs]
  );

  // Period comparison
  const periodComparison = useMemo(() => {
    if (filteredPTEC.length >= 2) {
      const first = filteredPTEC[0].totalScore;
      const last = filteredPTEC[filteredPTEC.length - 1].totalScore;
      const diff = last - first;
      const pct = first > 0 ? Math.round((Math.abs(diff) / first) * 100) : 0;
      if (pct < 3)
        return { text: "Overall severity remained stable over this period.", trend: "neutral" as const };
      const dir = diff < 0 ? "decreased" : "increased";
      return {
        text: `PTEC score ${dir} by ${pct}% over this period (${first} → ${last}).`,
        trend: diff < 0 ? ("improved" as const) : ("worsened" as const),
      };
    }
    if (filteredLogs.length >= 4) {
      const sorted = [...filteredLogs];
      const half = Math.ceil(sorted.length / 2);
      const firstAvg =
        sorted.slice(0, half).reduce((s, l) => s + dailyScore(l), 0) / half;
      const secondAvg =
        sorted.slice(half).reduce((s, l) => s + dailyScore(l), 0) /
        (sorted.length - half);
      const diff = secondAvg - firstAvg;
      const pct =
        firstAvg > 0 ? Math.round((Math.abs(diff) / firstAvg) * 100) : 0;
      if (pct < 5)
        return { text: "Overall daily severity remained stable over this period.", trend: "neutral" as const };
      const dir = diff < 0 ? "decreased" : "increased";
      return {
        text: `Overall daily severity ${dir} by ${pct}% over this period.`,
        trend: diff < 0 ? ("improved" as const) : ("worsened" as const),
      };
    }
    return null;
  }, [filteredPTEC, filteredLogs]);

  const hasData =
    filteredLogs.length > 0 ||
    filteredMeds.length > 0 ||
    filteredMilestones.length > 0 ||
    filteredTriggers.length > 0;

  // ─── PDF generator ────────────────────────────────────────────────────────

  function generatePDF() {
    track('export_triggered');
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const childName = baseline?.childName?.trim() || "";
    const childAge = baseline?.childAge?.trim() || "";

    // ── Header block ────────────────────────────────────────────────────────
    doc.setFillColor(...HEAD_COLOR);
    doc.rect(0, 0, pageWidth, 36, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text("PANS & PANDAS Symptom Report", margin, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(200, 230, 200);
    if (childName) {
      doc.text(
        `${childName}${childAge ? ` · Age ${childAge}` : ""}`,
        margin,
        21
      );
    }

    const rangeLabel =
      filteredLogs.length === 0 && filteredPTEC.length === 0
        ? "No entries in range"
        : `${fmtDate(effectiveStart)} – ${fmtDate(effectiveEnd)}`;

    doc.text(`Period: ${rangeLabel}`, margin, 27);
    doc.text(
      `Generated: ${format(new Date(), "MMMM d, yyyy")}`,
      pageWidth - margin,
      27,
      { align: "right" }
    );

    // Day count
    const dayCount = differenceInDays(
      parseISO(effectiveEnd),
      parseISO(effectiveStart)
    );
    doc.setFontSize(8);
    doc.setTextColor(170, 210, 170);
    doc.text(
      `${dayCount} days · ${filteredLogs.length} daily logs · ${filteredPTEC.length} PTEC check-ins`,
      margin,
      33
    );

    let y = 44;

    // ── Period comparison callout ────────────────────────────────────────────
    if (periodComparison) {
      const bgColor: [number, number, number] =
        periodComparison.trend === "improved"
          ? [220, 252, 231]
          : periodComparison.trend === "worsened"
          ? [254, 226, 226]
          : [241, 245, 249];
      const textColor: [number, number, number] =
        periodComparison.trend === "improved"
          ? [22, 101, 52]
          : periodComparison.trend === "worsened"
          ? [185, 28, 28]
          : [51, 65, 85];

      doc.setFillColor(...bgColor);
      doc.rect(margin, y, pageWidth - margin * 2, 11, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...textColor);
      doc.text("TREND  ", margin + 4, y + 4.5);
      doc.setFont("helvetica", "normal");
      const words = doc.splitTextToSize(
        periodComparison.text,
        pageWidth - margin * 2 - 20
      );
      doc.text(words[0], margin + 18, y + 4.5);
      y += 15;
    }

    // ── PTEC trend chart ─────────────────────────────────────────────────────
    y = maybeNewPage(doc, y, 60);
    y = sectionHeader(doc, "Weekly PTEC Check-In Score Trend (0–72)", y, margin);
    y += 2;
    y = drawPTECChart(doc, filteredPTEC, y, margin);
    y += 4;

    // ── Symptom category summary ─────────────────────────────────────────────
    y = maybeNewPage(doc, y, 55);
    y = sectionHeader(
      doc,
      `Symptom Category Averages  (${filteredLogs.length} logged days · scale 1–5)`,
      y,
      margin
    );
    y += 1;

    autoTable(doc, {
      startY: y,
      head: [["Symptom Category", "Avg Score", "Worst Day", "Severity Band"]],
      body: catStats.map(({ label, avg, worst }) => {
        const band =
          avg === 0
            ? "None logged"
            : avg <= 1.5
            ? "Mild"
            : avg <= 2.5
            ? "Mild–Moderate"
            : avg <= 3.5
            ? "Moderate"
            : avg <= 4.5
            ? "Moderate–Severe"
            : "Severe";
        return [label, avg > 0 ? avg.toFixed(1) : "—", worst > 0 ? `${worst}/5` : "—", band];
      }),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 2.8, valign: "middle" },
      headStyles: { fillColor: [80, 110, 80], textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const avg = parseFloat(String(data.cell.raw));
          if (!avg || avg === 0) {
            data.cell.styles.textColor = [180, 180, 180];
          } else if (avg <= 1.5) {
            data.cell.styles.textColor = [22, 101, 52];
          } else if (avg <= 2.5) {
            data.cell.styles.textColor = [133, 100, 4];
          } else {
            data.cell.styles.textColor = [185, 28, 28];
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // ── Top 3 severity days ──────────────────────────────────────────────────
    if (top3Days.length > 0) {
      y = maybeNewPage(doc, y, 50);
      y = sectionHeader(doc, "Highest Severity Days", y, margin);
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Total Score", "OCD", "Anxiety", "Rage", "Tics", "Sleep", "Cogn.", "Notes"]],
        body: top3Days.map((log) => [
          fmtDate(log.date),
          `${dailyScore(log)}/30`,
          log.ocd,
          log.anxiety,
          log.rage,
          log.tics,
          log.sleep,
          log.cognition,
          log.notes || "—",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [80, 110, 80], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 18, halign: "center", fontStyle: "bold" },
          2: { cellWidth: 9, halign: "center" },
          3: { cellWidth: 10, halign: "center" },
          4: { cellWidth: 9, halign: "center" },
          5: { cellWidth: 9, halign: "center" },
          6: { cellWidth: 9, halign: "center" },
          7: { cellWidth: 9, halign: "center" },
          8: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [120, 53, 15];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Medications ──────────────────────────────────────────────────────────
    if (filteredMeds.length > 0) {
      y = maybeNewPage(doc, y, 55);
      y = sectionHeader(doc, "Medications During This Period", y, margin);
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [["Name", "Dose", "Frequency", "Dr.", "Start", "End", "Status"]],
        body: filteredMeds
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .map((m) => {
            const isActive = !m.endDate || m.endDate >= today;
            return [
              m.name,
              m.dose,
              m.frequency ? FREQUENCY_LABELS[m.frequency] : "—",
              m.prescribingDoctor ? `Dr. ${m.prescribingDoctor}` : "—",
              fmtDate(m.startDate),
              m.endDate ? fmtDate(m.endDate) : "Ongoing",
              isActive ? "Active" : "Completed",
            ];
          }),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [80, 110, 80], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 18 },
          2: { cellWidth: 24 },
          3: { cellWidth: 22 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: "auto", halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 6) {
            if (String(data.cell.raw) === "Active") {
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fontStyle = "bold";
            } else {
              data.cell.styles.textColor = [120, 120, 120];
            }
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Triggers ─────────────────────────────────────────────────────────────
    if (filteredTriggers.length > 0) {
      y = maybeNewPage(doc, y, 45);
      y = sectionHeader(doc, "Triggers Logged", y, margin);
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Category", "Severity", "Notes"]],
        body: filteredTriggers.map((t) => [
          fmtDate(t.date),
          TRIGGER_LABELS[t.category],
          t.severity.charAt(0).toUpperCase() + t.severity.slice(1),
          t.notes || "—",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [80, 110, 80], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 40 },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 2) {
            const sev = String(data.cell.raw).toLowerCase();
            if (sev === "high") data.cell.styles.textColor = [185, 28, 28];
            else if (sev === "medium") data.cell.styles.textColor = [161, 98, 7];
            else data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Milestones ───────────────────────────────────────────────────────────
    if (filteredMilestones.length > 0) {
      y = maybeNewPage(doc, y, 45);
      y = sectionHeader(doc, "Milestones & Events", y, margin);
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Type", "Title", "Notes"]],
        body: filteredMilestones.map((m) => [
          fmtDate(m.date),
          MILESTONE_TYPE_LABELS[m.type],
          m.title,
          m.notes || "—",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [80, 110, 80], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 36 },
          2: { cellWidth: 56 },
          3: { cellWidth: "auto" },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Parent notes ─────────────────────────────────────────────────────────
    if (parentNotes.trim()) {
      y = maybeNewPage(doc, y, 30);
      y = sectionHeader(doc, "Parent / Caregiver Notes", y, margin);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      const wrapped = doc.splitTextToSize(
        parentNotes.trim(),
        pageWidth - margin * 2
      );
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.5 + 6;
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160);
      const fy = pageHeight - 7;
      doc.text(
        `PANS & PANDAS Tracker · ${childName || "Patient Report"} · Page ${i} of ${pageCount}`,
        margin,
        fy
      );
      doc.text("All data stored locally on this device — not for clinical diagnosis", pageWidth - margin, fy, { align: "right" });
    }

    const dateStr = format(new Date(), "yyyy-MM-dd");
    const safeName = childName
      ? childName.toLowerCase().replace(/\s+/g, "-") + "-"
      : "";
    doc.save(`pans-report-${safeName}${dateStr}.pdf`);
    toast({ title: "Doctor report downloaded" });
  }

  // ─── Clipboard ────────────────────────────────────────────────────────────

  async function copyToClipboard() {
    const text = buildClipboardText({
      childName: baseline?.childName?.trim() || "",
      childAge: baseline?.childAge?.trim() || "",
      effectiveStart,
      effectiveEnd,
      comparison: periodComparison,
      catStats,
      filteredPTEC,
      filteredMeds,
      filteredTriggers,
      filteredMilestones,
      top3Days,
      parentNotes,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Paste into your patient portal or email.",
      });
    } catch {
      toast({ title: "Copy failed", description: "Please try again.", variant: "destructive" });
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const childName = baseline?.childName?.trim();

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Doctor Report Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {childName
            ? `Generate a clinical summary for ${childName}'s appointment`
            : "Generate a professional summary to bring to any appointment"}
        </p>
      </div>

      {/* Date range */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base font-semibold"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {/* Since last appointment */}
            <button
              type="button"
              onClick={() => setRangeMode("since_appointment")}
              className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition-all ${
                rangeMode === "since_appointment"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
              data-testid="range-mode-appt"
            >
              <Flag
                className={`w-4 h-4 ${rangeMode === "since_appointment" ? "text-primary" : "text-muted-foreground"}`}
              />
              <p className="text-sm font-semibold text-foreground leading-tight">
                Since Last Appt
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {lastApptDate
                  ? `From ${fmtDate(lastApptDate)}`
                  : "Last 30 days (no appt logged)"}
              </p>
            </button>

            {/* Custom */}
            <button
              type="button"
              onClick={() => setRangeMode("custom")}
              className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition-all ${
                rangeMode === "custom"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
              data-testid="range-mode-custom"
            >
              <CalendarRange
                className={`w-4 h-4 ${rangeMode === "custom" ? "text-primary" : "text-muted-foreground"}`}
              />
              <p className="text-sm font-semibold text-foreground leading-tight">Custom Range</p>
              <p className="text-[11px] text-muted-foreground">Pick start & end</p>
            </button>

            {/* Full history */}
            <button
              type="button"
              onClick={() => setRangeMode("all")}
              className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition-all ${
                rangeMode === "all"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
              data-testid="range-mode-all"
            >
              <History
                className={`w-4 h-4 ${rangeMode === "all" ? "text-primary" : "text-muted-foreground"}`}
              />
              <p className="text-sm font-semibold text-foreground leading-tight">Full History</p>
              <p className="text-[11px] text-muted-foreground">All entries ever</p>
            </button>
          </div>

          {rangeMode === "custom" && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  End Date
                </Label>
                <Input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={today}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period comparison preview */}
      {periodComparison && (
        <div
          className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border ${
            periodComparison.trend === "improved"
              ? "bg-green-50 border-green-200"
              : periodComparison.trend === "worsened"
              ? "bg-red-50 border-red-200"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          {periodComparison.trend === "improved" ? (
            <TrendingDown className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          ) : periodComparison.trend === "worsened" ? (
            <TrendingUp className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Minus className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">Period overview</p>
            <p
              className={`text-sm mt-0.5 ${
                periodComparison.trend === "improved"
                  ? "text-green-700"
                  : periodComparison.trend === "worsened"
                  ? "text-red-700"
                  : "text-slate-600"
              }`}
            >
              {periodComparison.text}
            </p>
          </div>
        </div>
      )}

      {/* Stats preview */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Daily logs", value: filteredLogs.length },
          { label: "PTEC checks", value: filteredPTEC.length },
          { label: "Medications", value: filteredMeds.length },
          { label: "Triggers", value: filteredTriggers.length },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center py-3 bg-muted rounded-xl">
            <span
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {value}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Symptom summary preview */}
      {filteredLogs.length > 0 && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Category Summary — will appear in PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {catStats.map(({ label, avg, worst }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-44 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(avg / 5) * 100}%`,
                        backgroundColor:
                          avg <= 1.5 ? "#86efac" : avg <= 2.5 ? "#fde68a" : avg <= 3.5 ? "#fdba74" : "#f87171",
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-10 text-right tabular-nums">
                    {avg > 0 ? `${avg.toFixed(1)}/5` : "—"}
                  </span>
                  <span className="text-[11px] text-muted-foreground w-14 text-right tabular-nums">
                    worst {worst > 0 ? worst : "—"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent notes */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle
            className="text-base font-semibold"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Parent / Caregiver Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={parentNotes}
            onChange={(e) => setParentNotes(e.target.value)}
            placeholder="Add any observations, questions for the doctor, or context you want included in the report. This section prints at the bottom of the PDF."
            className="resize-none h-28 text-sm"
            data-testid="input-parent-notes"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            This note will appear in the PDF and clipboard copy.
          </p>
        </CardContent>
      </Card>

      {/* Export buttons */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <Button
          size="lg"
          onClick={generatePDF}
          disabled={!hasData}
          className="gap-2"
          data-testid="button-export-pdf"
        >
          <FileDown className="w-4 h-4" />
          Generate Doctor Report PDF
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={copyToClipboard}
          disabled={!hasData}
          className="gap-2"
          data-testid="button-copy-clipboard"
        >
          <ClipboardCopy className="w-4 h-4" />
          Copy Summary to Clipboard
        </Button>
        {!hasData && (
          <p className="text-sm text-muted-foreground">
            No data in the selected range.
          </p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground pb-2">
        All data is stored locally on your device. The PDF is generated entirely in your browser and never uploaded anywhere.
      </p>
    </div>
  );
}
