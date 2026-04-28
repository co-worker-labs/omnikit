// libs/cron/field-spec.ts
import type { CronFieldKind, CronMode, FieldSpec, FieldValueType } from "./types";

const COMMON_TYPES: FieldValueType[] = ["any", "specific", "range", "step", "list"];

const MONTH_ALIASES: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

const DOW_ALIASES_SUN0: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

const DOW_ALIASES_SUN1: Record<string, number> = {
  SUN: 1,
  MON: 2,
  TUE: 3,
  WED: 4,
  THU: 5,
  FRI: 6,
  SAT: 7,
};

function field(
  kind: CronFieldKind,
  min: number,
  max: number,
  extra: FieldValueType[] = [],
  aliases?: Record<string, number>
): FieldSpec {
  return { kind, min, max, allowedTypes: [...COMMON_TYPES, ...extra], aliases };
}

const STANDARD_FIELDS: FieldSpec[] = [
  field("minute", 0, 59),
  field("hour", 0, 23),
  field("dayOfMonth", 1, 31),
  field("month", 1, 12, [], MONTH_ALIASES),
  field("dayOfWeek", 0, 6, [], DOW_ALIASES_SUN0),
];

const SPRING_FIELDS: FieldSpec[] = [
  field("second", 0, 59),
  field("minute", 0, 59),
  field("hour", 0, 23),
  field("dayOfMonth", 1, 31),
  field("month", 1, 12, [], MONTH_ALIASES),
  field("dayOfWeek", 0, 7, [], DOW_ALIASES_SUN0),
];

const QUARTZ_FIELDS: FieldSpec[] = [
  field("second", 0, 59),
  field("minute", 0, 59),
  field("hour", 0, 23),
  field("dayOfMonth", 1, 31, ["noSpecific", "lastDay", "weekday", "lastDayOffset"]),
  field("month", 1, 12, [], MONTH_ALIASES),
  field("dayOfWeek", 1, 7, ["noSpecific", "lastDay", "nthDayOfWeek"], DOW_ALIASES_SUN1),
  field("year", 1970, 2099),
];

export const FIELD_SPECS: Record<CronMode, FieldSpec[]> = {
  standard: STANDARD_FIELDS,
  spring: SPRING_FIELDS,
  quartz: QUARTZ_FIELDS,
};

export function getFieldSpec(mode: CronMode, kind: CronFieldKind): FieldSpec | undefined {
  return FIELD_SPECS[mode].find((s) => s.kind === kind);
}

export function getFieldKindsForMode(mode: CronMode): CronFieldKind[] {
  return FIELD_SPECS[mode].map((s) => s.kind);
}
