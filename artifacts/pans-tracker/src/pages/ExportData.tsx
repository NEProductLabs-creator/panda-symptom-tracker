import { useState, useMemo } from "react";
import { track } from "@/lib/analytics";
import { format, parseISO, subDays, differenceInDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedications } from "@/hooks/useMedications";
import { useMedLibrary } from "@/hooks/useMedLibrary";
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
  Download,
  Archive,
  ShieldCheck,
  FileText,
  TableProperties,
} from "lucide-react";
import { MILESTONE_TYPE_LABELS, FREQUENCY_LABELS, TriggerCategory } from "@/lib/types";
import { PTECLog, SymptomLog, Medication, TriggerEntry, MedLibraryItem } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const today = format(new Date(), "yyyy-MM-dd");

type RangeMode = "since_appointment" | "custom" | "all";
type Tab = "pdf" | "csv";

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

// ─── PDF helpers ──────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return format(parseISO(d + "T12:00:00"), "MMM d, yyyy");
}

function fmtShort(d: string) {
  return format(parseISO(d + "T12:00:00"), "M/d");
}

function dailyScore(log: SymptomLog) {
  return (
    (log.ocd ?? 0) +
    (log.anxiety ?? 0) +
    (log.rage ?? 0) +
    (log.tics ?? 0) +
    (5 - (log.sleep ?? 0)) +
    (5 - (log.cognition ?? 0))
  );
}

