import { useState } from "react";
import { WellbeingLog } from "@/lib/types";

const STORAGE_KEY = "pans_tracker_wellbeing";

function loadLogs(): WellbeingLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WellbeingLog[]) : [];
  } catch {
    return [];
  }
}

function persistLogs(logs: WellbeingLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function useWellbeingLogs() {
  const [logs, setLogs] = useState<WellbeingLog[]>(loadLogs);

  function upsertLog(entry: Omit<WellbeingLog, "id"> & { id?: string }) {
    setLogs((prev) => {
      const existing = prev.find((l) => l.date === entry.date);
      let next: WellbeingLog[];
      if (existing) {
        next = prev.map((l) =>
          l.date === entry.date ? { ...l, ...entry, id: l.id } : l
        );
      } else {
        const id = entry.id ?? `wlog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        next = [...prev, { ...entry, id }];
      }
      persistLogs(next);
      return next;
    });
  }

  function deleteLog(id: string) {
    setLogs((prev) => {
      const next = prev.filter((l) => l.id !== id);
      persistLogs(next);
      return next;
    });
  }

  return { logs, upsertLog, deleteLog };
}
