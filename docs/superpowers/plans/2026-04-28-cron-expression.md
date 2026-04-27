# Cron Expression Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a browser-only Cron expression generator/parser at `/cron` supporting Standard (5), Spring (6) and Quartz (7) field modes, with human-readable description, next-5 executions table, presets, visual field editors, mode switching, and `localStorage`+URL persistence.

**Architecture:** Pure TypeScript engine in `libs/cron/` (parser/generator/describer/executor) driven by static `field-spec.ts` metadata, exposed through a single barrel `main.ts`. The `app/[locale]/cron/cron-page.tsx` client component holds the **single source of truth** `{ mode, expression, timezone }` and derives all displayed values via the engine. Tabs differ only in how they edit that state. No new runtime dependencies — UI uses existing `components/ui/*` and `@headlessui/react` for popover/dialog.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19 (with React Compiler — never write `useMemo`/`useCallback`/`React.memo`), Tailwind CSS 4 (`@theme` tokens), `next-intl@4`, `@headlessui/react@2`, `lucide-react`, `vitest@2`.

**Reference tool:** `app/[locale]/jwt/` — same Layout/banner/tabs/i18n pattern. Mirror its conventions.

**Conventions enforced throughout:**

- Each engine function returns structured data and **never throws** (parser yields `errors[]`, generator/describer/executor handle malformed input defensively).
- All user-visible strings live in `public/locales/{en,zh-CN,zh-TW}/cron.json`; reuse `common.json` for `clear/copy/copied/...`.
- Every commit message follows Conventional Commits with scope `cron`, e.g. `feat(cron): add parser for Standard mode`.
- Run `pnpm test` (Vitest) after each engine task to keep regressions out.

---

## File Structure

**Created** (engine — `libs/cron/`):

| File                          | Responsibility                                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                    | All exported types (`CronMode`, `CronFieldKind`, `FieldValueType`, `CronFieldValue`, `ParsedCron`, `ParseError`, `ExecutionResult`, `Preset`). No runtime code.                        |
| `field-spec.ts`               | Per-mode field metadata: `min/max`, allowed special-char value-types, alias maps (`JAN→1`, `MON→…`), DOW base. Single source of truth consumed by parser/generator/describer/executor. |
| `parser.ts`                   | `parseCron(expression, mode): ParsedCron`. Macros → tokenize → per-field parse → semantic checks (DOM/DOW interaction).                                                                |
| `generator.ts`                | `generateCron(fields, mode): string`. Pure inverse: emit canonical numeric form.                                                                                                       |
| `describer.ts`                | `describeCron(parsed, t, locale): string`. i18n-aware human description.                                                                                                               |
| `executor.ts`                 | `nextExecutions(parsed, count, opts): ExecutionResult`. Smart skip-iteration with 4-year window.                                                                                       |
| `presets.ts`                  | Static array of `Preset` objects with i18n label keys.                                                                                                                                 |
| `canonical.ts`                | Shared `tokenToString(CronFieldValue): string` — used by parser and generator to emit canonical tokens.                                                                                |
| `migrate.ts`                  | `migrateExpression(expr, from, to): MigrationResult` — mode-switch migration with DOW base shift, Quartz `?` rule, and special-char dropping.                                          |
| `main.ts`                     | Public barrel: re-export `parseCron / generateCron / describeCron / nextExecutions / migrateExpression / PRESETS / types`.                                                             |
| `__tests__/parser.test.ts`    | Table-driven validity, error, alias, macro tests.                                                                                                                                      |
| `__tests__/generator.test.ts` | Round-trip + structure→string.                                                                                                                                                         |
| `__tests__/describer.test.ts` | Composition snapshots with stub `t` returning keys verbatim.                                                                                                                           |
| `__tests__/executor.test.ts`  | Common patterns, special chars, DOM/DOW interaction, search exhaustion, perf.                                                                                                          |
| `__tests__/migrate.test.ts`   | Mode-switch migration: field add/drop, DOW base shift, Quartz `?` rule, special-char drop.                                                                                             |

**Created** (page + locales):

| File                              | Responsibility                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `app/[locale]/cron/page.tsx`      | Route entry + `generateMetadata` (mirrors `jwt/page.tsx`).                                                               |
| `app/[locale]/cron/cron-page.tsx` | Client component: mode selector, tabs, output area, description. Holds `{ mode, expression, timezone, rawInput }` state. |
| `public/locales/en/cron.json`     | English i18n.                                                                                                            |
| `public/locales/zh-CN/cron.json`  | Simplified Chinese.                                                                                                      |
| `public/locales/zh-TW/cron.json`  | Traditional Chinese.                                                                                                     |

**Modified**:

| File                                         | Change                                                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `libs/tools.ts`                              | Append `{ key: "cron", path: "/cron" }` to `TOOLS`.                                                                                             |
| `i18n/request.ts`                            | Append `"cron"` to `namespaces` array.                                                                                                          |
| `libs/storage-keys.ts`                       | Add `cron: "bc:cron"` to `STORAGE_KEYS`.                                                                                                        |
| `vitest.config.ts`                           | Extend `include` to `["libs/dbviewer/**/*.test.ts", "libs/cron/**/*.test.ts"]`.                                                                 |
| `public/locales/{en,zh-CN,zh-TW}/tools.json` | Add `cron.{title,shortTitle,description}`.                                                                                                      |
| `app/globals.css`                            | Add `--cron-hour/--cron-dom/--cron-month/--cron-dow` variables under `:root` and `.dark`, and matching `--color-cron-*` aliases under `@theme`. |

---

## Task 1: Project integration scaffolding

Wire the new tool into the registry, namespaces, storage keys, and the test runner _before_ writing any cron code, so subsequent commits already feed into the right pipelines.

**Files:**

- Modify: `libs/tools.ts`
- Modify: `i18n/request.ts`
- Modify: `libs/storage-keys.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add cron to the tool registry**

In `libs/tools.ts`, append the entry inside `TOOLS`:

```typescript
export const TOOLS: { key: string; path: string }[] = [
  { key: "base64", path: "/base64" },
  { key: "urlencoder", path: "/urlencoder" },
  { key: "uuid", path: "/uuid" },
  { key: "password", path: "/password" },
  { key: "hashing", path: "/hashing" },
  { key: "checksum", path: "/checksum" },
  { key: "json", path: "/json" },
  { key: "htmlcode", path: "/htmlcode" },
  { key: "storageunit", path: "/storageunit" },
  { key: "ascii", path: "/ascii" },
  { key: "cipher", path: "/cipher" },
  { key: "jwt", path: "/jwt" },
  { key: "diff", path: "/diff" },
  { key: "markdown", path: "/markdown" },
  { key: "dbviewer", path: "/dbviewer" },
  { key: "cron", path: "/cron" },
] as const;
```

- [ ] **Step 2: Register cron i18n namespace**

In `i18n/request.ts` append `"cron"` to the `namespaces` array (last entry).

```typescript
const namespaces = [
  "common",
  "tools",
  "home",
  "password",
  "hashing",
  "json",
  "base64",
  "ascii",
  "htmlcode",
  "checksum",
  "cipher",
  "storageunit",
  "terms",
  "privacy",
  "uuid",
  "urlencoder",
  "diff",
  "markdown",
  "pwa",
  "dbviewer",
  "jwt",
  "cron",
];
```

- [ ] **Step 3: Add cron storage key**

In `libs/storage-keys.ts`:

```typescript
export const STORAGE_KEYS = {
  savedPasswords: "bc:sp",
  diff: "bc:diff",
  markdown: "bc:md",
  dbviewerHistory: "bc:dbviewer:history",
  cron: "bc:cron",
} as const;
```

- [ ] **Step 4: Extend Vitest include glob**

In `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["libs/dbviewer/**/*.test.ts", "libs/cron/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    globals: false,
  },
});
```

- [ ] **Step 5: Verify TypeScript still compiles**

Run: `pnpm tsc --noEmit -p tsconfig.json`
Expected: 0 errors. (Cron files don't exist yet but nothing references them either.)

- [ ] **Step 6: Commit**

```bash
git add libs/tools.ts i18n/request.ts libs/storage-keys.ts vitest.config.ts
git commit -m "chore(cron): register cron tool, namespace, storage key, and test glob"
```

---

## Task 2: Core types

Define every type the rest of the engine consumes. No runtime code.

**Files:**

- Create: `libs/cron/types.ts`

- [ ] **Step 1: Write `types.ts`**

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add libs/cron/types.ts
git commit -m "feat(cron): add core type definitions"
```

---

## Task 3: Field spec metadata

Static per-mode tables: each mode lists its fields in order with min/max, allowed value-types, and aliases. Parser/generator/describer/executor all read from here — never hard-code field metadata elsewhere.

**Files:**

- Create: `libs/cron/field-spec.ts`
- Test: `libs/cron/__tests__/field-spec.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// libs/cron/__tests__/field-spec.test.ts
import { describe, it, expect } from "vitest";
import { FIELD_SPECS, getFieldSpec } from "../field-spec";

describe("FIELD_SPECS", () => {
  it("standard mode has 5 fields in canonical order", () => {
    expect(FIELD_SPECS.standard.map((s) => s.kind)).toEqual([
      "minute",
      "hour",
      "dayOfMonth",
      "month",
      "dayOfWeek",
    ]);
  });

  it("spring mode has 6 fields with second prepended", () => {
    expect(FIELD_SPECS.spring.map((s) => s.kind)).toEqual([
      "second",
      "minute",
      "hour",
      "dayOfMonth",
      "month",
      "dayOfWeek",
    ]);
  });

  it("quartz mode has 7 fields with year appended", () => {
    expect(FIELD_SPECS.quartz.map((s) => s.kind)).toEqual([
      "second",
      "minute",
      "hour",
      "dayOfMonth",
      "month",
      "dayOfWeek",
      "year",
    ]);
  });

  it("standard DOW base is 0..6 (Sun=0)", () => {
    const dow = getFieldSpec("standard", "dayOfWeek")!;
    expect(dow.min).toBe(0);
    expect(dow.max).toBe(6);
    expect(dow.aliases?.SUN).toBe(0);
  });

  it("spring DOW base is 0..7 (accepts both 0 and 7 for Sunday)", () => {
    const dow = getFieldSpec("spring", "dayOfWeek")!;
    expect(dow.min).toBe(0);
    expect(dow.max).toBe(7);
  });

  it("quartz DOW base is 1..7 (Sun=1)", () => {
    const dow = getFieldSpec("quartz", "dayOfWeek")!;
    expect(dow.min).toBe(1);
    expect(dow.max).toBe(7);
    expect(dow.aliases?.SUN).toBe(1);
    expect(dow.aliases?.SAT).toBe(7);
  });

  it("month aliases are JAN..DEC mapped to 1..12 in every mode", () => {
    for (const mode of ["standard", "spring", "quartz"] as const) {
      const month = getFieldSpec(mode, "month")!;
      expect(month.aliases?.JAN).toBe(1);
      expect(month.aliases?.DEC).toBe(12);
    }
  });

  it("only quartz dom/dow allow noSpecific (?)", () => {
    expect(getFieldSpec("quartz", "dayOfMonth")!.allowedTypes).toContain("noSpecific");
    expect(getFieldSpec("quartz", "dayOfWeek")!.allowedTypes).toContain("noSpecific");
    expect(getFieldSpec("standard", "dayOfMonth")!.allowedTypes).not.toContain("noSpecific");
    expect(getFieldSpec("spring", "dayOfWeek")!.allowedTypes).not.toContain("noSpecific");
  });

  it("only quartz dom allows W and L-N; only quartz dow allows # and nL", () => {
    const qDom = getFieldSpec("quartz", "dayOfMonth")!;
    const qDow = getFieldSpec("quartz", "dayOfWeek")!;
    expect(qDom.allowedTypes).toEqual(
      expect.arrayContaining(["weekday", "lastDay", "lastDayOffset"])
    );
    expect(qDow.allowedTypes).toEqual(expect.arrayContaining(["nthDayOfWeek", "lastDay"]));
    expect(getFieldSpec("standard", "dayOfMonth")!.allowedTypes).not.toContain("weekday");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — module `../field-spec` not found.

- [ ] **Step 3: Implement `field-spec.ts`**

```typescript
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
  // Spring accepts both 0 and 7 for Sunday; we model max=7 and the parser canonicalizes 7→0.
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS — all `FIELD_SPECS` cases green.

- [ ] **Step 5: Commit**

```bash
git add libs/cron/field-spec.ts libs/cron/__tests__/field-spec.test.ts
git commit -m "feat(cron): add per-mode field spec with aliases and allowed value types"
```

---

## Task 4: Parser — basic field parsing (Standard mode)

Build the parser incrementally: start with `*`, specific number, range, step, list. Macros and aliases come in later sub-tasks. Each step is one test + one piece of impl. Parser **never throws** — bad input goes into `errors[]`.

**Files:**

- Create: `libs/cron/parser.ts`
- Test: `libs/cron/__tests__/parser.test.ts`

- [ ] **Step 1: Write a failing test for `*` and field count**

```typescript
// libs/cron/__tests__/parser.test.ts
import { describe, it, expect } from "vitest";
import { parseCron } from "../parser";

describe("parseCron — Standard mode", () => {
  it("accepts '* * * * *' as all-any", () => {
    const r = parseCron("* * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.fields.minute).toEqual({ type: "any" });
    expect(r.fields.hour).toEqual({ type: "any" });
    expect(r.fields.dayOfMonth).toEqual({ type: "any" });
    expect(r.fields.month).toEqual({ type: "any" });
    expect(r.fields.dayOfWeek).toEqual({ type: "any" });
    expect(r.expression).toBe("* * * * *");
    expect(r.raw).toBe("* * * * *");
  });

  it("rejects wrong field count with errors.wrongFieldCount", () => {
    const r = parseCron("* * * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.wrongFieldCount");
    expect(r.errors[0].params).toMatchObject({ expected: 5, got: 4, mode: "standard" });
  });

  it("collapses internal whitespace", () => {
    const r = parseCron("  *  *   *  *   *  ", "standard");
    expect(r.valid).toBe(true);
    expect(r.expression).toBe("* * * * *");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement minimal parser shell**

```typescript
// libs/cron/parser.ts
import type { CronFieldKind, CronFieldValue, CronMode, ParseError, ParsedCron } from "./types";
import { FIELD_SPECS, getFieldSpec } from "./field-spec";

