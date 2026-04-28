# Unixtime Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Unix timestamp ⇔ datetime conversion tool at `/unixtime` with seconds/milliseconds support, dual timezone display (Local + UTC), pausable live clock, and three locales (en, zh-CN, zh-TW).

**Architecture:** Pure logic helpers in `libs/unixtime/main.ts` (TDD-tested with vitest); UI components and page composition in a single `unixtime-page.tsx` (per project convention; matches storageunit/jwt/uuid pattern). Route entry in `app/[locale]/unixtime/page.tsx`. i18n via next-intl with three JSON namespaces in `public/locales/<locale>/unixtime.json`.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · next-intl · vitest (for logic tests) · lucide-react (icons) · native `Date` + `Intl.*` (no date library)

**Spec reference:** `docs/superpowers/specs/2026-04-27-unixtime-design.md`

**Note on extracting logic:** The spec said "no separate utility file." This plan deviates: pure helpers live in `libs/unixtime/main.ts` so they can be unit-tested with vitest. The UI page (`unixtime-page.tsx`) stays single-file per spec. This change is small and improves testability of edge cases (auto-detect rules, ISO week, range validation).

---

## File Structure

| File                                      | Action | Responsibility                                                                           |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `vitest.config.ts`                        | Modify | Extend `include` glob to cover `libs/unixtime/**/*.test.ts`                              |
| `libs/unixtime/main.ts`                   | Create | Pure logic: parse, validate, format, presets, ISO week, relative time                    |
| `libs/unixtime/__tests__/main.test.ts`    | Create | Vitest tests for all helpers                                                             |
| `app/[locale]/unixtime/page.tsx`          | Create | Route entry with `generateMetadata`                                                      |
| `app/[locale]/unixtime/unixtime-page.tsx` | Create | Page component (LiveClock + TimestampToDate + DateToTimestamp + Description)             |
| `public/locales/en/unixtime.json`         | Create | English translations                                                                     |
| `public/locales/zh-CN/unixtime.json`      | Create | Simplified Chinese translations                                                          |
| `public/locales/zh-TW/unixtime.json`      | Create | Traditional Chinese translations                                                         |
| `public/locales/en/tools.json`            | Modify | Add `unixtime` metadata block                                                            |
| `public/locales/zh-CN/tools.json`         | Modify | Add `unixtime` metadata block                                                            |
| `public/locales/zh-TW/tools.json`         | Modify | Add `unixtime` metadata block                                                            |
| `libs/tools.ts`                           | Modify | Append `{ key: "unixtime", path: "/unixtime" }` to `TOOLS`                               |
| `i18n/request.ts`                         | Modify | Append `"unixtime"` to `namespaces`                                                      |
| `app/[locale]/home-page.tsx`              | Modify | Import `Clock` from lucide-react and add `"/unixtime": <Clock ... />` to `toolIcons` map |

---

## Task 1: Logic — Timestamp parsing & range validation (TDD)

**Files:**

- Modify: `vitest.config.ts`
- Create: `libs/unixtime/main.ts`
- Create: `libs/unixtime/__tests__/main.test.ts`

**Goal:** Parse a numeric string into a millisecond timestamp, given a unit mode (`auto | seconds | milliseconds`). Return `{ ms, error }` discriminated result. Reject negatives, 16+ digits, and out-of-safe-range values.

- [ ] **Step 1: Extend vitest config to include unixtime tests**

Edit `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["libs/dbviewer/**/*.test.ts", "libs/unixtime/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    globals: false,
  },
});
```

- [ ] **Step 2: Write failing tests for `parseTimestamp`**

Create `libs/unixtime/__tests__/main.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseTimestamp } from "../main";

describe("parseTimestamp", () => {
  describe("auto mode", () => {
    it("treats 1-11 digit input as seconds", () => {
      expect(parseTimestamp("1714521600", "auto")).toEqual({ ms: 1714521600000 });
      expect(parseTimestamp("0", "auto")).toEqual({ ms: 0 });
      expect(parseTimestamp("99999999999", "auto")).toEqual({ ms: 99999999999000 });
    });

    it("treats 12-15 digit input as milliseconds", () => {
      expect(parseTimestamp("100000000000", "auto")).toEqual({ ms: 100000000000 });
      expect(parseTimestamp("1714521600000", "auto")).toEqual({ ms: 1714521600000 });
      expect(parseTimestamp("253402300799999", "auto")).toEqual({ ms: 253402300799999 });
    });

    it("rejects 16+ digit input", () => {
      const r = parseTimestamp("1234567890123456", "auto");
      expect(r.error).toBe("tooLong");
    });
  });

  describe("seconds mode", () => {
    it("multiplies by 1000", () => {
      expect(parseTimestamp("1714521600", "seconds")).toEqual({ ms: 1714521600000 });
    });

    it("rejects values too large for seconds (> 12 digits)", () => {
      const r = parseTimestamp("1000000000000", "seconds");
      expect(r.error).toBe("secondsTooLarge");
    });
  });

  describe("milliseconds mode", () => {
    it("returns ms directly", () => {
      expect(parseTimestamp("1714521600000", "milliseconds")).toEqual({ ms: 1714521600000 });
    });

    it("rejects 16+ digits", () => {
      const r = parseTimestamp("1234567890123456", "milliseconds");
      expect(r.error).toBe("tooLong");
    });
  });

  describe("validation", () => {
    it("rejects empty input as no-op (no error, no ms)", () => {
      expect(parseTimestamp("", "auto")).toEqual({});
      expect(parseTimestamp("   ", "auto")).toEqual({});
    });

    it("rejects negative input", () => {
      expect(parseTimestamp("-1", "auto").error).toBe("negative");
    });

    it("rejects non-numeric input", () => {
      expect(parseTimestamp("abc", "auto").error).toBe("notNumeric");
      expect(parseTimestamp("12.5", "auto").error).toBe("notNumeric");
    });

    it("rejects values exceeding year 9999 in milliseconds", () => {
      // > 253402300799999 (9999-12-31T23:59:59.999Z)
      expect(parseTimestamp("253402300800000", "milliseconds").error).toBe("outOfRange");
    });
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

Run: `npx vitest run libs/unixtime/__tests__/main.test.ts`
Expected: FAIL — `Cannot find module '../main'`

- [ ] **Step 4: Implement `parseTimestamp` in `libs/unixtime/main.ts`**

Create `libs/unixtime/main.ts`:

```ts
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
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `npx vitest run libs/unixtime/__tests__/main.test.ts`
Expected: PASS — all `parseTimestamp` tests green.

