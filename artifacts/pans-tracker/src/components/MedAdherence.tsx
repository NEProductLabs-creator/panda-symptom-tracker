import { format, subDays } from "date-fns";
import { MedLibraryItem, SymptomLog } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

interface Props {
  medLibrary: MedLibraryItem[];
  logs: SymptomLog[];
}

export default function MedAdherence({ medLibrary, logs }: Props) {
  if (medLibrary.length === 0) return null;

  const today = new Date();
  const days30 = Array.from({ length: 30 }, (_, i) =>
    subDays(today, 29 - i)
  );

  const logMap = new Map(logs.map((l) => [l.date, l]));

  const loggedDates = new Set(
    days30
      .map((d) => format(d, "yyyy-MM-dd"))
      .filter((ds) => logMap.has(ds))
  );

  const headerDays = days30.filter((_, i) => i === 0 || i % 5 === 0 || i === 29);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle
          className="text-base font-semibold flex items-center gap-2"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          <CalendarDays className="w-4 h-4 text-primary" />
          Medication Adherence · Last 30 Days
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Filled = taken · Empty ring = missed · Faded = no log that day
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-1 px-1 pb-2">
          <div style={{ minWidth: 480 }}>
            <div className="flex items-end gap-0 mb-2 pl-[136px]">
              {days30.map((d, i) => {
                const show = i === 0 || i % 5 === 0 || i === 29;
                const ds = format(d, "yyyy-MM-dd");
                const isToday = ds === format(today, "yyyy-MM-dd");
                return (
                  <div
                    key={ds}
                    className="flex-shrink-0"
                    style={{ width: 16, marginRight: 2 }}
                  >
                    {show && (
                      <div
                        className="text-center leading-none"
                        style={{
                          fontSize: 8,
                          color: isToday
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted-foreground))",
                          fontWeight: isToday ? 700 : 400,
                          whiteSpace: "nowrap",
                          transform: "rotate(-45deg) translateX(-4px)",
                          transformOrigin: "center bottom",
                        }}
                      >
                        {format(d, "M/d")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {medLibrary.map((med) => {
              let takenCount = 0;
              let loggedCount = 0;

              days30.forEach((d) => {
                const ds = format(d, "yyyy-MM-dd");
                const log = logMap.get(ds);
                if (log) {
                  loggedCount++;
                  if (log.medicationsTaken?.includes(med.id)) takenCount++;
                }
              });

              const adherencePct =
                loggedCount > 0
                  ? Math.round((takenCount / loggedCount) * 100)
                  : 0;
              const adherenceColor =
                adherencePct >= 80
                  ? "#22c55e"
                  : adherencePct >= 50
                  ? "#f59e0b"
                  : "#ef4444";

              return (
                <div
                  key={med.id}
                  className="flex items-center gap-0 py-1.5 border-b border-border/40 last:border-0"
                >
                  <div className="flex-shrink-0 pr-3" style={{ width: 136 }}>
                    <p className="text-xs font-semibold text-foreground truncate leading-tight">
                      {med.name}
                    </p>
                    <p
                      className="text-[10px] font-medium leading-tight mt-0.5"
                      style={{ color: adherenceColor }}
                    >
                      {loggedCount > 0 ? `${adherencePct}% this month` : "No logs yet"}
                    </p>
                  </div>

                  <div className="flex items-center gap-0">
                    {days30.map((d) => {
                      const ds = format(d, "yyyy-MM-dd");
                      const log = logMap.get(ds);
                      const hasLog = !!log;
                      const taken = log?.medicationsTaken?.includes(med.id) ?? false;
                      const isToday = ds === format(today, "yyyy-MM-dd");

                      return (
                        <div
                          key={ds}
                          className="flex-shrink-0 flex items-center justify-center"
                          style={{ width: 16, height: 16, marginRight: 2 }}
                          title={`${format(d, "MMM d")}: ${
                            taken ? "taken" : hasLog ? "missed" : "no log"
                          }`}
                        >
                          <div
                            style={{
                              width: taken ? 11 : 9,
                              height: taken ? 11 : 9,
                              borderRadius: "50%",
                              backgroundColor: taken ? adherenceColor : "transparent",
                              border: taken
                                ? `2px solid ${adherenceColor}`
                                : hasLog
                                ? "1.5px solid hsl(var(--muted-foreground)/50)"
                                : "1.5px dashed hsl(var(--muted-foreground)/20)",
                              outline: isToday
                                ? "1.5px solid hsl(var(--primary))"
                                : undefined,
                              outlineOffset: isToday ? "1px" : undefined,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
