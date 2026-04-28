import type { CronFieldValue, ExecutionResult, ParsedCron } from "./types";

interface Options {
  from?: Date;
  tz?: "local" | "utc";
  maxYears?: number;
}

const DEFAULT_MAX_YEARS = 4;
const MAX_ITER = 100_000;

export function nextExecutions(
  parsed: ParsedCron,
  count: number,
  opts: Options = {}
): ExecutionResult {
  if (!parsed.valid) return { executions: [], searchExhausted: false };

  const tz = opts.tz ?? "local";
  const start = opts.from ?? new Date();
  const maxYears = opts.maxYears ?? DEFAULT_MAX_YEARS;
  const limitMs = start.getTime() + maxYears * 366 * 24 * 60 * 60 * 1000;
  const useSeconds = parsed.mode !== "standard";

  let cursor = ceilToNextSecond(start, useSeconds, tz);
  const out: Date[] = [];

  for (let i = 0; i < MAX_ITER && out.length < count; i++) {
    if (cursor.getTime() > limitMs) {
      return { executions: out, searchExhausted: true, notice: "executor.searchWindowExhausted" };
    }
    const next = stepToNextMatch(cursor, parsed, useSeconds, tz);
    if (!next) {
      return {
        executions: out,
        searchExhausted: true,
        notice: out.length === 0 ? "warn.neverTriggers" : "executor.searchWindowExhausted",
      };
    }
    if (next.getTime() > limitMs) {
      return { executions: out, searchExhausted: true, notice: "executor.searchWindowExhausted" };
    }
    out.push(next);
    cursor = addSeconds(next, useSeconds ? 1 : 60, tz);
  }
  return { executions: out, searchExhausted: false };
}

function get(
  d: Date,
  part: "year" | "month" | "day" | "hour" | "minute" | "second" | "dow",
  tz: "local" | "utc"
): number {
  const f =
    tz === "utc"
      ? {
          year: () => d.getUTCFullYear(),
          month: () => d.getUTCMonth() + 1,
          day: () => d.getUTCDate(),
          hour: () => d.getUTCHours(),
          minute: () => d.getUTCMinutes(),
          second: () => d.getUTCSeconds(),
          dow: () => d.getUTCDay(),
        }
      : {
          year: () => d.getFullYear(),
          month: () => d.getMonth() + 1,
          day: () => d.getDate(),
          hour: () => d.getHours(),
          minute: () => d.getMinutes(),
          second: () => d.getSeconds(),
          dow: () => d.getDay(),
        };
  return f[part]();
}

function build(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  ss: number,
  tz: "local" | "utc"
): Date {
  return tz === "utc"
    ? new Date(Date.UTC(y, m - 1, d, hh, mm, ss))
    : new Date(y, m - 1, d, hh, mm, ss);
}

function addSeconds(d: Date, n: number, _tz: "local" | "utc"): Date {
  return new Date(d.getTime() + n * 1000);
}