- [ ] **Step 6: Commit**

```bash
rtk git add vitest.config.ts libs/unixtime/main.ts libs/unixtime/__tests__/main.test.ts
rtk git commit -m "feat(unixtime): add timestamp parser with auto/seconds/ms modes"
```

---

## Task 2: Logic — Format helpers (TDD)

**Files:**

- Modify: `libs/unixtime/main.ts`
- Modify: `libs/unixtime/__tests__/main.test.ts`

**Goal:** Format a `Date` into Local, UTC, ISO 8601, SQL, RFC 2822, weekday, ISO week, and a friendly UTC-offset timezone label.

- [ ] **Step 1: Append failing tests for format helpers**

Append to `libs/unixtime/__tests__/main.test.ts`:

```ts
import { formatUtc, formatSql, formatRfc2822, isoWeekNumber, formatTimezoneOffset } from "../main";

describe("formatUtc", () => {
  it("formats a Date as 'YYYY-MM-DD HH:mm:ss' in UTC", () => {
    const d = new Date("2024-04-30T16:00:00.000Z");
    expect(formatUtc(d)).toBe("2024-04-30 16:00:00");
  });
});

describe("formatSql", () => {
  it("matches SQL DATETIME literal in UTC", () => {
    const d = new Date("2024-04-30T16:00:00.000Z");
    expect(formatSql(d)).toBe("2024-04-30 16:00:00");
  });
});

describe("formatRfc2822", () => {
  it("returns the toUTCString form", () => {
    const d = new Date("2024-04-30T16:00:00.000Z");
    expect(formatRfc2822(d)).toBe("Tue, 30 Apr 2024 16:00:00 GMT");
  });
});

describe("isoWeekNumber", () => {
  it("returns 1 for Jan 4 in any year (ISO 8601 anchor)", () => {
    expect(isoWeekNumber(new Date(Date.UTC(2024, 0, 4)))).toBe(1);
    expect(isoWeekNumber(new Date(Date.UTC(2020, 0, 4)))).toBe(1);
  });

  it("returns 53 for 2020-12-31 (ISO week 53)", () => {
    expect(isoWeekNumber(new Date(Date.UTC(2020, 11, 31)))).toBe(53);
  });

  it("returns 52 for 2023-01-01 (belongs to last week of 2022)", () => {
    expect(isoWeekNumber(new Date(Date.UTC(2023, 0, 1)))).toBe(52);
  });

  it("returns 18 for 2024-05-01", () => {
    expect(isoWeekNumber(new Date(Date.UTC(2024, 4, 1)))).toBe(18);
  });
});

describe("formatTimezoneOffset", () => {
  it("formats positive UTC offsets as UTC+HH:MM", () => {
    expect(formatTimezoneOffset(-480)).toBe("UTC+08:00");
    expect(formatTimezoneOffset(-330)).toBe("UTC+05:30");
  });

  it("formats negative UTC offsets as UTC-HH:MM", () => {
    expect(formatTimezoneOffset(300)).toBe("UTC-05:00");
  });

  it("formats zero offset as UTC+00:00", () => {
    expect(formatTimezoneOffset(0)).toBe("UTC+00:00");
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx vitest run libs/unixtime/__tests__/main.test.ts`
Expected: FAIL on missing exports.

- [ ] **Step 3: Append helpers to `libs/unixtime/main.ts`**

```ts
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

// ISO 8601 week number — Thursday-of-week anchor
export function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayOfWeek + 3); // shift to Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
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
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run libs/unixtime/__tests__/main.test.ts`
Expected: PASS — all format tests green.

- [ ] **Step 5: Commit**

```bash
rtk git add libs/unixtime/main.ts libs/unixtime/__tests__/main.test.ts
rtk git commit -m "feat(unixtime): add UTC/SQL/RFC 2822/ISO week formatters"
```

---

## Task 3: Logic — Relative time helper (TDD)

**Files:**

- Modify: `libs/unixtime/main.ts`
- Modify: `libs/unixtime/__tests__/main.test.ts`

**Goal:** Given a `from` and `to` Date, return a localized "1 year ago" / "in 3 minutes" string. Pick the largest unit where `|diff| ≥ 1 unit`.

- [ ] **Step 1: Append failing tests**

Append to test file:

```ts
import { formatRelative } from "../main";

describe("formatRelative", () => {
  const now = new Date("2025-04-28T12:00:00.000Z");

  it("uses seconds for sub-minute diffs", () => {
    expect(formatRelative(new Date("2025-04-28T11:59:30.000Z"), now, "en")).toMatch(
      /30 seconds ago/
    );
  });

  it("uses minutes for sub-hour diffs", () => {
    expect(formatRelative(new Date("2025-04-28T11:30:00.000Z"), now, "en")).toMatch(
      /30 minutes ago/
    );
  });

  it("uses hours for sub-day diffs", () => {
    expect(formatRelative(new Date("2025-04-28T05:00:00.000Z"), now, "en")).toMatch(/7 hours ago/);
  });

  it("uses days for sub-month diffs", () => {
    expect(formatRelative(new Date("2025-04-20T12:00:00.000Z"), now, "en")).toMatch(/8 days ago/);
  });

  it("uses years for >= 12 months", () => {
    expect(formatRelative(new Date("2024-04-28T12:00:00.000Z"), now, "en")).toMatch(/1 year ago/);
  });

  it("supports future direction", () => {
    expect(formatRelative(new Date("2025-04-28T12:00:30.000Z"), now, "en")).toMatch(
      /in 30 seconds/
    );
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx vitest run libs/unixtime/__tests__/main.test.ts`
Expected: FAIL — `formatRelative` not exported.

