import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { format, parseISO, subDays } from "date-fns";
import { Activity, AlertCircle, Pill, Star, Clock } from "lucide-react";
import type {
  SymptomLog,
  Medication,
  MedLibraryItem,
  Milestone,
  ChildBaseline,
  PTECLog,
} from "@/lib/types";
import SymptomChart from "@/components/charts/SymptomChart";

type ShareMeta = {
  expiresAt: string;
  includeNotes: boolean;
};

type ShareData = {
  logs: SymptomLog[];
  ptecLogs: PTECLog[];
  medications: Medication[];
  medLibrary: MedLibraryItem[];
  baseline: ChildBaseline | null;
  milestones: Milestone[];
  meta: ShareMeta;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; code: "expired" | "revoked" | "not_found" | "network" }
  | { status: "ok"; data: ShareData };

export default function SharedView() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "error", code: "not_found" });
      return;
    }
    fetch(`/api/shares/${token}`)
      .then(async (res) => {
        if (res.status === 410) {
          const body = await res.json().catch(() => ({}));
          const code = body.error === "revoked" ? "revoked" : "expired";
          setState({ status: "error", code });
          return;
        }
        if (res.status === 404) {
          setState({ status: "error", code: "not_found" });
          return;
        }
        if (!res.ok) throw new Error("server_error");
        const data = (await res.json()) as ShareData;
        setState({ status: "ok", data });
      })
      .catch(() => setState({ status: "error", code: "network" }));
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Activity className="w-8 h-8 animate-pulse" />
          <p className="text-sm">Loading shared tracker…</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    const messages: Record<typeof state.code, { title: string; body: string }> = {
      expired: {
        title: "This share link has expired",
        body: "The parent can create a new share link from their Settings.",
      },
      revoked: {
        title: "This share link has been revoked",
        body: "The parent has deactivated this link.",
      },
      not_found: {
        title: "Share link not found",
        body: "Double-check the URL and try again.",
      },
      network: {
        title: "Couldn't load the tracker",
        body: "Check your connection and reload the page.",
      },
    };
    const msg = messages[state.code];
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full rounded-2xl border border-border bg-card shadow-sm p-8 space-y-3 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h1
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {msg.title}
          </h1>
          <p className="text-sm text-muted-foreground">{msg.body}</p>
        </div>
      </div>
    );
  }

  const { data } = state;
  const { baseline, medications, medLibrary, milestones, logs, meta } = data;

  const childName = baseline?.childName ?? "your patient";
  const expiresLabel = format(parseISO(meta.expiresAt), "MMM d, yyyy");

  const cutoff = subDays(new Date(), 30).toISOString().slice(0, 10);
  const recentLogs = [...logs]
    .filter((l) => l.date >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const activeMeds = medications.filter(
    (m) => !m.endDate || m.endDate >= new Date().toISOString().slice(0, 10),
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Read-only banner */}
      <div
        className="sticky top-0 z-10 border-b border-border/60 px-4 py-3"
        style={{ background: "var(--bg-subtle, hsl(36 33% 97%))" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              Shared tracker for{" "}
              <span className="text-primary">{childName}</span>
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · Read-only
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="w-3.5 h-3.5" />
            Expires {expiresLabel}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        {/* Baseline summary */}
        {baseline && (
          <div className="rounded-2xl border border-border bg-card shadow-sm px-5 py-4 space-y-1">
            <h2
              className="text-sm font-bold text-foreground mb-2"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              About {childName}
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              {baseline.childAge && (
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground">Age:</span>
                  <span className="text-foreground">{baseline.childAge}</span>
                </div>
              )}
              {baseline.sleepHours && (
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground">Typical sleep:</span>
                  <span className="text-foreground">{baseline.sleepHours} hrs</span>
                </div>
              )}
              {baseline.appetite && (
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground">Appetite:</span>
                  <span className="text-foreground">{baseline.appetite}</span>
                </div>
              )}
              {baseline.activityLevel && (
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground">Activity:</span>
                  <span className="text-foreground capitalize">{baseline.activityLevel}</span>
                </div>
              )}
            </div>
            {baseline.description && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {baseline.description}
              </p>
            )}
          </div>
        )}

        {/* 30-day symptom chart */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <h2
              className="text-sm font-bold text-foreground"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              30-day symptom trend
            </h2>
          </div>
          <div className="p-4">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No symptom data logged yet.
              </p>
            ) : (
              <SymptomChart
                logs={logs}
                medications={medications}
                medLibrary={medLibrary}
                milestones={milestones}
                days={30}
              />
            )}
          </div>
        </div>

        {/* Recent log entries */}
        {recentLogs.length > 0 && (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <h2
                className="text-sm font-bold text-foreground"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Recent entries
              </h2>
            </div>
            <div className="divide-y divide-border/60">
              {recentLogs.map((log) => {
                const scores = [
                  log.ocd, log.anxiety, log.rage, log.tics,
                  log.sleep, log.cognition,
                ].filter((v) => v !== null && v !== undefined) as number[];
                const avg =
                  scores.length > 0
                    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                    : null;
                return (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-4">
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs font-semibold text-foreground">
                        {format(parseISO(log.date), "MMM d")}
                      </div>
                      {log.calmDay && (
                        <div className="text-[10px] text-emerald-600 font-medium">Calm day</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            ["OCD", log.ocd],
                            ["Anxiety", log.anxiety],
                            ["Rage", log.rage],
                            ["Tics", log.tics],
                            ["Sleep", log.sleep],
                            ["Cognition", log.cognition],
                          ] as [string, number | null | undefined][]
                        )
                          .filter(([, v]) => v !== null && v !== undefined)
                          .map(([label, v]) => (
                            <span
                              key={label}
                              className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium"
                            >
                              {label} {v}
                            </span>
                          ))}
                      </div>
                      {meta.includeNotes && log.notes && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {log.notes}
                        </p>
                      )}
                    </div>
                    {avg !== null && (
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs font-bold text-foreground">{avg}</div>
                        <div className="text-[10px] text-muted-foreground">avg</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Medications */}
        {activeMeds.length > 0 && (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Pill className="w-4 h-4 text-primary" />
              </div>
              <h2
                className="text-sm font-bold text-foreground"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Current medications
              </h2>
            </div>
            <div className="divide-y divide-border/60">
              {activeMeds.map((med) => (
                <div key={med.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{med.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {med.dose && <span>{med.dose}</span>}
                      {med.dose && med.type && <span> · </span>}
                      {med.type && <span className="capitalize">{med.type}</span>}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                    {med.startDate && (
                      <div>Since {format(parseISO(med.startDate), "MMM d, yyyy")}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <h2
                className="text-sm font-bold text-foreground"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Milestones
              </h2>
            </div>
            <div className="divide-y divide-border/60">
              {[...milestones]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 10)
                .map((m) => (
                  <div key={m.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="flex-shrink-0 text-xs text-muted-foreground pt-0.5 w-16">
                      {format(parseISO(m.date), "MMM d")}
                    </div>
                    <p className="text-sm text-foreground leading-snug">{m.notes}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          This is a read-only view. Data is provided by the child's care team.
        </p>
      </div>
    </div>
  );
}