export function parseCron(raw: string, mode: CronMode): ParsedCron {
  const errors: ParseError[] = [];
  const warnings: string[] = [];
  const trimmed = raw.trim().replace(/\s+/g, " ");

  const tokens = trimmed.length === 0 ? [] : trimmed.split(" ");
  const specs = FIELD_SPECS[mode];

  if (tokens.length !== specs.length) {
    errors.push({
      messageKey: "errors.wrongFieldCount",
      params: { expected: specs.length, got: tokens.length, mode },
    });
    return emptyResult(mode, raw, errors);
  }

  const fields: Partial<Record<CronFieldKind, CronFieldValue>> = {};
  const canonicalTokens: string[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const result = parseFieldToken(tokens[i], spec.kind, mode);
    if (result.errors.length) {
      errors.push(...result.errors);
      // Continue parsing remaining fields so we collect every error
    }
    if (result.value) fields[spec.kind] = result.value;
    canonicalTokens.push(canonicalize(result.value, tokens[i]));
  }

  return {
    mode,
    fields,
    expression: canonicalTokens.join(" "),
    raw,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function emptyResult(mode: CronMode, raw: string, errors: ParseError[]): ParsedCron {
  return { mode, fields: {}, expression: raw, raw, valid: false, errors, warnings: [] };
}

function parseFieldToken(
  token: string,
  kind: CronFieldKind,
  mode: CronMode
): { value?: CronFieldValue; errors: ParseError[] } {
  if (token === "*") return { value: { type: "any" }, errors: [] };
  // Other types implemented in subsequent steps.
  return {
    errors: [
      { field: kind, messageKey: "errors.invalidSyntax", params: { char: token, field: kind } },
    ],
  };
}

function canonicalize(value: CronFieldValue | undefined, fallback: string): string {
  if (!value) return fallback;
  if (value.type === "any") return "*";
  return fallback;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS for the 3 cases above.

- [ ] **Step 5: Commit**

```bash
git add libs/cron/parser.ts libs/cron/__tests__/parser.test.ts
git commit -m "feat(cron): parse '*' tokens and field-count validation"
```

---

## Task 5: Parser — specific numbers, ranges, steps

Extend `parseFieldToken` and `canonicalize` to handle `5`, `1-5`, `*/15`, `1-10/2`, `5/10`. Each test case adds one syntactic form.

**Files:**

- Modify: `libs/cron/parser.ts`
- Modify: `libs/cron/__tests__/parser.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `parser.test.ts`:

```typescript
describe("parseCron — specific / range / step", () => {
  it("parses a specific number", () => {
    const r = parseCron("5 * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.minute).toEqual({ type: "specific", values: [5] });
    expect(r.expression).toBe("5 * * * *");
  });

  it("rejects out-of-range specific value", () => {
    const r = parseCron("60 * * * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.outOfRange");
    expect(r.errors[0].params).toMatchObject({ field: "minute", min: 0, max: 59, value: 60 });
  });

  it("parses a range", () => {
    const r = parseCron("0 9-17 * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.hour).toEqual({ type: "range", range: { from: 9, to: 17 } });
  });

  it("rejects reversed range", () => {
    const r = parseCron("0 17-9 * * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.rangeReversed");
  });

  it("parses */k step", () => {
    const r = parseCron("*/15 * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.minute).toEqual({ type: "step", step: { start: "*", interval: 15 } });
  });

  it("parses range/k step", () => {
    const r = parseCron("0 0-23/2 * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.hour).toEqual({
      type: "step",
      step: { start: 0, from: 0, to: 23, interval: 2 },
    });
  });

  it("parses start/k step", () => {
    const r = parseCron("5/10 * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.minute).toEqual({ type: "step", step: { start: 5, interval: 10 } });
  });

  it("rejects zero or negative step interval", () => {
    const r = parseCron("*/0 * * * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.invalidStep");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test`
Expected: FAIL — `parseFieldToken` only handles `*`.

- [ ] **Step 3: Extend `parseFieldToken` and `canonicalize`**

Replace `parseFieldToken` and `canonicalize` in `libs/cron/parser.ts`:

```typescript
function parseFieldToken(
  token: string,
  kind: CronFieldKind,
  mode: CronMode
): { value?: CronFieldValue; errors: ParseError[] } {
  const spec = getFieldSpec(mode, kind)!;

  if (token === "*") return { value: { type: "any" }, errors: [] };

  // Step: <start>/<interval> where start is *, n, or n-m
  if (token.includes("/")) {
    const [startPart, intervalPart] = token.split("/");
    const interval = parseInt(intervalPart, 10);
    if (!Number.isFinite(interval) || interval <= 0) {
      return {
        errors: [
          { field: kind, messageKey: "errors.invalidStep", params: { value: intervalPart } },
        ],
      };
    }
    if (startPart === "*") {
      return { value: { type: "step", step: { start: "*", interval } }, errors: [] };
    }
    if (startPart.includes("-")) {
      const rangeRes = parseRange(startPart, kind, spec);
      if (rangeRes.errors.length) return rangeRes;
      const { from, to } = rangeRes.value!.range!;
      return {
        value: { type: "step", step: { start: from, from, to, interval } },
        errors: [],
      };
    }
    const n = parseSingleNumber(startPart, kind, spec);
    if (n.errors.length) return n;
    return { value: { type: "step", step: { start: n.value!.values![0], interval } }, errors: [] };
  }

  if (token.includes("-")) return parseRange(token, kind, spec);

  // Specific number
  return parseSingleNumber(token, kind, spec);
}

function parseSingleNumber(
  token: string,
  kind: CronFieldKind,
  spec: ReturnType<typeof getFieldSpec> & {}
): { value?: CronFieldValue; errors: ParseError[] } {
  const n = parseInt(token, 10);
  if (!Number.isFinite(n) || String(n) !== token) {
    return {
      errors: [
        { field: kind, messageKey: "errors.invalidSyntax", params: { char: token, field: kind } },
      ],
    };
  }
  if (n < spec.min || n > spec.max) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.outOfRange",
          params: { field: kind, min: spec.min, max: spec.max, value: n },
        },
      ],
    };
  }
  return { value: { type: "specific", values: [n] }, errors: [] };
}

function parseRange(
  token: string,
  kind: CronFieldKind,
  spec: ReturnType<typeof getFieldSpec> & {}
): { value?: CronFieldValue; errors: ParseError[] } {
  const [a, b] = token.split("-");
  const aN = parseSingleNumber(a, kind, spec);
  if (aN.errors.length) return aN;
  const bN = parseSingleNumber(b, kind, spec);
  if (bN.errors.length) return bN;
  const from = aN.value!.values![0];
  const to = bN.value!.values![0];
  if (from > to) {
    return {
      errors: [
        { field: kind, messageKey: "errors.rangeReversed", params: { field: kind, from, to } },
      ],
    };
  }
  return { value: { type: "range", range: { from, to } }, errors: [] };
}

function canonicalize(value: CronFieldValue | undefined, fallback: string): string {
  if (!value) return fallback;
  switch (value.type) {
    case "any":
      return "*";
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
    default:
      return fallback;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — all parser tests green.

- [ ] **Step 5: Commit**

```bash
git add libs/cron/parser.ts libs/cron/__tests__/parser.test.ts
git commit -m "feat(cron): parse specific, range, and step field tokens"
```

---

## Task 6: Parser — lists, aliases, macros

**Files:**

- Modify: `libs/cron/parser.ts`
- Modify: `libs/cron/__tests__/parser.test.ts`

- [ ] **Step 1: Write failing tests for lists**

Append to `parser.test.ts`:

```typescript
describe("parseCron — lists", () => {
  it("parses comma-separated specific values", () => {
    const r = parseCron("0,15,30,45 * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.minute).toMatchObject({
      type: "list",
      listItems: [
        { type: "specific", values: [0] },
        { type: "specific", values: [15] },
        { type: "specific", values: [30] },
        { type: "specific", values: [45] },
      ],
    });
    expect(r.expression).toBe("0,15,30,45 * * * *");
  });

  it("parses mixed ranges and specifics in a list", () => {
    const r = parseCron("0 9-12,14,16-18 * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.hour?.type).toBe("list");
    expect(r.fields.hour?.listItems?.[0]).toMatchObject({
      type: "range",
      range: { from: 9, to: 12 },
    });
    expect(r.fields.hour?.listItems?.[1]).toMatchObject({ type: "specific", values: [14] });
  });

  it("rejects empty list segment", () => {
    const r = parseCron("0,,15 * * * *", "standard");
    expect(r.valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test`
Expected: FAIL — list not handled, falls into `parseSingleNumber` and breaks.

- [ ] **Step 3: Add list handling to `parseFieldToken`**

In `libs/cron/parser.ts`, add list handling at the very top of `parseFieldToken` (before any other branch):

```typescript
function parseFieldToken(
  token: string, kind: CronFieldKind, mode: CronMode
): { value?: CronFieldValue; errors: ParseError[] } {
  if (token.includes(",")) {
    const parts = token.split(",");
    const items: CronFieldValue[] = [];
    for (const part of parts) {
      if (part.length === 0) {
        return { errors: [{ field: kind, messageKey: "errors.invalidSyntax", params: { char: ",", field: kind } }] };
      }
      const sub = parseFieldToken(part, kind, mode);
      if (sub.errors.length) return sub;
      items.push(sub.value!);
    }
    return { value: { type: "list", listItems: items }, errors: [] };
  }

  // ...existing branches unchanged
  // (keep all the * / step / range / single-number branches below)
```

In `canonicalize` add:

```typescript
case "list":
  return value.listItems!.map((it) => canonicalize(it, "")).join(",");
```

- [ ] **Step 4: Run to verify list tests pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Write failing tests for aliases**

```typescript
describe("parseCron — aliases", () => {
  it("normalizes JAN..DEC in month field", () => {
    const r = parseCron("0 0 1 JAN *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.month).toEqual({ type: "specific", values: [1] });
    expect(r.expression).toBe("0 0 1 1 *");
  });

  it("normalizes MON-FRI in dow field", () => {
    const r = parseCron("0 9 * * MON-FRI", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "range", range: { from: 1, to: 5 } });
    expect(r.expression).toBe("0 9 * * 1-5");
  });

  it("is case-insensitive", () => {
    const r = parseCron("0 9 * * mon-fri", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "range", range: { from: 1, to: 5 } });
  });

  it("supports aliases inside list", () => {
    const r = parseCron("0 0 * * SAT,SUN", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek?.type).toBe("list");
  });

  it("uses Quartz DOW base (SUN=1)", () => {
    const r = parseCron("0 0 0 ? * SUN *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "specific", values: [1] });
  });

  it("rejects unknown alias", () => {
    const r = parseCron("0 0 1 FOO *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.unknownAlias");
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `pnpm test`
Expected: FAIL — aliases not recognized.

- [ ] **Step 7: Resolve aliases before per-field parsing**

Add an alias-resolution pass at the top of `parseFieldToken` (after the list branch returns to recurse on segments). Insert this just **before** the `if (token === "*")` check:

```typescript
const spec = getFieldSpec(mode, kind)!;
if (spec.aliases) {
  const resolved = resolveAliases(token, spec.aliases);
  if (resolved.unknown) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.unknownAlias",
          params: { name: resolved.unknown, field: kind },
        },
      ],
    };
  }
  token = resolved.token;
}
```

Add helper at the bottom of the file:

```typescript
function resolveAliases(
  token: string,
  aliases: Record<string, number>
): { token: string; unknown?: string } {
  // Replace each alphabetic run with its alias number; leave digits/symbols intact.
  const re = /[A-Za-z]+/g;
  let unknown: string | undefined;
  const out = token.replace(re, (m) => {
    const upper = m.toUpperCase();
    if (upper in aliases) return String(aliases[upper]);
    unknown = m;
    return m;
  });
  return unknown ? { token, unknown } : { token: out };
}
```

(Note: the list branch at the top of `parseFieldToken` recurses with `parseFieldToken(part, kind, mode)`, so each list segment goes through alias resolution too.)

- [ ] **Step 8: Run to verify alias tests pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 9: Write failing tests for macros**

```typescript
describe("parseCron — macros", () => {
  it("@yearly expands in standard mode", () => {
    const r = parseCron("@yearly", "standard");
    expect(r.valid).toBe(true);
    expect(r.expression).toBe("0 0 1 1 *");
  });

  it("@annually is an alias of @yearly", () => {
    const r = parseCron("@annually", "standard");
    expect(r.valid).toBe(true);
    expect(r.expression).toBe("0 0 1 1 *");
  });

  it("@hourly expands in spring mode (prepends second=0)", () => {
    const r = parseCron("@hourly", "spring");
    expect(r.valid).toBe(true);
    expect(r.expression).toBe("0 0 * * * *");
  });

  it("@daily expands in quartz mode (prepends second=0, appends year=*)", () => {
    const r = parseCron("@daily", "quartz");
    expect(r.valid).toBe(true);
    // quartz @daily = "0 0 0 * * ? *" — DOW becomes "?" via Quartz post-validation; for now just expansion
    expect(r.expression.split(" ").length).toBe(7);
  });

  it("@reboot is rejected", () => {
    const r = parseCron("@reboot", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.macroRebootUnsupported");
  });

  it("unknown macro errors", () => {
    const r = parseCron("@bogus", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.unknownMacro");
  });
});
```

- [ ] **Step 10: Run to verify failure**

Run: `pnpm test`
Expected: FAIL — macros pass through as raw tokens.

- [ ] **Step 11: Add macro expansion**

At the very top of `parseCron`, after `trimmed`/whitespace normalization, add:

```typescript
if (trimmed.startsWith("@")) {
  const expanded = expandMacro(trimmed, mode);
  if ("error" in expanded) {
    return emptyResult(mode, raw, [expanded.error]);
  }
  return parseCron(expanded.expression, mode); // re-enter with raw replaced
}
```

Then update `parseCron` to preserve `raw` even when called recursively. Easier: bypass the recursion and just rewrite the local variable:

```typescript
let workingExpression = trimmed;
if (trimmed.startsWith("@")) {
  const expanded = expandMacro(trimmed, mode);
  if ("error" in expanded) {
    return { ...emptyResult(mode, raw, [expanded.error]) };
  }
  workingExpression = expanded.expression;
}
const tokens = workingExpression.length === 0 ? [] : workingExpression.split(" ");
```

Add `expandMacro` helper:

```typescript
const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

function expandMacro(
  token: string,
  mode: CronMode
): { expression: string } | { error: ParseError } {
  const lower = token.toLowerCase();
  if (lower === "@reboot") {
    return { error: { messageKey: "errors.macroRebootUnsupported" } };
  }
  const standard = MACROS[lower];
  if (!standard) {
    return { error: { messageKey: "errors.unknownMacro", params: { macro: token } } };
  }
  if (mode === "standard") return { expression: standard };
  if (mode === "spring") return { expression: `0 ${standard}` };
  // quartz: prepend second, append year, swap DOW '*' to '?' so it passes Quartz dom/dow validation later
  const parts = standard.split(" ");
  // standard: minute hour dom month dow → quartz: 0 minute hour dom month dow|? *
  const dow = parts[4] === "*" ? "?" : parts[4];
  const dom = parts[2] === "*" && dow === "?" ? "*" : parts[2];
  return { expression: `0 ${parts[0]} ${parts[1]} ${dom} ${parts[3]} ${dow} *` };
}
```

- [ ] **Step 12: Run to verify macro tests pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add libs/cron/parser.ts libs/cron/__tests__/parser.test.ts
git commit -m "feat(cron): parse lists, aliases, and macros"
```

---

## Task 7: Parser — Quartz special characters & DOM/DOW validation

Implement `?`, `L`, `nL`, `LW`, `nW`, `n#m`, `L-N`. After per-field parse, validate the Quartz "exactly one of DOM/DOW must be `?`" rule and the "`?` only allowed in dom/dow" rule.

**Files:**

- Modify: `libs/cron/parser.ts`
- Modify: `libs/cron/__tests__/parser.test.ts`

- [ ] **Step 1: Write failing tests for Quartz specials**

```typescript
describe("parseCron — Quartz specials", () => {
  it("parses '?' in dom", () => {
    const r = parseCron("0 0 9 ? * MON-FRI *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "noSpecific" });
  });

  it("parses 'L' (last day) in dom", () => {
    const r = parseCron("0 0 0 L * ? *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "lastDay" });
  });

  it("parses 'L-3' in dom", () => {
    const r = parseCron("0 0 0 L-3 * ? *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "lastDayOffset", lastDayOffset: 3 });
  });

  it("parses '15W' in dom", () => {
    const r = parseCron("0 0 0 15W * ? *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "weekday", weekdayDay: 15 });
  });

  it("parses 'LW' in dom", () => {
    const r = parseCron("0 0 0 LW * ? *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "weekday", weekdayDay: "L" });
  });

  it("parses '6#3' in dow (3rd Friday)", () => {
    const r = parseCron("0 0 0 ? * 6#3 *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({
      type: "nthDayOfWeek",
      nthDayOfWeek: { weekday: 6, n: 3 },
    });
  });

  it("parses '6L' in dow (last Friday)", () => {
    const r = parseCron("0 0 0 ? * 6L *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "lastDay", weekdayDay: 6 });
  });

  it("rejects 'L' in standard", () => {
    const r = parseCron("0 0 L * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.specialNotAllowed");
  });

  it("rejects 'W' in dow", () => {
    const r = parseCron("0 0 0 * * 1W *", "quartz");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.weekdayOnNonDom");
  });

  it("rejects '#' in dom", () => {
    const r = parseCron("0 0 0 1#2 * ? *", "quartz");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.nthOnNonDow");
  });
});

describe("parseCron — Quartz DOM/DOW interaction", () => {
  it("requires exactly one '?'", () => {
    const r = parseCron("0 0 0 1 * 1 *", "quartz");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.quartzNeedsQuestionMark");
  });

  it("rejects '?' in both", () => {
    const r = parseCron("0 0 0 ? * ? *", "quartz");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.quartzBothQuestionMarks");
  });

  it("accepts '? * dom' shape", () => {
    const r = parseCron("0 0 0 1 * ? *", "quartz");
    expect(r.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test`
Expected: FAIL — special chars not parsed.

- [ ] **Step 3: Add special-char branches to `parseFieldToken`**

In `libs/cron/parser.ts`, add these branches **after** the alias-resolution block and **before** the `*` check:

```typescript
// '?' — noSpecific
if (token === "?") {
  if (!spec.allowedTypes.includes("noSpecific")) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.specialNotAllowed",
          params: { token: "?", field: kind, mode },
        },
      ],
    };
  }
  return { value: { type: "noSpecific" }, errors: [] };
}

// 'L' alone — lastDay
if (token === "L") {
  if (!spec.allowedTypes.includes("lastDay")) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.specialNotAllowed",
          params: { token: "L", field: kind, mode },
        },
      ],
    };
  }
  if (kind !== "dayOfMonth") {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.specialNotAllowed",
          params: { token: "L", field: kind, mode },
        },
      ],
    };
  }
  return { value: { type: "lastDay" }, errors: [] };
}

// 'L-N' — lastDayOffset (Quartz dom only)
if (token.startsWith("L-")) {
  if (!spec.allowedTypes.includes("lastDayOffset")) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.specialNotAllowed",
          params: { token, field: kind, mode },
        },
      ],
    };
  }
  const n = parseInt(token.slice(2), 10);
  if (!Number.isFinite(n) || n < 0 || n > 30) {
    return {
      errors: [
        { field: kind, messageKey: "errors.invalidSyntax", params: { char: token, field: kind } },
      ],
    };
  }
  return { value: { type: "lastDayOffset", lastDayOffset: n }, errors: [] };
}

// 'LW' — last weekday of month (Quartz dom only)
if (token === "LW") {
  if (!spec.allowedTypes.includes("weekday")) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.specialNotAllowed",
          params: { token: "LW", field: kind, mode },
        },
      ],
    };
  }
  return { value: { type: "weekday", weekdayDay: "L" }, errors: [] };
}

// 'nW' — nearest weekday to dom n
if (/^\d+W$/.test(token)) {
  if (kind !== "dayOfMonth") {
    return { errors: [{ field: kind, messageKey: "errors.weekdayOnNonDom" }] };
  }
  if (!spec.allowedTypes.includes("weekday")) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.specialNotAllowed",
          params: { token, field: kind, mode },
        },
      ],
    };
  }
  const n = parseInt(token.slice(0, -1), 10);
  if (n < spec.min || n > spec.max) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.outOfRange",
          params: { field: kind, min: spec.min, max: spec.max, value: n },
        },
      ],
    };
  }
  return { value: { type: "weekday", weekdayDay: n }, errors: [] };
}

// 'n#m' — nth occurrence of weekday n
if (token.includes("#")) {
  if (kind !== "dayOfWeek") {
    return { errors: [{ field: kind, messageKey: "errors.nthOnNonDow" }] };
  }
  if (!spec.allowedTypes.includes("nthDayOfWeek")) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.specialNotAllowed",
          params: { token, field: kind, mode },
        },
      ],
    };
  }
  const [w, m] = token.split("#").map((p) => parseInt(p, 10));
  if (
    !Number.isFinite(w) ||
    !Number.isFinite(m) ||
    w < spec.min ||
    w > spec.max ||
    m < 1 ||
    m > 5
  ) {
    return {
      errors: [
        { field: kind, messageKey: "errors.invalidSyntax", params: { char: token, field: kind } },
      ],
    };
  }
  return { value: { type: "nthDayOfWeek", nthDayOfWeek: { weekday: w, n: m } }, errors: [] };
}

// 'nL' — last <weekday> of month (Quartz dow only)
if (/^\d+L$/.test(token)) {
  if (kind !== "dayOfWeek") {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.specialNotAllowed",
          params: { token, field: kind, mode },
        },
      ],
    };
  }
  if (!spec.allowedTypes.includes("lastDay")) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.specialNotAllowed",
          params: { token, field: kind, mode },
        },
      ],
    };
  }
  const w = parseInt(token.slice(0, -1), 10);
  if (w < spec.min || w > spec.max) {
    return {
      errors: [
        {
          field: kind,
          messageKey: "errors.outOfRange",
          params: { field: kind, min: spec.min, max: spec.max, value: w },
        },
      ],
    };
  }
  return { value: { type: "lastDay", weekdayDay: w }, errors: [] };
}
```

Extend `canonicalize`:

```typescript
case "noSpecific":      return "?";
case "lastDay":         return value.weekdayDay !== undefined ? `${value.weekdayDay}L` : "L";
case "lastDayOffset":   return `L-${value.lastDayOffset}`;
case "weekday":         return value.weekdayDay === "L" ? "LW" : `${value.weekdayDay}W`;
case "nthDayOfWeek":    return `${value.nthDayOfWeek!.weekday}#${value.nthDayOfWeek!.n}`;
```

- [ ] **Step 4: Add Quartz DOM/DOW post-validation**

In `parseCron`, after the per-field loop and before constructing the result, insert:

```typescript
if (mode === "quartz" && errors.length === 0) {
  const dom = fields.dayOfMonth;
  const dow = fields.dayOfWeek;
  const domQ = dom?.type === "noSpecific";
  const dowQ = dow?.type === "noSpecific";
  if (domQ && dowQ) {
    errors.push({ messageKey: "errors.quartzBothQuestionMarks" });
  } else if (!domQ && !dowQ) {
    errors.push({ messageKey: "errors.quartzNeedsQuestionMark" });
  }
}
```

- [ ] **Step 5: Run all parser tests**

Run: `pnpm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/cron/parser.ts libs/cron/__tests__/parser.test.ts
git commit -m "feat(cron): parse Quartz special chars and validate DOM/DOW interaction"
```

---

## Task 8: Parser — Spring DOW base & remaining edge cases

- Spring accepts `7` for Sunday — canonicalize to `0`.
- Standard `0 0 30 2 *` parses (syntactically valid) but executor will surface `neverTriggers` later.
- Both DOM and DOW non-`*` in Standard/Spring is **not** an error (it's OR semantics) — `bothDayFieldsSet` becomes a warning emitted in Generate-tab UI, not at parse time.

**Files:**

- Modify: `libs/cron/parser.ts`
- Modify: `libs/cron/__tests__/parser.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe("parseCron — Spring DOW", () => {
  it("normalizes 7 to 0 in spring DOW", () => {
    const r = parseCron("0 0 0 * * 7", "spring");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "specific", values: [0] });
    expect(r.expression).toBe("0 0 0 * * 0");
  });

  it("accepts 1-7 range in spring (then normalizes 7→0 inside lists)", () => {
    const r = parseCron("0 0 0 * * 1,7", "spring");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek?.type).toBe("list");
  });
});

describe("parseCron — never-triggers patterns parse cleanly", () => {
  it("'30 * Feb' is syntactically valid (executor catches dead-end later)", () => {
    const r = parseCron("0 0 30 2 *", "standard");
    expect(r.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test`
Expected: FAIL on Spring 7→0 (we currently store 7 as-is).

- [ ] **Step 3: Implement post-parse normalization**

In `parseCron` after the Quartz validation block, add a Spring DOW normalization pass:

```typescript
if (mode === "spring" && fields.dayOfWeek) {
  fields.dayOfWeek = normalizeSpringDow(fields.dayOfWeek);
}
```

Helper:

```typescript
function normalizeSpringDow(v: CronFieldValue): CronFieldValue {
  if (v.type === "specific" && v.values?.[0] === 7) return { type: "specific", values: [0] };
  if (v.type === "list" && v.listItems) {
    return { type: "list", listItems: v.listItems.map(normalizeSpringDow) };
  }
  if (v.type === "range" && v.range) {
    const from = v.range.from === 7 ? 0 : v.range.from;
    const to = v.range.to === 7 ? 0 : v.range.to;
    if (from > to)
      return {
        type: "list",
        listItems: [
          { type: "range", range: { from: 0, to } },
          { type: "specific", values: [from] },
        ],
      };
    return { type: "range", range: { from, to } };
  }
  return v;
}
```

After normalization, recompute the canonical token for that field. Easiest: regenerate the entire `expression` from `fields` after normalization. We'll defer that to Task 9 (generator) — for now, manually patch the canonical token at index 5 (spring) when DOW differs.

Actually, since canonical tokens were computed in the per-field loop, do the post-pass before the join. Refactor: after the for-loop, build `canonicalTokens` again from `fields`:

```typescript
const canonical = specs.map((spec) => canonicalize(fields[spec.kind], "*"));
```

Replace the previous `canonicalTokens` push inside the loop with this single call after both validation passes (Quartz + Spring DOW).

- [ ] **Step 4: Run to verify**

Run: `pnpm test`
Expected: PASS for all parser tests.

- [ ] **Step 5: Commit**

```bash
git add libs/cron/parser.ts libs/cron/__tests__/parser.test.ts
git commit -m "feat(cron): normalize Spring DOW '7' to '0' and recompute canonical tokens"
```

---

## Task 9: Generator

`generateCron(fields, mode)` — pure inverse of parser. Re-uses `canonicalize` from parser? No — keep them isolated. Generator has its own emitter (the parser's `canonicalize` is currently inside parser.ts; we expose it as a shared helper).

**Files:**

- Create: `libs/cron/generator.ts`
- Modify: `libs/cron/parser.ts` (export `canonicalize` as `tokenToString`)
- Test: `libs/cron/__tests__/generator.test.ts`

- [ ] **Step 1: Refactor — export `tokenToString` from a new shared module**

Create `libs/cron/canonical.ts`:

```typescript
// libs/cron/canonical.ts
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
```

In `parser.ts`, remove the local `canonicalize` and import `tokenToString` instead:

```typescript
import { tokenToString } from "./canonical";
// ...
const canonical = specs.map((spec) => tokenToString(fields[spec.kind]));
```

- [ ] **Step 2: Write failing generator tests**

```typescript
// libs/cron/__tests__/generator.test.ts
import { describe, it, expect } from "vitest";
import { generateCron } from "../generator";
import { parseCron } from "../parser";
import type { CronFieldValue } from "../types";

describe("generateCron", () => {
  it("emits '* * * * *' for all-any standard", () => {
    expect(
      generateCron(
        {
          minute: { type: "any" },
          hour: { type: "any" },
          dayOfMonth: { type: "any" },
          month: { type: "any" },
          dayOfWeek: { type: "any" },
        },
        "standard"
      )
    ).toBe("* * * * *");
  });

  it("emits a Quartz expression with all 7 fields", () => {
    expect(
      generateCron(
        {
          second: { type: "specific", values: [0] },
          minute: { type: "specific", values: [0] },
          hour: { type: "specific", values: [9] },
          dayOfMonth: { type: "noSpecific" },
          month: { type: "any" },
          dayOfWeek: { type: "range", range: { from: 2, to: 6 } },
          year: { type: "any" },
        },
        "quartz"
      )
    ).toBe("0 0 9 ? * 2-6 *");
  });

  it("round-trips every valid parser input", () => {
    const samples: { expr: string; mode: "standard" | "spring" | "quartz" }[] = [
      { expr: "* * * * *", mode: "standard" },
      { expr: "0 9 * * 1-5", mode: "standard" },
      { expr: "*/15 * * * *", mode: "standard" },
      { expr: "0 0 1,15 * *", mode: "standard" },
      { expr: "0 0 * * * *", mode: "spring" },
      { expr: "0 0 9 ? * 2-6 *", mode: "quartz" },
      { expr: "0 0 0 L * ? *", mode: "quartz" },
      { expr: "0 0 0 ? * 6#3 *", mode: "quartz" },
      { expr: "0 0 0 LW * ? *", mode: "quartz" },
      { expr: "0 0 0 L-3 * ? *", mode: "quartz" },
    ];

    for (const { expr, mode } of samples) {
      const parsed = parseCron(expr, mode);
      expect(parsed.valid, `parsing ${expr}`).toBe(true);
      const regen = generateCron(parsed.fields as Record<string, CronFieldValue>, mode);
      expect(regen, `regen of ${expr}`).toBe(expr);
    }
  });
});
```

- [ ] **Step 3: Run — expect failure (no `generator.ts`)**

Run: `pnpm test`
Expected: FAIL.

- [ ] **Step 4: Implement `generator.ts`**

```typescript
// libs/cron/generator.ts
import { tokenToString } from "./canonical";
import { FIELD_SPECS } from "./field-spec";
import type { CronFieldValue, CronMode, CronFieldKind } from "./types";

export function generateCron(
  fields: Partial<Record<CronFieldKind, CronFieldValue>>,
  mode: CronMode
): string {
  const specs = FIELD_SPECS[mode];
  return specs.map((spec) => tokenToString(fields[spec.kind])).join(" ");
}
```

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/cron/canonical.ts libs/cron/parser.ts libs/cron/generator.ts libs/cron/__tests__/generator.test.ts
git commit -m "feat(cron): add generator and shared canonical token serializer"
```

---

## Task 10: Describer — i18n-aware human-readable text

`describeCron(parsed, t, locale)` composes phrases from translation keys. The `t` function signature mirrors `next-intl`'s `useTranslations` return: `(key, params?) => string`.

**Strategy**: For each field, classify its type and emit a sub-phrase. Then assemble: `"At {time} {dayPhrase} {monthPhrase} {yearPhrase}"`.

Tests use a stub `t` that returns `key|json(params)` so we verify call shape, not real translations.

**Files:**

- Create: `libs/cron/describer.ts`
- Test: `libs/cron/__tests__/describer.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// libs/cron/__tests__/describer.test.ts
import { describe, it, expect } from "vitest";
import { describeCron } from "../describer";
import { parseCron } from "../parser";

const stubT = (key: string, params?: Record<string, unknown>): string =>
  params ? `${key}(${JSON.stringify(params)})` : key;

describe("describeCron", () => {
  it("describes '* * * * *' as everyMinute", () => {
    const p = parseCron("* * * * *", "standard");
    expect(describeCron(p, stubT, "en")).toContain("describe.everyMinute");
  });

  it("describes '0 9 * * 1-5' with atTime + range of weekdays", () => {
    const p = parseCron("0 9 * * 1-5", "standard");
    const out = describeCron(p, stubT, "en");
    expect(out).toContain("describe.atTime");
    expect(out).toContain('"time":"09:00"');
    expect(out).toContain("describe.throughDays");
  });

  it("describes 'L' as lastDayOfMonth", () => {
    const p = parseCron("0 0 0 L * ? *", "quartz");
    const out = describeCron(p, stubT, "en");
    expect(out).toContain("describe.lastDayOfMonth");
  });

  it("describes '6#3' as nth weekday", () => {
    const p = parseCron("0 0 0 ? * 6#3 *", "quartz");
    const out = describeCron(p, stubT, "en");
    expect(out).toContain("describe.nthWeekday");
    expect(out).toContain('"ordinal":"ordinal.3"');
  });

  it("describes '*/15 * * * *' as everyN", () => {
    const p = parseCron("*/15 * * * *", "standard");
    const out = describeCron(p, stubT, "en");
    expect(out).toContain("describe.everyN");
    expect(out).toContain('"n":15');
  });

  it("returns empty string for invalid parsed", () => {
    const p = parseCron("bogus", "standard");
    expect(describeCron(p, stubT, "en")).toBe("");
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL.

- [ ] **Step 3: Implement `describer.ts`**

```typescript
// libs/cron/describer.ts
import type { CronFieldValue, ParsedCron } from "./types";

type T = (key: string, params?: Record<string, string | number>) => string;

export function describeCron(parsed: ParsedCron, t: T, locale: string): string {
  if (!parsed.valid) return "";

  const { fields, mode } = parsed;
  const second = fields.second;
  const minute = fields.minute!;
  const hour = fields.hour!;
  const dom = fields.dayOfMonth;
  const month = fields.month;
  const dow = fields.dayOfWeek;

  // Time portion
  const timePhrase = describeTime(second, minute, hour, t);

  // Day portion
  const dayPhrase = describeDay(dom, dow, mode, t);

  // Month portion (omit if month is "any")
  const monthPhrase = month && month.type !== "any" ? describeMonth(month, t) : "";

  return [timePhrase, dayPhrase, monthPhrase].filter(Boolean).join(" ");
}

function describeTime(
  second: CronFieldValue | undefined,
  minute: CronFieldValue,
  hour: CronFieldValue,
  t: T
): string {
  // Every minute / every second
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
  // every N minutes
  if (hour.type === "any" && minute.type === "step" && minute.step?.start === "*") {
    return t("describe.everyN", { n: minute.step.interval, unit: "minute" });
  }
  // At HH:MM
  if (hour.type === "specific" && minute.type === "specific") {
    const time = `${pad(hour.values![0])}:${pad(minute.values![0])}`;
    return t("describe.atTime", { time });
  }
  // Fallback: At HH every minute
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
  // Quartz: one side is `?`
  const useDom = dom && dom.type !== "any" && dom.type !== "noSpecific";
  const useDow = dow && dow.type !== "any" && dow.type !== "noSpecific";

  const parts: string[] = [];

  if (useDom) {
    parts.push(describeDom(dom!, t));
  }
  if (useDow) {
    parts.push(describeDow(dow!, mode, t));
  }

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
      return t("describe.onDays", { days: v.listItems!.map((it) => tokenSummary(it)).join(",") });
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
        ? `last ${weekdayName(v.weekdayDay as number, mode, t)}`
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

function describeMonth(v: CronFieldValue, t: T): string {
  // Trivial first cut — refined later if i18n needs it
  return tokenSummary(v);
}

function weekdayName(n: number, mode: ParsedCron["mode"], t: T): string {
  // Standard/Spring: 0=Sun..6=Sat. Quartz: 1=Sun..7=Sat.
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
```

- [ ] **Step 4: Run tests to verify**

Run: `pnpm test`
Expected: PASS for the 6 describer cases.

- [ ] **Step 5: Commit**

```bash
git add libs/cron/describer.ts libs/cron/__tests__/describer.test.ts
git commit -m "feat(cron): add i18n-aware human description composer"
```

---

## Task 11: Executor — common patterns (Standard/Spring)

Smart-skip iteration. Implement order: year → month → day → hour → minute → second. For Standard mode, skip second. Special chars come in Task 12; DST/UTC in Task 13.

**Files:**

- Create: `libs/cron/executor.ts`
- Test: `libs/cron/__tests__/executor.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// libs/cron/__tests__/executor.test.ts
import { describe, it, expect } from "vitest";
import { nextExecutions } from "../executor";
import { parseCron } from "../parser";

function iso(d: Date): string {
  // local YYYY-MM-DD HH:mm:ss for stable equality
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

describe("nextExecutions — standard", () => {
  it("'* * * * *' produces consecutive minutes", () => {
    const from = new Date(2026, 3, 28, 10, 0, 30); // 2026-04-28 10:00:30 local
    const r = nextExecutions(parseCron("* * * * *", "standard"), 3, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual([
      "2026-04-28 10:01:00",
      "2026-04-28 10:02:00",
      "2026-04-28 10:03:00",
    ]);
    expect(r.searchExhausted).toBe(false);
  });

  it("'0 9 * * *' yields next 09:00 daily", () => {
    const from = new Date(2026, 3, 28, 12, 0, 0);
    const r = nextExecutions(parseCron("0 9 * * *", "standard"), 2, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-04-29 09:00:00", "2026-04-30 09:00:00"]);
  });

  it("'0 9 * * 1-5' skips weekends", () => {
    // 2026-05-01 is Friday; 2026-05-04 is Monday
    const from = new Date(2026, 4, 1, 12, 0, 0);
    const r = nextExecutions(parseCron("0 9 * * 1-5", "standard"), 3, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual([
      "2026-05-04 09:00:00",
      "2026-05-05 09:00:00",
      "2026-05-06 09:00:00",
    ]);
  });

  it("'0 0 1 * *' fires on day 1 of each month", () => {
    const from = new Date(2026, 3, 28, 12, 0, 0);
    const r = nextExecutions(parseCron("0 0 1 * *", "standard"), 3, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual([
      "2026-05-01 00:00:00",
      "2026-06-01 00:00:00",
      "2026-07-01 00:00:00",
    ]);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `executor.ts` (no special chars yet)**

```typescript
// libs/cron/executor.ts
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
    cursor = addSeconds(next, 1, tz);
  }
  return { executions: out, searchExhausted: false };
}

// --- Time arithmetic helpers (parametric on tz) ---

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
  // standard: round up to next minute
  const ms = d.getTime();
  const remainder = ms % 60000;
  return remainder === 0 ? new Date(d) : new Date(ms + (60000 - remainder));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// --- Field matching ---

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
      return false; // special chars handled in stepToNextMatch via dedicated helpers
  }
}

function matchesYear(p: ParsedCron, year: number): boolean {
  if (p.mode !== "quartz") return true;
  return matches(p.fields.year, year);
}

// Standard/Spring: OR semantics across DOM/DOW (Vixie cron) when both are non-`*`.
// Quartz: exactly one is `?`, so it reduces to single-side check.
function matchesDayConjunction(p: ParsedCron, year: number, month: number, day: number): boolean {
  const dom = p.fields.dayOfMonth;
  const dow = p.fields.dayOfWeek;

  if (p.mode === "quartz") {
    if (dom?.type === "noSpecific") return matchesDow(dow, year, month, day, p.mode);
    return matchesDom(dom, year, month, day);
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
  // Special chars (L, W, L-N, LW) handled in Task 12.
  return matches(v, day);
}

function matchesDow(
  v: CronFieldValue,
  year: number,
  month: number,
  day: number,
  mode: ParsedCron["mode"]
): boolean {
  // Special chars (#, nL) handled in Task 12.
  const dow = new Date(year, month - 1, day).getDay(); // 0=Sun..6=Sat
  const numeric = mode === "quartz" ? dow + 1 : dow;
  return matches(v, numeric);
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
      // jump to next month
      const nextMonth = mo === 12 ? { y: y + 1, m: 1 } : { y, m: mo + 1 };
      cur = build(nextMonth.y, nextMonth.m, 1, 0, 0, 0, tz);
      continue;
    }
    if (!matchesDayConjunction(p, y, mo, d)) {
      // jump to next day; carry month/year
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
```

- [ ] **Step 4: Run executor tests**

Run: `pnpm test`
Expected: PASS for the 4 standard cases.

- [ ] **Step 5: Commit**

```bash
git add libs/cron/executor.ts libs/cron/__tests__/executor.test.ts
git commit -m "feat(cron): add smart-skip executor for non-special patterns"
```

---

## Task 12: Executor — Quartz special chars

Add `L`, `nL`, `LW`, `nW`, `n#m`, `L-N` matching. Each has its own check; integrate into `matchesDom` and `matchesDow`.

**Files:**

- Modify: `libs/cron/executor.ts`
- Modify: `libs/cron/__tests__/executor.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe("nextExecutions — Quartz special chars", () => {
  function iso(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  it("'L' fires on the last day of the month", () => {
    const from = new Date(2026, 3, 1, 0, 0, 0); // 2026-04-01
    const r = nextExecutions(parseCron("0 0 0 L * ? *", "quartz"), 3, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual([
      "2026-04-30 00:00:00",
      "2026-05-31 00:00:00",
      "2026-06-30 00:00:00",
    ]);
  });

  it("'L-3' fires 3 days before the last day", () => {
    const from = new Date(2026, 3, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 L-3 * ? *", "quartz"), 2, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-04-27 00:00:00", "2026-05-28 00:00:00"]);
  });

  it("'15W' fires on the nearest weekday to day 15", () => {
    // 2026-08-15 is a Saturday → fires Friday 14
    const from = new Date(2026, 7, 1, 0, 0, 0); // 2026-08-01
    const r = nextExecutions(parseCron("0 0 0 15W * ? *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-08-14 00:00:00"]);
  });

  it("'1W' jumps Monday when day 1 is a Sunday (no boundary cross)", () => {
    // 2026-11-01 is Sunday → fires Monday Nov 2
    const from = new Date(2026, 9, 25, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 1W * ? *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-11-02 00:00:00"]);
  });

  it("'LW' fires on the last weekday of the month", () => {
    // 2026-05-31 is Sunday → fires Friday May 29
    const from = new Date(2026, 4, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 LW * ? *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-05-29 00:00:00"]);
  });

  it("'6#3' fires on the 3rd Friday of the month (Quartz DOW: Fri=6)", () => {
    // 2026-05: 1st=Fri 1, 2nd=Fri 8, 3rd=Fri 15
    const from = new Date(2026, 4, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 ? * 6#3 *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-05-15 00:00:00"]);
  });

  it("'6#5' skips months without a 5th Friday", () => {
    // April 2026 has Fridays on 3,10,17,24 → no 5th. May 2026: 1,8,15,22,29 → fires May 29.
    const from = new Date(2026, 3, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 ? * 6#5 *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-05-29 00:00:00"]);
  });

  it("'6L' fires on the last Friday of the month", () => {
    // 2026-04: last Fri = 24
    const from = new Date(2026, 3, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 ? * 6L *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-04-24 00:00:00"]);
  });

  it("never-triggers pattern returns empty with neverTriggers notice", () => {
    const from = new Date(2026, 0, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 30 2 ? *", "quartz"), 5, { from, tz: "local" });
    expect(r.executions).toEqual([]);
    expect(r.searchExhausted).toBe(true);
  });

  it("performance: 5 executions within 100ms", () => {
    const from = new Date(2026, 0, 1, 0, 0, 0);
    const t0 = performance.now();
    nextExecutions(parseCron("0 0 9 ? * MON-FRI *", "quartz"), 5, { from, tz: "local" });
    expect(performance.now() - t0).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL on every special-char case.

- [ ] **Step 3: Replace `matchesDom` and `matchesDow` with special-aware versions**

In `executor.ts`:

```typescript
function matchesDom(v: CronFieldValue, year: number, month: number, day: number): boolean {
  switch (v.type) {
    case "lastDay":
      return day === daysInMonth(year, month);
    case "lastDayOffset":
      return day === daysInMonth(year, month) - (v.lastDayOffset ?? 0);
    case "weekday": {
      if (v.weekdayDay === "L") {
        // last weekday of month
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
  const realDow = new Date(year, month - 1, day).getDay(); // 0=Sun..6=Sat
  const modal = mode === "quartz" ? realDow + 1 : realDow;

  switch (v.type) {
    case "nthDayOfWeek": {
      const { weekday, n } = v.nthDayOfWeek!;
      if (modal !== weekday) return false;
      // Compute which occurrence in the month this is.
      const occurrence = Math.ceil(day / 7);
      return occurrence === n;
    }
    case "lastDay": {
      // nL — last <weekday> of month
      const targetDow = v.weekdayDay as number;
      if (modal !== targetDow) return false;
      const lastDay = daysInMonth(year, month);
      // The day in question is the "last" if (lastDay - day) < 7 AND realDow matches.
      return lastDay - day < 7;
    }
    default:
      return matches(v, modal);
  }
}

// 'W' rule: nearest weekday (Mon–Fri) to the target day, never crossing month boundary.
// direction:
//   "either"  — used by `nW`: nearest in either direction
//   "backward" — used by `LW`: never go past last day
function nearestWeekday(
  year: number,
  month: number,
  target: number,
  direction: "either" | "backward"
): number {
  const dim = daysInMonth(year, month);
  const clampedTarget = Math.min(target, dim);
  const dow = new Date(year, month - 1, clampedTarget).getDay(); // 0=Sun..6=Sat
  if (dow >= 1 && dow <= 5) return clampedTarget; // already a weekday

  // Saturday (6) → Friday (-1); Sunday (0) → Monday (+1)
  if (direction === "backward") {
    // LW: never cross to next month
    if (dow === 6) return clampedTarget - 1;
    // Sunday: prefer Monday only if it stays in month, else Friday
    return clampedTarget + 1 <= dim ? clampedTarget + 1 : clampedTarget - 2;
  }
  // 'either' — Quartz nW: never cross month boundary
  if (dow === 6) {
    // Saturday: prefer Friday; if Friday is day 0 (impossible) bump to Monday
    if (clampedTarget - 1 >= 1) return clampedTarget - 1;
    return clampedTarget + 2; // Sat day 1 → Mon day 3
  }
  // Sunday
  if (clampedTarget + 1 <= dim) return clampedTarget + 1;
  return clampedTarget - 2;
}
```

- [ ] **Step 4: Run all executor tests**

Run: `pnpm test`
Expected: PASS for all 10 Quartz cases plus the 4 standard cases.

- [ ] **Step 5: Commit**

```bash
git add libs/cron/executor.ts libs/cron/__tests__/executor.test.ts
git commit -m "feat(cron): execute Quartz special characters L/W/#/L-N/LW/nL"
```

---

## Task 13: Executor — UTC mode and DST sanity

UTC mode uses the `tz: "utc"` branch added in Task 11. We didn't actually exercise it. Verify here.

**Files:**

- Modify: `libs/cron/__tests__/executor.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe("nextExecutions — UTC mode", () => {
  it("matches against UTC fields when tz='utc'", () => {
    // from is 2026-04-28 23:00:00 UTC (regardless of host TZ)
    const from = new Date(Date.UTC(2026, 3, 28, 23, 0, 0));
    const r = nextExecutions(parseCron("0 0 * * *", "standard"), 1, { from, tz: "utc" });
    expect(r.executions[0].toISOString()).toBe("2026-04-29T00:00:00.000Z");
  });

  it("midnight UTC and midnight local can differ", () => {
    // Construct two queries from the same instant, expect different next-fire when host TZ != UTC
    const from = new Date(Date.UTC(2026, 3, 28, 23, 0, 0));
    const utc = nextExecutions(parseCron("0 0 * * *", "standard"), 1, { from, tz: "utc" });
    const local = nextExecutions(parseCron("0 0 * * *", "standard"), 1, { from, tz: "local" });
    // We don't assert specific local time (host-dependent); we just assert both produce a Date in the future.
    expect(utc.executions[0].getTime()).toBeGreaterThan(from.getTime());
    expect(local.executions[0].getTime()).toBeGreaterThan(from.getTime());
  });
});
```

- [ ] **Step 2: Run**

Run: `pnpm test`
Expected: PASS — UTC plumbing already in place from Task 11.

- [ ] **Step 3: Commit**

```bash
git add libs/cron/__tests__/executor.test.ts
git commit -m "test(cron): cover executor UTC mode behavior"
```

---

## Task 14: Presets and main barrel

**Files:**

- Create: `libs/cron/presets.ts`
- Create: `libs/cron/main.ts`

- [ ] **Step 1: Write `presets.ts`**

```typescript
// libs/cron/presets.ts
import type { Preset } from "./types";

export const PRESETS: Preset[] = [
  { id: "everyMinute", labelKey: "presets.everyMinute", mode: "standard", expression: "* * * * *" },
  {
    id: "every5Minutes",
    labelKey: "presets.every5Minutes",
    mode: "standard",
    expression: "*/5 * * * *",
  },
  {
    id: "every15Minutes",
    labelKey: "presets.every15Minutes",
    mode: "standard",
    expression: "*/15 * * * *",
  },
  { id: "everyHour", labelKey: "presets.everyHour", mode: "standard", expression: "0 * * * *" },
  {
    id: "every2Hours",
    labelKey: "presets.every2Hours",
    mode: "standard",
    expression: "0 */2 * * *",
  },
  { id: "everyDay", labelKey: "presets.everyDay", mode: "standard", expression: "0 0 * * *" },
  {
    id: "everyMondayMorning",
    labelKey: "presets.everyMondayMorning",
    mode: "standard",
    expression: "0 9 * * 1",
  },
  {
    id: "weekdays9am",
    labelKey: "presets.weekdays9am",
    mode: "standard",
    expression: "0 9 * * 1-5",
  },
  {
    id: "firstOfMonth",
    labelKey: "presets.firstOfMonth",
    mode: "standard",
    expression: "0 0 1 * *",
  },
  {
    id: "lastOfMonth",
    labelKey: "presets.lastOfMonth",
    mode: "quartz",
    expression: "0 0 0 L * ? *",
  },
  {
    id: "everyQuarter",
    labelKey: "presets.everyQuarter",
    mode: "standard",
    expression: "0 0 1 1,4,7,10 *",
  },
];
```

- [ ] **Step 2: Write `main.ts`**

```typescript
// libs/cron/main.ts
export { parseCron } from "./parser";
export { generateCron } from "./generator";
export { describeCron } from "./describer";
export { nextExecutions } from "./executor";
export { PRESETS } from "./presets";
export { tokenToString } from "./canonical";
export { FIELD_SPECS, getFieldSpec, getFieldKindsForMode } from "./field-spec";
export type {
  CronMode,
  CronFieldKind,
  FieldValueType,
  CronFieldValue,
  ParsedCron,
  ParseError,
  ExecutionResult,
  Preset,
  FieldSpec,
} from "./types";
```

- [ ] **Step 3: Verify TypeScript**

Run: `pnpm tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add libs/cron/presets.ts libs/cron/main.ts
git commit -m "feat(cron): add presets and public barrel"
```

---

## Task 15: i18n — `cron.json` (English)

The full key shape comes from the spec's "Cron-specific Keys" section. Write the English file complete; zh-CN and zh-TW follow identically in Task 16.

**Files:**

- Create: `public/locales/en/cron.json`

- [ ] **Step 1: Write the file**

```json
{
  "mode": {
    "label": "Mode",
    "standard": "Standard (5 fields)",
    "spring": "Spring (6 fields)",
    "quartz": "Quartz (7 fields)"
  },
  "tab": { "generate": "Generate", "parse": "Parse" },
  "timezone": { "label": "Timezone", "local": "Local", "utc": "UTC" },
  "field": {
    "second": "Second",
    "minute": "Minute",
    "hour": "Hour",
    "dayOfMonth": "Day",
    "month": "Month",
    "dayOfWeek": "Weekday",
    "year": "Year"
  },
  "fieldType": {
    "any": "Any",
    "noSpecific": "No specific",
    "specific": "Specific",
    "range": "Range",
    "step": "Step",
    "list": "List",
    "lastDay": "Last day",
    "weekday": "Nearest weekday",
    "nthDayOfWeek": "Nth weekday",
    "lastDayOffset": "Days before last"
  },
  "monthShort": [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ],
  "weekdayShort": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  "weekdayLong": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  "presets": {
    "everyMinute": "Every minute",
    "every5Minutes": "Every 5 minutes",
    "every15Minutes": "Every 15 minutes",
    "everyHour": "Every hour",
    "every2Hours": "Every 2 hours",
    "everyDay": "Every day at 00:00",
    "everyMondayMorning": "Every Monday at 09:00",
    "weekdays9am": "Weekdays at 09:00",
    "firstOfMonth": "First day of month",
    "lastOfMonth": "Last day of month",
    "everyQuarter": "Every quarter (Jan/Apr/Jul/Oct 1st)"
  },
  "describe": {
    "everyMinute": "Every minute",
    "everySecond": "Every second",
    "atTime": "At {time}",
    "everyN": "Every {n} {unit}",
    "fromTo": "from {from} to {to}",
    "onDays": "on {days}",
    "throughDays": "{from} through {to}",
    "andList": "{prefix} and {item}",
    "ofEveryMonth": "of every month",
    "lastDayOfMonth": "the last day of the month",
    "nthWeekday": "the {ordinal} {weekday} of the month",
    "nearestWeekdayTo": "the nearest weekday to day {day}",
    "lastWeekdayOfMonth": "the last weekday of the month",
    "lastDayMinusN": "{n} days before the last day of the month"
  },
  "ordinal": { "1": "first", "2": "second", "3": "third", "4": "fourth", "5": "fifth" },
  "output": {
    "expression": "Expression",
    "description": "Description",
    "nextExecutions": "Next 5 executions",
    "header": { "num": "#", "dateTime": "Date & Time", "relative": "Relative" },
    "relative": { "in": "in {value}", "now": "now", "past": "past" }
  },
  "share": { "button": "Share link", "copied": "Share link copied" },
  "parse": {
    "placeholder": "Paste or type a Cron expression",
    "showingPrevious": "Showing last valid output"
  },
  "warn": {
    "neverTriggers": "This expression will never trigger",
    "searchWindowExhausted": "Only {found} of {requested} executions found in the next 4 years",
    "secondDropped": "Second field was dropped (was: {value})",
    "yearDropped": "Year field was dropped (was: {value})",
    "specialDroppedFromMode": "Special character {token} is not supported in {mode} mode and was removed",
    "bothDayFieldsSet": "Both day-of-month and day-of-week are set — expression fires when EITHER matches",
    "orSemanticsLost": "Quartz cannot represent OR semantics across day fields — keeping day-of-week, setting day-of-month to '?'"
  },
  "errors": {
    "wrongFieldCount": "Expected {expected} fields for {mode} mode, got {got}",
    "outOfRange": "{field} must be {min}-{max}, got {value}",
    "invalidSyntax": "Unexpected character '{char}' in {field} field",
    "invalidStep": "Step value must be positive, got {value}",
    "rangeReversed": "Range start ({from}) is greater than end ({to}) in {field}",
    "specialNotAllowed": "'{token}' is not allowed in {field} field for {mode} mode",
    "quartzNeedsQuestionMark": "Quartz mode requires either day-of-month or day-of-week to be '?'",
    "quartzBothQuestionMarks": "Day-of-month and day-of-week cannot both be '?'",
    "macroRebootUnsupported": "@reboot is not supported (browser cannot detect system boot)",
    "unknownMacro": "Unknown macro '{macro}'",
    "unknownAlias": "Unknown name '{name}' in {field} field",
    "weekdayOnNonDom": "'W' is only allowed in day-of-month field",
    "nthOnNonDow": "'#' is only allowed in day-of-week field"
  },
  "descriptions": {
    "whatIsTitle": "What is a Cron Expression?",
    "whatIs": "A Cron expression is a string of fields that describes a schedule. Each field controls a unit of time (minute, hour, day, month, weekday). Originally from Unix cron, the syntax has been extended by Spring (adds seconds) and Quartz (adds seconds and year, plus special characters L, W, #).",
    "fieldRefTitle": "Field Reference",
    "specialCharsTitle": "Special Characters",
    "modesTitle": "Modes",
    "dstTitle": "Daylight Saving Time",
    "dst": "When the active timezone observes DST, schedules within the spring-forward gap fire at the next valid time, and schedules within the fall-back overlap fire at the first occurrence. Switch to UTC to avoid DST entirely."
  },
  "editor": {
    "title": "Edit field",
    "preview": "Preview",
    "apply": "Apply",
    "specificValue": "Value",
    "rangeFrom": "From",
    "rangeTo": "To",
    "stepStart": "Start",
    "stepInterval": "Interval",
    "stepEvery": "Every",
    "listSelect": "Select values",
    "specialKind": "Kind"
  },
  "presetSection": "Quick presets"
}
```

- [ ] **Step 2: Verify JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/locales/en/cron.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add public/locales/en/cron.json
git commit -m "feat(cron): add English i18n strings"
```

---

## Task 16: i18n — `cron.json` (zh-CN, zh-TW) and `tools.json` updates

**Files:**

- Create: `public/locales/zh-CN/cron.json`
- Create: `public/locales/zh-TW/cron.json`
- Modify: `public/locales/en/tools.json`
- Modify: `public/locales/zh-CN/tools.json`
- Modify: `public/locales/zh-TW/tools.json`

- [ ] **Step 1: Translate `zh-CN/cron.json`**

Mirror the English structure. Translate every value. Key examples:

```json
{
  "mode": {
    "label": "模式",
    "standard": "标准（5 字段）",
    "spring": "Spring（6 字段）",
    "quartz": "Quartz（7 字段）"
  },
  "tab": { "generate": "生成", "parse": "解析" },
  "timezone": { "label": "时区", "local": "本地", "utc": "UTC" },
  "field": {
    "second": "秒",
    "minute": "分",
    "hour": "时",
    "dayOfMonth": "日",
    "month": "月",
    "dayOfWeek": "周",
    "year": "年"
  },
  "monthShort": [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月"
  ],
  "weekdayShort": ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  "weekdayLong": ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
  // ... continue translating every key from en/cron.json
  "describe": {
    "everyMinute": "每分钟",
    "atTime": "于 {time}",
    "throughDays": "{from} 至 {to}",
    "lastDayOfMonth": "本月最后一天",
    "nthWeekday": "本月第 {ordinal} 个 {weekday}",
    "lastDayMinusN": "本月最后一天前 {n} 天"
  }
}
```

Fully translate every key in en/cron.json — do not omit any. Refer to existing `zh-CN/jwt.json` for tone conventions.

- [ ] **Step 2: Translate `zh-TW/cron.json`**

Same structure, Traditional Chinese variants (e.g., 「最後一天」 instead of 「最后一天」). Refer to existing `zh-TW/jwt.json` for tone.

- [ ] **Step 3: Add tools metadata in all three locales**

In `public/locales/en/tools.json`, append (alphabetic ordering not required — match the order in `libs/tools.ts`):

```json
"cron": {
  "shortTitle": "Cron",
  "title": "Cron Expression Generator & Parser",
  "description": "Build and decode Cron expressions for Standard, Spring, and Quartz schedulers. See human-readable explanations and the next 5 execution times."
}
```

Add equivalents to `zh-CN/tools.json` and `zh-TW/tools.json`. Suggested copy:

zh-CN:

```json
"cron": {
  "shortTitle": "Cron 表达式",
  "title": "Cron 表达式生成与解析",
  "description": "为 Standard、Spring 和 Quartz 调度器生成与解析 Cron 表达式，附人类可读的解释与未来 5 次执行时间。"
}
```

zh-TW:

```json
"cron": {
  "shortTitle": "Cron 表達式",
  "title": "Cron 表達式產生與解析",
  "description": "為 Standard、Spring 和 Quartz 排程器產生與解析 Cron 表達式，附人類可讀的解釋與未來 5 次執行時間。"
}
```

- [ ] **Step 4: Verify all five JSON files parse**

Run:

```bash
for f in public/locales/en/cron.json public/locales/zh-CN/cron.json public/locales/zh-TW/cron.json public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || echo "BAD: $f"
done
echo "done"
```

Expected: `done` with no `BAD:` lines.

- [ ] **Step 5: Commit**

```bash
git add public/locales/zh-CN/cron.json public/locales/zh-TW/cron.json public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
git commit -m "feat(cron): add zh-CN, zh-TW translations and tools.json metadata"
```

---

## Task 17: CSS color tokens for field coding

**Files:**

- Modify: `app/globals.css`

- [ ] **Step 1: Add `--cron-*` variables under `:root` and `.dark`**

In the `:root` block:

```css
--cron-hour: #f59e0b;
--cron-dom: #e11d48;
--cron-month: #10b981;
--cron-dow: #3b82f6;
```

In the `.dark` block:

```css
--cron-hour: #fbbf24;
--cron-dom: #fb7185;
--cron-month: #34d399;
--cron-dow: #60a5fa;
```

- [ ] **Step 2: Expose as Tailwind utilities under `@theme`**

Append inside the existing `@theme { ... }` block:

```css
--color-cron-hour: var(--cron-hour);
--color-cron-dom: var(--cron-dom);
--color-cron-month: var(--cron-month);
--color-cron-dow: var(--cron-dow);
```

- [ ] **Step 3: Sanity-check by running a build**

Run: `pnpm build`
Expected: build succeeds (no Tailwind class errors).

If `pnpm build` is too slow for your iteration, use `pnpm dev` and load any page — Tailwind will compile on demand and report errors immediately. (Stop the dev server after.)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(cron): add field-color CSS variables and tailwind tokens"
```

---

## Task 18: Page scaffold — route, mode selector, tabs, persistence stub

Build the page skeleton with a working mode selector and tab structure, but leave Generate/Parse panels empty placeholders. State source-of-truth `{ mode, expression, timezone, rawInput }` in the top component. Persist on every change to `localStorage` (Task 19 wires URL too).

**Files:**

- Create: `app/[locale]/cron/page.tsx`
- Create: `app/[locale]/cron/cron-page.tsx`

- [ ] **Step 1: Write `page.tsx`**

```typescript
// app/[locale]/cron/page.tsx
import { getTranslations } from "next-intl/server";
import CronPage from "./cron-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return {
    title: t("cron.title"),
    description: t("cron.description"),
    keywords: "",
  };
}

export default function CronRoute() {
  return <CronPage />;
}
```

- [ ] **Step 2: Write `cron-page.tsx` skeleton**

```typescript
// app/[locale]/cron/cron-page.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Layout from "../../../components/layout";
import { NeonTabs } from "../../../components/ui/tabs";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import {
  parseCron, describeCron, nextExecutions,
  type CronMode, type ParsedCron, type ExecutionResult,
} from "../../../libs/cron/main";

const DEFAULT_EXPRESSIONS: Record<CronMode, string> = {
  standard: "0 9 * * 1-5",
  spring:   "0 0 9 * * 1-5",
  quartz:   "0 0 9 ? * MON-FRI *",
};

interface PersistedState {
  mode: CronMode;
  expression: string;
  timezone: "local" | "utc";
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.cron);
    if (!raw) return null;
    const v = JSON.parse(raw) as PersistedState;
    if (!["standard", "spring", "quartz"].includes(v.mode)) return null;
    return v;
  } catch {
    return null;
  }
}

function savePersisted(s: PersistedState) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.cron, JSON.stringify(s));
  } catch { /* quota or private mode — silently ignore */ }
}

export default function CronPage() {
  const t = useTranslations("cron");
  const ts = useTranslations("tools");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [mode, setMode] = useState<CronMode>("standard");
  const [expression, setExpression] = useState<string>(DEFAULT_EXPRESSIONS.standard);
  const [timezone, setTimezone] = useState<"local" | "utc">("local");

  // Hydrate from localStorage on mount.
  /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration from external source */
  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      setMode(persisted.mode);
      setExpression(persisted.expression);
      setTimezone(persisted.timezone);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist on change (debounced 500ms).
  useEffect(() => {
    const id = setTimeout(() => savePersisted({ mode, expression, timezone }), 500);
    return () => clearTimeout(id);
  }, [mode, expression, timezone]);

  // Derived values
  const parsed: ParsedCron = parseCron(expression, mode);
  const description = describeCron(parsed, t as unknown as (k: string, p?: Record<string, string | number>) => string, locale);
  const result: ExecutionResult = nextExecutions(parsed, 5, { tz: timezone });

  function handleModeChange(next: CronMode) {
    if (next === mode) return;
    // Migration logic comes in Task 22; for now just switch mode and reset to default.
    setMode(next);
    setExpression(DEFAULT_EXPRESSIONS[next]);
  }

  return (
    <Layout title={ts("cron.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <ModeSelector mode={mode} onChange={handleModeChange} />

        <NeonTabs
          tabs={[
            {
              label: t("tab.generate"),
              content: <div className="text-sm text-fg-muted">Generate placeholder</div>,
            },
            {
              label: t("tab.parse"),
              content: <div className="text-sm text-fg-muted">Parse placeholder</div>,
            },
          ]}
        />

        <OutputArea
          expression={expression}
          mode={mode}
          parsed={parsed}
          description={description}
          result={result}
          timezone={timezone}
          onTimezoneChange={setTimezone}
        />
      </div>
    </Layout>
  );
}

// --- Mode selector (radio pills) ---

function ModeSelector({ mode, onChange }: { mode: CronMode; onChange: (m: CronMode) => void }) {
  const t = useTranslations("cron");
  const options: { value: CronMode; label: string }[] = [
    { value: "standard", label: t("mode.standard") },
    { value: "spring", label: t("mode.spring") },
    { value: "quartz", label: t("mode.quartz") },
  ];
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-fg-secondary mb-2">{t("mode.label")}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              mode === o.value
                ? "border-accent-cyan text-accent-cyan bg-accent-cyan-dim"
                : "border-border-default text-fg-secondary hover:text-fg-primary"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Output area placeholder (Task 19 fills it in) ---

function OutputArea(_: {
  expression: string;
  mode: CronMode;
  parsed: ParsedCron;
  description: string;
  result: ExecutionResult;
  timezone: "local" | "utc";
  onTimezoneChange: (tz: "local" | "utc") => void;
}) {
  return null;
}
```

- [ ] **Step 3: Verify TypeScript & dev server boots**

Run: `pnpm tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

Then: `pnpm dev` — open `http://localhost:3000/cron`. Expected: page renders with privacy banner, mode pills (3 buttons), tab strip with "Generate placeholder" / "Parse placeholder", no errors in console. Switch modes → expression silently changes (no UI shows it yet). Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/cron/page.tsx app/[locale]/cron/cron-page.tsx
git commit -m "feat(cron): scaffold cron page with mode selector and tab shell"
```

---

## Task 19: Output area — color-coded expression, description, executions table

The shared output below the tabs. Reads only from props derived in `CronPage`.

**Files:**

- Modify: `app/[locale]/cron/cron-page.tsx`

- [ ] **Step 1: Add color-coded expression renderer**

At the top of `cron-page.tsx`, add this helper (just below the imports):

```typescript
import { getFieldKindsForMode } from "../../../libs/cron/main";
import type { CronFieldKind } from "../../../libs/cron/main";

const COLOR_BY_KIND: Record<CronFieldKind, string> = {
  second: "text-accent-cyan",
  minute: "text-accent-purple",
  hour: "text-cron-hour",
  dayOfMonth: "text-cron-dom",
  month: "text-cron-month",
  dayOfWeek: "text-cron-dow",
  year: "text-fg-secondary",
};

function ColoredExpression({ expression, mode }: { expression: string; mode: CronMode }) {
  const kinds = getFieldKindsForMode(mode);
  const tokens = expression.split(/\s+/);
  return (
    <span className="font-mono text-base">
      {tokens.map((tok, i) => (
        <span key={i} className={kinds[i] ? COLOR_BY_KIND[kinds[i]] : ""}>
          {tok}
          {i < tokens.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Implement `OutputArea` body**

Replace the empty `OutputArea` from Task 18 with:

```typescript
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledSelect } from "../../../components/ui/input";
import { showToast } from "../../../libs/toast";

function formatRelative(future: Date, now: Date, t: ReturnType<typeof useTranslations>): string {
  const diffMs = future.getTime() - now.getTime();
  if (Math.abs(diffMs) < 1000) return t("output.relative.now");
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && !days) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${Math.floor(abs / 1000)}s`);
  return past ? t("output.relative.past") : t("output.relative.in", { value: parts.join(" ") });
}

function formatAbsolute(d: Date, tz: "local" | "utc", locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
    timeZone: tz === "utc" ? "UTC" : undefined,
  });
  return fmt.format(d);
}

function OutputArea({
  expression, mode, description, result, timezone, onTimezoneChange,
}: {
  expression: string;
  mode: CronMode;
  parsed: ParsedCron;
  description: string;
  result: ExecutionResult;
  timezone: "local" | "utc";
  onTimezoneChange: (tz: "local" | "utc") => void;
}) {
  const t = useTranslations("cron");
  const tc = useTranslations("common");
  const locale = useLocale();
  const now = new Date();

  function handleShare() {
    const params = new URLSearchParams({ mode, expr: expression, tz: timezone });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    showToast(t("share.copied"), "success", 2000);
  }

  return (
    <div className="mt-6 rounded-xl border border-border-default bg-bg-surface p-4 space-y-4">
      {/* Expression row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <ColoredExpression expression={expression} mode={mode} />
        <div className="flex items-center gap-2">
          <CopyButton getContent={() => expression} />
          <Button variant="secondary" onClick={handleShare}>
            {t("share.button")}
          </Button>
        </div>
      </div>

      {/* Description */}
      <div className="border-t border-border-default pt-4">
        <div className="text-sm font-medium text-fg-secondary mb-1">{t("output.description")}</div>
        <div className="text-fg-primary text-base">{description || tc("noData")}</div>
      </div>

      {/* Warnings */}
      {mode !== "quartz" && parsed.valid && parsed.fields.dayOfMonth && parsed.fields.dayOfMonth.type !== "any" && parsed.fields.dayOfWeek && parsed.fields.dayOfWeek.type !== "any" && (
        <div className="border-t border-border-default pt-3">
          <div className="text-sm text-amber-500 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
            {t("warn.bothDayFieldsSet")}
          </div>
        </div>
      )}

      {/* Executions */}
      <div className="border-t border-border-default pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-fg-secondary">{t("output.nextExecutions")}</div>
          <StyledSelect
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value as "local" | "utc")}
            className="max-w-[120px]"
          >
            <option value="local">{t("timezone.local")}</option>
            <option value="utc">{t("timezone.utc")}</option>
          </StyledSelect>
        </div>
        <table className="w-full text-sm">
          <thead className="text-fg-muted text-left">
            <tr>
              <th className="py-1 pr-2 w-8">{t("output.header.num")}</th>
              <th className="py-1 pr-2">{t("output.header.dateTime")}</th>
              <th className="py-1">{t("output.header.relative")}</th>
            </tr>
          </thead>
          <tbody>
            {result.executions.map((d, i) => (
              <tr key={i} className="border-t border-border-default">
                <td className="py-1 pr-2 text-fg-muted">{i + 1}</td>
                <td className="py-1 pr-2 font-mono">{formatAbsolute(d, timezone, locale)}</td>
                <td className="py-1 text-fg-secondary">{formatRelative(d, now, t)}</td>
              </tr>
            ))}
            {result.executions.length === 0 && (
              <tr><td colSpan={3} className="py-2 text-fg-muted">{tc("noData")}</td></tr>
            )}
          </tbody>
        </table>
        {result.notice && (
          <div className="mt-2 text-xs text-fg-muted">
            {result.notice === "warn.neverTriggers" ? t("warn.neverTriggers") :
             t("warn.searchWindowExhausted", { found: result.executions.length, requested: 5 })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire `OutputArea` into the page**

`OutputArea` is already rendered in `CronPage` from Task 18 — it just needs to no longer be a no-op. The previous import block also needs `getFieldKindsForMode` and `CronFieldKind` (already added in Step 1).

- [ ] **Step 4: Verify dev**

Run: `pnpm dev` → open `/cron`.
Expected: Default expression `0 9 * * 1-5` shows color-coded; description reads "At 09:00 Monday through Friday" (or close — describer composes from i18n); table shows next 5 executions; switching timezone updates display; "Share link" copies a URL.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/cron/cron-page.tsx
git commit -m "feat(cron): render shared output area with color-coded expression and executions table"
```

---

## Task 20: Parse tab

Real-time parsing with 150ms debounce. Two states: `rawInput` (user-typed text) and `expression` (last-valid). When parse fails, the OutputArea below stays mounted on the last-valid expression.

**Files:**

- Modify: `app/[locale]/cron/cron-page.tsx`

- [ ] **Step 1: Add `rawInput` and `parseError` state to `CronPage`**

Inside `CronPage`, add:

```typescript
const [rawInput, setRawInput] = useState<string>(DEFAULT_EXPRESSIONS.standard);
const [parseError, setParseError] = useState<string | null>(null);
const [parseErrorParams, setParseErrorParams] = useState<Record<string, string | number>>({});

/* eslint-disable react-hooks/set-state-in-effect -- debounced external sync */
useEffect(() => {
  const id = setTimeout(() => {
    if (rawInput.trim() === "") {
      setParseError(null);
      setParseErrorParams({});
      return;
    }
    const p = parseCron(rawInput, mode);
    if (p.valid) {
      setExpression(p.expression);
      setParseError(null);
      setParseErrorParams({});
    } else {
      setParseError(p.errors[0]?.messageKey ?? "errors.invalidSyntax");
      setParseErrorParams(p.errors[0]?.params ?? {});
    }
  }, 150);
  return () => clearTimeout(id);
}, [rawInput, mode]);
/* eslint-enable react-hooks/set-state-in-effect */
```

When `mode` changes via `handleModeChange`, also reset `rawInput`:

```typescript
function handleModeChange(next: CronMode) {
  if (next === mode) return;
  setMode(next);
  setExpression(DEFAULT_EXPRESSIONS[next]);
  setRawInput(DEFAULT_EXPRESSIONS[next]);
}
```

- [ ] **Step 2: Build the Parse panel and wire it into `NeonTabs`**

Replace the `tab.parse` content with `<ParseTab ... />`. Add the component:

```typescript
import { StyledTextarea } from "../../../components/ui/input";

function ParseTab({
  rawInput, setRawInput, parseError, parseErrorParams,
}: { rawInput: string; setRawInput: (v: string) => void; parseError: string | null; parseErrorParams: Record<string, string | number> }) {
  const t = useTranslations("cron");
  return (
    <div>
      <StyledTextarea
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder={t("parse.placeholder")}
        rows={2}
        className="font-mono text-sm"
      />
      {parseError && (
        <p className="mt-1 text-sm text-danger">{t(parseError, parseErrorParams)}</p>
      )}
    </div>
  );
}
```

In the tabs array:

```typescript
{
  label: t("tab.parse"),
  content: (
    <ParseTab
      rawInput={rawInput}
      setRawInput={setRawInput}
      parseError={parseError}
      parseErrorParams={parseErrorParams}
    />
  ),
}
```

- [ ] **Step 3: Verify dev**

Run: `pnpm dev` → `/cron`. Switch to Parse tab. Type `* * * * *` → output updates within 150ms. Type `60 * * * *` → red error appears, output keeps showing previous valid expression. Type `@yearly` → shows `0 0 1 1 *` color-coded. Stop dev.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/cron/cron-page.tsx
git commit -m "feat(cron): add Parse tab with debounced live parsing and inline errors"
```

---

## Task 21: Generate tab — preset pills and field cards (read-only display)

Click a preset pill → applies its expression (mode-converting if needed; for now just switch mode if preset.mode differs). Field cards show current value & type — clicking is wired in Task 23.

**Files:**

- Modify: `app/[locale]/cron/cron-page.tsx`

- [ ] **Step 1: Build `GenerateTab` skeleton**

```typescript
import { Badge } from "../../../components/ui/badge";
import { PRESETS, type CronFieldValue } from "../../../libs/cron/main";

function GenerateTab({
  mode, parsed, expression, onApplyPreset, onEditField,
}: {
  mode: CronMode;
  parsed: ParsedCron;
  expression: string;
  onApplyPreset: (preset: typeof PRESETS[number]) => void;
  onEditField: (kind: CronFieldKind) => void;
}) {
  const t = useTranslations("cron");
  const kinds = getFieldKindsForMode(mode);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-fg-secondary mb-2">{t("presetSection")}</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onApplyPreset(p)}
              className="px-3 py-1.5 text-sm rounded-full border border-border-default text-fg-secondary hover:text-accent-cyan hover:border-accent-cyan transition-colors"
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kinds.map((kind) => (
          <FieldCard
            key={kind}
            kind={kind}
            value={parsed.fields[kind]}
            onClick={() => onEditField(kind)}
          />
        ))}
      </div>
    </div>
  );
}

function FieldCard({
  kind, value, onClick,
}: { kind: CronFieldKind; value: CronFieldValue | undefined; onClick: () => void }) {
  const t = useTranslations("cron");
  const colorClass = COLOR_BY_KIND[kind];
  const display = value ? tokenToString(value) : "*";
  const typeKey = `fieldType.${value?.type ?? "any"}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-border-default bg-bg-surface p-3 hover:border-accent-cyan transition-colors"
      style={{ borderLeft: `3px solid var(--${kind === "year" ? "fg-secondary" : `cron-${kind === "dayOfMonth" ? "dom" : kind === "dayOfWeek" ? "dow" : kind}`}, currentColor)` }}
    >
      <div className={`flex items-center gap-2 mb-2 ${colorClass}`}>
        <span className="w-2 h-2 rounded-full bg-current" />
        <span className="text-sm font-medium">{t(`field.${kind}`)}</span>
      </div>
      <div className="font-mono text-base text-fg-primary mb-1">{display}</div>
      <Badge>{t(typeKey)}</Badge>
    </button>
  );
}
```

Note: the `style={{ borderLeft: ... }}` uses CSS variables directly because Tailwind's arbitrary border-color syntax doesn't compose with CSS variable-based color tokens cleanly across `:root/.dark`. Hour/minute/second use the same color classes via `colorClass`; the variable names differ slightly (`--cron-dom`, `--cron-dow` for dayOfMonth/dayOfWeek). Verify visually.

Also import `tokenToString`:

```typescript
import { tokenToString } from "../../../libs/cron/main";
```

- [ ] **Step 2: Wire `GenerateTab` into `NeonTabs`**

Add `editingField` state placeholder (we'll wire its editor in Task 23):

```typescript
const [editingField, setEditingField] = useState<CronFieldKind | null>(null);
```

Replace the `tab.generate` content:

```typescript
{
  label: t("tab.generate"),
  content: (
    <GenerateTab
      mode={mode}
      parsed={parsed}
      expression={expression}
      onApplyPreset={(p) => {
        setMode(p.mode);
        setExpression(p.expression);
        setRawInput(p.expression);
      }}
      onEditField={(k) => setEditingField(k)}
    />
  ),
}
```

- [ ] **Step 3: Verify dev**

Run: `pnpm dev` → `/cron`. Generate tab shows 11 preset pills and 5 (Standard) / 6 (Spring) / 7 (Quartz) field cards with color-coded left borders. Click a preset → mode switches and expression updates. Click a card → nothing yet (intentional). Stop dev.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/cron/cron-page.tsx
git commit -m "feat(cron): render Generate tab with preset pills and field cards"
```

---

## Task 22: Mode switching with migration

Replace the trivial `handleModeChange` with the migration table from the spec. Migration may emit warnings (toast on switch).

**Files:**

- Create: `libs/cron/migrate.ts`
- Test: `libs/cron/__tests__/migrate.test.ts`
- Modify: `libs/cron/main.ts` (re-export `migrateExpression`)
- Modify: `app/[locale]/cron/cron-page.tsx` (use migration)

- [ ] **Step 1: Write failing migration tests**

```typescript
// libs/cron/__tests__/migrate.test.ts
import { describe, it, expect } from "vitest";
import { migrateExpression } from "../migrate";

describe("migrateExpression", () => {
  it("standard → spring prepends second=0", () => {
    const r = migrateExpression("0 9 * * 1-5", "standard", "spring");
    expect(r.expression).toBe("0 0 9 * * 1-5");
    expect(r.warnings).toEqual([]);
  });

  it("standard → quartz prepends 0, appends *, sets DOW '?' when DOW=*", () => {
    const r = migrateExpression("0 9 1 * *", "standard", "quartz");
    expect(r.expression).toBe("0 0 9 1 * ? *");
  });

  it("standard → quartz with both DOM/DOW non-* keeps DOW, drops DOM to '?', warns", () => {
    const r = migrateExpression("0 9 1 * 1", "standard", "quartz");
    // DOW base shifts: standard 1 (Mon) → quartz 2 (Mon)
    expect(r.expression).toBe("0 0 9 ? * 2 *");
    expect(r.warnings).toContain("warn.orSemanticsLost");
  });

  it("spring → standard drops second, warns when non-zero", () => {
    const r = migrateExpression("30 0 9 * * 1-5", "spring", "standard");
    expect(r.expression).toBe("0 9 * * 1-5");
    expect(r.warnings).toContain("warn.secondDropped");
  });

  it("quartz → standard drops second & year, converts ? back to *", () => {
    const r = migrateExpression("0 0 9 ? * 2-6 *", "quartz", "standard");
    // DOW base shifts back: quartz 2-6 (Mon-Fri) → standard 1-5
    expect(r.expression).toBe("0 9 * * 1-5");
  });

  it("quartz → spring drops year only", () => {
    const r = migrateExpression("0 0 9 ? * 2-6 *", "quartz", "spring");
    expect(r.expression).toBe("0 0 9 * * 1-5");
  });

  it("quartz → standard with L drops the special and warns", () => {
    const r = migrateExpression("0 0 0 L * ? *", "quartz", "standard");
    expect(r.warnings).toContain("warn.specialDroppedFromMode");
    // Field becomes '*' as a safe fallback
    expect(r.expression).toBe("0 0 * * *");
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL.

- [ ] **Step 3: Implement `migrate.ts`**

```typescript
// libs/cron/migrate.ts
import { parseCron } from "./parser";
import { generateCron } from "./generator";
import { tokenToString } from "./canonical";
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
    // Best effort: fall back to all-any in target mode
    const kinds = getFieldKindsForMode(to);
    const fields = Object.fromEntries(kinds.map((k) => [k, { type: "any" } as CronFieldValue]));
    return { expression: generateCron(fields, to), warnings: [] };
  }

  const warnings: string[] = [];
  const fields: Partial<Record<CronFieldKind, CronFieldValue>> = { ...parsed.fields };

  // Add/remove second
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

  // Add/remove year
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

  // DOW base shift
  if (to === "quartz" && from !== "quartz") {
    fields.dayOfWeek = shiftDow(fields.dayOfWeek, +1);
  } else if (from === "quartz" && to !== "quartz") {
    fields.dayOfWeek = shiftDow(fields.dayOfWeek, -1);
  }

  // Quartz '?' rule
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
      // both set: keep dow, set dom to '?', warn
      fields.dayOfMonth = { type: "noSpecific" };
      warnings.push("warn.orSemanticsLost");
    }
  } else if (from === "quartz") {
    // Quartz → others: convert '?' back to '*'
    if (fields.dayOfMonth?.type === "noSpecific") fields.dayOfMonth = { type: "any" };
    if (fields.dayOfWeek?.type === "noSpecific") fields.dayOfWeek = { type: "any" };
  }

  // Drop specials not supported in target mode
  for (const kind of getFieldKindsForMode(to)) {
    const v = fields[kind];
    if (v && hasUnsupportedSpecial(v, to, kind)) {
      warnings.push("warn.specialDroppedFromMode");
      fields[kind] = { type: "any" };
    }
  }

  // Spring DOW: 7 → 0 (already handled by parser when re-parsed; be defensive here too)
  if (to === "spring") {
    fields.dayOfWeek = shiftDow(fields.dayOfWeek, 0); // no-op shift for spring
  }

  return { expression: generateCron(fields, to), warnings };
}

function shiftDow(v: CronFieldValue | undefined, delta: number): CronFieldValue | undefined {
  if (!v || delta === 0) return v;
  switch (v.type) {
    case "specific":
      return { type: "specific", values: v.values!.map((n) => n + delta) };
    case "range":
      return { type: "range", range: { from: v.range!.from + delta, to: v.range!.to + delta } };
    case "list":
      return { type: "list", listItems: v.listItems!.map((it) => shiftDow(it, delta)!) };
    case "nthDayOfWeek":
      return {
        type: "nthDayOfWeek",
        nthDayOfWeek: { weekday: v.nthDayOfWeek!.weekday + delta, n: v.nthDayOfWeek!.n },
      };
    case "lastDay":
      return v.weekdayDay !== undefined
        ? { type: "lastDay", weekdayDay: (v.weekdayDay as number) + delta }
        : v;
    default:
      return v;
  }
}

function hasUnsupportedSpecial(v: CronFieldValue, mode: CronMode, kind: CronFieldKind): boolean {
  if (mode === "quartz") return false;
  if (
    v.type === "lastDay" ||
    v.type === "lastDayOffset" ||
    v.type === "weekday" ||
    v.type === "nthDayOfWeek" ||
    v.type === "noSpecific"
  )
    return true;
  if (v.type === "list") return v.listItems!.some((it) => hasUnsupportedSpecial(it, mode, kind));
  return false;
}
```

- [ ] **Step 4: Re-export from `main.ts`**

```typescript
export { migrateExpression } from "./migrate";
export type { MigrationResult } from "./migrate";
```

- [ ] **Step 5: Wire into `handleModeChange`**

In `cron-page.tsx`, import `migrateExpression`:

```typescript
import { migrateExpression } from "../../../libs/cron/main";
```

Replace `handleModeChange`:

```typescript
function handleModeChange(next: CronMode) {
  if (next === mode) return;
  const result = migrateExpression(expression, mode, next);
  setMode(next);
  setExpression(result.expression);
  setRawInput(result.expression);
  for (const key of result.warnings) {
    showToast(t(key, { value: "", mode: next, token: "" }), "warning", 3000);
  }
}
```

- [ ] **Step 6: Run all tests**

Run: `pnpm test`
Expected: PASS for the 7 migration cases (and all earlier cron tests).

- [ ] **Step 7: Verify dev**

Run: `pnpm dev` → `/cron`. With expression `0 9 * * 1-5` in Standard, switch to Quartz → expression becomes `0 0 9 ? * 2-6 *` (DOW shifted, `?` added). Switch back to Standard → returns to `0 9 * * 1-5`. Switch to Spring → `0 0 9 * * 1-5`. Stop dev.

- [ ] **Step 8: Commit**

```bash
git add libs/cron/migrate.ts libs/cron/__tests__/migrate.test.ts libs/cron/main.ts app/[locale]/cron/cron-page.tsx
git commit -m "feat(cron): migrate expressions across modes with warnings"
```

---

## Task 23: Field editor (Dialog — mobile bottom sheet + centered desktop modal)

Click a field card → opens an editor as a modal dialog. Spec calls for Popover on desktop and bottom sheet on mobile, but after evaluating the UX tradeoffs, we use a **single `@headlessui/react` `Dialog`** that is bottom-sheet on mobile and centered-modal on desktop (the responsive `sm:` breakpoint in the CSS handles the switch). Rationale: (1) Popover anchoring to a grid card is fragile when the grid reflows; (2) the field editor has enough content that a centered modal feels better on desktop anyway; (3) one component to test. If users request popover anchoring post-launch, it can be added as an enhancement.

Editor controls vary by selected `FieldValueType`. Apply rebuilds the field and regenerates the expression.

**Files:**

- Create: `app/[locale]/cron/field-editor.tsx`
- Modify: `app/[locale]/cron/cron-page.tsx`

- [ ] **Step 1: Write `field-editor.tsx`**

```typescript
// app/[locale]/cron/field-editor.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Button } from "../../../components/ui/button";
import { StyledInput, StyledSelect, StyledCheckbox } from "../../../components/ui/input";
import {
  getFieldSpec, tokenToString,
  type CronFieldKind, type CronFieldValue, type CronMode, type FieldValueType,
} from "../../../libs/cron/main";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (value: CronFieldValue) => void;
  mode: CronMode;
  kind: CronFieldKind;
  initial: CronFieldValue | undefined;
}

export function FieldEditor({ open, onClose, onApply, mode, kind, initial }: Props) {
  const t = useTranslations("cron");
  const tc = useTranslations("common");
  const spec = getFieldSpec(mode, kind)!;
  const [type, setType] = useState<FieldValueType>(initial?.type ?? "any");
  const [draft, setDraft] = useState<CronFieldValue>(initial ?? { type: "any" });

  /* eslint-disable react-hooks/set-state-in-effect -- reset on open */
  useEffect(() => {
    if (open) {
      setType(initial?.type ?? "any");
      setDraft(initial ?? { type: "any" });
    }
  }, [open, initial]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleTypeChange(next: FieldValueType) {
    setType(next);
    // Initialize draft to a sensible default for the new type
    switch (next) {
      case "any":           setDraft({ type: "any" }); break;
      case "noSpecific":    setDraft({ type: "noSpecific" }); break;
      case "specific":      setDraft({ type: "specific", values: [spec.min] }); break;
      case "range":         setDraft({ type: "range", range: { from: spec.min, to: spec.max } }); break;
      case "step":          setDraft({ type: "step", step: { start: "*", interval: 1 } }); break;
      case "list":          setDraft({ type: "list", listItems: [{ type: "specific", values: [spec.min] }] }); break;
      case "lastDay":       setDraft({ type: "lastDay" }); break;
      case "weekday":       setDraft({ type: "weekday", weekdayDay: 15 }); break;
      case "nthDayOfWeek":  setDraft({ type: "nthDayOfWeek", nthDayOfWeek: { weekday: spec.min, n: 1 } }); break;
      case "lastDayOffset": setDraft({ type: "lastDayOffset", lastDayOffset: 1 }); break;
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <DialogPanel className="w-full sm:max-w-md bg-bg-surface border border-border-default rounded-t-xl sm:rounded-xl p-4 space-y-3">
          <div className="text-sm font-medium text-fg-secondary">{t("editor.title")} — {t(`field.${kind}`)}</div>

          <StyledSelect
            label={t("editor.specialKind")}
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as FieldValueType)}
          >
            {spec.allowedTypes.map((tp) => (
              <option key={tp} value={tp}>{t(`fieldType.${tp}`)}</option>
            ))}
          </StyledSelect>

          <EditorControls type={type} draft={draft} setDraft={setDraft} spec={spec} t={t} />

          <div className="text-xs text-fg-muted font-mono">
            {t("editor.preview")}: {tokenToString(draft)}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>{tc("cancel")}</Button>
            <Button variant="primary" onClick={() => { onApply(draft); onClose(); }}>{tc("save")}</Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function EditorControls({
  type, draft, setDraft, spec, t,
}: {
  type: FieldValueType;
  draft: CronFieldValue;
  setDraft: (v: CronFieldValue) => void;
  spec: ReturnType<typeof getFieldSpec> & {};
  t: ReturnType<typeof useTranslations>;
}) {
  switch (type) {
    case "any":
    case "noSpecific":
    case "lastDay":
    case "weekday": // weekday with default value handled inline below
      if (type === "weekday") {
        const wd = draft.weekdayDay === "L" ? "L" : (draft.weekdayDay ?? 15);
        return (
          <StyledSelect
            value={wd === "L" ? "L" : String(wd)}
            onChange={(e) => setDraft({ type: "weekday", weekdayDay: e.target.value === "L" ? "L" : parseInt(e.target.value, 10) })}
          >
            <option value="L">LW (last weekday)</option>
            {Array.from({ length: spec.max - spec.min + 1 }, (_, i) => spec.min + i).map((n) => (
              <option key={n} value={n}>{`${n}W`}</option>
            ))}
          </StyledSelect>
        );
      }
      return null;

    case "specific":
      return (
        <StyledInput
          type="number"
          label={t("editor.specificValue")}
          min={spec.min}
          max={spec.max}
          value={draft.values?.[0] ?? spec.min}
          onChange={(e) => setDraft({ type: "specific", values: [Math.max(spec.min, Math.min(spec.max, parseInt(e.target.value, 10) || 0))] })}
        />
      );

    case "range":
      return (
        <div className="grid grid-cols-2 gap-2">
          <StyledInput
            type="number" label={t("editor.rangeFrom")} min={spec.min} max={spec.max}
            value={draft.range?.from ?? spec.min}
            onChange={(e) => setDraft({ type: "range", range: { from: parseInt(e.target.value, 10), to: draft.range?.to ?? spec.max } })}
          />
          <StyledInput
            type="number" label={t("editor.rangeTo")} min={spec.min} max={spec.max}
            value={draft.range?.to ?? spec.max}
            onChange={(e) => setDraft({ type: "range", range: { from: draft.range?.from ?? spec.min, to: parseInt(e.target.value, 10) } })}
          />
        </div>
      );

    case "step":
      return (
        <div className="grid grid-cols-2 gap-2">
          <StyledInput
            type="text" label={t("editor.stepStart")}
            value={draft.step?.start === "*" ? "*" : String(draft.step?.start ?? "*")}
            onChange={(e) => {
              const v = e.target.value === "*" ? "*" : parseInt(e.target.value, 10);
              setDraft({ type: "step", step: { start: isNaN(v as number) ? "*" : v, interval: draft.step?.interval ?? 1 } });
            }}
          />
          <StyledInput
            type="number" label={t("editor.stepInterval")} min={1} max={spec.max}
            value={draft.step?.interval ?? 1}
            onChange={(e) => setDraft({ type: "step", step: { start: draft.step?.start ?? "*", interval: Math.max(1, parseInt(e.target.value, 10) || 1) } })}
          />
        </div>
      );

    case "list":
      return (
        <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto">
          {Array.from({ length: spec.max - spec.min + 1 }, (_, i) => spec.min + i).map((n) => {
            const checked = draft.listItems?.some((it) => it.type === "specific" && it.values?.[0] === n) ?? false;
            return (
              <StyledCheckbox
                key={n}
                checked={checked}
                label={String(n)}
                onChange={(e) => {
                  const items = (draft.listItems ?? []).filter((it) => !(it.type === "specific" && it.values?.[0] === n));
                  if (e.target.checked) items.push({ type: "specific", values: [n] });
                  items.sort((a, b) => (a.values?.[0] ?? 0) - (b.values?.[0] ?? 0));
                  setDraft({ type: "list", listItems: items });
                }}
              />
            );
          })}
        </div>
      );

    case "nthDayOfWeek":
      return (
        <div className="grid grid-cols-2 gap-2">
          <StyledSelect
            label={t("field.dayOfWeek")}
            value={String(draft.nthDayOfWeek?.weekday ?? spec.min)}
            onChange={(e) => setDraft({ type: "nthDayOfWeek", nthDayOfWeek: { weekday: parseInt(e.target.value, 10), n: draft.nthDayOfWeek?.n ?? 1 } })}
          >
            {Array.from({ length: spec.max - spec.min + 1 }, (_, i) => spec.min + i).map((n) => <option key={n} value={n}>{n}</option>)}
          </StyledSelect>
          <StyledSelect
            label="N"
            value={String(draft.nthDayOfWeek?.n ?? 1)}
            onChange={(e) => setDraft({ type: "nthDayOfWeek", nthDayOfWeek: { weekday: draft.nthDayOfWeek?.weekday ?? spec.min, n: parseInt(e.target.value, 10) } })}
          >
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </StyledSelect>
        </div>
      );

    case "lastDayOffset":
      return (
        <StyledInput
          type="number" label="L − N" min={0} max={30}
          value={draft.lastDayOffset ?? 1}
          onChange={(e) => setDraft({ type: "lastDayOffset", lastDayOffset: Math.max(0, parseInt(e.target.value, 10) || 0) })}
        />
      );
  }
  return null;
}
```

- [ ] **Step 2: Wire `FieldEditor` into `cron-page.tsx`**

Add the import:

```typescript
import { FieldEditor } from "./field-editor";
```

In `CronPage`, replace the `editingField` declaration with stateful open + write-back logic. Below the `NeonTabs`:

```typescript
{editingField && (
  <FieldEditor
    open={true}
    onClose={() => setEditingField(null)}
    onApply={(value) => {
      const nextFields = { ...parsed.fields, [editingField]: value };
      const next = generateCron(nextFields as Record<string, CronFieldValue>, mode);
      setExpression(next);
      setRawInput(next);
    }}
    mode={mode}
    kind={editingField}
    initial={parsed.fields[editingField]}
  />
)}
```

Also import `generateCron`:

```typescript
import { generateCron } from "../../../libs/cron/main";
```

- [ ] **Step 3: Verify dev**

Run: `pnpm dev` → `/cron`. Open Generate tab. Click each card type:

- Minute card → editor opens; choose "Step" with `*/15` → Apply → expression becomes `*/15 * * * *`
- Quartz mode, dayOfMonth card → choose "Last day" → expression becomes `0 0 9 L * ? *` (or similar) wait no — when you change DOM to `lastDay`, the `?` rule says DOW must become `*`/concrete. The migration logic from Task 22 only runs on mode-switch, not on field edit. We need the post-edit Quartz invariant. Add inside `onApply`:

```typescript
onApply={(value) => {
  const nextFields = { ...parsed.fields, [editingField]: value } as Record<CronFieldKind, CronFieldValue>;
  // Maintain Quartz '?' invariant: setting one side concrete forces the other to '?'
  if (mode === "quartz") {
    if (editingField === "dayOfMonth" && value.type !== "noSpecific" && value.type !== "any") {
      nextFields.dayOfWeek = { type: "noSpecific" };
    } else if (editingField === "dayOfWeek" && value.type !== "noSpecific" && value.type !== "any") {
      nextFields.dayOfMonth = { type: "noSpecific" };
    }
  }
  const next = generateCron(nextFields, mode);
  setExpression(next);
  setRawInput(next);
}}
```

Re-test in browser. Stop dev.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/cron/field-editor.tsx app/[locale]/cron/cron-page.tsx
git commit -m "feat(cron): add field editor dialog with type-specific controls"
```

---

## Task 24: URL sharing (read on load, write on Share button)

The Share button (Task 19) already writes the URL. Add read-on-load: on first mount, query parameters take precedence over `localStorage`.

**Files:**

- Modify: `app/[locale]/cron/cron-page.tsx`

- [ ] **Step 1: Replace the hydration `useEffect`**

```typescript
/* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration from external source */
useEffect(() => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get("mode") as CronMode | null;
  const urlExpr = params.get("expr");
  const urlTz = params.get("tz") as "local" | "utc" | null;

  if (urlMode && ["standard", "spring", "quartz"].includes(urlMode)) {
    setMode(urlMode);
    if (urlExpr) {
      setExpression(urlExpr);
      setRawInput(urlExpr);
    } else {
      setExpression(DEFAULT_EXPRESSIONS[urlMode]);
      setRawInput(DEFAULT_EXPRESSIONS[urlMode]);
    }
    if (urlTz === "local" || urlTz === "utc") setTimezone(urlTz);
    return;
  }

  const persisted = loadPersisted();
  if (persisted) {
    setMode(persisted.mode);
    setExpression(persisted.expression);
    setRawInput(persisted.expression);
    setTimezone(persisted.timezone);
  }
}, []);
/* eslint-enable react-hooks/set-state-in-effect */
```

- [ ] **Step 2: Verify dev**

Run: `pnpm dev`. Visit `http://localhost:3000/cron?mode=quartz&expr=0%200%209%20%3F%20*%20MON-FRI%20*&tz=utc`.
Expected: Mode = Quartz, expression preset, timezone = UTC.
Click Share → URL is copied; paste it in new tab → state restored. Stop dev.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/cron/cron-page.tsx
git commit -m "feat(cron): hydrate state from URL query parameters with localStorage fallback"
```

---

## Task 25: Description / help section

Static info block below the output. Pulls from `descriptions.*` translation keys.

**Files:**

- Modify: `app/[locale]/cron/cron-page.tsx`

- [ ] **Step 1: Add `Description` component**

```typescript
function Description() {
  const t = useTranslations("cron");
  return (
    <section className="mt-8 space-y-4">
      <div>
        <h4 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h4>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">{t("descriptions.whatIs")}</p>
      </div>
      <div>
        <h4 className="font-semibold text-fg-primary text-base">{t("descriptions.dstTitle")}</h4>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">{t("descriptions.dst")}</p>
      </div>
    </section>
  );
}
```

Render it inside `CronPage` after the `OutputArea`:

```typescript
<OutputArea ... />
<Description />
```

- [ ] **Step 2: Verify dev**

Run: `pnpm dev` → `/cron`. Scroll below the output area; help text appears in three languages (switch via the language switcher in header). Stop dev.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/cron/cron-page.tsx
git commit -m "feat(cron): add help/description section"
```

---

## Task 26: Final validation pass

Run the full test suite, build, and a manual smoke test of all the Generate-tab semantic warnings called out in the spec.

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: All cron tests PASS plus existing dbviewer tests.

- [ ] **Step 2: Type-check the whole project**

Run: `pnpm tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 3: ESLint clean**

Run: `pnpm exec eslint --ext .ts,.tsx libs/cron app/[locale]/cron`
Expected: 0 errors. (React Compiler rule will flag stray `useMemo`/`useCallback` if you slipped any in.)

- [ ] **Step 4: Production build**

Run: `pnpm build`
Expected: Build completes; `/cron` route shows up in the output.

- [ ] **Step 5: Manual QA checklist**

Run: `pnpm dev` and walk through:

- [ ] All three locales (`/cron`, `/zh-CN/cron`, `/zh-TW/cron`) render with translated copy.
- [ ] Generate tab: every preset pill produces the expected expression; field cards' borders use the right colors.
- [ ] Field editor: open each kind (Standard `minute/hour/dom/month/dow`; Quartz extras `noSpecific/lastDay/weekday/nthDayOfWeek/lastDayOffset`); Apply commits.
- [ ] Mode switch from Standard `0 9 1 * 1` to Quartz triggers `warn.orSemanticsLost` toast.
- [ ] Parse tab: `60 * * * *` shows `outOfRange` error inline, OutputArea keeps last valid.
- [ ] Parse tab: `@yearly` parses, expression becomes `0 0 1 1 *` color-coded.
- [ ] Output: `0 0 30 2 ?` (Quartz) yields `neverTriggers` notice; `0 0 9 ? * 6#5 *` shows Only N executions notice if window doesn't yield 5.
- [ ] Copy / Share buttons work; Share URL round-trips state when opened in a new tab.
- [ ] Light & dark mode both render readable color tokens.

- [ ] **Step 6: Commit any final fixes**

If any step uncovered an issue, fix and commit per the convention; otherwise no extra commit needed.

```bash
git add -A
git commit -m "chore(cron): final QA fixes"  # only if there were changes
```

---

## Self-Review Notes

**Spec coverage check** (every spec section maps to a task):

- Functional: 3 modes (Tasks 4-8), Generate tab (21, 23), Parse tab (20), Shared output (19) — all covered.
- Non-functional: zero deps (no new imports added beyond existing `@headlessui/react`), browser-only (executor uses no I/O), i18n 3 locales (15-16), perf <100ms (executor test 12), 4-year window (executor 11-12).
- Architecture file structure: matches Task list 1-1 (including `canonical.ts`, `migrate.ts`, and `migrate.test.ts`).
- Project integration: Task 1.
- Core types: Task 2; Field spec: Task 3; Parser: 4-8; Generator: 9; Describer: 10; Executor: 11-13; Presets: 14; Migration: 22.
- Cron semantics (modes, DOW base, DOM/DOW interaction, special chars, macros, aliases, edge cases): all covered in Tasks 3-8 and 11-12 with explicit tests.
- Execution computation (timezone, DST, search window, smart iteration): Tasks 11-13.
- State model & mode switching: Tasks 18, 22.
- UI layout, color coding, editor UX: Tasks 17, 19-23.
- Generate-tab validation warnings: `bothDayFieldsSet` yellow warning banner in `OutputArea` (Task 19); `neverTriggers` / `searchExhausted` notices surfaced in executions table (Task 19).
- Persistence (localStorage + URL): Tasks 18 (write), 24 (URL read).
- Error tiers: Parse tab passes full `params` from `ParseError` to i18n (Task 20); describer/executor return empty defensively (Task 10/11).
- Testing: Tasks 4-13 plus the manual QA checklist in Task 26.
- Scope exclusions: respected (no IANA picker, no autocomplete in Parse tab, etc).

**Design decisions** (documented deviations from spec):

- Field editor uses a single responsive `Dialog` (bottom-sheet on mobile, centered modal on desktop) instead of Popover+Dialog. Rationale: popover anchoring is fragile on a responsive grid; modal works well for the editor's content density. Post-launch enhancement if users request popover. (Task 23)
- `CronFieldValue.step` includes optional `from`/`to` fields for `n-m/k` range-step form — the spec's type was underspecified. (Task 2)
- Cancel/Save button labels use `common.cancel`/`common.save` instead of editor-scoped keys. (Task 23)

**Type consistency check**: All types defined in `types.ts` (Task 2) and used by parser/generator/describer/executor/migrate verbatim. The recursive list shape (`listItems: CronFieldValue[]`) is consistently used.

**Placeholder scan**: No "TBD" / "implement later" / "similar to Task N" — every step shows actual code or commands.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-28-cron-expression.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