- [ ] **Step 3: Append `formatRelative` to `libs/unixtime/main.ts`**

```ts
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
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, "second");
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run libs/unixtime/__tests__/main.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add libs/unixtime/main.ts libs/unixtime/__tests__/main.test.ts
rtk git commit -m "feat(unixtime): add relative time formatter via Intl.RelativeTimeFormat"
```

---

## Task 4: Logic — Date input → timestamp builder (TDD)

**Files:**

- Modify: `libs/unixtime/main.ts`
- Modify: `libs/unixtime/__tests__/main.test.ts`

**Goal:** Build a `Date` from form fields (date string, time string, optional ms, timezone). Provide preset helpers for `now`, `todayMidnightLocal`, `todayMidnightUtc`.

- [ ] **Step 1: Append failing tests**

```ts
import { buildDate, presetParts } from "../main";

describe("buildDate", () => {
  it("interprets inputs as UTC when tz='utc'", () => {
    const d = buildDate({ date: "2024-05-01", time: "00:00:00", ms: 0, tz: "utc" });
    expect(d?.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  it("interprets inputs as local when tz='local'", () => {
    const d = buildDate({ date: "2024-05-01", time: "12:00:00", ms: 0, tz: "local" });
    // Sanity check: not Date instance check, but the same wall-clock time round-trips
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(4); // May = 4
    expect(d?.getDate()).toBe(1);
    expect(d?.getHours()).toBe(12);
  });

  it("includes milliseconds in resulting timestamp (UTC)", () => {
    const d = buildDate({ date: "2024-05-01", time: "00:00:00", ms: 123, tz: "utc" });
    expect(d?.getTime() % 1000).toBe(123);
  });

  it("returns null when date is empty", () => {
    expect(buildDate({ date: "", time: "00:00:00", ms: 0, tz: "utc" })).toBe(null);
  });

  it("returns null when time is malformed", () => {
    expect(buildDate({ date: "2024-05-01", time: "bad", ms: 0, tz: "utc" })).toBe(null);
  });
});

describe("presetParts", () => {
  it("'now' returns the supplied reference time's parts", () => {
    const ref = new Date("2024-05-01T03:04:05.678Z");
    const parts = presetParts("now", "local", ref);
    // Local interpretation depends on test runner TZ; only assert structure
    expect(parts.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parts.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(parts.ms).toBeGreaterThanOrEqual(0);
    expect(parts.ms).toBeLessThanOrEqual(999);
  });

  it("'todayMidnightUtc' returns 00:00:00 with ms=0", () => {
    const ref = new Date("2024-05-01T03:04:05.678Z");
    const parts = presetParts("todayMidnightUtc", "utc", ref);
    expect(parts.date).toBe("2024-05-01");
    expect(parts.time).toBe("00:00:00");
    expect(parts.ms).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx vitest run libs/unixtime/__tests__/main.test.ts`
Expected: FAIL.

- [ ] **Step 3: Append builder/preset to `libs/unixtime/main.ts`**

```ts
export type Tz = "local" | "utc";

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

  const result =
    input.tz === "utc"
      ? new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms))
      : new Date(y, mo - 1, d, h, mi, s, ms);

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
    return tz === "utc"
      ? {
          date: ref.toISOString().slice(0, 10),
          time: ref.toISOString().slice(11, 19),
          ms: ref.getUTCMilliseconds(),
        }
      : {
          date: `${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}-${pad2(ref.getDate())}`,
          time: `${pad2(ref.getHours())}:${pad2(ref.getMinutes())}:${pad2(ref.getSeconds())}`,
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
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run libs/unixtime/__tests__/main.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add libs/unixtime/main.ts libs/unixtime/__tests__/main.test.ts
rtk git commit -m "feat(unixtime): add date-input builder and quick presets"
```

---

## Task 5: i18n — English translations

**Files:**

- Create: `public/locales/en/unixtime.json`
- Modify: `public/locales/en/tools.json`

- [ ] **Step 1: Create `public/locales/en/unixtime.json`**

```json
{
  "liveClock": {
    "title": "Current Unix Timestamp",
    "pause": "Pause",
    "resume": "Resume",
    "localLabel": "Local",
    "utcLabel": "UTC"
  },
  "tsToDate": {
    "title": "Timestamp → DateTime",
    "unitLegend": "Unit",
    "unitAuto": "Auto",
    "unitSeconds": "Seconds",
    "unitMilliseconds": "Milliseconds",
    "inputLabel": "Input",
    "inputPlaceholder": "e.g. 1714521600",
    "paste": "Paste",
    "clear": "Clear",
    "rows": {
      "local": "Local",
      "utc": "UTC",
      "iso": "ISO 8601",
      "sql": "SQL",
      "rfc": "RFC 2822",
      "dayWeek": "Day / Week",
      "relative": "Relative"
    },
    "weekShort": "W"
  },
  "dateToTs": {
    "title": "DateTime → Timestamp",
    "quickLegend": "Quick",
    "now": "Now",
    "todayLocal": "Today 00:00 Local",
    "todayUtc": "Today 00:00 UTC",
    "dateLabel": "Date",
    "timeLabel": "Time",
    "msLabel": "Milliseconds (optional)",
    "tzLegend": "Timezone",
    "tzLocal": "Local",
    "tzUtc": "UTC",
    "rows": {
      "seconds": "Seconds",
      "milliseconds": "Milliseconds"
    }
  },
  "errors": {
    "notNumeric": "Must be a positive integer",
    "negative": "Negative timestamps are not supported",
    "tooLong": "Too long — looks like microseconds. Truncate to 13 digits.",
    "secondsTooLarge": "Value too large for seconds. Switch to Milliseconds?",
    "outOfRange": "Out of supported range (1970-01-01 to 9999-12-31)",
    "pasteFailed": "Paste unavailable — use Ctrl+V / ⌘V instead"
  },
  "description": {
    "whatIsTitle": "What is a Unix timestamp?",
    "whatIs": "A Unix timestamp is the number of seconds elapsed since 1970-01-01T00:00:00Z (the Unix epoch). It is timezone-agnostic — the same number always refers to the same instant in time, regardless of where you are.",
    "secMsTitle": "Seconds vs Milliseconds",
    "secMs": "Most Unix tools and log files use seconds (10 digits today). JavaScript's Date.getTime(), Java's System.currentTimeMillis(), and many web APIs use milliseconds (13 digits today).",
    "y2k38Title": "The Year 2038 Problem",
    "y2k38": "Systems that store Unix seconds in a signed 32-bit integer overflow on 2038-01-19 03:14:07 UTC. Modern 64-bit systems are not affected.",
    "tzTitle": "Timezones",
    "tz": "A timestamp itself has no timezone. The human-readable form (e.g. 2024-05-01 00:00:00) depends on which timezone you display it in. This tool always shows both Local and UTC."
  }
}
```

