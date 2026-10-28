const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(value: string | null | undefined): value is string {
  if (!value || !YMD.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function shanghaiToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shanghaiDate(iso: string): string {
  // Do not call isYmd here: its `value is string` predicate turns the
  // remaining branch into `never` when the argument is already a string.
  if (YMD.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) return iso;
  }
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso.slice(0, 10);
  return shanghaiToday(dt);
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function monthKey(ymd: string): string {
  return ymd.slice(0, 7);
}

export function monthEnd(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function addMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d, last);
  const out = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day));
  return out.toISOString().slice(0, 10);
}

export function mondayOf(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const mon0 = (utc.getUTCDay() + 6) % 7;
  return addDays(ymd, -mon0);
}

export function isMonday(ymd: string): boolean {
  return mondayOf(ymd) === ymd;
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

export const PRESETS = ["today", "yesterday", "7d", "week", "month", "last_month", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export function presetRange(preset: Preset, today: string): { from: string; to: string } {
  if (preset === "today") return { from: today, to: today };
  if (preset === "yesterday") {
    const y = addDays(today, -1);
    return { from: y, to: y };
  }
  if (preset === "7d") return { from: addDays(today, -6), to: today };
  if (preset === "week") return { from: mondayOf(today), to: today };
  if (preset === "last_month") {
    const prev = addMonths(monthStart(today), -1);
    return { from: monthStart(prev), to: monthEnd(prev) };
  }
  return { from: monthStart(today), to: today };
}

export function resolveRange(
  params: { preset?: string; from?: string; to?: string },
  today: string,
): { preset: Preset; from: string; to: string } {
  const preset = (PRESETS as readonly string[]).includes(params.preset ?? "")
    ? (params.preset as Preset)
    : "month";
  if (preset === "custom") {
    let from = isYmd(params.from) ? params.from : monthStart(today);
    let to = isYmd(params.to) ? params.to : today;
    if (from > to) [from, to] = [to, from];
    const cap = addDays(from, 366);
    if (to > cap) to = cap;
    return { preset, from, to };
  }
  return { preset, ...presetRange(preset, today) };
}

export function inRange(ymd: string | null | undefined, from: string, to: string): boolean {
  if (!ymd) return false;
  const day = ymd.slice(0, 10);
  return day >= from && day <= to;
}

export function weekEnd(monday: string): string {
  return addDays(monday, 6);
}
