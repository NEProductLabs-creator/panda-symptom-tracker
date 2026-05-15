import { useState } from "react";
import { format, subDays, parseISO } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedications } from "@/hooks/useMedications";
import { useMedLibrary } from "@/hooks/useMedLibrary";
import { useMilestones } from "@/hooks/useMilestones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Download, History, CalendarRange, Flag, Plus, Trash2, FileDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RangeMode = "all" | "custom";

const today = format(new Date(), "yyyy-MM-dd");
const defaultStart = format(subDays(new Date(), 30), "yyyy-MM-dd");

function fmtDate(d: string) {
  return format(parseISO(d), "MMM d, yyyy");
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 bg-muted rounded-xl">
      <span className="text-xl font-bold text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

export default function ExportPDF() {
  const { logs } = useSymptomLogs();
  const { medications } = useMedications();
  const { medLibrary } = useMedLibrary();
  const { milestones, addMilestone, deleteMilestone } = useMilestones();
  const { toast } = useToast();

  const [rangeMode, setRangeMode] = useState<RangeMode>("all");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);

  const [showAddForm, setShowAddForm] = useState(false);
  const [msDate, setMsDate] = useState(today);
  const [msLabel, setMsLabel] = useState("");
  const [msNotes, setMsNotes] = useState("");

  const filteredLogs = [...logs]
    .filter((l) => rangeMode === "all" || (l.date >= startDate && l.date <= endDate))
    .sort((a, b) => a.date.localeCompare(b.date));

  const filteredMilestones = [...milestones]
    .filter((m) => rangeMode === "all" || (m.date >= startDate && m.date <= endDate))
    .sort((a, b) => a.date.localeCompare(b.date));

  const filteredMeds = medications.filter((m) => {
    if (rangeMode === "all") return true;
    const medEnd = m.endDate ?? "9999-99-99";
    return m.startDate <= endDate && medEnd >= startDate;
  });

  const logsWithNotes = filteredLogs.filter((l) => l.notes?.trim());

  const rangeStart =
    rangeMode === "all"
      ? filteredLogs[0]?.date ?? today
      : startDate;
  const rangeEnd =
    rangeMode === "all"
      ? filteredLogs[filteredLogs.length - 1]?.date ?? today
      : endDate;

  function handleAddMilestone() {
    if (!msLabel.trim()) return;
    addMilestone({ date: msDate, label: msLabel.trim(), notes: msNotes.trim() || undefined });
    setMsLabel("");
    setMsNotes("");
    setShowAddForm(false);
    toast({ title: "Milestone added" });
  }

  function generatePDF() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const headColor: [number, number, number] = [74, 103, 74];

    // ── Header ──────────────────────────────────────────────────
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("PANS/PANDAS Symptom Tracker", margin, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Symptom & Medication Export", margin, 25);

    const rangeLabel =
      filteredLogs.length === 0
        ? "No entries"
        : rangeStart === rangeEnd
        ? fmtDate(rangeStart)
        : `${fmtDate(rangeStart)} – ${fmtDate(rangeEnd)}`;

    doc.setFontSize(9);
    doc.text(`Date Range: ${rangeLabel}`, margin, 32);
    doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, margin, 37);

    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.4);
    doc.line(margin, 42, pageWidth - margin, 42);

    let y = 50;

    // ── Daily Symptom Scores ────────────────────────────────────
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Daily Symptom Scores", margin, y);
    y += 3;

    if (filteredLogs.length === 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150);
      doc.text("No entries in this date range.", margin, y + 7);
      doc.setTextColor(0);
      y += 16;
    } else {
      const scoreRows = filteredLogs.map((log) => {
        const takenNames = (log.medicationsTaken ?? [])
          .map((id) => medLibrary.find((m) => m.id === id)?.name ?? "")
          .filter(Boolean)
          .join(", ");
        return [
          fmtDate(log.date),
          log.ocd,
          log.anxiety,
          log.rage,
          log.tics,
          log.sleep,
          log.cognition,
          takenNames || "—",
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["Date", "OCD", "Anx", "Rage", "Tics", "Sleep", "Cogn", "Meds Taken"]],
        body: scoreRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5, valign: "middle" },
        headStyles: { fillColor: headColor, textColor: 255, fontStyle: "bold", fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 10, halign: "center" },
          2: { cellWidth: 10, halign: "center" },
          3: { cellWidth: 10, halign: "center" },
          4: { cellWidth: 10, halign: "center" },
          5: { cellWidth: 10, halign: "center" },
          6: { cellWidth: 10, halign: "center" },
          7: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index >= 1 && data.column.index <= 6) {
            const val = Number(data.cell.raw);
            if (val <= 2) {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [22, 101, 52];
            } else if (val === 3) {
              data.cell.styles.fillColor = [254, 249, 195];
              data.cell.styles.textColor = [133, 100, 4];
            } else {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [185, 28, 28];
            }
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Notes ───────────────────────────────────────────────────
    if (logsWithNotes.length > 0) {
      if (y > pageHeight - 60) { doc.addPage(); y = 20; }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Notes", margin, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Notes"]],
        body: logsWithNotes.map((l) => [fmtDate(l.date), l.notes!]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: headColor, textColor: 255, fontStyle: "bold", fontSize: 8 },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: "auto" } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Medications ─────────────────────────────────────────────
    if (filteredMeds.length > 0) {
      if (y > pageHeight - 60) { doc.addPage(); y = 20; }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Medications", margin, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [["Name", "Dose", "Type", "Start", "End", "Notes"]],
        body: filteredMeds.map((m) => [
          m.name,
          m.dose,
          m.type,
          fmtDate(m.startDate),
          m.endDate ? fmtDate(m.endDate) : "Ongoing",
          m.notes || "—",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: headColor, textColor: 255, fontStyle: "bold", fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: "auto" },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Milestones ───────────────────────────────────────────────
    if (filteredMilestones.length > 0) {
      if (y > pageHeight - 60) { doc.addPage(); y = 20; }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Milestones & Events", margin, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Event", "Notes"]],
        body: filteredMilestones.map((m) => [fmtDate(m.date), m.label, m.notes || "—"]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: headColor, textColor: 255, fontStyle: "bold", fontSize: 8 },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 60 }, 2: { cellWidth: "auto" } },
      });
    }

    // ── Footer on every page ────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 160, 160);
      const footerY = pageHeight - 8;
      doc.text(`PANS/PANDAS Tracker · Page ${i} of ${pageCount}`, margin, footerY);
      doc.text("All data stored locally on this device", pageWidth - margin, footerY, { align: "right" });
    }

    const filename =
      rangeMode === "custom"
        ? `pans-tracker-${startDate}-to-${endDate}.pdf`
        : "pans-tracker-full-export.pdf";
    doc.save(filename);

    toast({ title: "PDF downloaded", description: filename });
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Export to PDF
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Download your tracking data as a PDF to share with your doctor
        </p>
      </div>

      {/* ── Range selector ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base font-semibold"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRangeMode("all")}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                rangeMode === "all"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
              data-testid="range-mode-all"
            >
              <History
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${rangeMode === "all" ? "text-primary" : "text-muted-foreground"}`}
              />
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  Full History
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All entries ever logged
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRangeMode("custom")}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                rangeMode === "custom"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
              data-testid="range-mode-custom"
            >
              <CalendarRange
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${rangeMode === "custom" ? "text-primary" : "text-muted-foreground"}`}
              />
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  Custom Range
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick a start and end date
                </p>
              </div>
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
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm"
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  End Date
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={today}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm"
                  data-testid="input-end-date"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Preview summary ── */}
      <div className="flex gap-3 flex-wrap">
        <StatPill label="Log entries" value={filteredLogs.length} />
        <StatPill label="With notes" value={logsWithNotes.length} />
        <StatPill label="Medications" value={filteredMeds.length} />
        <StatPill label="Milestones" value={filteredMilestones.length} />
      </div>

      {/* ── Milestones management ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle
              className="text-base font-semibold flex items-center gap-2"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Flag className="w-4 h-4 text-primary" />
              Milestones &amp; Events
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm((v) => !v)}
              data-testid="button-add-milestone"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Record key events (e.g. "Started amoxicillin", "IVIG infusion") to include in the export.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add form */}
          {showAddForm && (
            <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                New Milestone
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={msDate}
                    max={today}
                    onChange={(e) => setMsDate(e.target.value)}
                    className="text-sm"
                    data-testid="input-ms-date"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Event</Label>
                  <Input
                    value={msLabel}
                    onChange={(e) => setMsLabel(e.target.value)}
                    placeholder="e.g. Started amoxicillin"
                    className="text-sm"
                    data-testid="input-ms-label"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Notes (optional)
                </Label>
                <Textarea
                  value={msNotes}
                  onChange={(e) => setMsNotes(e.target.value)}
                  placeholder="Any additional context..."
                  className="resize-none h-16 text-sm"
                  data-testid="input-ms-notes"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddMilestone}
                  disabled={!msLabel.trim()}
                  data-testid="button-save-milestone"
                >
                  Save Milestone
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Milestone list */}
          {milestones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Flag className="w-7 h-7 mb-2 opacity-25" />
              <p className="text-sm">No milestones yet</p>
              <p className="text-xs mt-0.5">
                Add events to mark important moments in your child's treatment journey.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...milestones]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((ms) => {
                  const inRange =
                    rangeMode === "all" ||
                    (ms.date >= startDate && ms.date <= endDate);
                  return (
                    <div
                      key={ms.id}
                      className={`flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors ${
                        inRange
                          ? "border-border bg-background"
                          : "border-border/40 bg-muted/30 opacity-50"
                      }`}
                      data-testid={`milestone-row-${ms.id}`}
                    >
                      <Flag className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {ms.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {fmtDate(ms.date)}
                          </span>
                          {!inRange && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              outside range
                            </span>
                          )}
                        </div>
                        {ms.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {ms.notes}
                          </p>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            data-testid={`button-delete-milestone-${ms.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this milestone?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{ms.label}" on {fmtDate(ms.date)} will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMilestone(ms.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Export button ── */}
      <div className="flex items-center gap-4 pt-1 pb-6">
        <Button
          size="lg"
          onClick={generatePDF}
          disabled={filteredLogs.length === 0 && filteredMeds.length === 0 && filteredMilestones.length === 0}
          className="gap-2"
          data-testid="button-export-pdf"
        >
          <FileDown className="w-4 h-4" />
          Download PDF
        </Button>
        {filteredLogs.length === 0 && filteredMeds.length === 0 && filteredMilestones.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No data in the selected range to export.
          </p>
        )}
      </div>
    </div>
  );
}