- [ ] **Step 2: Add `unixtime` block to `public/locales/en/tools.json`**

Insert anywhere inside the top-level object (next to `dbviewer`):

```json
  "unixtime": {
    "title": "Unix Timestamp Converter — Seconds, Milliseconds, UTC",
    "shortTitle": "Unix Timestamp",
    "description": "Convert between Unix timestamps and human-readable dates. Supports seconds and milliseconds, shows Local and UTC side-by-side, with a live clock. 100% client-side."
  }
```

- [ ] **Step 3: Commit**

```bash
rtk git add public/locales/en/unixtime.json public/locales/en/tools.json
rtk git commit -m "feat(unixtime): add English translations"
```

---

## Task 6: i18n — Simplified Chinese translations

**Files:**

- Create: `public/locales/zh-CN/unixtime.json`
- Modify: `public/locales/zh-CN/tools.json`

- [ ] **Step 1: Create `public/locales/zh-CN/unixtime.json`**

```json
{
  "liveClock": {
    "title": "当前 Unix 时间戳",
    "pause": "暂停",
    "resume": "恢复",
    "localLabel": "本地",
    "utcLabel": "UTC"
  },
  "tsToDate": {
    "title": "时间戳 → 日期时间",
    "unitLegend": "单位",
    "unitAuto": "自动",
    "unitSeconds": "秒",
    "unitMilliseconds": "毫秒",
    "inputLabel": "输入",
    "inputPlaceholder": "例如 1714521600",
    "paste": "粘贴",
    "clear": "清空",
    "rows": {
      "local": "本地时间",
      "utc": "UTC 时间",
      "iso": "ISO 8601",
      "sql": "SQL",
      "rfc": "RFC 2822",
      "dayWeek": "星期 / 周数",
      "relative": "相对时间"
    },
    "weekShort": "第"
  },
  "dateToTs": {
    "title": "日期时间 → 时间戳",
    "quickLegend": "快捷",
    "now": "现在",
    "todayLocal": "今日 00:00（本地）",
    "todayUtc": "今日 00:00（UTC）",
    "dateLabel": "日期",
    "timeLabel": "时间",
    "msLabel": "毫秒（可选）",
    "tzLegend": "时区",
    "tzLocal": "本地",
    "tzUtc": "UTC",
    "rows": {
      "seconds": "秒级时间戳",
      "milliseconds": "毫秒级时间戳"
    }
  },
  "errors": {
    "notNumeric": "必须为正整数",
    "negative": "不支持负数时间戳",
    "tooLong": "位数过长 — 看起来像微秒，请截断到 13 位",
    "secondsTooLarge": "数值过大，秒级无法表示。切换到毫秒？",
    "outOfRange": "超出支持范围（1970-01-01 至 9999-12-31）",
    "pasteFailed": "粘贴不可用 — 请使用 Ctrl+V / ⌘V"
  },
  "description": {
    "whatIsTitle": "什么是 Unix 时间戳？",
    "whatIs": "Unix 时间戳是自 1970-01-01T00:00:00Z（Unix 纪元）以来经过的秒数。它与时区无关 — 同一个数字在世界任何地方都指向同一个时间点。",
    "secMsTitle": "秒 vs 毫秒",
    "secMs": "大多数 Unix 工具与日志使用秒（当前 10 位）。JavaScript 的 Date.getTime()、Java 的 System.currentTimeMillis() 以及许多 Web API 使用毫秒（当前 13 位）。",
    "y2k38Title": "2038 年问题",
    "y2k38": "把 Unix 秒存进 32 位有符号整数的系统会在 2038-01-19 03:14:07 UTC 溢出。现代 64 位系统不受影响。",
    "tzTitle": "时区",
    "tz": "时间戳本身没有时区。人类可读形式（如 2024-05-01 00:00:00）取决于显示时使用的时区。本工具同时显示本地与 UTC。"
  }
}
```

- [ ] **Step 2: Add `unixtime` block to `public/locales/zh-CN/tools.json`**

```json
  "unixtime": {
    "title": "Unix 时间戳转换 — 秒、毫秒、UTC",
    "shortTitle": "Unix 时间戳",
    "description": "在 Unix 时间戳与日期时间之间互转。支持秒和毫秒，本地与 UTC 并排展示，附带实时时钟。100% 浏览器本地处理。"
  }
```

- [ ] **Step 3: Commit**

```bash
rtk git add public/locales/zh-CN/unixtime.json public/locales/zh-CN/tools.json
rtk git commit -m "feat(unixtime): add Simplified Chinese translations"
```

---

## Task 7: i18n — Traditional Chinese translations

**Files:**

- Create: `public/locales/zh-TW/unixtime.json`
- Modify: `public/locales/zh-TW/tools.json`

- [ ] **Step 1: Create `public/locales/zh-TW/unixtime.json`**

