# CSV Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bidirectional JSON ↔ CSV ↔ Markdown Table converter tool at route `/csv`.

**Architecture:** Dual-panel layout (input/output) with Button-group format selectors. Business logic split into focused modules under `libs/csv/`. CSV parsing via papaparse, Markdown table and JSON flattening via hand-rolled functions. Unified `convert()` entry point routes between 6 conversion paths.

**Tech Stack:** TypeScript, React (client component), papaparse, next-intl, Tailwind CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-04-29-csv-converter-design.md`

---

## File Map

| Action  | Path                                        | Responsibility                              |
| ------- | ------------------------------------------- | ------------------------------------------- |
| Create  | `libs/csv/flatten.ts`                       | Recursive dot-notation JSON flattening      |
| Create  | `libs/csv/csv-stringify.ts`                 | JSON object array → CSV string              |
| Create  | `libs/csv/csv-parse.ts`                     | CSV string → JSON object array (papaparse)  |
| Create  | `libs/csv/markdown-table.ts`                | Markdown Table ↔ JSON object array          |
| Create  | `libs/csv/convert.ts`                       | Unified conversion entry point              |
| Create  | `libs/csv/__tests__/flatten.test.ts`        | Tests for flatten.ts                        |
| Create  | `libs/csv/__tests__/csv-stringify.test.ts`  | Tests for csv-stringify.ts                  |
| Create  | `libs/csv/__tests__/csv-parse.test.ts`      | Tests for csv-parse.ts                      |
| Create  | `libs/csv/__tests__/markdown-table.test.ts` | Tests for markdown-table.ts                 |
| Create  | `libs/csv/__tests__/convert.test.ts`        | Tests for convert.ts                        |
| Create  | `app/[locale]/csv/page.tsx`                 | Route entry (metadata + renders CsvPage)    |
| Create  | `app/[locale]/csv/csv-page.tsx`             | Main page component with all UI and logic   |
| Create  | `public/locales/en/csv.json`                | English tool-specific i18n                  |
| Create  | `public/locales/zh-CN/csv.json`             | Simplified Chinese tool-specific i18n       |
| Create  | `public/locales/zh-TW/csv.json`             | Traditional Chinese tool-specific i18n      |
| Modify  | `libs/tools.ts`                             | Add `{ key: "csv", path: "/csv" }` to TOOLS |
| Modify  | `public/locales/en/tools.json`              | Add csv metadata entry                      |
| Modify  | `public/locales/zh-CN/tools.json`           | Add csv metadata entry                      |
| Modify  | `public/locales/zh-TW/tools.json`           | Add csv metadata entry                      |
| Modify  | `vitest.config.ts`                          | Add `libs/csv/**/*.test.ts` to include      |
| Install | `papaparse`, `@types/papaparse`             | CSV parsing dependency                      |

---

## Task 1: Install dependency and update vitest config

**Files:**

- Modify: `vitest.config.ts`
- Install: `papaparse`, `@types/papaparse`

- [ ] **Step 1: Install papaparse**

```bash
npm install papaparse && npm install -D @types/papaparse
```

Expected: dependency added to package.json, no errors.

- [ ] **Step 2: Update vitest.config.ts to include csv tests**

Add `"libs/csv/**/*.test.ts"` to the `include` array:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "libs/dbviewer/**/*.test.ts",
      "libs/unixtime/**/*.test.ts",
      "libs/cron/**/*.test.ts",
      "libs/qrcode/**/*.test.ts",
      "libs/textcase/**/*.test.ts",
      "libs/color/**/*.test.ts",
      "libs/regex/**/*.test.ts",
      "libs/csv/**/*.test.ts",
    ],
    environment: "node",
    pool: "forks",
    globals: false,
  },
});
```

- [ ] **Step 3: Verify tests runner picks up the new path**

```bash
npx vitest run --reporter=verbose 2>&1 | head -5
```

Expected: vitest runs without errors (existing tests pass, no csv tests yet).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add papaparse dependency and vitest config for csv tool"
```

---

## Task 2: JSON flattening (`libs/csv/flatten.ts`)

**Files:**

- Create: `libs/csv/flatten.ts`
- Create: `libs/csv/__tests__/flatten.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// libs/csv/__tests__/flatten.test.ts
import { describe, it, expect } from "vitest";
import { flatten } from "../flatten";

