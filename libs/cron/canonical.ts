import type { CronFieldValue } from "./types";

export function tokenToString(value: CronFieldValue | undefined): string {
  if (!value) return "*";
  switch (value.type) {
    case "any":
      return "*";
    case "noSpecific":
      return "?";
    case "specific":
      return String(value.values![0]);
    case "range":
      return `${value.range!.from}-${value.range!.to}`;
    case "step": {
      const { start, from, to, interval } = value.step!;
      if (start === "*") return `*/${interval}`;
      if (from !== undefined && to !== undefined) return `${from}-${to}/${interval}`;
      return `${start}/${interval}`;
    }
    case "list":
      return value.listItems!.map((it) => tokenToString(it)).join(",");
    case "lastDay":
      return value.weekdayDay !== undefined ? `${value.weekdayDay}L` : "L";
    case "lastDayOffset":
      return `L-${value.lastDayOffset}`;
    case "weekday":
      return value.weekdayDay === "L" ? "LW" : `${value.weekdayDay}W`;
    case "nthDayOfWeek":
      return `${value.nthDayOfWeek!.weekday}#${value.nthDayOfWeek!.n}`;
  }
}