```json
{
  "liveClock": {
    "title": "目前 Unix 時間戳",
    "pause": "暫停",
    "resume": "恢復",
    "localLabel": "本地",
    "utcLabel": "UTC"
  },
  "tsToDate": {
    "title": "時間戳 → 日期時間",
    "unitLegend": "單位",
    "unitAuto": "自動",
    "unitSeconds": "秒",
    "unitMilliseconds": "毫秒",
    "inputLabel": "輸入",
    "inputPlaceholder": "例如 1714521600",
    "paste": "貼上",
    "clear": "清除",
    "rows": {
      "local": "本地時間",
      "utc": "UTC 時間",
      "iso": "ISO 8601",
      "sql": "SQL",
      "rfc": "RFC 2822",
      "dayWeek": "星期 / 週數",
      "relative": "相對時間"
    },
    "weekShort": "第"
  },
  "dateToTs": {
    "title": "日期時間 → 時間戳",
    "quickLegend": "快捷",
    "now": "現在",
    "todayLocal": "今日 00:00（本地）",
    "todayUtc": "今日 00:00（UTC）",
    "dateLabel": "日期",
    "timeLabel": "時間",
    "msLabel": "毫秒（可選）",
    "tzLegend": "時區",
    "tzLocal": "本地",
    "tzUtc": "UTC",
    "rows": {
      "seconds": "秒級時間戳",
      "milliseconds": "毫秒級時間戳"
    }
  },
  "errors": {
    "notNumeric": "必須為正整數",
    "negative": "不支援負數時間戳",
    "tooLong": "位數過長 — 看起來像微秒，請截斷到 13 位",
    "secondsTooLarge": "數值過大，秒級無法表示。切換到毫秒？",
    "outOfRange": "超出支援範圍（1970-01-01 至 9999-12-31）",
    "pasteFailed": "貼上不可用 — 請使用 Ctrl+V / ⌘V"
  },
  "description": {
    "whatIsTitle": "什麼是 Unix 時間戳？",
    "whatIs": "Unix 時間戳是自 1970-01-01T00:00:00Z（Unix 紀元）以來經過的秒數。它與時區無關 — 同一個數字在世界任何地方都指向同一個時間點。",
    "secMsTitle": "秒 vs 毫秒",
    "secMs": "大多數 Unix 工具與日誌使用秒（目前 10 位）。JavaScript 的 Date.getTime()、Java 的 System.currentTimeMillis() 以及許多 Web API 使用毫秒（目前 13 位）。",
    "y2k38Title": "2038 年問題",
    "y2k38": "把 Unix 秒存進 32 位元有符號整數的系統會在 2038-01-19 03:14:07 UTC 溢位。現代 64 位元系統不受影響。",
    "tzTitle": "時區",
    "tz": "時間戳本身沒有時區。人類可讀格式（如 2024-05-01 00:00:00）取決於顯示時使用的時區。本工具同時顯示本地與 UTC。"
  }
}
```

- [ ] **Step 2: Add `unixtime` block to `public/locales/zh-TW/tools.json`**

```json
  "unixtime": {
    "title": "Unix 時間戳轉換 — 秒、毫秒、UTC",
    "shortTitle": "Unix 時間戳",
    "description": "在 Unix 時間戳與日期時間之間互轉。支援秒和毫秒，本地與 UTC 並列顯示，附帶即時時鐘。100% 瀏覽器本地處理。"
  }
```

- [ ] **Step 3: Commit**

```bash
rtk git add public/locales/zh-TW/unixtime.json public/locales/zh-TW/tools.json
rtk git commit -m "feat(unixtime): add Traditional Chinese translations"
```

---

## Task 8: Registry wiring (tools.ts, i18n/request.ts, home-page.tsx)

**Files:**

- Modify: `libs/tools.ts`
- Modify: `i18n/request.ts`
- Modify: `app/[locale]/home-page.tsx`

- [ ] **Step 1: Append unixtime to TOOLS in `libs/tools.ts`**

Replace the existing `TOOLS` array literal so the last entry becomes `unixtime`:

```ts
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
  { key: "unixtime", path: "/unixtime" },
] as const;
```

- [ ] **Step 2: Append `"unixtime"` to namespaces in `i18n/request.ts`**

Modify the namespaces array (last entry):

```ts
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
  "unixtime",
];
```

- [ ] **Step 3: Add Clock icon to home-page.tsx**

In `app/[locale]/home-page.tsx`:

(a) Add `Clock` to the lucide-react import (alphabetical order is not strict here — append):

```tsx
import {
  Hash,
  FileCode,
  Lock,
  KeyRound,
  FileCheck,
  Type,
  Code,
  HardDrive,
  FingerprintPattern,
  Percent,
  GitCompare,
  FileText,
  FileJson,
  Database,
  ShieldCheck,
  Clock,
} from "lucide-react";
```

(b) Add `"/unixtime"` mapping at the end of `toolIcons`:

```tsx
  "/jwt": <ShieldCheck size={28} className="text-accent-cyan" />,
  "/unixtime": <Clock size={28} className="text-accent-cyan" />,
```

- [ ] **Step 4: Smoke check — typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to `unixtime`. Pre-existing errors unrelated to unixtime are acceptable.

- [ ] **Step 5: Commit**

```bash
rtk git add libs/tools.ts i18n/request.ts app/[locale]/home-page.tsx
rtk git commit -m "feat(unixtime): register tool in registry and home page"
```

---

## Task 9: Route entry — page.tsx

**Files:**

- Create: `app/[locale]/unixtime/page.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p "app/[locale]/unixtime"
```

- [ ] **Step 2: Write `app/[locale]/unixtime/page.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import UnixtimePage from "./unixtime-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return {
    title: t("unixtime.title"),
    description: t("unixtime.description"),
    keywords: "",
  };
}

export default function UnixtimeRoute() {
  return <UnixtimePage />;
}
```

- [ ] **Step 3: Commit (deferred until unixtime-page.tsx exists)**

Skip the commit for now — `UnixtimePage` import is unresolved until Task 10. Combine with the next commit.

---

## Task 10: UI — LiveClock component

**Files:**

