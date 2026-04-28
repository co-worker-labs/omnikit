// libs/cron/types.ts

export type CronMode = "standard" | "spring" | "quartz";

export type CronFieldKind =
  | "second"
  | "minute"
  | "hour"
  | "dayOfMonth"
  | "month"
  | "dayOfWeek"
  | "year";

export type FieldValueType =
  | "any" // *
  | "noSpecific" // ? (Quartz only, dom or dow)
  | "specific" // single number
  | "range" // n-m
  | "step" // n/k or n-m/k or */k
  | "list" // n,m,p (each item recursive)
  | "lastDay" // L (dom: last day) or nL (dow: last <weekday>)
  | "weekday" // nW (nearest weekday) / LW
  | "nthDayOfWeek" // n#m (mth occurrence of weekday n)
  | "lastDayOffset"; // L-n

export interface CronFieldValue {
  type: FieldValueType;
  values?: number[]; // specific / list members
  range?: { from: number; to: number }; // range
  step?: { start: number | "*"; from?: number; to?: number; interval: number };
  listItems?: CronFieldValue[]; // list: recursive
  lastDayOffset?: number; // L-N (Quartz dom)
  weekdayDay?: number | "L"; // nW or LW
  nthDayOfWeek?: { weekday: number; n: number }; // 6#3 = 3rd Friday
}

export interface ParseError {
  field?: CronFieldKind;
  messageKey: string; // i18n key under "errors.*"
  params?: Record<string, string | number>;
}

export interface ParsedCron {
  mode: CronMode;
  fields: Partial<Record<CronFieldKind, CronFieldValue>>;
  expression: string; // canonicalized form
  raw: string; // user input
  valid: boolean;
  errors: ParseError[];
  warnings: string[]; // i18n keys
}

export interface ExecutionResult {
  executions: Date[];
  searchExhausted: boolean;
  notice?: string; // i18n key
}

export interface Preset {
  id: string;
  labelKey: string; // i18n key, e.g. "presets.everyMinute"
  mode: CronMode;
  expression: string; // canonical form for that mode
}

export interface FieldSpec {
  kind: CronFieldKind;
  min: number;
  max: number;
  allowedTypes: FieldValueType[];
  aliases?: Record<string, number>; // case-insensitive in lookup
}