function ceilToNextSecond(d: Date, useSeconds: boolean, tz: "local" | "utc"): Date {
  if (useSeconds) {
    return d.getMilliseconds() === 0 ? new Date(d) : new Date(Math.ceil(d.getTime() / 1000) * 1000);
  }
  const ms = d.getTime();
  const remainder = ms % 60000;
  return remainder === 0 ? new Date(d) : new Date(ms + (60000 - remainder));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function matches(value: CronFieldValue | undefined, n: number): boolean {
  if (!value || value.type === "any" || value.type === "noSpecific") return true;
  switch (value.type) {
    case "specific":
      return value.values!.includes(n);
    case "range":
      return n >= value.range!.from && n <= value.range!.to;
    case "step": {
      const { start, from, to, interval } = value.step!;
      const lo = start === "*" ? (from ?? 0) : (from ?? (start as number));
      const hi = to ?? Infinity;
      if (n < lo || n > hi) return false;
      return (n - lo) % interval === 0;
    }
    case "list":
      return value.listItems!.some((it) => matches(it, n));
    default:
      return false;
  }
}

function matchesYear(p: ParsedCron, year: number): boolean {
  if (p.mode !== "quartz") return true;
  return matches(p.fields.year, year);
}

function matchesDayConjunction(p: ParsedCron, year: number, month: number, day: number): boolean {
  const dom = p.fields.dayOfMonth;
  const dow = p.fields.dayOfWeek;

  if (p.mode === "quartz") {
    if (dom?.type === "noSpecific") return matchesDow(dow!, year, month, day, p.mode);
    return matchesDom(dom!, year, month, day);
  }

  const domAny = !dom || dom.type === "any";
  const dowAny = !dow || dow.type === "any";

  if (domAny && dowAny) return true;
  if (!domAny && !dowAny) {
    return matchesDom(dom!, year, month, day) || matchesDow(dow!, year, month, day, p.mode);
  }
  if (!domAny) return matchesDom(dom!, year, month, day);
  return matchesDow(dow!, year, month, day, p.mode);
}

function matchesDom(v: CronFieldValue, year: number, month: number, day: number): boolean {
  switch (v.type) {
    case "lastDay":
      return day === daysInMonth(year, month);
    case "lastDayOffset":
      return day === daysInMonth(year, month) - (v.lastDayOffset ?? 0);
    case "weekday": {
      if (v.weekdayDay === "L") {
        const lastDay = daysInMonth(year, month);
        const target = nearestWeekday(year, month, lastDay, "backward");
        return day === target;
      }
      const target = nearestWeekday(year, month, v.weekdayDay as number, "either");
      return day === target;
    }
    default:
      return matches(v, day);
  }
}

function matchesDow(
  v: CronFieldValue,
  year: number,
  month: number,
  day: number,
  mode: ParsedCron["mode"]
): boolean {
  const realDow = new Date(year, month - 1, day).getDay();
  const modal = mode === "quartz" ? realDow + 1 : realDow;

  switch (v.type) {
    case "nthDayOfWeek": {
      const { weekday, n } = v.nthDayOfWeek!;
      if (modal !== weekday) return false;
      const occurrence = Math.ceil(day / 7);
      return occurrence === n;
    }
    case "lastDay": {
      const targetDow = v.weekdayDay as number;
      if (modal !== targetDow) return false;
      const lastDay = daysInMonth(year, month);
      return lastDay - day < 7;
    }
    default:
      return matches(v, modal);
  }
}

function nearestWeekday(
  year: number,
  month: number,
  target: number,
  direction: "either" | "backward"
): number {
  const dim = daysInMonth(year, month);
  const clampedTarget = Math.min(target, dim);
  const dow = new Date(year, month - 1, clampedTarget).getDay();
  if (dow >= 1 && dow <= 5) return clampedTarget;

  if (direction === "backward") {
    if (dow === 6) return clampedTarget - 1;
    return clampedTarget + 1 <= dim ? clampedTarget + 1 : clampedTarget - 2;
  }
  if (dow === 6) {
    if (clampedTarget - 1 >= 1) return clampedTarget - 1;
    return clampedTarget + 2;
  }
  if (clampedTarget + 1 <= dim) return clampedTarget + 1;
  return clampedTarget - 2;
}

function stepToNextMatch(
  cursor: Date,
  p: ParsedCron,
  useSeconds: boolean,
  tz: "local" | "utc"
): Date | null {
  let cur = new Date(cursor);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const y = get(cur, "year", tz);
    const mo = get(cur, "month", tz);
    const d = get(cur, "day", tz);
    const h = get(cur, "hour", tz);
    const mi = get(cur, "minute", tz);
    const s = get(cur, "second", tz);

    if (!matchesYear(p, y)) {
      cur = build(y + 1, 1, 1, 0, 0, 0, tz);
      continue;
    }
    if (!matches(p.fields.month, mo)) {
      const nextMonth = mo === 12 ? { y: y + 1, m: 1 } : { y, m: mo + 1 };
      cur = build(nextMonth.y, nextMonth.m, 1, 0, 0, 0, tz);
      continue;
    }
    if (!matchesDayConjunction(p, y, mo, d)) {
      const dim = daysInMonth(y, mo);
      if (d >= dim) {
        const nextMonth = mo === 12 ? { y: y + 1, m: 1 } : { y, m: mo + 1 };
        cur = build(nextMonth.y, nextMonth.m, 1, 0, 0, 0, tz);
      } else {
        cur = build(y, mo, d + 1, 0, 0, 0, tz);
      }
      continue;
    }
    if (!matches(p.fields.hour, h)) {
      if (h >= 23) {
        cur = addDays(build(y, mo, d, 0, 0, 0, tz), 1, tz);
      } else {
        cur = build(y, mo, d, h + 1, 0, 0, tz);
      }
      continue;
    }
    if (!matches(p.fields.minute, mi)) {
      if (mi >= 59) {
        cur = build(y, mo, d, h + 1, 0, 0, tz);
      } else {
        cur = build(y, mo, d, h, mi + 1, 0, tz);
      }
      continue;
    }
    if (useSeconds && !matches(p.fields.second, s)) {
      if (s >= 59) {
        cur = build(y, mo, d, h, mi + 1, 0, tz);
      } else {
        cur = build(y, mo, d, h, mi, s + 1, tz);
      }
      continue;
    }
    return cur;
  }
  return null;
}

function addDays(d: Date, n: number, tz: "local" | "utc"): Date {
  const y = get(d, "year", tz),
    m = get(d, "month", tz),
    day = get(d, "day", tz);
  return build(y, m, day + n, 0, 0, 0, tz);
}
