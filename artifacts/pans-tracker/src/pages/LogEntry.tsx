import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ClipboardList } from "lucide-react";
import { SymptomLog } from "@/lib/types";
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

const CATEGORIES = [
  { key: "ocd", label: "OCD Behaviors" },
  { key: "anxiety", label: "Anxiety" },
  { key: "rage", label: "Rage / Dysregulation" },
  { key: "tics", label: "Tics" },
  { key: "sleep", label: "Sleep Quality" },
  { key: "cognition", label: "School / Cognition" },
] as const;

function ScoreBubble({ value, active, onClick }: { value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-sm scale-105"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {value}
    </button>
  );
}

function ScoreBadge({ value }: { value: number }) {
  const colors = ["", "bg-green-100 text-green-700", "bg-lime-100 text-lime-700", "bg-yellow-100 text-yellow-700", "bg-orange-100 text-orange-700", "bg-red-100 text-red-700"];
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${colors[value] ?? ""}`}>
      {value}
    </span>
  );
}

export default function LogEntry() {
  const { logs, addLog, deleteLog } = useSymptomLogs();
  const { toast } = useToast();

  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);

  const existing = logs.find((l) => l.date === selectedDate);

  const [scores, setScores] = useState({
    ocd: 1,
    anxiety: 1,
    rage: 1,
    tics: 1,
    sleep: 1,
    cognition: 1,
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setScores({
        ocd: existing.ocd,
        anxiety: existing.anxiety,
        rage: existing.rage,
        tics: existing.tics,
        sleep: existing.sleep,
        cognition: existing.cognition,
      });
      setNotes(existing.notes ?? "");
    } else {
      setScores({ ocd: 1, anxiety: 1, rage: 1, tics: 1, sleep: 1, cognition: 1 });
      setNotes("");
    }
  }, [selectedDate, existing?.id]);

  function handleSave() {
    const log: SymptomLog = {
      id: existing?.id ?? `log-${Date.now()}`,
      date: selectedDate,
      ...scores,
      notes,
    };
    addLog(log);
    toast({ title: "Log saved", description: `Symptoms saved for ${format(new Date(selectedDate + "T12:00:00"), "MMMM d, yyyy")}.` });
  }

  const recent = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
          Daily Log
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Record symptom scores for any day</p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
            {existing ? "Edit Entry" : "New Entry"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</Label>
            <Input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48 text-sm"
              data-testid="input-date"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {cat.label}
                </Label>
                <div className="flex gap-1.5" data-testid={`score-${cat.key}`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <ScoreBubble
                      key={n}
                      value={n}
                      active={scores[cat.key] === n}
                      onClick={() => setScores((s) => ({ ...s, [cat.key]: n }))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, triggers, context..."
              className="resize-none h-24 text-sm"
              data-testid="input-log-notes"
            />
          </div>

          <Button onClick={handleSave} data-testid="button-save-entry">
            {existing ? "Update Entry" : "Save Entry"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent entries */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            <ClipboardList className="w-4 h-4 text-primary" />
            Recent Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ClipboardList className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No entries yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="log-table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">OCD</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Anx</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Rage</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Tics</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Sleep</th>
                    <th className="py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Cogn</th>
                    <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Notes</th>
                    <th className="py-3 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((log) => (
                    <tr
                      key={log.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${selectedDate === log.date ? "bg-accent/40" : ""}`}
                      onClick={() => setSelectedDate(log.date)}
                      data-testid={`log-row-${log.date}`}
                    >
                      <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                        {format(new Date(log.date + "T12:00:00"), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 px-2 text-center"><ScoreBadge value={log.ocd} /></td>
                      <td className="py-3 px-2 text-center"><ScoreBadge value={log.anxiety} /></td>
                      <td className="py-3 px-2 text-center"><ScoreBadge value={log.rage} /></td>
                      <td className="py-3 px-2 text-center"><ScoreBadge value={log.tics} /></td>
                      <td className="py-3 px-2 text-center"><ScoreBadge value={log.sleep} /></td>
                      <td className="py-3 px-2 text-center"><ScoreBadge value={log.cognition} /></td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate text-xs">
                        {log.notes || "—"}
                      </td>
                      <td className="py-3 px-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-delete-log-${log.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the log for{" "}
                                {format(new Date(log.date + "T12:00:00"), "MMMM d, yyyy")}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  deleteLog(log.id);
                                  toast({ title: "Entry deleted" });
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
