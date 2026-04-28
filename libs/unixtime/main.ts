export type UnitMode = "auto" | "seconds" | "milliseconds";

export type ParseError = "notNumeric" | "negative" | "tooLong" | "secondsTooLarge" | "outOfRange";

export interface ParseResult {
  ms?: number;
  error?: ParseError;
}

const MAX_MS = 253402300799999; // 9999-12-31T23:59:59.999Z

export function parseTimestamp(raw: string, mode: UnitMode): ParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") return {};
  if (!/^-?\d+$/.test(trimmed)) return { error: "notNumeric" };
  if (trimmed.startsWith("-")) return { error: "negative" };

  const digits = trimmed.length;
  if (digits >= 16) return { error: "tooLong" };

  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) return { error: "outOfRange" };

  let ms: number;
  if (mode === "seconds") {
    if (digits > 12) return { error: "secondsTooLarge" };
    ms = value * 1000;
  } else if (mode === "milliseconds") {
    ms = value;
  } else {
    // auto: ≤11 digits → seconds, 12-15 → milliseconds
    ms = digits <= 11 ? value * 1000 : value;
  }

  if (ms > MAX_MS) return { error: "outOfRange" };
  return { ms };
}

export function formatUtc(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

// Same string as formatUtc; kept as a separate name to document intent at call sites
export function formatSql(date: Date): string {
  return formatUtc(date);
}

export function formatRfc2822(date: Date): string {
  return date.toUTCString();
}

// ISO 8601 week number (UTC) — Thursday-of-week anchor
export function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayOfWeek + 3); // shift to Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diffDays = (target.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round(diffDays / 7);
}

// ISO 8601 week number (local timezone) — same algorithm using local date components
export function localIsoWeekNumber(date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayOfWeek + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diffDays = (target.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round(diffDays / 7);
}

// `offsetMinutes` follows the JS convention (Date.getTimezoneOffset): UTC minus local, in minutes.
// e.g. Asia/Shanghai = -480 → UTC+08:00.
export function formatTimezoneOffset(offsetMinutes: number): string {
  const sign = offsetMinutes <= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const m = (abs % 60).toString().padStart(2, "0");
  return `UTC${sign}${h}:${m}`;
}

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

export function formatRelative(from: Date, to: Date, locale: string): string {
  const diffMs = from.getTime() - to.getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const { unit, ms } of RELATIVE_UNITS) {
    if (Math.abs(diffMs) >= ms) {
      return rtf.format(Math.trunc(diffMs / ms), unit);
    }
  }
  return rtf.format(0, "second");
}

export type Tz = "local" | "utc" | (string & {});

export interface BuildDateInput {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  ms: number; // 0-999
  tz: Tz;
}

export function buildDate(input: BuildDateInput): Date | null {
  if (!input.date) return null;
  const dateParts = input.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeParts = input.time.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!dateParts || !timeParts) return null;

  const [, y, mo, d] = dateParts.map(Number);
  const [, h, mi, s] = timeParts.map(Number);
  const ms = Math.max(0, Math.min(999, Math.trunc(input.ms || 0)));

  if (input.tz === "utc") {
    const result = new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms));
    return Number.isNaN(result.getTime()) ? null : result;
  }

  if (input.tz === "local") {
    const result = new Date(y, mo - 1, d, h, mi, s, ms);
    return Number.isNaN(result.getTime()) ? null : result;
  }

  // IANA timezone: construct via a UTC date then adjust using timezone offset
  const utcDate = new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms));
  if (Number.isNaN(utcDate.getTime())) return null;

  const tzMs = new Date(utcDate.toLocaleString("en-US", { timeZone: input.tz })).getTime();
  const utcMs = new Date(utcDate.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const offset = tzMs - utcMs;

  const result = new Date(utcDate.getTime() - offset);
  return Number.isNaN(result.getTime()) ? null : result;
}

export type Preset = "now" | "todayMidnightLocal" | "todayMidnightUtc";

export interface DateParts {
  date: string;
  time: string;
  ms: number;
}

export function presetParts(preset: Preset, tz: Tz, ref: Date = new Date()): DateParts {
  if (preset === "now") {
    if (tz === "utc") {
      return {
        date: ref.toISOString().slice(0, 10),
        time: ref.toISOString().slice(11, 19),
        ms: ref.getUTCMilliseconds(),
      };
    }
    if (tz === "local") {
      return {
        date: `${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}-${pad2(ref.getDate())}`,
        time: `${pad2(ref.getHours())}:${pad2(ref.getMinutes())}:${pad2(ref.getSeconds())}`,
        ms: ref.getMilliseconds(),
      };
    }
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(ref);
    const tf = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).formatToParts(ref);
    const g = (parts: Intl.DateTimeFormatPart[], type: string) =>
      parts.find((x) => x.type === type)?.value ?? "00";
    return {
      date: `${g(p, "year")}-${g(p, "month")}-${g(p, "day")}`,
      time: `${g(tf, "hour")}:${g(tf, "minute")}:${g(tf, "second")}`,
      ms: ref.getMilliseconds(),
    };
  }
  if (preset === "todayMidnightUtc") {
    return { date: ref.toISOString().slice(0, 10), time: "00:00:00", ms: 0 };
  }
  // todayMidnightLocal
  return {
    date: `${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}-${pad2(ref.getDate())}`,
    time: "00:00:00",
    ms: 0,
  };
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Compute timezone offset string for ISO 8601, e.g. "+08:00" or "Z" */
export function tzOffsetIso(date: Date, tz: string): string {
  const tzMs = new Date(date.toLocaleString("en-US", { timeZone: tz })).getTime();
  const utcMs = new Date(date.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const diffMin = Math.round((tzMs - utcMs) / 60000);
  if (diffMin === 0) return "Z";
  const sign = diffMin > 0 ? "+" : "-";
  const abs = Math.abs(diffMin);
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/** Format date as ISO 8601 in the given timezone, e.g. "2024-05-01T08:00:00+08:00" */
export function formatIsoInTz(date: Date, tz: string): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const t = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);
  const g = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((x) => x.type === type)?.value ?? "00";
  return `${g(p, "year")}-${g(p, "month")}-${g(p, "day")}T${g(t, "hour")}:${g(t, "minute")}:${g(t, "second")}${tzOffsetIso(date, tz)}`;
}

/** Format date as RFC 2822 in the given timezone, e.g. "Wed, 01 May 2024 08:00:00 +0800" */
export function formatRfcInTz(date: Date, tz: string): string {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date);
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);
  const g = (type: string) => p.find((x) => x.type === type)?.value ?? "00";
  const offset = tzOffsetIso(date, tz) === "Z" ? "+0000" : tzOffsetIso(date, tz).replace(":", "");
  return `${weekday}, ${g("day")} ${g("month")} ${g("year")} ${g("hour")}:${g("minute")}:${g("second")} ${offset}`;
}
