import { format, subDays } from "date-fns";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useMedications } from "@/hooks/useMedications";
import { Medication, MedicationType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Printer, ArrowLeft } from "lucide-react";

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

  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const recentLogs = [...logs]
    .filter((l) => l.date >= thirtyDaysAgo)
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeMeds = medications.filter((m) => !m.endDate || m.endDate >= today);
  const pastMeds = medications.filter((m) => m.endDate && m.endDate < today);

  const logsWithNotes = recentLogs.filter((l) => l.notes && l.notes.trim());

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Print controls - hidden on actual print */}
      <div className="print:hidden bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" className="gap-2 text-muted-foreground" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Print Summary</p>
          <p className="text-xs text-muted-foreground">For doctor appointments</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2" data-testid="button-print">
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      <style>{`
        @media print {
          @page { margin: 0.75in; size: letter portrait; }
          body { font-size: 10pt; color: #111; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          h2 { page-break-after: avoid; }
          .print-section { page-break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="border-b-2 border-gray-200 pb-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            PANS &amp; PANDAS Symptom Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generated on {format(new Date(), "MMMM d, yyyy")} &bull; Last 30 days
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Covering {format(new Date(thirtyDaysAgo + "T12:00:00"), "MMMM d")} – {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>

        {/* Medications section */}
        <div className="mb-8 print-section">
          <h2 className="text-base font-bold text-gray-800 mb-3 uppercase tracking-wide text-xs border-b border-gray-100 pb-1">
            Current Medications
          </h2>
          {activeMeds.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No active medications recorded.</p>
          ) : (
            <table className="w-full text-sm mb-2">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Dose</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Started</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {activeMeds.map((med) => (
                  <tr key={med.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium">{med.name}</td>
                    <td className="py-2 pr-4 text-gray-600">{med.dose}</td>
                    <td className="py-2 pr-4 text-gray-600">{MED_TYPE_LABELS[med.type]}</td>
                    <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                      {format(new Date(med.startDate + "T12:00:00"), "MMM d, yyyy")}
                    </td>
                    <td className="py-2 text-gray-500 text-xs">{med.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pastMeds.length > 0 && (
            <>
              <h2 className="text-base font-bold text-gray-800 mt-6 mb-3 uppercase tracking-wide text-xs border-b border-gray-100 pb-1">
                Past Medications (last 30 days)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Dose</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Dates</th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {pastMeds
                    .filter((m) => m.startDate >= thirtyDaysAgo || (m.endDate && m.endDate >= thirtyDaysAgo))
                    .map((med) => (
                      <tr key={med.id} className="border-b border-gray-100 text-gray-500">
                        <td className="py-2 pr-4">{med.name}</td>
                        <td className="py-2 pr-4">{med.dose}</td>
                        <td className="py-2 pr-4">{MED_TYPE_LABELS[med.type]}</td>
                        <td className="py-2 pr-4 whitespace-nowrap text-xs">
                          {format(new Date(med.startDate + "T12:00:00"), "MMM d")} – {med.endDate ? format(new Date(med.endDate + "T12:00:00"), "MMM d, yyyy") : "ongoing"}
                        </td>
                        <td className="py-2 text-xs">{med.notes || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Symptom log table */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-gray-800 mb-3 uppercase tracking-wide text-xs border-b border-gray-100 pb-1">
            30-Day Symptom Log
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            OCD, Anxiety, Rage, Tics: 0 (none) – 5 (extreme) &nbsp;·&nbsp;
            Sleep &amp; Cognition: 0 (poor) – 5 (excellent)
          </p>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No symptom data recorded for this period.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase">OCD</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Anxiety</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Rage</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Tics</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Sleep</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Cognition</th>
                  <th className="text-left py-2 pl-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, i) => (
                  <tr key={log.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-gray-50/50" : ""}`}>
                    <td className="py-1.5 pr-3 font-medium text-xs whitespace-nowrap">
                      {format(new Date(log.date + "T12:00:00"), "MMM d, yyyy")}
                    </td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs">{log.ocd}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs">{log.anxiety}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs">{log.rage}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs">{log.tics}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs">{log.sleep}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-xs">{log.cognition}</td>
                    <td className="py-1.5 pl-3 text-xs text-gray-500 max-w-xs">{log.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Notes section */}
        {logsWithNotes.length > 0 && (
          <div className="print-section">
            <h2 className="text-base font-bold text-gray-800 mb-3 uppercase tracking-wide text-xs border-b border-gray-100 pb-1">
              Daily Notes
            </h2>
            <div className="space-y-2">
              {logsWithNotes.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-xs font-semibold text-gray-500 whitespace-nowrap pt-0.5 w-24 flex-shrink-0">
                    {format(new Date(log.date + "T12:00:00"), "MMM d, yyyy")}
                  </span>
                  <p className="text-xs text-gray-700 flex-1">{log.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          <p>Printed from PANS &amp; PANDAS Tracker &bull; {format(new Date(), "MMMM d, yyyy")}</p>
          <p className="mt-0.5">All data is stored locally on this device and is not shared.</p>
        </div>
      </div>
    </div>
  );
}
