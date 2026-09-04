export type DashboardRangePreset = "7d" | "30d" | "90d" | "ytd" | "all" | "custom";
export type DashboardGranularity = "day" | "week" | "month";

export interface DashboardRange {
  preset: DashboardRangePreset;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  days: number;
  granularity: DashboardGranularity;
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function dateFromIso(value: string) {
  if (!isoDate.test(value)) throw new Error("Dates must use YYYY-MM-DD format");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid dashboard date");
  return date;
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function resolveDashboardRange(
  input: { preset?: string | null; start?: string | null; end?: string | null },
  now = new Date(),
): DashboardRange {
  const allowed = new Set<DashboardRangePreset>(["7d", "30d", "90d", "ytd", "all", "custom"]);
  const preset = allowed.has(input.preset as DashboardRangePreset) ? input.preset as DashboardRangePreset : "30d";
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let end = preset === "custom" && input.end ? dateFromIso(input.end) : today;
  let start: Date;

  if (preset === "custom") {
    if (!input.start || !input.end) throw new Error("Choose both a start and end date");
    start = dateFromIso(input.start);
    end = dateFromIso(input.end);
  } else if (preset === "ytd") {
    start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  } else if (preset === "all") {
    start = new Date(Date.UTC(2000, 0, 1));
  } else {
    start = addDays(end, -(Number(preset.slice(0, -1)) - 1));
  }

  if (start > end) throw new Error("Start date must be on or before end date");
  if (end > today) throw new Error("End date cannot be in the future");
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  const granularity: DashboardGranularity = days <= 45 ? "day" : days <= 180 ? "week" : "month";

  return {
    preset,
    start: toIso(start),
    end: toIso(end),
    previousStart: toIso(previousStart),
    previousEnd: toIso(previousEnd),
    days,
    granularity,
  };
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
