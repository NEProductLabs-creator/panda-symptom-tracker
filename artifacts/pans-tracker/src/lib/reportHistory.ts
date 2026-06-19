export type ReportVariant = 'first_appointment' | 'er_visit' | 'follow_up';

export interface ReportHistoryItem {
  id: string;
  variant: ReportVariant;
  visitDate: string;
  generatedAt: string;
  childName?: string;
}

const KEY = 'pans_tracker_report_history';

export function getReportHistory(): ReportHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch { return []; }
}

export function addReportToHistory(item: Omit<ReportHistoryItem, 'id' | 'generatedAt'>): void {
  const history = getReportHistory();
  const next: ReportHistoryItem = {
    ...item,
    id: Math.random().toString(36).slice(2),
    generatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([next, ...history].slice(0, 20)));
}

export function setReportHistory(items: ReportHistoryItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function clearReportHistory(): void {
  localStorage.removeItem(KEY);
}

export const VARIANT_LABELS: Record<ReportVariant, string> = {
  first_appointment: 'First appointment',
  er_visit: 'ER visit',
  follow_up: 'Follow-up with PANS provider',
};