describe("flatten", () => {
  it("flattens nested objects with dot notation", () => {
    const input = { user: { name: "John", age: 30 } };
    expect(flatten(input)).toEqual({
      "user.name": "John",
      "user.age": 30,
    });
  });

  it("flattens arrays with numeric index keys", () => {
    const input = { tags: ["a", "b"] };
    expect(flatten(input)).toEqual({
      "tags.0": "a",
      "tags.1": "b",
    });
  });

  it("joins array of primitives with semicolons", () => {
    const input = { list: [1, 2, 3] };
    expect(flatten(input)).toEqual({ list: "1;2;3" });
  });

  it("handles empty array", () => {
    expect(flatten({ arr: [] })).toEqual({ arr: "" });
  });

  it("handles empty object", () => {
    expect(flatten({ obj: {} })).toEqual({ obj: "" });
  });

  it("preserves null, boolean, number as-is", () => {
    expect(flatten({ a: null, b: true, c: 42, d: "text" })).toEqual({
      a: null,
      b: true,
      c: 42,
      d: "text",
    });
  });

  it("flattens deeply nested structures", () => {
    const input = { a: { b: { c: { d: "deep" } } } };
    expect(flatten(input)).toEqual({ "a.b.c.d": "deep" });
  });

  it("handles mixed nested objects and arrays", () => {
    const input = {
      user: { name: "John", scores: [90, 85] },
    };
    expect(flatten(input)).toEqual({
      "user.name": "John",
      "user.scores.0": 90,
      "user.scores.1": 85,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run libs/csv/__tests__/flatten.test.ts
```

Expected: FAIL — `flatten` module does not exist.

- [ ] **Step 3: Write implementation**

```typescript
// libs/csv/flatten.ts

/**
 * Recursively flatten a nested object using dot-notation keys.
 *
 * Rules:
 * - Nested objects → dot-separated keys (parent.child.grandchild)
 * - Arrays of objects → numeric index keys (items.0, items.1)
 * - Arrays of primitives → semicolon-joined string ("a;b;c")
 * - Empty array → ""
 * - Empty object → ""
 * - null / boolean / number → preserved as-is
 */
export function flatten(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  function walk(current: unknown, prefix: string): void {
    if (current === null || current === undefined) {
      result[prefix] = current;
      return;
    }

    if (typeof current !== "object") {
      result[prefix] = current;
      return;
    }

    if (Array.isArray(current)) {
      if (current.length === 0) {
        result[prefix] = "";
        return;
      }

      // Check if array contains only primitives
      const allPrimitive = current.every((item) => item === null || typeof item !== "object");

      if (allPrimitive) {
        result[prefix] = current.join(";");
        return;
      }

      // Array of objects — walk each element with numeric index
      for (let i = 0; i < current.length; i++) {
        walk(current[i], `${prefix}.${i}`);
      }
      return;
    }

    // Plain object
    const entries = Object.entries(current as Record<string, unknown>);
    if (entries.length === 0) {
      result[prefix] = "";
      return;
    }

    for (const [key, value] of entries) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      walk(value, newKey);
    }
  }

  walk(obj, "");
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run libs/csv/__tests__/flatten.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/csv/flatten.ts libs/csv/__tests__/flatten.test.ts
git commit -m "feat(csv): add JSON flattening with dot-notation"
```

---

## Task 3: CSV stringify (`libs/csv/csv-stringify.ts`)

**Files:**

- Create: `libs/csv/csv-stringify.ts`
- Create: `libs/csv/__tests__/csv-stringify.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// libs/csv/__tests__/csv-stringify.test.ts
import { describe, it, expect } from "vitest";
import { csvStringify } from "../csv-stringify";

describe("csvStringify", () => {
  it("converts simple object array to CSV with BOM and CRLF", () => {
    const input = [
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ];
    const result = csvStringify(input);
    expect(result).toContain("\uFEFF");
    expect(result).toContain("\r\n");
    expect(result).toBe('\uFEFF"name","age"\r\n"John","30"\r\n"Alice","25"\r\n');
  });

  it("escapes fields containing commas", () => {
    const input = [{ text: "hello, world" }];
    const result = csvStringify(input);
    expect(result).toContain('"hello, world"');
  });

  it("escapes fields containing double quotes", () => {
    const input = [{ text: 'say "hi"' }];
    const result = csvStringify(input);
    expect(result).toContain('"say ""hi"""');
  });

  it("escapes fields containing newlines", () => {
    const input = [{ text: "line1\nline2" }];
    const result = csvStringify(input);
    expect(result).toContain('"line1\nline2"');
  });

  it("handles null and undefined as empty string", () => {
    const input = [{ a: null, b: undefined }] as Record<string, unknown>[];
    const result = csvStringify(input);
    expect(result).toContain('"a","b"\r\n"",""');
  });

  it("converts booleans to true/false strings", () => {
    const input = [{ active: true, deleted: false }];
    const result = csvStringify(input);
    expect(result).toContain('"active","deleted"\r\n"true","false"');
  });

  it("handles inconsistent keys across objects (union of all keys)", () => {
    const input = [
      { a: 1, b: 2 },
      { a: 3, c: 4 },
    ];
    const result = csvStringify(input);
    // Header should have all 3 keys
    expect(result).toContain('"a","b","c"');
    // First row: a=1, b=2, c=""
    // Second row: a=3, b="", c=4
    expect(result).toContain('"1","2",""');
    expect(result).toContain('"3","","4"');
  });

  it("handles empty array", () => {
    const result = csvStringify([]);
    expect(result).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run libs/csv/__tests__/csv-stringify.test.ts
```

Expected: FAIL — `csvStringify` module does not exist.

- [ ] **Step 3: Write implementation**

```typescript
// libs/csv/csv-stringify.ts

import { flatten } from "./flatten";

const BOM = "\uFEFF";
const CRLF = "\r\n";

/**
 * Escape a single CSV field value.
 * - Wraps in double quotes if field contains comma, quote, or newline.
 * - Escapes internal double quotes as "".
 * - null/undefined → empty string.
 * - boolean → "true" / "false".
 */
function escapeField(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Convert an array of JSON objects into a CSV string.
 * Flattens nested objects via dot-notation before serializing.
 */
export function csvStringify(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";

  // Flatten all objects
  const flat = data.map((obj) => flatten(obj));

  // Collect union of all keys in order of first appearance
  const keySet = new Set<string>();
  const keys: string[] = [];
  for (const obj of flat) {
    for (const key of Object.keys(obj)) {
      if (!keySet.has(key)) {
        keySet.add(key);
        keys.push(key);
      }
    }
  }

  // Header row
  const header = keys.map((k) => escapeField(k)).join(",");
  // Data rows
  const rows = flat.map((obj) => keys.map((k) => escapeField(obj[k])).join(","));

  return BOM + header + CRLF + rows.map((r) => r + CRLF).join("");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run libs/csv/__tests__/csv-stringify.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/csv/csv-stringify.ts libs/csv/__tests__/csv-stringify.test.ts
git commit -m "feat(csv): add CSV stringify with BOM, CRLF, and escaping"
```

---

## Task 4: CSV parse (`libs/csv/csv-parse.ts`)

**Files:**

- Create: `libs/csv/csv-parse.ts`
- Create: `libs/csv/__tests__/csv-parse.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// libs/csv/__tests__/csv-parse.test.ts
import { describe, it, expect } from "vitest";
import { csvParse } from "../csv-parse";

describe("csvParse", () => {
  it("parses simple CSV with header", () => {
    const csv = "name,age\nJohn,30\nAlice,25";
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data).toEqual([
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ]);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'text,value\n"hello, world",1';
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data[0].text).toBe("hello, world");
  });

  it("handles escaped double quotes", () => {
    const csv = 'text\n"say ""hi"""\n';
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data[0].text).toBe('say "hi"');
  });

  it("handles BOM prefix", () => {
    const csv = "\uFEFFname,age\nJohn,30";
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data[0].name).toBe("John");
  });

  it("handles CRLF line endings", () => {
    const csv = "name,age\r\nJohn,30\r\n";
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data).toEqual([{ name: "John", age: 30 }]);
  });

  it("returns errors for malformed CSV", () => {
    const csv = 'name\n"unclosed quote';
    const { errors } = csvParse(csv);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const { data, errors } = csvParse("");
    expect(errors).toHaveLength(0);
    expect(data).toEqual([]);
  });

  it("auto-detects tab delimiter", () => {
    const csv = "name\tage\nJohn\t30";
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data[0].name).toBe("John");
    expect(data[0].age).toBe(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run libs/csv/__tests__/csv-parse.test.ts
```

Expected: FAIL — `csvParse` module does not exist.

- [ ] **Step 3: Write implementation**

```typescript
// libs/csv/csv-parse.ts

import Papa from "papaparse";

export interface CsvParseResult {
  data: Record<string, unknown>[];
  errors: string[];
}

/**
 * Parse a CSV string into a JSON object array using papaparse.
 * - First row = column headers (trimmed).
 * - Auto-detects delimiter (comma, tab, semicolon, pipe).
 * - Auto-converts numeric strings and booleans via dynamicTyping.
 * - Strips UTF-8 BOM if present.
 */
export function csvParse(csv: string): CsvParseResult {
  const result = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h: string) => h.trim(),
  });

  const errors = result.errors.map((e) => `Row ${e.row ?? "?"}: ${e.message}`);

  return {
    data: result.data as Record<string, unknown>[],
    errors,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run libs/csv/__tests__/csv-parse.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/csv/csv-parse.ts libs/csv/__tests__/csv-parse.test.ts
git commit -m "feat(csv): add CSV parse via papaparse with auto-detection"
```

---

## Task 5: Markdown table (`libs/csv/markdown-table.ts`)

**Files:**

- Create: `libs/csv/markdown-table.ts`
- Create: `libs/csv/__tests__/markdown-table.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// libs/csv/__tests__/markdown-table.test.ts
import { describe, it, expect } from "vitest";
import { markdownTableStringify, markdownTableParse } from "../markdown-table";

describe("markdownTableStringify", () => {
  it("converts object array to aligned markdown table", () => {
    const input = [
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ];
    const result = markdownTableStringify(input);
    expect(result).toContain("| name  | age |");
    expect(result).toContain("| ----- | --- |");
    expect(result).toContain("| John  | 30  |");
    expect(result).toContain("| Alice | 25  |");
  });

  it("handles boolean and null values", () => {
    const input = [{ active: true, note: null }];
    const result = markdownTableStringify(input);
    expect(result).toContain("| true |");
    expect(result).toContain("|  |"); // null → empty
  });

  it("handles empty array", () => {
    expect(markdownTableStringify([])).toBe("");
  });
});

describe("markdownTableParse", () => {
  it("parses standard markdown table to object array", () => {
    const md = `| name  | age |
| ----- | --- |
| John  | 30  |
| Alice | 25  |`;
    const result = markdownTableParse(md);
    expect(result.data).toEqual([
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ]);
    expect(result.errors).toHaveLength(0);
  });

  it("auto-types numeric and boolean values", () => {
    const md = `| active | count |
| ------ | ----- |
| true   | 42    |
| false  | 0     |`;
    const result = markdownTableParse(md);
    expect(result.data[0].active).toBe(true);
    expect(result.data[0].count).toBe(42);
    expect(result.data[1].active).toBe(false);
  });

  it("returns error for input with no pipe delimiters", () => {
    const result = markdownTableParse("just plain text");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.data).toEqual([]);
  });

  it("handles tables without outer pipes", () => {
    const md = `name | age
----- | ---
John  | 30`;
    const result = markdownTableParse(md);
    expect(result.data).toEqual([{ name: "John", age: 30 }]);
  });

  it("handles empty input", () => {
    const result = markdownTableParse("");
    expect(result.data).toEqual([]);
    expect(result.errors).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run libs/csv/__tests__/markdown-table.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Write implementation**

```typescript
// libs/csv/markdown-table.ts

import { flatten } from "./flatten";

export interface MarkdownParseResult {
  data: Record<string, unknown>[];
  errors: string[];
}

const SEPARATOR_RE = /^\s*\|?\s*[-:]+[-|\s:]*\s*\|?\s*$/;

/**
 * Auto-type a cell value: numeric strings → number, "true"/"false" → boolean.
 */
function autoType(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== "") return num;
  return trimmed;
}

/**
 * Parse cells from a markdown table line.
 * Splits by |, trims whitespace, removes empty first/last from outer pipes.
 */
function parseLine(line: string): string[] {
  let cells = line.split("|").map((c) => c.trim());
  // Remove empty strings from leading/trailing pipes
  if (cells.length > 0 && cells[0] === "") cells = cells.slice(1);
  if (cells.length > 0 && cells[cells.length - 1] === "") cells = cells.slice(0, -1);
  return cells;
}

/**
 * Parse a Markdown Table string into a JSON object array.
 */
export function markdownTableParse(input: string): MarkdownParseResult {
  if (!input.trim()) return { data: [], errors: [] };

  const lines = input.split("\n");
  const tableLines = lines.filter((l) => l.includes("|"));

  if (tableLines.length === 0) {
    return { data: [], errors: ["Cannot detect Markdown table format"] };
  }

  // Find header line (first non-separator line)
  let headerLine: string | null = null;
  const dataLines: string[] = [];
  let headerFound = false;

  for (const line of tableLines) {
    if (!headerFound) {
      if (SEPARATOR_RE.test(line)) continue; // skip separator before header
      headerLine = line;
      headerFound = true;
    } else {
      if (SEPARATOR_RE.test(line)) continue; // skip separator after header
      dataLines.push(line);
    }
  }

  if (!headerLine) {
    return { data: [], errors: ["Cannot detect Markdown table format"] };
  }

  const headers = parseLine(headerLine);
  const data: Record<string, unknown>[] = [];

  for (const dl of dataLines) {
    const cells = parseLine(dl);
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = autoType(cells[i] ?? "");
    }
    data.push(obj);
  }

  return { data, errors: [] };
}

/**
 * Convert a JSON object array to a Markdown Table string.
 * Columns are aligned with padding to the widest value.
 */
export function markdownTableStringify(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";

  // Flatten and collect keys
  const flat = data.map((obj) => flatten(obj));
  const keySet = new Set<string>();
  const keys: string[] = [];
  for (const obj of flat) {
    for (const key of Object.keys(obj)) {
      if (!keySet.has(key)) {
        keySet.add(key);
        keys.push(key);
      }
    }
  }

  // Build rows of string values
  const toStr = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v);
  };

  const headerRow = keys;
  const rows = flat.map((obj) => keys.map((k) => toStr(obj[k])));

  // Calculate column widths
  const widths = keys.map((key, i) => {
    const headerLen = key.length;
    const maxDataLen = Math.max(...rows.map((r) => r[i].length), 0);
    return Math.max(headerLen, maxDataLen);
  });

  // Pad a cell value to its column width
  const pad = (value: string, width: number): string => value.padEnd(width, " ");

  // Build output
  const lines: string[] = [];

  // Header
  lines.push("| " + headerRow.map((h, i) => pad(h, widths[i])).join(" | ") + " |");
  // Separator
  lines.push("| " + widths.map((w) => "-".repeat(w + (w > 5 ? 0 : 0))).join(" | ") + " |");
  // Data rows
  for (const row of rows) {
    lines.push("| " + row.map((cell, i) => pad(cell, widths[i])).join(" | ") + " |");
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run libs/csv/__tests__/markdown-table.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/csv/markdown-table.ts libs/csv/__tests__/markdown-table.test.ts
git commit -m "feat(csv): add markdown table stringify and parse"
```

---

## Task 6: Unified converter (`libs/csv/convert.ts`)

**Files:**

- Create: `libs/csv/convert.ts`
- Create: `libs/csv/__tests__/convert.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// libs/csv/__tests__/convert.test.ts
import { describe, it, expect } from "vitest";
import { convert } from "../convert";

describe("convert", () => {
  it("converts JSON → CSV", () => {
    const json = JSON.stringify([
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ]);
    const result = convert(json, "json", "csv");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain('"name","age"');
    expect(result.output).toContain('"John"');
  });

  it("converts JSON → Markdown", () => {
    const json = JSON.stringify([{ name: "John", age: 30 }]);
    const result = convert(json, "json", "markdown");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain("| name");
    expect(result.output).toContain("| John");
  });

  it("converts CSV → JSON", () => {
    const csv = "name,age\nJohn,30";
    const result = convert(csv, "csv", "json");
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.output);
    expect(parsed[0].name).toBe("John");
    expect(parsed[0].age).toBe(30);
  });

  it("converts CSV → Markdown", () => {
    const csv = "name,age\nJohn,30";
    const result = convert(csv, "csv", "markdown");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain("| name");
    expect(result.output).toContain("| John");
  });

  it("converts Markdown → JSON", () => {
    const md = "| name | age |\n| --- | --- |\n| John | 30 |";
    const result = convert(md, "markdown", "json");
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.output);
    expect(parsed[0].name).toBe("John");
  });

  it("converts Markdown → CSV", () => {
    const md = "| name | age |\n| --- | --- |\n| John | 30 |";
    const result = convert(md, "markdown", "csv");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain("name");
    expect(result.output).toContain("John");
  });

  it("returns error for invalid JSON", () => {
    const result = convert("not valid json{{{", "json", "csv");
    expect(result.error).toBeTruthy();
  });

  it("returns error for invalid Markdown table", () => {
    const result = convert("no pipes here", "markdown", "json");
    expect(result.error).toBeTruthy();
  });

  it("returns error for malformed CSV", () => {
    const result = convert('name\n"unclosed', "csv", "json");
    expect(result.error).toBeTruthy();
  });

  it("handles empty input", () => {
    const result = convert("", "json", "csv");
    expect(result.output).toBe("");
    expect(result.error).toBeUndefined();
  });

  it("auto-wraps single JSON object into array", () => {
    const json = JSON.stringify({ name: "John", age: 30 });
    const result = convert(json, "json", "csv");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain("John");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run libs/csv/__tests__/convert.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Write implementation**

```typescript
// libs/csv/convert.ts

import { csvStringify } from "./csv-stringify";
import { csvParse } from "./csv-parse";
import { markdownTableStringify, markdownTableParse } from "./markdown-table";

export type Format = "json" | "csv" | "markdown";

export interface ConvertResult {
  output: string;
  error?: string;
}

/**
 * Type coercion for CSV/Markdown → JSON direction:
 * - "true"/"false" → boolean
 * - "null" → null
 * - Numeric strings → number
 * Already handled by papaparse dynamicTyping and markdownTableParse autoType.
 */

/**
 * Parse JSON string, auto-wrapping single objects into arrays.
 */
function parseJsonInput(input: string): { data: Record<string, unknown>[]; error?: string } {
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return { data: parsed };
    }
    // Auto-wrap single object
    return { data: [parsed] };
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : "Invalid JSON";
    return { data: [], error: msg };
  }
}

/**
 * Unified conversion entry point.
 * Routes to the appropriate conversion path based on source and target formats.
 * Returns error message on parse failure instead of throwing.
 */
export function convert(input: string, from: Format, to: Format): ConvertResult {
  if (!input.trim()) return { output: "" };

  // Step 1: Parse input to intermediate JSON array
  let intermediate: Record<string, unknown>[];

  switch (from) {
    case "json": {
      const result = parseJsonInput(input);
      if (result.error) return { output: "", error: result.error };
      intermediate = result.data;
      break;
    }
    case "csv": {
      const result = csvParse(input);
      if (result.errors.length > 0) {
        return { output: "", error: result.errors.join("; ") };
      }
      intermediate = result.data;
      break;
    }
    case "markdown": {
      const result = markdownTableParse(input);
      if (result.errors.length > 0) {
        return { output: "", error: result.errors.join("; ") };
      }
      intermediate = result.data;
      break;
    }
  }

  // Step 2: Serialize intermediate to target format
  switch (to) {
    case "json":
      return { output: JSON.stringify(intermediate, null, 2) };
    case "csv":
      return { output: csvStringify(intermediate) };
    case "markdown":
      return { output: markdownTableStringify(intermediate) };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run libs/csv/__tests__/convert.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Run all CSV tests together**

```bash
npx vitest run libs/csv/
```

Expected: All tests across all 5 test files PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/csv/convert.ts libs/csv/__tests__/convert.test.ts
git commit -m "feat(csv): add unified convert entry point with 6 conversion paths"
```

---

## Task 7: Tool registration and i18n

**Files:**

- Modify: `libs/tools.ts`
- Modify: `public/locales/en/tools.json`
- Modify: `public/locales/zh-CN/tools.json`
- Modify: `public/locales/zh-TW/tools.json`
- Create: `public/locales/en/csv.json`
- Create: `public/locales/zh-CN/csv.json`
- Create: `public/locales/zh-TW/csv.json`

- [ ] **Step 1: Add CSV to TOOLS array in `libs/tools.ts`**

Add `{ key: "csv", path: "/csv" }` after the last entry, before the closing bracket:

```typescript
  { key: "httpstatus", path: "/httpstatus" },
  { key: "color", path: "/color" },
  { key: "csv", path: "/csv" },
] as const;
```

- [ ] **Step 2: Add csv entry to `public/locales/en/tools.json`**

Add before the closing `}`:

```json
  "regex": {
    "title": "Regex Tester & Live Regex Editor",
    "shortTitle": "Regex Tester",
    "description": "Test regular expressions in real-time with match highlighting, capture group inspection, and replacement preview. Built-in preset library and token-level explanation. 100% client-side."
  },
  "csv": {
    "title": "CSV Converter - JSON to CSV, Markdown Table Online",
    "shortTitle": "CSV Converter",
    "description": "Convert between JSON, CSV and Markdown Table formats. Bidirectional, real-time, client-side."
  }
```

- [ ] **Step 3: Add csv entry to `public/locales/zh-CN/tools.json`**

```json
  "csv": {
    "title": "CSV 转换器 - JSON 转 CSV、Markdown 表格在线工具",
    "shortTitle": "CSV 转换器",
    "description": "在 JSON、CSV 和 Markdown 表格格式之间相互转换。双向实时转换，100%客户端处理。"
  }
```

- [ ] **Step 4: Add csv entry to `public/locales/zh-TW/tools.json`**

```json
  "csv": {
    "title": "CSV 轉換器 - JSON 轉 CSV、Markdown 表格線上工具",
    "shortTitle": "CSV 轉換器",
    "description": "在 JSON、CSV 和 Markdown 表格格式之間相互轉換。雙向即時轉換，100%客戶端處理。"
  }
```

- [ ] **Step 5: Create `public/locales/en/csv.json`**

```json
{
  "input": "Input",
  "output": "Output",
  "inputPlaceholder": "Paste or type your data here, or drop a file",
  "outputPlaceholder": "Converted result will appear here",
  "clear": "Clear",
  "upload": "Upload",
  "paste": "Paste",
  "copy": "Copy",
  "download": "Download",
  "formatJson": "JSON",
  "formatCsv": "CSV",
  "formatMarkdown": "Markdown Table",
  "dropHere": "Drop file here",
  "fileTooLarge": "File is too large (max 5MB)",
  "binaryRejected": "Binary file detected, please upload a text file",
  "fileLoaded": "File loaded successfully",
  "descriptions": {
    "whatIsTitle": "What is CSV?",
    "whatIsP1": "CSV (Comma-Separated Values) is a plain text format for storing tabular data. Each line represents a row, and fields are separated by commas. It's the most common format for data exchange between spreadsheets, databases, and applications.",
    "whatIsP2": "This tool converts between JSON, CSV, and Markdown Table formats in real-time. All processing happens in your browser — nothing is sent to any server.",
    "howTitle": "How to use",
    "howP1": "Select your input format and output format using the buttons above each panel. Paste, type, or drag-and-drop your data into the input panel. The output updates automatically.",
    "howP2": "Nested JSON objects are flattened using dot-notation (e.g., user.name). Arrays of objects produce numbered keys (e.g., items.0). Single JSON objects are auto-wrapped into arrays.",
    "supportedTitle": "Supported conversions",
    "supportedP1": "JSON → CSV, JSON → Markdown Table, CSV → JSON, CSV → Markdown Table, Markdown Table → JSON, Markdown Table → CSV. Auto-detects CSV delimiters (comma, tab, semicolon, pipe).",
    "limitationsTitle": "Limitations",
    "limitationsP1": "Files larger than 5MB are rejected. Binary files are detected and rejected. Excel (.xlsx) format is not supported."
  }
}
```

- [ ] **Step 6: Create `public/locales/zh-CN/csv.json`**

```json
{
  "input": "输入",
  "output": "输出",
  "inputPlaceholder": "在此粘贴或输入数据，或拖拽文件",
  "outputPlaceholder": "转换结果将显示在这里",
  "clear": "清空",
  "upload": "上传",
  "paste": "粘贴",
  "copy": "复制",
  "download": "下载",
  "formatJson": "JSON",
  "formatCsv": "CSV",
  "formatMarkdown": "Markdown 表格",
  "dropHere": "拖拽文件到此处",
  "fileTooLarge": "文件过大（最大 5MB）",
  "binaryRejected": "检测到二进制文件，请上传文本文件",
  "fileLoaded": "文件加载成功",
  "descriptions": {
    "whatIsTitle": "什么是 CSV？",
    "whatIsP1": "CSV（逗号分隔值）是一种用于存储表格数据的纯文本格式。每行代表一条记录，字段之间用逗号分隔。它是电子表格、数据库和应用程序之间数据交换最常用的格式。",
    "whatIsP2": "此工具可以在 JSON、CSV 和 Markdown 表格格式之间实时转换。所有处理都在浏览器中完成，不会将数据发送到任何服务器。",
    "howTitle": "使用方法",
    "howP1": "使用每个面板上方的按钮选择输入格式和输出格式。粘贴、输入或拖拽文件到输入面板，输出结果会自动更新。",
    "howP2": "嵌套的 JSON 对象会使用点号展平（如 user.name）。对象数组会生成编号键（如 items.0）。单个 JSON 对象会自动包装为数组。",
    "supportedTitle": "支持的转换",
    "supportedP1": "JSON → CSV、JSON → Markdown 表格、CSV → JSON、CSV → Markdown 表格、Markdown 表格 → JSON、Markdown 表格 → CSV。自动检测 CSV 分隔符（逗号、制表符、分号、管道符）。",
    "limitationsTitle": "限制",
    "limitationsP1": "超过 5MB 的文件会被拒绝。二进制文件会被检测并拒绝。不支持 Excel (.xlsx) 格式。"
  }
}
```

- [ ] **Step 7: Create `public/locales/zh-TW/csv.json`**

```json
{
  "input": "輸入",
  "output": "輸出",
  "inputPlaceholder": "在此貼上或輸入資料，或拖曳檔案",
  "outputPlaceholder": "轉換結果將顯示在這裡",
  "clear": "清空",
  "upload": "上傳",
  "paste": "貼上",
  "copy": "複製",
  "download": "下載",
  "formatJson": "JSON",
  "formatCsv": "CSV",
  "formatMarkdown": "Markdown 表格",
  "dropHere": "拖曳檔案到此處",
  "fileTooLarge": "檔案過大（最大 5MB）",
  "binaryRejected": "偵測到二進位檔案，請上傳文字檔案",
  "fileLoaded": "檔案載入成功",
  "descriptions": {
    "whatIsTitle": "什麼是 CSV？",
    "whatIsP1": "CSV（逗號分隔值）是一種用於儲存表格資料的純文字格式。每行代表一筆記錄，欄位之間用逗號分隔。它是試算表、資料庫和應用程式之間資料交换最常用的格式。",
    "whatIsP2": "此工具可以在 JSON、CSV 和 Markdown 表格格式之間即時轉換。所有處理都在瀏覽器中完成，不會將資料傳送到任何伺服器。",
    "howTitle": "使用方法",
    "howP1": "使用每個面板上方的按鈕選擇輸入格式和輸出格式。貼上、輸入或拖曳檔案到輸入面板，輸出結果會自動更新。",
    "howP2": "巢狀的 JSON 物件會使用點號展平（如 user.name）。物件陣列會產生編號鍵（如 items.0）。單一 JSON 物件會自動包裝為陣列。",
    "supportedTitle": "支援的轉換",
    "supportedP1": "JSON → CSV、JSON → Markdown 表格、CSV → JSON、CSV → Markdown 表格、Markdown 表格 → JSON、Markdown 表格 → CSV。自動偵測 CSV 分隔符號（逗號、定位字元、分號、管道符）。",
    "limitationsTitle": "限制",
    "limitationsP1": "超過 5MB 的檔案會被拒絕。二進位檔案會被偵測並拒絕。不支援 Excel (.xlsx) 格式。"
  }
}
```

- [ ] **Step 8: Verify i18n compiles without errors**

```bash
npx next build 2>&1 | head -20
```

Expected: Build succeeds or shows only unrelated warnings. If i18n keys are missing, TypeScript will catch them.

- [ ] **Step 9: Commit**

```bash
git add libs/tools.ts public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json public/locales/en/csv.json public/locales/zh-CN/csv.json public/locales/zh-TW/csv.json
git commit -m "feat(csv): add tool registration and i18n for all 3 locales"
```

---

## Task 8: Page component (`app/[locale]/csv/csv-page.tsx`)

**Files:**

- Create: `app/[locale]/csv/csv-page.tsx`

- [ ] **Step 1: Create the page component**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { Button } from "../../../components/ui/button";
import { StyledTextarea } from "../../../components/ui/input";
import { CopyButton } from "../../../components/ui/copy-btn";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { showToast } from "../../../libs/toast";
import { MAX_FILE_BYTES } from "../../../libs/file/limits";
import { isBinaryFile } from "../../../libs/file/binary-sniff";
import { convert, type Format } from "../../../libs/csv/convert";

const DEBOUNCE_MS = 500;

const FORMAT_OPTIONS: { key: Format; labelKey: string }[] = [
  { key: "json", labelKey: "formatJson" },
  { key: "csv", labelKey: "formatCsv" },
  { key: "markdown", labelKey: "formatMarkdown" },
];

const ACCEPT_MAP: Record<Format, string> = {
  json: ".json",
  csv: ".csv,.tsv,.txt",
  markdown: ".md,.txt",
};

const EXT_MAP: Record<Format, string> = {
  json: ".json",
  csv: ".csv",
  markdown: ".md",
};

function FormatSelector({
  selected,
  disabled,
  onChange,
  t,
}: {
  selected: Format;
  disabled?: Format;
  onChange: (f: Format) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex gap-1">
      {FORMAT_OPTIONS.map(({ key, labelKey }) => {
        const isActive = key === selected;
        const isDisabled = key === disabled;
        return (
          <Button
            key={key}
            variant={isActive ? "primary" : "outline"}
            size="sm"
            disabled={isDisabled}
            onClick={() => onChange(key)}
            className={isDisabled ? "opacity-40 cursor-not-allowed" : ""}
          >
            {t(labelKey)}
          </Button>
        );
      })}
    </div>
  );
}

function CsvPageBody() {
  const t = useTranslations("csv");
  const tc = useTranslations("common");
  const isMobile = useIsMobile();

  const [inputFormat, setInputFormat] = useState<Format>("json");
  const [outputFormat, setOutputFormat] = useState<Format>("csv");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time conversion with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!inputText.trim()) {
        setOutputText("");
        setError(null);
        return;
      }

      const result = convert(inputText, inputFormat, outputFormat);
      if (result.error) {
        setOutputText(result.error);
        setError(result.error);
      } else {
        setOutputText(result.output);
        setError(null);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [inputText, inputFormat, outputFormat]);

  // File handling
  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      showToast(t("fileTooLarge"), "error");
      return;
    }
    if (await isBinaryFile(file)) {
      showToast(t("binaryRejected"), "error");
      return;
    }
    const text = await file.text();
    setInputText(text);
    showToast(t("fileLoaded"), "success");
  }

  // Drag & drop handlers
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) setIsDragging(true);
    }
  }

  function onDragLeave() {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // Paste from clipboard
  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch {
      showToast(tc("copyFailed"), "error");
    }
  }

  // Download output as file
  function handleDownload() {
    const ext = EXT_MAP[outputFormat];
    const mimeType = outputFormat === "json" ? "application/json" : "text/plain";
    const blob = new Blob([outputText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setInputText("");
    setOutputText("");
    setError(null);
  }

  return (
    <div className={isMobile ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
      {/* Input Panel */}
      <div
        className={`relative rounded-lg border p-4 transition-colors ${
          isDragging
            ? "border-accent-cyan shadow-[0_0_12px_rgba(6,214,160,0.3)]"
            : "border-border-default"
        }`}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-between mb-3">
          <FormatSelector selected={inputFormat} onChange={setInputFormat} t={t} />
          <span className="text-xs text-fg-muted">{t("input")}</span>
        </div>

        <StyledTextarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("inputPlaceholder")}
          className="min-h-[300px] font-mono text-sm"
          rows={12}
        />

        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={handleClear}>
            {t("clear")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {t("upload")}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePaste}>
            {t("paste")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_MAP[inputFormat]}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-base/80 rounded-lg border-2 border-dashed border-accent-cyan">
            <p className="text-accent-cyan font-medium">{t("dropHere")}</p>
          </div>
        )}
      </div>

      {/* Output Panel */}
      <div className="rounded-lg border border-border-default p-4">
        <div className="flex items-center justify-between mb-3">
          <FormatSelector
            selected={outputFormat}
            disabled={inputFormat}
            onChange={setOutputFormat}
            t={t}
          />
          <span className="text-xs text-fg-muted">{t("output")}</span>
        </div>

        <StyledTextarea
          value={outputText}
          readOnly
          placeholder={t("outputPlaceholder")}
          className={`min-h-[300px] font-mono text-sm ${error ? "text-danger" : ""}`}
          rows={12}
        />

        <div className="flex gap-2 mt-3">
          <CopyButton getContent={() => outputText} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!outputText || !!error}
          >
            {t("download")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Description() {
  const t = useTranslations("csv");

  return (
    <div className="mt-8 space-y-6 text-sm text-fg-secondary">
      <div>
        <h3 className="font-semibold text-fg-primary mb-2">{t("descriptions.whatIsTitle")}</h3>
        <p>{t("descriptions.whatIsP1")}</p>
        <p className="mt-2">{t("descriptions.whatIsP2")}</p>
      </div>
      <div>
        <h3 className="font-semibold text-fg-primary mb-2">{t("descriptions.howTitle")}</h3>
        <p>{t("descriptions.howP1")}</p>
        <p className="mt-2">{t("descriptions.howP2")}</p>
      </div>
      <div>
        <h3 className="font-semibold text-fg-primary mb-2">{t("descriptions.supportedTitle")}</h3>
        <p>{t("descriptions.supportedP1")}</p>
      </div>
      <div>
        <h3 className="font-semibold text-fg-primary mb-2">{t("descriptions.limitationsTitle")}</h3>
        <p>{t("descriptions.limitationsP1")}</p>
      </div>
    </div>
  );
}

export default function CsvPage() {
  const tTools = useTranslations("tools");
  return (
    <Layout title={tTools("csv.shortTitle")}>
      <CsvPageBody />
      <Description />
    </Layout>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "csv" || echo "No csv-related errors"
```

Expected: No csv-related TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/csv/csv-page.tsx
git commit -m "feat(csv): add main page component with dual-panel UI"
```

---

## Task 9: Route entry and final integration

**Files:**

- Create: `app/[locale]/csv/page.tsx`

- [ ] **Step 1: Create the route entry**

```tsx
// app/[locale]/csv/page.tsx
import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import CsvPage from "./csv-page";

const PATH = "/csv";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("csv.title"),
    description: t("csv.description"),
  });
}

export default function CsvRoute() {
  return <CsvPage />;
}
```

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: Build succeeds. No TypeScript errors. No missing i18n key warnings.

- [ ] **Step 3: Run all tests**

```bash
npm run test
```

Expected: All existing tests + all new CSV tests pass.

- [ ] **Step 4: Start dev server and manually verify**

```bash
npm run dev
```

Open http://localhost:3000/csv and verify:

- Default state: input = JSON, output = CSV
- Format selectors switch correctly (output disabled when matching input)
- Type JSON → see CSV output
- Switch input to CSV → paste CSV → see JSON output
- Drag and drop a .csv file → loads into input
- Copy button copies output
- Download button downloads file
- Clear button clears both panels

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/csv/page.tsx
git commit -m "feat(csv): add route entry and complete CSV converter tool"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: Each requirement in the design spec maps to a task
- [x] **Placeholder scan**: No TBD, TODO, or vague instructions
- [x] **Type consistency**: All type signatures match across tasks (Format, ConvertResult, CsvParseResult, MarkdownParseResult)
