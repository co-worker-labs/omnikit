import { parseCron } from "./parser";
import { generateCron } from "./generator";
import { getFieldKindsForMode } from "./field-spec";
import type { CronFieldKind, CronFieldValue, CronMode } from "./types";

export interface MigrationResult {
  expression: string;
  warnings: string[];
}

export function migrateExpression(
  expression: string,
  from: CronMode,
  to: CronMode
): MigrationResult {
  if (from === to) return { expression, warnings: [] };

  const parsed = parseCron(expression, from);
  if (!parsed.valid) {
    const kinds = getFieldKindsForMode(to);
    const fields = Object.fromEntries(kinds.map((k) => [k, { type: "any" } as CronFieldValue]));
    return { expression: generateCron(fields, to), warnings: [] };
  }

  const warnings: string[] = [];
  const fields: Partial<Record<CronFieldKind, CronFieldValue>> = { ...parsed.fields };

  const targetHasSecond = to !== "standard";
  const fromHasSecond = from !== "standard";
  if (targetHasSecond && !fromHasSecond) {
    fields.second = { type: "specific", values: [0] };
  } else if (!targetHasSecond && fromHasSecond) {
    if (fields.second && !(fields.second.type === "specific" && fields.second.values?.[0] === 0)) {
      warnings.push("warn.secondDropped");
    }
    delete fields.second;
  }

  const targetHasYear = to === "quartz";
  const fromHasYear = from === "quartz";
  if (targetHasYear && !fromHasYear) {
    fields.year = { type: "any" };
  } else if (!targetHasYear && fromHasYear) {
    if (fields.year && fields.year.type !== "any") {
      warnings.push("warn.yearDropped");
    }
    delete fields.year;
  }

  if (to === "quartz" && from !== "quartz") {
    fields.dayOfWeek = shiftDow(fields.dayOfWeek, +1);
  } else if (from === "quartz" && to !== "quartz") {
    fields.dayOfWeek = shiftDow(fields.dayOfWeek, -1);
  }

  if (to === "quartz") {
    const dom = fields.dayOfMonth;
    const dow = fields.dayOfWeek;
    const domAny = !dom || dom.type === "any";
    const dowAny = !dow || dow.type === "any";
    if (domAny && dowAny) {
      fields.dayOfWeek = { type: "noSpecific" };
    } else if (domAny) {
      fields.dayOfMonth = { type: "noSpecific" };
    } else if (dowAny) {
      fields.dayOfWeek = { type: "noSpecific" };
    } else {
      fields.dayOfMonth = { type: "noSpecific" };
      warnings.push("warn.orSemanticsLost");
    }
  } else if (from === "quartz") {
    if (fields.dayOfMonth?.type === "noSpecific") fields.dayOfMonth = { type: "any" };
    if (fields.dayOfWeek?.type === "noSpecific") fields.dayOfWeek = { type: "any" };
  }

  for (const kind of getFieldKindsForMode(to)) {
    const v = fields[kind];
    if (v && hasUnsupportedSpecial(v, to)) {
      warnings.push("warn.specialDroppedFromMode");
      fields[kind] = { type: "any" };
    }
  }

  return { expression: generateCron(fields, to), warnings };
}

function shiftDow(v: CronFieldValue | undefined, delta: number): CronFieldValue | undefined {
  if (!v || delta === 0) return v;
  switch (v.type) {
    case "specific":
      return { type: "specific", values: v.values!.map((n) => n + delta) };
    case "range":
      return {
        type: "range",
        range: { from: v.range!.from + delta, to: v.range!.to + delta },
      };
    case "list":
      return { type: "list", listItems: v.listItems!.map((it) => shiftDow(it, delta)!) };
    case "nthDayOfWeek":
      return {
        type: "nthDayOfWeek",
        nthDayOfWeek: {
          weekday: v.nthDayOfWeek!.weekday + delta,
          n: v.nthDayOfWeek!.n,
        },
      };
    case "lastDay":
      return v.weekdayDay !== undefined
        ? { type: "lastDay", weekdayDay: (v.weekdayDay as number) + delta }
        : v;
    default:
      return v;
  }
}

function hasUnsupportedSpecial(v: CronFieldValue, mode: CronMode): boolean {
  // Both Quartz and Spring support special tokens (L, W, #, ?).
  // Only standard 5-field cron does not.
  if (mode !== "standard") return false;
  if (
    v.type === "lastDay" ||
    v.type === "lastDayOffset" ||
    v.type === "weekday" ||
    v.type === "nthDayOfWeek" ||
    v.type === "noSpecific"
  )
    return true;
  if (v.type === "list") return v.listItems!.some((it) => hasUnsupportedSpecial(it, mode));
  return false;
}