- Create: `app/[locale]/unixtime/unixtime-page.tsx` (start the file with imports + LiveClock)

- [ ] **Step 1: Scaffold the page file with imports**

Create `app/[locale]/unixtime/unixtime-page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Pause, Play } from "lucide-react";
import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { StyledInput } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { showToast } from "../../../libs/toast";
import {
  parseTimestamp,
  formatUtc,
  formatSql,
  formatRfc2822,
  formatRelative,
  formatTimezoneOffset,
  isoWeekNumber,
  buildDate,
  presetParts,
  type UnitMode,
  type Tz,
  type Preset,
} from "../../../libs/unixtime/main";
```

- [ ] **Step 2: Append the `LiveClock` component**

```tsx
function LiveClock() {
  const t = useTranslations("unixtime");
  const [now, setNow] = useState<Date>(() => new Date());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const timestamp = Math.trunc(now.getTime() / 1000);
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOffset = formatTimezoneOffset(now.getTimezoneOffset());
  const localStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  const utcStr = formatUtc(now);

  return (
    <section className="rounded-lg border border-border-default bg-bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
          <span className="font-mono text-sm font-semibold text-accent-cyan">
            {t("liveClock.title")}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? t("liveClock.resume") : t("liveClock.pause")}
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3 my-2">
        <span className="font-mono text-3xl font-bold tabular-nums" aria-live="off">
          {timestamp}
        </span>
        <CopyButton getContent={() => timestamp.toString()} />
      </div>
      <div className="space-y-1 mt-3 text-sm font-mono">
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">
            {t("liveClock.localLabel")} ({tzName}, {tzOffset})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>{localStr}</span>
          <CopyButton getContent={() => localStr} />
        </div>
        <div className="flex items-center justify-between">
          <span>
            <span className="text-fg-muted mr-2">{t("liveClock.utcLabel")}</span>
            {utcStr}
          </span>
          <CopyButton getContent={() => utcStr} />
        </div>
      </div>
    </section>
  );
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
```

- [ ] **Step 3: Provide a placeholder default export so the route compiles**

Append to the file:

```tsx
export default function UnixtimePage() {
  const tt = useTranslations("tools");
  return (
    <Layout title={tt("unixtime.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <LiveClock />
      </div>
    </Layout>
  );
}
```

- [ ] **Step 4: Smoke test — start dev server**

Run (in a second terminal): `npm run dev`
Visit: `http://localhost:3000/unixtime` (English), `http://localhost:3000/zh-CN/unixtime`, `http://localhost:3000/zh-TW/unixtime`
Expected: LiveClock renders with ticking timestamp, three Copy buttons, working Pause/Resume button. Timezone label shows IANA name + offset (e.g. `Local (Asia/Shanghai, UTC+08:00)`).

- [ ] **Step 5: Commit (route + LiveClock together)**

```bash
rtk git add "app/[locale]/unixtime/page.tsx" "app/[locale]/unixtime/unixtime-page.tsx"
rtk git commit -m "feat(unixtime): add route and live clock with pausable interval"
```

---

## Task 11: UI — TimestampToDate component

**Files:**

- Modify: `app/[locale]/unixtime/unixtime-page.tsx`

- [ ] **Step 1: Append the `TimestampToDate` component above `UnixtimePage`**

