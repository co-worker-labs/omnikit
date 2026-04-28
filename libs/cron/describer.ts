import type { CronFieldValue, ParsedCron } from "./types";

type T = (key: string, params?: Record<string, string | number>) => string;

export function describeCron(parsed: ParsedCron, t: T, _locale: string): string {
  if (!parsed.valid) return "";
  const { fields, mode } = parsed;
  const second = fields.second;
  const minute = fields.minute!;
  const hour = fields.hour!;
  const dom = fields.dayOfMonth;
  const month = fields.month;
  const dow = fields.dayOfWeek;

  const timePhrase = describeTime(second, minute, hour, t);
  const dayPhrase = describeDay(dom, dow, mode, t);
  const monthPhrase = month && month.type !== "any" ? describeMonth(month, t) : "";

  return [timePhrase, dayPhrase, monthPhrase].filter(Boolean).join(" ");
}

function describeTime(
  second: CronFieldValue | undefined,
  minute: CronFieldValue,
  hour: CronFieldValue,
  t: T
): string {
  if (
    hour.type === "any" &&
    minute.type === "any" &&
    (!second || second.type === "any" || (second.type === "specific" && second.values?.[0] === 0))
  ) {
    return t("describe.everyMinute");
  }
  if (hour.type === "any" && minute.type === "any" && second?.type === "any") {
    return t("describe.everySecond");
  }
  if (hour.type === "any" && minute.type === "step" && minute.step?.start === "*") {
    return t("describe.everyN", { n: minute.step.interval });
  }
  if (hour.type === "any" && minute.type === "specific") {
    if (
      minute.values![0] === 0 &&
      (!second || second.type === "any" || (second.type === "specific" && second.values![0] === 0))
    )
      return t("describe.everyHour");
    const mm = pad(minute.values![0]);
    const hasSecond = second && second.type === "specific" && second.values![0] !== 0;
    const time = hasSecond ? `${mm}:${pad(second.values![0])}` : mm;
    return t("describe.everyHourAt", { time });
  }
  if (hour.type === "specific" && minute.type === "specific") {
    const time = `${pad(hour.values![0])}:${pad(minute.values![0])}`;
    return t("describe.atTime", { time });
  }
  if (hour.type === "specific") {
    const time = `${pad(hour.values![0])}:${minute.type === "any" ? "**" : "??"}`;
    return t("describe.atTime", { time });
  }
  return "";
}

function describeDay(
  dom: CronFieldValue | undefined,
  dow: CronFieldValue | undefined,
  mode: ParsedCron["mode"],
  t: T
): string {
  const useDom = dom && dom.type !== "any" && dom.type !== "noSpecific";
  const useDow = dow && dow.type !== "any" && dow.type !== "noSpecific";
  const parts: string[] = [];
  if (useDom) parts.push(describeDom(dom!, t));
  if (useDow) parts.push(describeDow(dow!, mode, t));
  return parts.join(" ");
}

function describeDom(v: CronFieldValue, t: T): string {
  switch (v.type) {
    case "lastDay":
      return t("describe.lastDayOfMonth");
    case "lastDayOffset":
      return t("describe.lastDayMinusN", { n: v.lastDayOffset! });
    case "weekday":
      if (v.weekdayDay === "L") return t("describe.lastWeekdayOfMonth");
      return t("describe.nearestWeekdayTo", { day: v.weekdayDay as number });
    case "specific":
      return t("describe.onDays", { days: String(v.values![0]) });
    case "range":
      return t("describe.throughDays", { from: v.range!.from, to: v.range!.to });
    case "list":
      return t("describe.onDays", { days: v.listItems!.map((it) => tokenSummary(it)).join(", ") });
    default:
      return "";
  }
}

function describeDow(v: CronFieldValue, mode: ParsedCron["mode"], t: T): string {
  switch (v.type) {
    case "nthDayOfWeek":
      return t("describe.nthWeekday", {
        ordinal: `ordinal.${v.nthDayOfWeek!.n}`,
        weekday: weekdayName(v.nthDayOfWeek!.weekday, mode, t),
      });
    case "lastDay":
      return v.weekdayDay !== undefined
        ? t("describe.lastDow", { weekday: weekdayName(v.weekdayDay as number, mode, t) })
        : t("describe.lastDayOfMonth");
    case "specific":
      return weekdayName(v.values![0], mode, t);
    case "range":
      return t("describe.throughDays", {
        from: weekdayName(v.range!.from, mode, t),
        to: weekdayName(v.range!.to, mode, t),
      });
    case "list":
      return t("describe.onDays", {
        days: v.listItems!.map((it) => describeDow(it, mode, t)).join(", "),
      });
    default:
      return "";
  }
}

function monthName(n: number, t: T): string {
  return t(`monthShort.${n - 1}`);
}

function describeMonthPart(v: CronFieldValue, t: T): string {
  if (v.type === "specific") return v.values!.map((n) => monthName(n, t)).join(", ");
  if (v.type === "range") {
    return t("describe.throughDays", {
      from: monthName(v.range!.from, t),
      to: monthName(v.range!.to, t),
    });
  }
  return tokenSummary(v);
}

function describeMonth(v: CronFieldValue, t: T): string {
  switch (v.type) {
    case "specific":
      return v.values!.map((n) => monthName(n, t)).join(", ");
    case "range":
      return t("describe.throughDays", {
        from: monthName(v.range!.from, t),
        to: monthName(v.range!.to, t),
      });
    case "list":
      return v.listItems!.map((it) => describeMonthPart(it, t)).join(", ");
    default:
      return tokenSummary(v);
  }
}

function weekdayName(n: number, mode: ParsedCron["mode"], t: T): string {
  const idx = mode === "quartz" ? n - 1 : n;
  return t(`weekdayLong.${idx}`);
}

function tokenSummary(v: CronFieldValue): string {
  if (v.type === "specific") return String(v.values![0]);
  if (v.type === "range") return `${v.range!.from}-${v.range!.to}`;
  return "";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
