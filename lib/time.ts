import { APP_TIMEZONE } from "./config";

/** Returns the calendar date ("YYYY-MM-DD") for an epoch-ms in the given tz. */
export function tzDateKey(ms: number, tz: string = APP_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Human label for a day key, e.g. "Mon Jun 22". */
export function formatDayLabel(dayKey: string, tz: string = APP_TIMEZONE): string {
  // Anchor at local noon so the date doesn't slip across tz boundaries.
  const d = new Date(`${dayKey}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Kickoff clock time, e.g. "2:00 PM". */
export function formatKickoff(ms: number, tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}