```tsx
const ROW_KEYS = ["local", "utc", "iso", "sql", "rfc", "dayWeek", "relative"] as const;

function TimestampToDate() {
  const t = useTranslations("unixtime");
  const locale = useLocale();
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<UnitMode>("auto");

  const parsed = parseTimestamp(raw, mode);
  const date = parsed.ms !== undefined ? new Date(parsed.ms) : null;

  const rows: Record<(typeof ROW_KEYS)[number], string> = date
    ? {
        local: date.toLocaleString(locale, { hour12: false }),
        utc: formatUtc(date),
        iso: date.toISOString(),
        sql: formatSql(date),
        rfc: formatRfc2822(date),
        dayWeek: `${new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date)}, ${t("tsToDate.weekShort")}${isoWeekNumber(date)}`,
        relative: formatRelative(date, new Date(), locale),
      }
    : { local: "", utc: "", iso: "", sql: "", rfc: "", dayWeek: "", relative: "" };

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setRaw(text.trim());
    } catch {
      showToast(t("errors.pasteFailed"), "error", 3000);
    }
  }

  return (
    <section className="rounded-lg border border-border-default bg-bg-surface p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
        <span className="font-mono text-sm font-semibold text-accent-cyan">
          {t("tsToDate.title")}
        </span>
      </div>

      <fieldset className="mb-3">
        <legend className="block text-sm font-medium text-fg-secondary mb-1">
          {t("tsToDate.unitLegend")}
        </legend>
        <div className="flex gap-3 text-sm">
          {(["auto", "seconds", "milliseconds"] as UnitMode[]).map((m) => (
            <label key={m} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="unit-mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="accent-[#06D6A0]"
              />
              <span className="text-fg-secondary">
                {m === "auto"
                  ? t("tsToDate.unitAuto")
                  : m === "seconds"
                    ? t("tsToDate.unitSeconds")
                    : t("tsToDate.unitMilliseconds")}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-2 mb-2">
        <StyledInput
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={t("tsToDate.inputLabel")}
          placeholder={t("tsToDate.inputPlaceholder")}
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, ""))}
          className="font-mono"
        />
        <Button variant="outline" size="sm" onClick={handlePaste}>
          {t("tsToDate.paste")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRaw("")}>
          {t("tsToDate.clear")}
        </Button>
      </div>

      {parsed.error && (
        <p className="text-danger text-sm mb-2">{t(`errors.${parsed.error}` as const)}</p>
      )}

      {date && (
        <div className="rounded-lg border border-border-default overflow-hidden mt-3">
          <table className="w-full">
            <tbody>
              {ROW_KEYS.map((k) => (
                <tr key={k} className="border-b border-border-default last:border-b-0">
                  <th
                    scope="row"
                    className="py-2 px-3 w-32 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                  >
                    {t(`tsToDate.rows.${k}` as const)}
                  </th>
                  <td className="py-2 px-3 font-mono text-sm break-all">
                    {rows[k]}
                    <CopyButton
                      getContent={() => rows[k]}
                      className="ms-1.5 opacity-60 hover:opacity-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Wire `TimestampToDate` into `UnixtimePage`**

Replace the body of `UnixtimePage`:

```tsx
export default function UnixtimePage() {
  const tt = useTranslations("tools");
  return (
    <Layout title={tt("unixtime.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6 space-y-4">
        <LiveClock />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimestampToDate />
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Smoke test in dev server**

Open `http://localhost:3000/unixtime`. Test cases:

| Input                     | Expected                                        |
| ------------------------- | ----------------------------------------------- |
| `1714521600`              | All seven rows render with 2024-04-30/05-01 UTC |
| `1714521600000`           | Same instant, ISO ends in `.000Z`               |
| `123` (with mode=Seconds) | Year 1970 timestamps                            |
| `1234567890123456`        | Inline error: "Too long..."                     |
| `-1`                      | Inline error: "Negative timestamps..."          |
| `abc`                     | Auto-stripped (input filter); no error          |
| Click Paste               | Reads clipboard or shows toast on failure       |
| Click Clear               | Empties input, hides outputs                    |

- [ ] **Step 4: Commit**

```bash
rtk git add "app/[locale]/unixtime/unixtime-page.tsx"
rtk git commit -m "feat(unixtime): add timestamp-to-datetime panel with 7 formats"
```

---

## Task 12: UI — DateToTimestamp component

**Files:**

- Modify: `app/[locale]/unixtime/unixtime-page.tsx`

- [ ] **Step 1: Append `DateToTimestamp` component**

```tsx
function DateToTimestamp() {
  const t = useTranslations("unixtime");
  const initial = presetParts("now", "local");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [ms, setMs] = useState<string>("0");
  const [tz, setTz] = useState<Tz>("local");

  const built = buildDate({ date, time, ms: Number(ms), tz });
  const seconds = built ? Math.trunc(built.getTime() / 1000).toString() : "";
  const milliseconds = built ? built.getTime().toString() : "";

  function applyPreset(preset: Preset) {
    const presetTz: Tz = preset === "todayMidnightUtc" ? "utc" : "local";
    const parts = presetParts(preset, presetTz);
    setDate(parts.date);
    setTime(parts.time);
    setMs(parts.ms.toString());
    setTz(presetTz);
  }

  return (
    <section className="rounded-lg border border-border-default bg-bg-surface p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-accent-purple/60" />
        <span className="font-mono text-sm font-semibold text-accent-purple">
          {t("dateToTs.title")}
        </span>
      </div>

      <fieldset className="mb-3">
        <legend className="block text-sm font-medium text-fg-secondary mb-1">
          {t("dateToTs.quickLegend")}
        </legend>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => applyPreset("now")}>
            {t("dateToTs.now")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("todayMidnightLocal")}>
            {t("dateToTs.todayLocal")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("todayMidnightUtc")}>
            {t("dateToTs.todayUtc")}
          </Button>
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <StyledInput
          type="date"
          aria-label={t("dateToTs.dateLabel")}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min="1970-01-01"
          max="9999-12-31"
        />
        <StyledInput
          type="time"
          step={1}
          aria-label={t("dateToTs.timeLabel")}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <StyledInput
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={t("dateToTs.msLabel")}
          label={t("dateToTs.msLabel")}
          value={ms}
          onChange={(e) => setMs(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
          className="font-mono"
        />
      </div>

      <fieldset className="mb-3">
        <legend className="block text-sm font-medium text-fg-secondary mb-1">
          {t("dateToTs.tzLegend")}
        </legend>
        <div className="flex gap-3 text-sm">
          {(["local", "utc"] as Tz[]).map((z) => (
            <label key={z} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="dt-tz"
                value={z}
                checked={tz === z}
                onChange={() => setTz(z)}
                className="accent-[#06D6A0]"
              />
              <span className="text-fg-secondary">
                {z === "local" ? t("dateToTs.tzLocal") : t("dateToTs.tzUtc")}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {built && (
        <div className="rounded-lg border border-border-default overflow-hidden">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-border-default">
                <th
                  scope="row"
                  className="py-2 px-3 w-40 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                >
                  {t("dateToTs.rows.seconds")}
                </th>
                <td className="py-2 px-3 font-mono text-sm">
                  {seconds}
                  <CopyButton
                    getContent={() => seconds}
                    className="ms-1.5 opacity-60 hover:opacity-100"
                  />
                </td>
              </tr>
              <tr>
                <th
                  scope="row"
                  className="py-2 px-3 w-40 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                >
                  {t("dateToTs.rows.milliseconds")}
                </th>
                <td className="py-2 px-3 font-mono text-sm">
                  {milliseconds}
                  <CopyButton
                    getContent={() => milliseconds}
                    className="ms-1.5 opacity-60 hover:opacity-100"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Add `DateToTimestamp` to the page grid**

Modify the body of `UnixtimePage`:

```tsx
export default function UnixtimePage() {
  const tt = useTranslations("tools");
  return (
    <Layout title={tt("unixtime.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6 space-y-4">
        <LiveClock />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimestampToDate />
          <DateToTimestamp />
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Smoke test in dev server**

Test cases on `/unixtime`:

| Action                                            | Expected                                                |
| ------------------------------------------------- | ------------------------------------------------------- |
| Initial render                                    | Date/time pre-filled with current local datetime        |
| Edit date to 2024-05-01, time to 00:00:00, tz=UTC | Seconds = 1714521600, milliseconds = 1714521600000      |
| Same with tz=Local in CST/UTC+8                   | Seconds differs by ±28800 from UTC value                |
| Click "Today 00:00 UTC"                           | Date populated, time `00:00:00`, ms `0`, tz radio = UTC |
| Set ms field to `500`, leave rest                 | Milliseconds output ends in `500`                       |
| Type non-digits in ms field                       | Filtered out by onChange handler                        |
| Click "Now" twice                                 | Each click overwrites; no live re-sync from LiveClock   |

- [ ] **Step 4: Commit**

```bash
rtk git add "app/[locale]/unixtime/unixtime-page.tsx"
rtk git commit -m "feat(unixtime): add datetime-to-timestamp panel with quick presets"
```

---

## Task 13: UI — Description component

**Files:**

- Modify: `app/[locale]/unixtime/unixtime-page.tsx`

- [ ] **Step 1: Append `Description` component**

```tsx
function Description() {
  const t = useTranslations("unixtime.description");
  const items: {
    titleKey: "whatIsTitle" | "secMsTitle" | "y2k38Title" | "tzTitle";
    bodyKey: "whatIs" | "secMs" | "y2k38" | "tz";
  }[] = [
    { titleKey: "whatIsTitle", bodyKey: "whatIs" },
    { titleKey: "secMsTitle", bodyKey: "secMs" },
    { titleKey: "y2k38Title", bodyKey: "y2k38" },
    { titleKey: "tzTitle", bodyKey: "tz" },
  ];
  return (
    <section className="rounded-lg border border-border-default bg-bg-surface p-5 space-y-3">
      {items.map(({ titleKey, bodyKey }) => (
        <div key={titleKey}>
          <h3 className="font-mono text-sm font-semibold text-accent-cyan mb-1">{t(titleKey)}</h3>
          <p className="text-sm text-fg-secondary leading-relaxed">{t(bodyKey)}</p>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Add `Description` after the grid in `UnixtimePage`**

```tsx
export default function UnixtimePage() {
  const tt = useTranslations("tools");
  return (
    <Layout title={tt("unixtime.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6 space-y-4">
        <LiveClock />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimestampToDate />
          <DateToTimestamp />
        </div>
        <Description />
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Smoke test in dev server**

Confirm Description renders below the grid in all three locales.

- [ ] **Step 4: Commit**

```bash
rtk git add "app/[locale]/unixtime/unixtime-page.tsx"
rtk git commit -m "feat(unixtime): add description section with epoch/Y2K38/timezone notes"
```

---

## Task 14: Final verification

- [ ] **Step 1: Run all tests**

Run: `rtk test npm test` (or `npx vitest run`)
Expected: all unixtime tests pass; existing dbviewer tests still green.

- [ ] **Step 2: Build**

Run: `rtk next build`
Expected: build succeeds, `/unixtime` route present in output.

- [ ] **Step 3: End-to-end manual smoke**

In dev server:

- [ ] Visit `/unixtime` (English) — all four sections render, no console errors
- [ ] Visit `/zh-CN/unixtime` — Chinese strings everywhere, no missing-translation warnings
- [ ] Visit `/zh-TW/unixtime` — Traditional Chinese strings everywhere
- [ ] LiveClock ticks every second; Pause stops it; Resume restarts
- [ ] Copy buttons on LiveClock (timestamp, local, UTC) all copy correctly
- [ ] TimestampToDate: paste `1714521600`, all 7 rows render
- [ ] TimestampToDate: paste `1714521600000`, ISO row ends in `.000Z`
- [ ] TimestampToDate: enter `1234567890123456`, error appears
- [ ] TimestampToDate: switch unit to "Seconds" with 13-digit input, error appears
- [ ] DateToTimestamp: initial values are `now`; edit date/time, output updates
- [ ] DateToTimestamp: tz radio toggles between Local/UTC, output differs by tz offset
- [ ] DateToTimestamp: "Today 00:00 UTC" preset populates correctly and switches tz radio to UTC
- [ ] Mobile width (< 768px): TimestampToDate and DateToTimestamp stack vertically
- [ ] Home page: tool card "Unix Timestamp" appears with Clock icon

- [ ] **Step 4: No commit needed if all checks pass**

If any issue found, fix it inline and commit as `fix(unixtime): ...`.

---

## Self-Review Notes

**Spec coverage check:**

| Spec section                                                 | Implementing task                                 |
| ------------------------------------------------------------ | ------------------------------------------------- |
| Supported Range (1970-9999)                                  | Task 1 (`MAX_MS`, error rules)                    |
| LiveClock (3 copies, pause, IANA tz, aria-live=off)          | Task 10                                           |
| TimestampToDate (input control)                              | Task 11 (`type=text inputMode=numeric`)           |
| Auto rule (1-11 sec, 12-15 ms, 16+ reject)                   | Task 1                                            |
| Manual override radio                                        | Task 11                                           |
| Output formats (Local/UTC/ISO/SQL/RFC/Day-Week/Relative)     | Tasks 2, 3, 11                                    |
| ISO week algorithm                                           | Task 2                                            |
| Paste fallback toast                                         | Task 11 (`handlePaste` catch)                     |
| DateToTimestamp (date+time+optional ms)                      | Task 12                                           |
| Quick presets (Now / Today local / Today UTC)                | Task 12 (`applyPreset`)                           |
| Initial value once at mount                                  | Task 12 (`presetParts("now",...)` in initializer) |
| Tz radio (Local/UTC interpretation)                          | Task 12                                           |
| `Math.trunc` not `Math.floor`                                | Tasks 10, 12 (`Math.trunc(getTime()/1000)`)       |
| Responsive breakpoint `md:grid-cols-2`                       | Tasks 11/12/13                                    |
| Error matrix                                                 | Task 1 (logic) + Task 11 (display)                |
| Description (Unix epoch / Y2K38 / sec-vs-ms / tz)            | Task 13                                           |
| Accessibility (aria-pressed, aria-live=off, fieldset/legend) | Tasks 10, 11, 12                                  |
| i18n (en, zh-CN, zh-TW)                                      | Tasks 5, 6, 7                                     |

**Type consistency:** `UnitMode`, `Tz`, `Preset`, `ParseError`, `BuildDateInput`, `DateParts` defined once in `libs/unixtime/main.ts` and reused across UI tasks.

**No placeholders:** every code-changing step shows the actual code or exact command.