function sectionHeader(
  doc: jsPDF,
  title: string,
  y: number,
  margin: number,
): number {
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
  margin: number,
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

  doc.setFillColor(249, 250, 251);
  doc.rect(margin, startY, chartW, chartH, "F");
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(margin, startY, chartW, chartH, "S");

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
      { align: "center" },
    );
    doc.setTextColor(0);
    return startY + chartH + 5;
  }

  const n = ptecData.length;

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
      doc.text(fmtShort(p.weekStartDate), x, cBottom + 7, {
        align: "center",
      });
    }
  });

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
  if (childName)
    lines.push(`Patient: ${childName}${childAge ? `, Age ${childAge}` : ""}`);
  lines.push(`Period: ${fmtDate(effectiveStart)} – ${fmtDate(effectiveEnd)}`);
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
      `  ${label.padEnd(28)} avg ${avg.toFixed(1)}/5   worst ${worst}/5`,
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
    (m) => !m.endDate || m.endDate >= effectiveEnd,
  );
  const pastMeds = filteredMeds.filter(
    (m) => m.endDate && m.endDate < effectiveEnd,
  );

  if (filteredMeds.length > 0) {
    if (activeMeds.length > 0) {
      lines.push("CURRENT MEDICATIONS");
      activeMeds.forEach((m) => {
        const freq = m.frequency ? FREQUENCY_LABELS[m.frequency] : null;
        const dr = m.prescribingDoctor ? `Dr. ${m.prescribingDoctor}` : null;
        lines.push(
          `  • ${m.name} ${m.dose}${freq ? `, ${freq}` : ""}${dr ? ` — ${dr}` : ""} (started ${fmtDate(m.startDate)})`,
        );
      });
    }
    if (pastMeds.length > 0) {
      lines.push("PAST MEDICATIONS (this period)");
      pastMeds.forEach((m) => {
        lines.push(
          `  • ${m.name} ${m.dose} (${fmtDate(m.startDate)} – ${m.endDate ? fmtDate(m.endDate) : "ongoing"})`,
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
        `  • ${fmtDate(t.date)} — ${TRIGGER_LABELS[t.category]} (${sev})${t.notes ? `: ${t.notes}` : ""}`,
      );
    });
    lines.push(hr);
  }

  if (filteredMilestones.length > 0) {
    lines.push("MILESTONES");
    filteredMilestones.forEach((m) => {
      lines.push(
        `  • ${fmtDate(m.date)} — ${MILESTONE_TYPE_LABELS[m.type]}: ${m.title}${m.notes ? ` (${m.notes})` : ""}`,
      );
    });
    lines.push(hr);
  }

  if (top3Days.length > 0) {
    lines.push("HIGHEST SEVERITY DAYS");
    top3Days.forEach((log, i) => {
      lines.push(
        `  ${i + 1}. ${fmtDate(log.date)} — total ${dailyScore(log)}/30`,
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

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeField(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\n") || s.includes("\r") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [
    headers.map(escapeField).join(","),
    ...rows.map((row) => row.map(escapeField).join(",")),
  ].join("\r\n");
}

function triggerDownload(filename: string, content: string | Blob, mimeType = "text/csv;charset=utf-8;"): void {
  const blob =
    content instanceof Blob
      ? content
      : new Blob(["\uFEFF" + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildSymptomLogsCsv(
  logs: SymptomLog[],
  medLibMap: Map<string, string>,
): string {
  return toCsv(
    ["date", "ocd", "anxiety", "rage", "tics", "sleep", "cognition", "calmDay", "medicationsTaken", "notes"],
    [...logs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => [
        l.date,
        l.ocd ?? "",
        l.anxiety ?? "",
        l.rage ?? "",
        l.tics ?? "",
        l.sleep ?? "",
        l.cognition ?? "",
        l.calmDay ? "true" : "false",
        (l.medicationsTaken ?? [])
          .map((id) => medLibMap.get(id) ?? id)
          .join("; "),
        l.notes ?? "",
      ]),
  );
}

function buildPtecCsv(ptecLogs: PTECLog[]): string {
  return toCsv(
    [
      "weekStartDate", "date",
      "ocdBehaviors", "anxiety", "emotionalLability", "aggression",
      "restrictiveEating", "sleepDisturbance", "urinarySymptoms",
      "sensorySensitivities", "tics", "handwritingRegression",
      "academicDecline", "personalityChange", "totalScore", "notes",
    ],
    [...ptecLogs]
      .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
      .map((p) => [
        p.weekStartDate, p.date,
        p.scores.ocdBehaviors, p.scores.anxiety, p.scores.emotionalLability,
        p.scores.aggression, p.scores.restrictiveEating, p.scores.sleepDisturbance,
        p.scores.urinarySymptoms, p.scores.sensorySensitivities, p.scores.tics,
        p.scores.handwritingRegression, p.scores.academicDecline, p.scores.personalityChange,
        p.totalScore, p.notes ?? "",
      ]),
  );
}

function buildMedicationsCsv(medications: Medication[]): string {
  return toCsv(
    ["id", "name", "dose", "frequency", "type", "startDate", "endDate",
     "prescribingDoctor", "courseType", "courseDays", "supplyDays", "notes"],
    [...medications]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((m) => [
        m.id, m.name, m.dose, m.frequency ?? "", m.type,
        m.startDate, m.endDate ?? "", m.prescribingDoctor ?? "",
        m.courseType ?? "", m.courseDays ?? "", m.supplyDays ?? "", m.notes ?? "",
      ]),
  );
}

function buildTriggersCsv(entries: TriggerEntry[]): string {
  return toCsv(
    ["id", "date", "category", "severity", "householdMemberName", "customCategory", "notes"],
    [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => [
        t.id, t.date, t.category, t.severity,
        t.householdMemberName ?? "", t.customCategory ?? "", t.notes,
      ]),
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExportData() {
  const { logs } = useSymptomLogs();
  const { medications } = useMedications();
  const { medLibrary } = useMedLibrary();
  const { milestones } = useMilestones();
  const { ptecLogs } = usePTECLogs();
  const { entries: triggerEntries } = useTriggerLog();
  const { baseline } = useChildBaseline();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("pdf");
  const [rangeMode, setRangeMode] = useState<RangeMode>("since_appointment");
  const [customStart, setCustomStart] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [customEnd, setCustomEnd] = useState(today);
  const [parentNotes, setParentNotes] = useState("");
  const [zipBusy, setZipBusy] = useState(false);

  // Med library lookup map for symptom logs (medicationsTaken IDs → names)
  const medLibMap = useMemo(
    () => new Map(medLibrary.map((m: MedLibraryItem) => [m.id, m.name])),
    [medLibrary],
  );

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

  // Filtered data (for PDF)
  const filteredLogs = useMemo(
    () =>
      [...logs]
        .filter(
          (l) =>
            rangeMode === "all" ||
            (l.date >= effectiveStart && l.date <= effectiveEnd),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [logs, rangeMode, effectiveStart, effectiveEnd],
  );

  const filteredPTEC = useMemo(
    () =>
      [...ptecLogs]
        .filter(
          (p) =>
            rangeMode === "all" ||
            (p.weekStartDate >= effectiveStart &&
              p.weekStartDate <= effectiveEnd),
        )
        .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)),
    [ptecLogs, rangeMode, effectiveStart, effectiveEnd],
  );

  const filteredMeds = useMemo(
    () =>
      medications.filter((m) => {
        if (rangeMode === "all") return true;
        const end = m.endDate ?? "9999-99-99";
        return m.startDate <= effectiveEnd && end >= effectiveStart;
      }),
    [medications, rangeMode, effectiveStart, effectiveEnd],
  );

  const filteredTriggers = useMemo(
    () =>
      [...triggerEntries]
        .filter(
          (t) =>
            rangeMode === "all" ||
            (t.date >= effectiveStart && t.date <= effectiveEnd),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [triggerEntries, rangeMode, effectiveStart, effectiveEnd],
  );

  const filteredMilestones = useMemo(
    () =>
      [...milestones]
        .filter(
          (m) =>
            rangeMode === "all" ||
            (m.date >= effectiveStart && m.date <= effectiveEnd),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [milestones, rangeMode, effectiveStart, effectiveEnd],
  );

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
    [filteredLogs],
  );

  const top3Days = useMemo(
    () =>
      [...filteredLogs]
        .sort((a, b) => dailyScore(b) - dailyScore(a))
        .slice(0, 3),
    [filteredLogs],
  );

  const periodComparison = useMemo(() => {
    if (filteredPTEC.length >= 2) {
      const first = filteredPTEC[0].totalScore;
      const last = filteredPTEC[filteredPTEC.length - 1].totalScore;
      const diff = last - first;
      const pct = first > 0 ? Math.round((Math.abs(diff) / first) * 100) : 0;
      if (pct < 3)
        return {
          text: "Overall severity remained stable over this period.",
          trend: "neutral" as const,
        };
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
        return {
          text: "Overall daily severity remained stable over this period.",
          trend: "neutral" as const,
        };
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

  // ─── CSV filename helper ──────────────────────────────────────────────────

  function csvFilename(dataset: string) {
    const first =
      baseline?.childName?.trim().split(" ")[0]?.toLowerCase() ?? "tracker";
    return `${first}-${dataset}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  }

  // ─── CSV download handlers ────────────────────────────────────────────────

  function downloadSymptomLogs() {
    track("csv_exported", { dataset: "symptom_logs" });
    triggerDownload(csvFilename("symptom-logs"), buildSymptomLogsCsv(logs, medLibMap));
  }

  function downloadPtec() {
    track("csv_exported", { dataset: "ptec_checkins" });
    triggerDownload(csvFilename("ptec-checkins"), buildPtecCsv(ptecLogs));
  }

  function downloadMedications() {
    track("csv_exported", { dataset: "medications" });
    triggerDownload(csvFilename("medications"), buildMedicationsCsv(medications));
  }

  function downloadTriggers() {
    track("csv_exported", { dataset: "triggers" });
    triggerDownload(csvFilename("triggers"), buildTriggersCsv(triggerEntries));
  }

  async function downloadZip() {
    setZipBusy(true);
    try {
      const { default: JSZip } = await import("jszip");
      track("csv_exported", { dataset: "all_zip" });

      const zip = new JSZip();
      zip.file("symptom_logs.csv", buildSymptomLogsCsv(logs, medLibMap));
      zip.file("ptec_checkins.csv", buildPtecCsv(ptecLogs));
      zip.file("medications.csv", buildMedicationsCsv(medications));
      zip.file("triggers.csv", buildTriggersCsv(triggerEntries));
      zip.file("baseline.json", JSON.stringify(baseline ?? {}, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const first =
        baseline?.childName?.trim().split(" ")[0]?.toLowerCase() ?? "tracker";
      triggerDownload(
        `${first}-export-${format(new Date(), "yyyy-MM-dd")}.zip`,
        blob,
      );
    } catch {
      toast({ title: "ZIP export failed — please try again", variant: "destructive" });
    } finally {
      setZipBusy(false);
    }
  }

  // ─── PDF generator ────────────────────────────────────────────────────────

  function generatePDF() {
    track("export_triggered");
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const childName = baseline?.childName?.trim() || "";
    const childAge = baseline?.childAge?.trim() || "";

    doc.setFillColor(...HEAD_COLOR);
    doc.rect(0, 0, pageWidth, 36, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text("PANS & PANDAS Symptom Report", margin, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(200, 230, 200);
    if (childName)
      doc.text(
        `${childName}${childAge ? ` · Age ${childAge}` : ""}`,
        margin,
        21,
      );

    const rangeLabel =
      filteredLogs.length === 0 && filteredPTEC.length === 0
        ? "No entries in range"
        : `${fmtDate(effectiveStart)} – ${fmtDate(effectiveEnd)}`;

    doc.text(`Period: ${rangeLabel}`, margin, 27);
    doc.text(
      `Generated: ${format(new Date(), "MMMM d, yyyy")}`,
      pageWidth - margin,
      27,
      { align: "right" },
    );

    const dayCount = differenceInDays(
      parseISO(effectiveEnd),
      parseISO(effectiveStart),
    );
    doc.setFontSize(8);
    doc.setTextColor(170, 210, 170);
    doc.text(
      `${dayCount} days · ${filteredLogs.length} daily logs · ${filteredPTEC.length} PTEC check-ins`,
      margin,
      33,
    );

    let y = 44;

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
        pageWidth - margin * 2 - 20,
      );
      doc.text(words[0], margin + 18, y + 4.5);
      y += 15;
    }

    y = maybeNewPage(doc, y, 60);
    y = sectionHeader(
      doc,
      "Weekly PTEC Check-In Score Trend (0–72)",
      y,
      margin,
    );
    y += 2;
    y = drawPTECChart(doc, filteredPTEC, y, margin);
    y += 4;

    y = maybeNewPage(doc, y, 55);
    y = sectionHeader(
      doc,
      `Symptom Category Averages  (${filteredLogs.length} logged days · scale 1–5)`,
      y,
      margin,
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
        return [
          label,
          avg > 0 ? avg.toFixed(1) : "—",
          worst > 0 ? `${worst}/5` : "—",
          band,
        ];
      }),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 2.8, valign: "middle" },
      headStyles: {
        fillColor: [80, 110, 80],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
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

    if (top3Days.length > 0) {
      y = maybeNewPage(doc, y, 50);
      y = sectionHeader(doc, "Highest Severity Days", y, margin);
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [["Date", "OCD", "Anx", "Rage", "Tics", "Sleep", "Cog", "Total", "Notes"]],
        body: top3Days.map((log) => [
          fmtDate(log.date),
          log.ocd ?? "—",
          log.anxiety ?? "—",
          log.rage ?? "—",
          log.tics ?? "—",
          log.sleep ?? "—",
          log.cognition ?? "—",
          dailyScore(log),
          log.notes ? log.notes.slice(0, 60) + (log.notes.length > 60 ? "…" : "") : "",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [80, 110, 80], textColor: 255, fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 10, halign: "center" },
          2: { cellWidth: 10, halign: "center" },
          3: { cellWidth: 10, halign: "center" },
          4: { cellWidth: 10, halign: "center" },
          5: { cellWidth: 10, halign: "center" },
          6: { cellWidth: 10, halign: "center" },
          7: { cellWidth: 13, halign: "center", fontStyle: "bold" },
          8: { cellWidth: "auto" },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (filteredLogs.length > 0) {
      y = maybeNewPage(doc, y, 55);
      y = sectionHeader(
        doc,
        `Daily Symptom Log  (${filteredLogs.length} entries)`,
        y,
        margin,
      );
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [["Date", "OCD", "Anx", "Rage", "Tics", "Sleep", "Cog", "Notes"]],
        body: filteredLogs.map((log) => [
          fmtShort(log.date),
          log.ocd ?? "—",
          log.anxiety ?? "—",
          log.rage ?? "—",
          log.tics ?? "—",
          log.sleep ?? "—",
          log.cognition ?? "—",
          log.notes
            ? log.notes.slice(0, 50) + (log.notes.length > 50 ? "…" : "")
            : "",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [80, 110, 80], textColor: 255, fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 10, halign: "center" },
          2: { cellWidth: 10, halign: "center" },
          3: { cellWidth: 10, halign: "center" },
          4: { cellWidth: 10, halign: "center" },
          5: { cellWidth: 11, halign: "center" },
          6: { cellWidth: 10, halign: "center" },
          7: { cellWidth: "auto" },
        },
        alternateRowStyles: { fillColor: [248, 250, 248] },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (filteredMeds.length > 0) {
      y = maybeNewPage(doc, y, 50);
      y = sectionHeader(
        doc,
        `Medications  (${filteredMeds.length} in period)`,
        y,
        margin,
      );
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [["Medication", "Dose", "Frequency", "Start", "End", "Notes"]],
        body: filteredMeds.map((m) => [
          m.name,
          m.dose,
          m.frequency ? FREQUENCY_LABELS[m.frequency] : "",
          fmtShort(m.startDate),
          m.endDate ? fmtShort(m.endDate) : "Ongoing",
          m.notes
            ? m.notes.slice(0, 40) + (m.notes.length > 40 ? "…" : "")
            : "",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [80, 110, 80], textColor: 255, fontSize: 7.5 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (filteredTriggers.length > 0) {
      y = maybeNewPage(doc, y, 50);
      y = sectionHeader(
        doc,
        `Triggers  (${filteredTriggers.length} logged)`,
        y,
        margin,
      );
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Trigger", "Severity", "Notes"]],
        body: filteredTriggers.map((t) => [
          fmtShort(t.date),
          TRIGGER_LABELS[t.category],
          t.severity.charAt(0).toUpperCase() + t.severity.slice(1),
          t.notes
            ? t.notes.slice(0, 60) + (t.notes.length > 60 ? "…" : "")
            : "",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [80, 110, 80], textColor: 255, fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 40 },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: "auto" },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (filteredMilestones.length > 0) {
      y = maybeNewPage(doc, y, 50);
      y = sectionHeader(
        doc,
        `Milestones  (${filteredMilestones.length})`,
        y,
        margin,
      );
      y += 1;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Type", "Title", "Notes"]],
        body: filteredMilestones.map((m) => [
          fmtShort(m.date),
          MILESTONE_TYPE_LABELS[m.type],
          m.title,
          m.notes ?? "",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [80, 110, 80], textColor: 255, fontSize: 7.5 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (parentNotes.trim()) {
      y = maybeNewPage(doc, y, 40);
      y = sectionHeader(doc, "Parent / Caregiver Notes", y, margin);
      y += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40);
      const noteLines = doc.splitTextToSize(
        parentNotes.trim(),
        pageWidth - margin * 2,
      );
      doc.text(noteLines, margin, y);
    }

    // Footer on each page
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160);
      doc.text(
        `PANS & PANDAS Tracker · Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" },
      );
    }

    const safeName = (baseline?.childName?.trim() || "report")
      .toLowerCase()
      .replace(/\s+/g, "-");
    doc.save(`${safeName}-symptom-report-${today}.pdf`);
  }

  // ─── Clipboard ────────────────────────────────────────────────────────────

  function copyToClipboard() {
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
    navigator.clipboard
      .writeText(text)
      .then(() =>
        toast({ title: "Summary copied to clipboard", variant: "success" }),
      )
      .catch(() =>
        toast({ title: "Clipboard copy failed", variant: "destructive" }),
      );
  }

  // ─── JSX ─────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "pdf", label: "PDF Summary", icon: FileText },
    { id: "csv", label: "Raw CSV", icon: TableProperties },
  ];

  const CSV_DATASETS = [
    {
      id: "symptom_logs" as const,
      label: "Symptom Logs",
      description: "Daily scores for OCD, anxiety, rage, tics, sleep, cognition",
      count: logs.length,
      onDownload: downloadSymptomLogs,
    },
    {
      id: "ptec" as const,
      label: "PTEC Check-ins",
      description: "Weekly parent stress and executive function scores (0–72)",
      count: ptecLogs.length,
      onDownload: downloadPtec,
    },
    {
      id: "medications" as const,
      label: "Medications",
      description: "All medications with dose, dates, and notes",
      count: medications.length,
      onDownload: downloadMedications,
    },
    {
      id: "triggers" as const,
      label: "Triggers",
      description: "Logged trigger events with category and severity",
      count: triggerEntries.length,
      onDownload: downloadTriggers,
    },
  ];

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-5 pb-12">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FileDown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Export &amp; Download
          </h1>
          <p className="text-sm text-muted-foreground">
            Doctor-ready reports and raw data exports
          </p>
        </div>
      </div>

      {/* GDPR / data portability note */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border bg-muted/40">
        <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Your data, your control
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            You have the right to access and export all data stored in this app
            (GDPR Art. 20 / CCPA §1798.100). The CSV exports below contain every
            record in your account — use them to move to another tool, share with
            a specialist, or keep your own backup. Everything is generated
            entirely in your browser and never sent to a third party.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── PDF TAB ────────────────────────────────────────────────────────── */}
      {activeTab === "pdf" && (
        <>
          {/* Date range selector */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle
                className="text-base font-semibold"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: "since_appointment",
                      label: "Since last appointment",
                      icon: History,
                    },
                    {
                      id: "custom",
                      label: "Custom range",
                      icon: CalendarRange,
                    },
                    { id: "all", label: "All data", icon: Flag },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRangeMode(id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      rangeMode === id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 text-foreground"
                    }`}
                    data-testid={`range-${id}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {rangeMode === "since_appointment" && (
                <p className="text-xs text-muted-foreground">
                  {lastApptDate
                    ? `From ${fmtDate(lastApptDate)} to today.`
                    : "No appointment milestone found — defaulting to last 30 days. Add one in Milestones."}
                </p>
              )}

              {rangeMode === "custom" && (
                <div className="grid grid-cols-2 gap-3">
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

          {/* Period comparison callout */}
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
                <p className="text-sm font-semibold text-foreground">
                  Period overview
                </p>
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
              <div
                key={label}
                className="flex flex-col items-center py-3 bg-muted rounded-xl"
              >
                <span
                  className="text-xl font-bold text-foreground"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  {value}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Category summary preview */}
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
                      <span className="text-xs text-muted-foreground w-44 flex-shrink-0">
                        {label}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(avg / 5) * 100}%`,
                            backgroundColor:
                              avg <= 1.5
                                ? "#86efac"
                                : avg <= 2.5
                                  ? "#fde68a"
                                  : avg <= 3.5
                                    ? "#fdba74"
                                    : "#f87171",
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
            All data is stored locally on your device. The PDF is generated
            entirely in your browser and never uploaded anywhere.
          </p>
        </>
      )}

      {/* ── CSV TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === "csv" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Downloads include <strong>all records</strong> regardless of date
            range — these are full data exports, not filtered reports. Each CSV
            opens in Excel, Numbers, or Google Sheets.
          </p>

          {/* Individual dataset buttons */}
          <div className="space-y-2.5">
            {CSV_DATASETS.map(({ id, label, description, count, onDownload }) => (
              <div
                key={id}
                className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border border-border bg-card"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {description}
                    {count > 0 && (
                      <span className="ml-1.5 font-medium text-foreground/70">
                        · {count} record{count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={count === 0 ? "outline" : "default"}
                  className="flex-shrink-0 gap-1.5"
                  disabled={count === 0}
                  onClick={onDownload}
                  data-testid={`csv-download-${id}`}
                >
                  <Download className="w-3.5 h-3.5" />
                  {count === 0 ? "No data" : "Download"}
                </Button>
              </div>
            ))}
          </div>

          {/* ZIP everything */}
          <div className="pt-1">
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              disabled={
                zipBusy ||
                (logs.length === 0 &&
                  ptecLogs.length === 0 &&
                  medications.length === 0 &&
                  triggerEntries.length === 0)
              }
              onClick={downloadZip}
              data-testid="csv-download-zip"
            >
              {zipBusy ? (
                <>
                  <Archive className="w-4 h-4 animate-pulse" />
                  Building ZIP…
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  Download everything (ZIP)
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Includes all four CSVs plus a{" "}
              <code className="text-[11px] font-mono">baseline.json</code> with
              your child&apos;s profile
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">
              Symptom log column order
            </p>
            <p className="text-[11px] font-mono text-muted-foreground leading-relaxed break-all">
              date, ocd, anxiety, rage, tics, sleep, cognition, calmDay,
              medicationsTaken, notes
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <code className="font-mono text-[11px]">medicationsTaken</code>{" "}
              contains medication names joined by semicolons. All text fields
              containing commas or line breaks are RFC 4180 quoted.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
