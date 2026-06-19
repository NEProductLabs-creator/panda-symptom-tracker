import { format, subDays } from "date-fns";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedications } from "@/hooks/useMedications";
import { useLabResults } from "@/hooks/useLabResults";
import { useActiveChild } from "@/hooks/useActiveChild";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { Medication, MedicationType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Printer, ArrowLeft, Baby } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  ocd: "OCD",
  anxiety: "Anxiety",
  rage: "Rage",
  tics: "Tics",
  sleep: "Sleep",
  cognition: "Cognition",
};

const MED_TYPE_LABELS: Record<MedicationType, string> = {
  antibiotic: "Antibiotic",
  ssri: "SSRI",
  supplement: "Supplement",
  ivig: "IVIG",
  steroid: "Steroid",
  other: "Other",
};

export default function PrintSummary() {
  const { logs } = useSymptomLogs();
  const { medications } = useMedications();
  const { entries: labEntries } = useLabResults();
  const activeChild = useActiveChild();
  const { baseline } = useChildBaseline();
  const childName = activeChild?.name ?? baseline?.childName?.trim() ?? "";

  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const recentLogs = [...logs]
    .filter((l) => l.date >= thirtyDaysAgo)
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeMeds = medications.filter((m) => !m.endDate || m.endDate >= today);
  const pastMeds = medications.filter((m) => m.endDate && m.endDate < today);

  const logsWithNotes = recentLogs.filter((l) => l.notes && l.notes.trim());

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Print controls - hidden on actual print */}
      <div className="print:hidden bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" className="gap-2 text-muted-foreground" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "Fraunces, serif" }}>Print Summary</p>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "Newsreader, serif", fontStyle: "italic" }}>For doctor appointments</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2" data-testid="button-print">
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      <style>{`
        @media print {
          @page { margin: 0.75in; size: letter portrait; }
          body {
            font-size: 10pt;
            font-family: 'Newsreader', Georgia, serif;
            color: hsl(27, 26%, 18%);
            background: #ffffff;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Fraunces', serif;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          h2 { page-break-after: avoid; }
          .print-section { page-break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* No child empty state */}
        {!activeChild && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Baby className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No child profile yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add a child to generate a print summary.</p>
            </div>
            <Link href="/onboarding/add-child">
              <Button size="sm">Add a child</Button>
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-border pb-6 mb-8">
          <p className="text-sm italic text-muted-foreground mb-1" style={{ fontFamily: "Newsreader, serif", color: "var(--terracotta)" }}>
            Doctor Visit Summary
          </p>
          <h1 className="text-3xl font-semibold text-foreground" style={{ fontFamily: "Fraunces, serif", letterSpacing: "-0.02em", fontWeight: 400 }}>
            PANS &amp; PANDAS Symptom Report
          </h1>
          {childName && (
            <p className="text-lg text-foreground mt-1" style={{ fontFamily: "Fraunces, serif", fontWeight: 400 }}>
              {childName}
            </p>
          )}
          <noscript>
            <p style={{ fontFamily: "Newsreader, serif", fontSize: "0.875rem", color: "#666" }}>
              {childName ? `Report generated for ${childName}` : "Report generated from PANS & PANDAS Tracker"}
            </p>
          </noscript>
          <p className="text-sm text-muted-foreground mt-2" style={{ fontFamily: "Newsreader, serif" }}>
            Generated {format(new Date(), "MMMM d, yyyy")} &bull; Covering the last 30 days
          </p>
          <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "Newsreader, serif" }}>
            {format(new Date(thirtyDaysAgo + "T12:00:00"), "MMMM d")} – {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>

        {/* Medications section */}
        <div className="mb-10 print-section">
          <h2 className="text-[11px] font-semibold text-foreground uppercase tracking-widest border-b border-border pb-2 mb-4" style={{ fontFamily: "Newsreader, serif", letterSpacing: "0.12em" }}>
            Current Medications
          </h2>
          {activeMeds.length === 0 ? (
            <p className="text-sm text-muted-foreground italic" style={{ fontFamily: "Newsreader, serif" }}>No active medications recorded.</p>
          ) : (
            <table className="w-full text-sm mb-2">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dose</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Started</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody>
                {activeMeds.map((med) => (
                  <tr key={med.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{med.name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{med.dose}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{MED_TYPE_LABELS[med.type]}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(med.startDate + "T12:00:00"), "MMM d, yyyy")}
                    </td>
                    <td className="py-2.5 text-muted-foreground text-xs">{med.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pastMeds.length > 0 && (
            <>
              <h2 className="text-[11px] font-semibold text-foreground uppercase tracking-widest border-b border-border pb-2 mb-4 mt-8" style={{ fontFamily: "Newsreader, serif", letterSpacing: "0.12em" }}>
                Past Medications (last 30 days)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dose</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dates</th>
                    <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {pastMeds
                    .filter((m) => m.startDate >= thirtyDaysAgo || (m.endDate && m.endDate >= thirtyDaysAgo))
                    .map((med) => (
                      <tr key={med.id} className="border-b border-border/50 text-muted-foreground">
                        <td className="py-2.5 pr-4">{med.name}</td>
                        <td className="py-2.5 pr-4">{med.dose}</td>
                        <td className="py-2.5 pr-4">{MED_TYPE_LABELS[med.type]}</td>
                        <td className="py-2.5 pr-4 whitespace-nowrap text-xs">
                          {format(new Date(med.startDate + "T12:00:00"), "MMM d")} – {med.endDate ? format(new Date(med.endDate + "T12:00:00"), "MMM d, yyyy") : "ongoing"}
                        </td>
                        <td className="py-2.5 text-xs">{med.notes || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Lab results section */}
        {labEntries.length > 0 && (
          <div className="mb-10 print-section">
            <h2 className="text-[11px] font-semibold text-foreground uppercase tracking-widest border-b border-border pb-2 mb-4" style={{ fontFamily: "Newsreader, serif", letterSpacing: "0.12em" }}>
              Lab Results
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Test</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lab</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...labEntries]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((lab) => (
                    <tr key={lab.id} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap text-xs">
                        {format(new Date(lab.date + "T12:00:00"), "MMM d, yyyy")}
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{lab.test_name}</td>
                      <td className="py-2.5 pr-4 text-foreground">
                        {lab.result_value != null
                          ? `${lab.result_value}${lab.result_unit ? ` ${lab.result_unit}` : ""}`
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">{lab.reference_range || "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">{lab.lab_name || "—"}</td>
                      <td className="py-2.5 text-muted-foreground text-xs">{lab.notes || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Symptom log table */}
        <div className="mb-10">
          <h2 className="text-[11px] font-semibold text-foreground uppercase tracking-widest border-b border-border pb-2 mb-4" style={{ fontFamily: "Newsreader, serif", letterSpacing: "0.12em" }}>
            30-Day Symptom Log
          </h2>
          <p className="text-xs text-muted-foreground mb-4 italic" style={{ fontFamily: "Newsreader, serif" }}>
            OCD, Anxiety, Rage, Tics: 0 (none) – 5 (extreme) &nbsp;·&nbsp;
            Sleep &amp; Cognition: 0 (poor) – 5 (excellent)
          </p>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic" style={{ fontFamily: "Newsreader, serif" }}>No symptom data recorded for this period.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">OCD</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Anxiety</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rage</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tics</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sleep</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cognition</th>
                  <th className="text-left py-2 pl-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, i) => (
                  <tr key={log.id} className={`border-b border-border/40 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                    <td className="py-1.5 pr-3 font-medium text-xs whitespace-nowrap text-foreground">
                      {format(new Date(log.date + "T12:00:00"), "MMM d, yyyy")}
                    </td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs text-foreground">{log.ocd}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs text-foreground">{log.anxiety}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs text-foreground">{log.rage}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs text-foreground">{log.tics}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs text-foreground">{log.sleep}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs text-foreground">{log.cognition}</td>
                    <td className="py-1.5 pl-3 text-xs text-muted-foreground max-w-xs">{log.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Notes section */}
        {logsWithNotes.length > 0 && (
          <div className="print-section">
            <h2 className="text-[11px] font-semibold text-foreground uppercase tracking-widest border-b border-border pb-2 mb-4" style={{ fontFamily: "Newsreader, serif", letterSpacing: "0.12em" }}>
              Daily Notes
            </h2>
            <div className="space-y-3">
              {logsWithNotes.map((log) => (
                <div key={log.id} className="flex gap-4 border-b border-border/30 pb-3 last:border-0">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap pt-0.5 w-24 flex-shrink-0" style={{ fontFamily: "Fraunces, serif" }}>
                    {format(new Date(log.date + "T12:00:00"), "MMM d, yyyy")}
                  </span>
                  <p className="text-sm text-foreground flex-1 leading-relaxed">{log.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-border text-xs text-muted-foreground text-center" style={{ fontFamily: "Newsreader, serif", fontStyle: "italic" }}>
          <p>Printed from PANS &amp; PANDAS Tracker &bull; {format(new Date(), "MMMM d, yyyy")}</p>
          <p className="mt-0.5">All data is stored locally on this device and is not shared.</p>
        </div>
      </div>
    </div>
  );
}
