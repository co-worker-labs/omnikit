# CSV ↔ Markdown Table Converter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone bidirectional CSV ↔ Markdown Table converter at `/csv-md`, reusing existing `libs/csv/` libraries.

**Architecture:** Thin orchestrator (`csv-md-convert.ts`) wraps existing parse/stringify functions. UI is a dual-panel page component following csv-page.tsx patterns. Markdown side adds an edit/preview toggle referencing the Markdown Editor. Shared `useDropZone` hook extracted from csv-page.tsx.

**Tech Stack:** TypeScript, React (Next.js App Router), Tailwind CSS, papaparse, markdown-it, Vitest

---

## File Map

| File                                        | Action     | Responsibility                                                     |
| ------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `hooks/useDropZone.ts`                      | **CREATE** | Shared drag-and-drop hook (extracted from csv-page.tsx)            |
| `libs/csv/csv-parse.ts`                     | **MODIFY** | Add optional `delimiter` parameter                                 |
| `libs/csv/__tests__/csv-parse.test.ts`      | **MODIFY** | Add tests for explicit delimiter                                   |
| `libs/csv/markdown-table.ts`                | **MODIFY** | Extend stringify with alignment; extend parse to return alignments |
| `libs/csv/__tests__/markdown-table.test.ts` | **MODIFY** | Add tests for alignment features                                   |
| `libs/csv/csv-md-convert.ts`                | **CREATE** | CSV ↔ Markdown Table conversion orchestrator                       |
| `libs/csv/__tests__/csv-md-convert.test.ts` | **CREATE** | Unit tests for the converter                                       |
| `libs/tools.ts`                             | **MODIFY** | Register new tool entry                                            |
| `public/locales/en/csv-md.json`             | **CREATE** | English translations                                               |
| `public/locales/zh-CN/csv-md.json`          | **CREATE** | Simplified Chinese translations                                    |
| `public/locales/zh-TW/csv-md.json`          | **CREATE** | Traditional Chinese translations                                   |
| `public/locales/en/tools.json`              | **MODIFY** | Add csv-md entry                                                   |
| `public/locales/zh-CN/tools.json`           | **MODIFY** | Add csv-md entry with searchTerms                                  |
| `public/locales/zh-TW/tools.json`           | **MODIFY** | Add csv-md entry with searchTerms                                  |
| `app/[locale]/csv-md/page.tsx`              | **CREATE** | Route entry with SEO metadata                                      |
| `app/[locale]/csv-md/csv-md-page.tsx`       | **CREATE** | Main page component with all UI and logic                          |

---

### Task 1: Extract useDropZone to shared hook

**Files:**

- Create: `hooks/useDropZone.ts`
- Modify: `app/[locale]/csv/csv-page.tsx`

**Why first:** Both csv-page.tsx and the new csv-md-page.tsx need this hook. Extract before building the new tool.

- [ ] **Step 1: Create `hooks/useDropZone.ts`**

```typescript
"use client";

import { useRef, useState, type DragEvent } from "react";

export function useDropZone(onFile: (file: File) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const counterRef = useRef(0);

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.dataTransfer.dropEffect = "copy";
  }

  function onDragEnter(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    counterRef.current++;
    if (ev.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    counterRef.current--;
    if (counterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    counterRef.current = 0;
    setIsDragging(false);
    const file = ev.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return { isDragging, onDragOver, onDragEnter, onDragLeave, onDrop };
}
```

- [ ] **Step 2: Update `app/[locale]/csv/csv-page.tsx` to import extracted hook**

Remove the inline `useDropZone` function (lines 44-82) and replace the import:

```typescript
// Remove lines 44-82 (the inline useDropZone function)

// Add import at the top (after line 3):
import { useDropZone } from "../../../hooks/useDropZone";
```

Remove `useState` from the React import if it's no longer needed by the hook code (it IS still needed by the Conversion component, so keep it). Remove the `DragEvent` type import since it's now in the hook file:

```typescript
// Change line 3 from:
import { useEffect, useRef, useState, type DragEvent } from "react";
// To:
import { useEffect, useRef, useState } from "react";
```

- [ ] **Step 3: Verify CSV tool still works**

Run: `npm run build`
Expected: Build succeeds with no errors. The CSV tool page loads and drag-and-drop still functions.

- [ ] **Step 4: Commit**

```bash
git add hooks/useDropZone.ts app/[locale]/csv/csv-page.tsx
git commit -m "refactor: extract useDropZone hook for reuse"
```

---

### Task 2: Add delimiter parameter to csv-parse

**Files:**

- Modify: `libs/csv/csv-parse.ts`
- Modify: `libs/csv/__tests__/csv-parse.test.ts`

- [ ] **Step 1: Write failing test for explicit delimiter**

Add to `libs/csv/__tests__/csv-parse.test.ts`:

```typescript
it("uses explicit delimiter when provided", () => {
  const csv = "name;age\nJohn;30";
  const { data, errors } = csvParse(csv, ";");
  expect(errors).toHaveLength(0);
  expect(data).toEqual([{ name: "John", age: 30 }]);
});

it("ignores explicit delimiter when auto-detect would succeed anyway", () => {
  const csv = "name,age\nJohn,30";
  const { data, errors } = csvParse(csv);
  expect(errors).toHaveLength(0);
  expect(data).toEqual([{ name: "John", age: 30 }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run libs/csv/__tests__/csv-parse.test.ts`
Expected: FAIL — `csvParse` does not accept a second argument.

- [ ] **Step 3: Implement delimiter parameter in `libs/csv/csv-parse.ts`**

```typescript
import Papa from "papaparse";

export interface CsvParseResult {
  data: Record<string, unknown>[];
  errors: string[];
}

/**
 * Parse a CSV string into a JSON object array using papaparse.
 * - First row = column headers (trimmed).
 * - Auto-detects delimiter (comma, tab, semicolon, pipe) unless explicitly provided.
 * - Auto-converts numeric strings and booleans via dynamicTyping.
 * - Strips UTF-8 BOM if present.
 */
export function csvParse(csv: string, delimiter?: string): CsvParseResult {
  const result = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h: string) => h.trim(),
    ...(delimiter ? { delimiter } : {}),
  });

  const errors = result.errors
    .filter((e) => e.code !== "UndetectableDelimiter")
    .map((e) => `Row ${e.row ?? "?"}: ${e.message}`);

  return {
    data: result.data as Record<string, unknown>[],
    errors,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run libs/csv/__tests__/csv-parse.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/csv/csv-parse.ts libs/csv/__tests__/csv-parse.test.ts
git commit -m "feat(csv-parse): add optional delimiter parameter"
```

---

### Task 3: Extend markdownTableStringify with alignment

**Files:**

- Modify: `libs/csv/markdown-table.ts`
- Modify: `libs/csv/__tests__/markdown-table.test.ts`

- [ ] **Step 1: Write failing tests for alignment**

Add to `libs/csv/__tests__/markdown-table.test.ts`:

```typescript
describe("markdownTableStringify with alignment", () => {
  it("applies left alignment to separator", () => {
    const input = [{ name: "John", age: 30 }];
    const result = markdownTableStringify(input, { alignment: ["left", "left"] });
    expect(result).toMatch(/:---/);
  });

  it("applies center alignment to separator", () => {
    const input = [{ name: "John", age: 30 }];
    const result = markdownTableStringify(input, { alignment: ["center", "center"] });
    expect(result).toMatch(/:---:/);
  });

  it("applies right alignment to separator", () => {
    const input = [{ name: "John", age: 30 }];
    const result = markdownTableStringify(input, { alignment: ["right", "right"] });
    expect(result).toMatch(/---:/);
  });

  it("applies none alignment (plain dashes)", () => {
    const input = [{ name: "John", age: 30 }];
    const result = markdownTableStringify(input, { alignment: ["none", "none"] });
    const lines = result.split("\n");
    const separator = lines[1];
    // Should NOT contain colons
    expect(separator).not.toMatch(/:/);
    expect(separator).toMatch(/---/);
  });

  it("supports per-column alignment", () => {
    const input = [{ name: "John", age: 30 }];
    const result = markdownTableStringify(input, { alignment: ["left", "right"] });
    const lines = result.split("\n");
    const separator = lines[1];
    expect(separator).toMatch(/:---.*---:/);
  });

  it("pads separator dashes to match column width", () => {
    const input = [{ name: "John", age: 30 }];
    const result = markdownTableStringify(input, { alignment: ["center", "center"] });
    const lines = result.split("\n");
    // Separator cells should be at least as wide as header cells
    const headerCells = lines[0].split("|").filter((c: string) => c.trim());
    const sepCells = lines[1].split("|").filter((c: string) => c.trim());
    headerCells.forEach((h: string, i: number) => {
      expect(sepCells[i].length).toBeGreaterThanOrEqual(h.trim().length);
    });
  });

  it("preserves backward compatibility when options omitted", () => {
    const input = [{ name: "John", age: 30 }];
    const result = markdownTableStringify(input);
    const lines = result.split("\n");
    // Original behavior: all dashes, no colons
    expect(lines[1]).not.toMatch(/:/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run libs/csv/__tests__/markdown-table.test.ts`
Expected: FAIL — `markdownTableStringify` does not accept a second argument.

- [ ] **Step 3: Implement alignment in `markdownTableStringify`**

Replace the `markdownTableStringify` function in `libs/csv/markdown-table.ts`:

```typescript
export type ColumnAlignment = "left" | "center" | "right" | "none";

export interface MarkdownStringifyOptions {
  alignment?: ColumnAlignment[];
}

/**
 * Convert a JSON object array to a Markdown Table string.
 * Columns are aligned with padding to the widest value.
 */
export function markdownTableStringify(
  data: Record<string, unknown>[],
  options?: MarkdownStringifyOptions
): string {
  if (data.length === 0) return "";

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

  const toStr = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v);
  };

  const headerRow = keys;
  const rows = flat.map((obj) => keys.map((k) => toStr(obj[k])));

  const widths = keys.map((key, i) => {
    const headerLen = key.length;
    const maxDataLen = Math.max(...rows.map((r) => r[i].length), 0);
    return Math.max(headerLen, maxDataLen);
  });

  const alignments = options?.alignment;

  const pad = (value: string, width: number): string => value.padEnd(width, " ");

  function separatorCell(width: number, align?: ColumnAlignment): string {
    const dashes = "-".repeat(width);
    switch (align) {
      case "left":
        return ":" + dashes.slice(1);
      case "center":
        return ":" + dashes.slice(1) + ":";
      case "right":
        return dashes.slice(0, -1) + ":";
      case "none":
      default:
        return dashes;
    }
  }

  const lines: string[] = [];

  lines.push("| " + headerRow.map((h, i) => pad(h, widths[i])).join(" | ") + " |");
  lines.push("| " + widths.map((w, i) => separatorCell(w, alignments?.[i])).join(" | ") + " |");
  for (const row of rows) {
    lines.push("| " + row.map((cell, i) => pad(cell, widths[i])).join(" | ") + " |");
  }

  return lines.join("\n");
}
```

Also add the `ColumnAlignment` type export at the top of the file (near `MarkdownParseResult`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run libs/csv/__tests__/markdown-table.test.ts`
Expected: All tests PASS (both old and new).

- [ ] **Step 5: Commit**

```bash
git add libs/csv/markdown-table.ts libs/csv/__tests__/markdown-table.test.ts
git commit -m "feat(markdown-table): add alignment support to stringify"
```

---

### Task 4: Extend markdownTableParse to return alignments

**Files:**

- Modify: `libs/csv/markdown-table.ts`
- Modify: `libs/csv/__tests__/markdown-table.test.ts`

- [ ] **Step 1: Write failing tests for alignment extraction**

Add to `libs/csv/__tests__/markdown-table.test.ts`:

```typescript
describe("markdownTableParse alignment extraction", () => {
  it("extracts left alignment", () => {
    const md = `| name | age |\n| :--- | --- |\n| John | 30 |`;
    const result = markdownTableParse(md);
    expect(result.alignments).toEqual(["left", "none"]);
  });

  it("extracts center alignment", () => {
    const md = `| name | age |\n| :---: | :---: |\n| John | 30 |`;
    const result = markdownTableParse(md);
    expect(result.alignments).toEqual(["center", "center"]);
  });

  it("extracts right alignment", () => {
    const md = `| name | age |\n| ---: | ---: |\n| John | 30 |`;
    const result = markdownTableParse(md);
    expect(result.alignments).toEqual(["right", "right"]);
  });

  it("returns none for plain dashes", () => {
    const md = `| name | age |\n| --- | --- |\n| John | 30 |`;
    const result = markdownTableParse(md);
    expect(result.alignments).toEqual(["none", "none"]);
  });

  it("returns undefined alignments when no separator found", () => {
    const md = `| name | age |\n| John | 30 |`;
    const result = markdownTableParse(md);
    expect(result.alignments).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run libs/csv/__tests__/markdown-table.test.ts`
Expected: FAIL — `result.alignments` is undefined (not yet returned).

- [ ] **Step 3: Implement alignment extraction in `markdownTableParse`**

Update `MarkdownParseResult` interface to include alignments:

```typescript
export interface MarkdownParseResult {
  data: Record<string, unknown>[];
  errors: string[];
  alignments?: ColumnAlignment[];
}
```

Add a helper function to detect alignment from a separator cell:

```typescript
function detectAlignment(cell: string): ColumnAlignment {
  const trimmed = cell.trim();
  const hasLeftColon = trimmed.startsWith(":");
  const hasRightColon = trimmed.endsWith(":");
  if (hasLeftColon && hasRightColon) return "center";
  if (hasRightColon) return "right";
  if (hasLeftColon) return "left";
  return "none";
}
```

Modify `markdownTableParse` to extract and return alignments. In the main loop, when a separator line is detected, parse its cells for alignment:

```typescript
export function markdownTableParse(input: string): MarkdownParseResult {
  if (!input.trim()) return { data: [], errors: [] };

  const lines = input.split("\n");
  const tableLines = lines.filter((l) => l.includes("|"));

  if (tableLines.length === 0) {
    return { data: [], errors: ["Cannot detect Markdown table format"] };
  }

  let headerLine: string | null = null;
  let separatorLine: string | null = null;
  const dataLines: string[] = [];
  let headerFound = false;

  for (const line of tableLines) {
    if (!headerFound) {
      if (SEPARATOR_RE.test(line)) {
        if (!separatorLine) separatorLine = line;
        continue;
      }
      headerLine = line;
      headerFound = true;
    } else {
      if (SEPARATOR_RE.test(line)) continue;
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

  // Extract alignment from separator line
  let alignments: ColumnAlignment[] | undefined;
  if (separatorLine) {
    const sepCells = parseLine(separatorLine);
    alignments = sepCells.map((cell) => detectAlignment(cell));
  }

  return { data, errors: [], alignments };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run libs/csv/__tests__/markdown-table.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/csv/markdown-table.ts libs/csv/__tests__/markdown-table.test.ts
git commit -m "feat(markdown-table): extract alignment info from parse"
```

---

### Task 5: Create csv-md-convert orchestrator

**Files:**

- Create: `libs/csv/csv-md-convert.ts`
- Create: `libs/csv/__tests__/csv-md-convert.test.ts`

- [ ] **Step 1: Write failing tests**

Create `libs/csv/__tests__/csv-md-convert.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { csvMdConvert } from "../csv-md-convert";

describe("csvMdConvert", () => {
  describe("CSV → Markdown Table", () => {
    it("converts simple CSV to Markdown table", () => {
      const csv = "name,age\nJohn,30\nAlice,25";
      const result = csvMdConvert(csv, "csv", "markdown");
      expect(result.error).toBeUndefined();
      expect(result.output).toContain("| name");
      expect(result.output).toContain("| John");
      expect(result.output).toContain("| Alice");
    });

    it("respects delimiter option", () => {
      const csv = "name;age\nJohn;30";
      const result = csvMdConvert(csv, "csv", "markdown", { delimiter: ";" });
      expect(result.error).toBeUndefined();
      expect(result.output).toContain("| name");
      expect(result.output).toContain("| John");
    });

    it("applies alignment option", () => {
      const csv = "name,age\nJohn,30";
      const result = csvMdConvert(csv, "csv", "markdown", { alignment: "center" });
      expect(result.error).toBeUndefined();
      expect(result.output).toMatch(/:---:/);
    });

    it("returns empty output for empty input", () => {
      const result = csvMdConvert("", "csv", "markdown");
      expect(result.output).toBe("");
      expect(result.error).toBeUndefined();
    });

    it("returns error for invalid CSV", () => {
      const csv = 'name\n"unclosed quote';
      const result = csvMdConvert(csv, "csv", "markdown");
      expect(result.error).toBeDefined();
    });
  });

  describe("Markdown Table → CSV", () => {
    it("converts simple Markdown table to CSV", () => {
      const md = "| name | age |\n| --- | --- |\n| John | 30 |";
      const result = csvMdConvert(md, "markdown", "csv");
      expect(result.error).toBeUndefined();
      expect(result.output).toContain("name");
      expect(result.output).toContain("John");
    });

    it("respects delimiter option for CSV output", () => {
      const md = "| name | age |\n| --- | --- |\n| John | 30 |";
      const result = csvMdConvert(md, "markdown", "csv", { delimiter: ";" });
      expect(result.error).toBeUndefined();
      expect(result.output).toContain(";");
    });

    it("returns error for invalid Markdown table", () => {
      const result = csvMdConvert("not a table", "markdown", "csv");
      expect(result.error).toBeDefined();
    });
  });

  describe("Round-trip", () => {
    it("CSV → MD → CSV preserves data", () => {
      const csv = "name,age\nJohn,30\nAlice,25";
      const mdResult = csvMdConvert(csv, "csv", "markdown");
      expect(mdResult.error).toBeUndefined();
      const csvResult = csvMdConvert(mdResult.output, "markdown", "csv");
      expect(csvResult.error).toBeUndefined();
      // The round-trip CSV should contain the same data
      expect(csvResult.output).toContain("name");
      expect(csvResult.output).toContain("John");
      expect(csvResult.output).toContain("Alice");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run libs/csv/__tests__/csv-md-convert.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `libs/csv/csv-md-convert.ts`**

```typescript
import { csvParse } from "./csv-parse";
import { csvStringify } from "./csv-stringify";
import { markdownTableParse, markdownTableStringify, type ColumnAlignment } from "./markdown-table";

export type { ColumnAlignment };

export type CsvMdFormat = "csv" | "markdown";

export interface CsvMdConvertOptions {
  delimiter?: string;
  alignment?: ColumnAlignment;
}

export interface CsvMdConvertResult {
  output: string;
  error?: string;
}

export function csvMdConvert(
  input: string,
  from: CsvMdFormat,
  to: CsvMdFormat,
  options?: CsvMdConvertOptions
): CsvMdConvertResult {
  if (!input.trim()) return { output: "" };

  const delimiter = options?.delimiter;
  const alignment = options?.alignment;

  if (from === "csv" && to === "markdown") {
    const parsed = csvParse(input, delimiter);
    if (parsed.errors.length > 0) {
      return { output: "", error: parsed.errors.join("; ") };
    }
    if (parsed.data.length === 0) {
      return { output: "" };
    }
    const colCount = Object.keys(parsed.data[0]).length;
    const alignArray = alignment
      ? (Array(colCount).fill(alignment) as ColumnAlignment[])
      : undefined;
    const output = markdownTableStringify(
      parsed.data,
      alignArray ? { alignment: alignArray } : undefined
    );
    return { output };
  }

  if (from === "markdown" && to === "csv") {
    const parsed = markdownTableParse(input);
    if (parsed.errors.length > 0) {
      return { output: "", error: parsed.errors.join("; ") };
    }
    if (parsed.data.length === 0) {
      return { output: "" };
    }
    const output = csvStringify(parsed.data, delimiter);
    return { output };
  }

  return { output: "", error: "Unsupported conversion direction" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run libs/csv/__tests__/csv-md-convert.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/csv/csv-md-convert.ts libs/csv/__tests__/csv-md-convert.test.ts
git commit -m "feat(csv): add CSV ↔ Markdown Table conversion orchestrator"
```

---

### Task 6: Tool registration and i18n

**Files:**

- Modify: `libs/tools.ts`
- Modify: `public/locales/en/tools.json`
- Modify: `public/locales/zh-CN/tools.json`
- Modify: `public/locales/zh-TW/tools.json`
- Create: `public/locales/en/csv-md.json`
- Create: `public/locales/zh-CN/csv-md.json`
- Create: `public/locales/zh-TW/csv-md.json`

- [ ] **Step 1: Register tool in `libs/tools.ts`**

Add `Table` to the lucide-react import (or reuse `FileSpreadsheet`):

```typescript
import {
  // ... existing imports ...
  FileSpreadsheet,
  Table, // NEW
  ImageDown,
} from "lucide-react";
```

Add entry in `TOOLS` array, **before the CSV entry** for logical grouping:

```typescript
{ key: "csv-md", path: "/csv-md", icon: Table },
```

- [ ] **Step 2: Add entry to `public/locales/en/tools.json`**

Add the `"csv-md"` key (place it before `"csv"` for grouping):

```json
"csv-md": {
  "title": "CSV ↔ Markdown Table Converter",
  "shortTitle": "CSV / Markdown Table",
  "description": "Convert between CSV and Markdown Table formats. Bidirectional, real-time, 100% client-side."
}
```

- [ ] **Step 3: Add entry to `public/locales/zh-CN/tools.json`**

```json
"csv-md": {
  "title": "CSV ↔ Markdown 表格转换器",
  "shortTitle": "CSV / Markdown 表格",
  "description": "在 CSV 和 Markdown 表格格式之间双向转换。实时转换，100% 浏览器端处理。",
  "searchTerms": "csvzhuanmarkdown csvzmd markdownbiaoge biaogezhuanhuan"
}
```

- [ ] **Step 4: Add entry to `public/locales/zh-TW/tools.json`**

```json
"csv-md": {
  "title": "CSV ↔ Markdown 表格轉換器",
  "shortTitle": "CSV / Markdown 表格",
  "description": "在 CSV 和 Markdown 表格格式之間雙向轉換。即時轉換，100% 瀏覽器端處理。",
  "searchTerms": "csvzhuanmarkdown csvzmd markdownbiaoge biaogezhuanhuan"
}
```

- [ ] **Step 5: Create `public/locales/en/csv-md.json`**

```json
{
  "csvPlaceholder": "Paste or type CSV here...",
  "mdPlaceholder": "Paste or type Markdown table here...",
  "loadFile": "Load",
  "download": "Download",
  "csvToMd": "CSV → MD",
  "mdToCsv": "MD → CSV",
  "dropZoneCsv": "Drop .csv, .tsv, or .txt file",
  "dropZoneMd": "Drop .md or .txt file",
  "convertedToMd": "Converted to Markdown",
  "convertedToCsv": "Converted to CSV",
  "invalidInput": "Invalid input",
  "preview": "CSV Preview",
  "showingRows": "Showing {shown} of {total} rows",
  "rows": "{count} rows",
  "noData": "No data",
  "advancedSettings": "Advanced Settings",
  "delimiter": "Delimiter",
  "delimiterComma": "Comma",
  "delimiterTab": "Tab",
  "delimiterSemicolon": "Semicolon",
  "delimiterPipe": "Pipe",
  "alignment": "Alignment",
  "alignmentLeft": "Left",
  "alignmentCenter": "Center",
  "alignmentRight": "Right",
  "alignmentNone": "None",
  "edit": "Edit",
  "previewMode": "Preview",
  "emptyPreview": "Markdown preview will appear here",
  "descriptions": {
    "whatIsTitle": "CSV ↔ Markdown Table",
    "whatIsP1": "Convert between CSV (Comma-Separated Values) and Markdown Table formats. CSV is the standard for spreadsheet data exchange, while Markdown tables are commonly used in documentation, README files, and GitHub issues.",
    "useCasesTitle": "Use Cases",
    "useCasesP1": "Converting spreadsheet data to Markdown for documentation, pasting API response CSV into GitHub issues, generating Markdown tables from CSV exports, and converting Markdown tables back to CSV for spreadsheet analysis.",
    "limitationsTitle": "Limitations",
    "limitationsP1": "Complex Markdown formatting (links, images, inline code) in table cells is preserved as raw text. Multi-line cells are not supported. The tool handles flat tabular data only."
  }
}
```

- [ ] **Step 6: Create `public/locales/zh-CN/csv-md.json`**

```json
{
  "csvPlaceholder": "在此粘贴或输入 CSV...",
  "mdPlaceholder": "在此粘贴或输入 Markdown 表格...",
  "loadFile": "加载",
  "download": "下载",
  "csvToMd": "CSV → MD",
  "mdToCsv": "MD → CSV",
  "dropZoneCsv": "拖放 .csv、.tsv 或 .txt 文件",
  "dropZoneMd": "拖放 .md 或 .txt 文件",
  "convertedToMd": "已转换为 Markdown",
  "convertedToCsv": "已转换为 CSV",
  "invalidInput": "输入无效",
  "preview": "CSV 预览",
  "showingRows": "显示前 {shown} / 共 {total} 行",
  "rows": "{count} 行",
  "noData": "无数据",
  "advancedSettings": "高级设置",
  "delimiter": "分隔符",
  "delimiterComma": "逗号",
  "delimiterTab": "制表符",
  "delimiterSemicolon": "分号",
  "delimiterPipe": "竖线",
  "alignment": "对齐方式",
  "alignmentLeft": "左对齐",
  "alignmentCenter": "居中",
  "alignmentRight": "右对齐",
  "alignmentNone": "无",
  "edit": "编辑",
  "previewMode": "预览",
  "emptyPreview": "Markdown 预览将显示在这里",
  "descriptions": {
    "whatIsTitle": "CSV ↔ Markdown 表格",
    "whatIsP1": "在 CSV（逗号分隔值）和 Markdown 表格格式之间转换。CSV 是电子表格数据交换的标准格式，而 Markdown 表格常用于文档、README 文件和 GitHub issues。",
    "useCasesTitle": "使用场景",
    "useCasesP1": "将电子表格数据转换为 Markdown 用于文档编写，将 CSV 数据粘贴到 GitHub issues 中，从 CSV 导出生成 Markdown 表格，以及将 Markdown 表格转回 CSV 进行分析。",
    "limitationsTitle": "限制",
    "limitationsP1": "表格单元格中的复杂 Markdown 格式（链接、图片、行内代码）会保留为原始文本。不支持多行单元格。仅支持扁平表格数据。"
  }
}
```

- [ ] **Step 7: Create `public/locales/zh-TW/csv-md.json`**

```json
{
  "csvPlaceholder": "在此貼上或輸入 CSV...",
  "mdPlaceholder": "在此貼上或輸入 Markdown 表格...",
  "loadFile": "載入",
  "download": "下載",
  "csvToMd": "CSV → MD",
  "mdToCsv": "MD → CSV",
  "dropZoneCsv": "拖放 .csv、.tsv 或 .txt 檔案",
  "dropZoneMd": "拖放 .md 或 .txt 檔案",
  "convertedToMd": "已轉換為 Markdown",
  "convertedToCsv": "已轉換為 CSV",
  "invalidInput": "輸入無效",
  "preview": "CSV 預覽",
  "showingRows": "顯示前 {shown} / 共 {total} 行",
  "rows": "{count} 行",
  "noData": "無資料",
  "advancedSettings": "進階設定",
  "delimiter": "分隔符號",
  "delimiterComma": "逗號",
  "delimiterTab": "製表符",
  "delimiterSemicolon": "分號",
  "delimiterPipe": "豎線",
  "alignment": "對齊方式",
  "alignmentLeft": "靠左",
  "alignmentCenter": "置中",
  "alignmentRight": "靠右",
  "alignmentNone": "無",
  "edit": "編輯",
  "previewMode": "預覽",
  "emptyPreview": "Markdown 預覽將顯示在這裡",
  "descriptions": {
    "whatIsTitle": "CSV ↔ Markdown 表格",
    "whatIsP1": "在 CSV（逗號分隔值）和 Markdown 表格格式之間轉換。CSV 是電子表格資料交換的標準格式，而 Markdown 表格常用於文件、README 檔案和 GitHub issues。",
    "useCasesTitle": "使用場景",
    "useCasesP1": "將電子表格資料轉換為 Markdown 用於文件撰寫，將 CSV 資料貼到 GitHub issues 中，從 CSV 匯出生成 Markdown 表格，以及將 Markdown 表格轉回 CSV 進行分析。",
    "limitationsTitle": "限制",
    "limitationsP1": "表格儲存格中的複雜 Markdown 格式（連結、圖片、行內程式碼）會保留為原始文字。不支援多行儲存格。僅支援扁平表格資料。"
  }
}
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: Build succeeds. No missing translation errors.

- [ ] **Step 9: Commit**

```bash
git add libs/tools.ts public/locales/en/csv-md.json public/locales/zh-CN/csv-md.json public/locales/zh-TW/csv-md.json public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
git commit -m "feat(csv-md): register tool and add i18n translations"
```

---

### Task 7: Create route entry

**Files:**

- Create: `app/[locale]/csv-md/page.tsx`

- [ ] **Step 1: Create `app/[locale]/csv-md/page.tsx`**

```typescript
import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import CsvMdPage from "./csv-md-page";

const PATH = "/csv-md";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("csv-md.title"),
    description: t("csv-md.description"),
  });
}

export default function CsvMdRoute() {
  return <CsvMdPage />;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/csv-md/page.tsx
git commit -m "feat(csv-md): add route entry with SEO metadata"
```

---

### Task 8: Create CSV-MD page component

**Files:**

- Create: `app/[locale]/csv-md/csv-md-page.tsx`

This is the main UI component. It follows csv-page.tsx patterns closely. Read `app/[locale]/csv/csv-page.tsx` as the primary reference for all styling, layout, and interaction patterns.

- [ ] **Step 1: Create `app/[locale]/csv-md/csv-md-page.tsx`**

The component follows the exact same patterns as csv-page.tsx (dual-panel layout, drop zones, file upload/download, error display, advanced settings, CsvPreview). Key differences:

- Two panels: CSV (left, cyan) and Markdown (right, purple)
- Markdown side has edit/preview toggle
- No JSON side, no indent/nested-json settings
- Added alignment setting
- Conversion via `csvMdConvert()` orchestrator

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FolderOpen,
  Table2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledTextarea } from "../../../components/ui/input";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { useDropZone } from "../../../hooks/useDropZone";
import { csvMdConvert, type ColumnAlignment } from "../../../libs/csv/csv-md-convert";
import { csvParse } from "../../../libs/csv/csv-parse";
import { renderMarkdown } from "../../../libs/markdown/render";

// --- Types ---

type ParseError = { message: string };

type Delimiter = "," | "\t" | ";" | "|";

const DELIMITERS: { value: Delimiter; labelKey: string }[] = [
  { value: ",", labelKey: "delimiterComma" },
  { value: "\t", labelKey: "delimiterTab" },
  { value: ";", labelKey: "delimiterSemicolon" },
  { value: "|", labelKey: "delimiterPipe" },
];

const ALIGNMENTS: { value: ColumnAlignment; labelKey: string }[] = [
  { value: "left", labelKey: "alignmentLeft" },
  { value: "center", labelKey: "alignmentCenter" },
  { value: "right", labelKey: "alignmentRight" },
  { value: "none", labelKey: "alignmentNone" },
];

// --- CsvPreview Component (same pattern as csv-page.tsx) ---

interface CsvPreviewProps {
  csvContent: string;
  csvError: ParseError | null;
}

function CsvPreview({ csvContent, csvError }: CsvPreviewProps) {
  const t = useTranslations("csv-md");
  const [isExpanded, setIsExpanded] = useState(false);
  const prevEmptyRef = useRef(true);

  useEffect(() => {
    const isEmpty = !csvContent.trim() || !!csvError;
    if (prevEmptyRef.current && !isEmpty) {
      setIsExpanded(true);
    }
    prevEmptyRef.current = isEmpty;
  }, [csvContent, csvError]);

  if (!csvContent.trim() || csvError) return null;

  const result = csvParse(csvContent);
  if (result.errors.length > 0 || result.data.length === 0) return null;

  const headers = Object.keys(result.data[0]);
  if (headers.length === 0) return null;

  const totalRows = result.data.length;
  const MAX_ROWS = 100;
  const displayData = result.data.slice(0, MAX_ROWS);
  const isTruncated = totalRows > MAX_ROWS;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left py-2 cursor-pointer group"
      >
        <Table2 size={14} className="text-fg-secondary" />
        <span className="text-sm font-semibold text-fg-secondary group-hover:text-fg-primary transition-colors">
          {t("preview")}
        </span>
        <span className="text-xs text-fg-muted font-mono">
          ({totalRows.toLocaleString()} {t("rows", { count: totalRows })})
        </span>
        <ChevronDown
          size={14}
          className={`text-fg-muted ml-auto transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`transition-all duration-200 ${isExpanded ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
      >
        <div className="overflow-auto max-h-[50vh] rounded-lg border border-border-default">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-elevated sticky top-0 z-10">
                {headers.map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2 text-left font-semibold text-fg-secondary border-b border-border-default whitespace-nowrap text-xs uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-border-default hover:bg-bg-input/50 transition-colors ${i % 2 === 1 ? "bg-bg-input/30" : ""}`}
                >
                  {headers.map((header) => (
                    <td
                      key={header}
                      className="px-3 py-2 font-mono text-sm max-w-[300px] truncate"
                      title={row[header] == null ? "" : String(row[header])}
                    >
                      {row[header] == null ? "" : String(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-fg-muted text-xs py-2 px-1">
          {isTruncated
            ? t("showingRows", { shown: MAX_ROWS, total: totalRows })
            : `${totalRows.toLocaleString()} ${t("rows", { count: totalRows })}`}
        </div>
      </div>
    </div>
  );
}

// --- Helper: file download ---

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Conversion Component ---

function Conversion() {
  const t = useTranslations("csv-md");
  const tc = useTranslations("common");
  const ts = useTranslations("site");

  const [csvContent, setCsvContent] = useState("");
  const [mdContent, setMdContent] = useState("");
  const [csvError, setCsvError] = useState<ParseError | null>(null);
  const [mdError, setMdError] = useState<ParseError | null>(null);
  const [delimiter, setDelimiter] = useState<Delimiter>(",");
  const [alignment, setAlignment] = useState<ColumnAlignment>("left");
  const [mdPreviewMode, setMdPreviewMode] = useState<"edit" | "preview">("edit");

  const csvFileRef = useRef<HTMLInputElement>(null);
  const mdFileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Derived state
  const isDisabledCsvToMd = !csvContent.trim();
  const isDisabledMdToCsv = !mdContent.trim();
  const isDisabledClear = !csvContent.trim() && !mdContent.trim();

  // --- Drop Zones ---

  const csvDrop = useDropZone(async (file) => {
    const text = await file.text();
    setCsvContent(text);
    setCsvError(null);
  });

  const mdDrop = useDropZone(async (file) => {
    const text = await file.text();
    setMdContent(text);
    setMdError(null);
  });

  // --- Validation: 500ms debounce ---

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!csvContent.trim()) {
        setCsvError(null);
        return;
      }
      const result = csvMdConvert(csvContent, "csv", "markdown", { delimiter });
      if (result.error) {
        setCsvError({ message: result.error });
      } else {
        setCsvError(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [csvContent, delimiter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mdContent.trim()) {
        setMdError(null);
        return;
      }
      const result = csvMdConvert(mdContent, "markdown", "csv");
      if (result.error) {
        setMdError({ message: result.error });
      } else {
        setMdError(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [mdContent]);

  // --- Conversion Functions ---

  function doCsvToMd() {
    const input = csvContent.trim();
    if (!input) return;
    const result = csvMdConvert(input, "csv", "markdown", { delimiter, alignment });
    if (result.error) {
      setCsvError({ message: result.error });
      return;
    }
    setMdContent(result.output);
    setMdError(null);
  }

  function doMdToCsv() {
    const input = mdContent.trim();
    if (!input) return;
    const result = csvMdConvert(input, "markdown", "csv", { delimiter });
    if (result.error) {
      setMdError({ message: result.error });
      return;
    }
    setCsvContent(result.output);
    setCsvError(null);
  }

  function doClearAll() {
    setCsvContent("");
    setMdContent("");
    setCsvError(null);
    setMdError(null);
  }

  // --- File Load ---

  async function handleCsvFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvContent(text);
    setCsvError(null);
    e.target.value = "";
  }

  async function handleMdFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMdContent(text);
    setMdError(null);
    e.target.value = "";
  }

  // --- Markdown Preview ---

  const mdHtml = mdContent.trim() ? renderMarkdown(mdContent) : "";

  // --- Input Areas ---

  const csvInputArea = (
    <div className="relative" {...csvDrop}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
          <span className="font-mono text-sm font-semibold text-accent-cyan">CSV</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => csvFileRef.current?.click()}
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors inline-flex items-center gap-1"
          >
            <FolderOpen size={12} /> {t("loadFile")}
          </button>
          {csvContent.trim() && (
            <>
              <button
                type="button"
                onClick={() => downloadFile(csvContent, "data.csv")}
                className="text-fg-secondary text-xs hover:text-fg-primary transition-colors inline-flex items-center gap-1"
              >
                <Download size={12} /> {t("download")}
              </button>
              <button
                type="button"
                onClick={() => { setCsvContent(""); setCsvError(null); }}
                className="text-danger/70 text-xs hover:text-danger transition-colors inline-flex items-center gap-1"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="relative">
        <StyledTextarea
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder={t("csvPlaceholder")}
          className="font-mono text-sm"
          rows={isMobile ? 10 : undefined}
          style={!isMobile ? { height: "50vh" } : undefined}
        />
        <div className="absolute end-2 top-2">
          <CopyButton getContent={() => csvContent} />
        </div>
      </div>
      <input
        ref={csvFileRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={handleCsvFileLoad}
      />
      {csvError && (
        <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
          ⚠ {csvError.message}
        </div>
      )}
      {csvDrop.isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-cyan bg-accent-cyan/5 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Upload size={40} className="mx-auto mb-3 text-accent-cyan" />
            <p className="text-lg font-semibold text-accent-cyan">{tc("dropActive")}</p>
            <p className="text-sm text-fg-muted mt-1">{t("dropZoneCsv")}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Markdown edit/preview toggle
  const mdToggle = (
    <div className="absolute top-3 right-3 z-10 inline-flex border border-border-default rounded-lg overflow-hidden bg-bg-surface/90 shadow-sm">
      <button
        type="button"
        onClick={() => setMdPreviewMode("edit")}
        className={`px-2 py-1 text-xs transition-colors ${mdPreviewMode === "edit" ? "bg-accent-purple text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
      >
        {t("edit")}
      </button>
      <button
        type="button"
        onClick={() => setMdPreviewMode("preview")}
        className={`px-2 py-1 text-xs transition-colors ${mdPreviewMode === "preview" ? "bg-accent-purple text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
      >
        {t("previewMode")}
      </button>
    </div>
  );

  const mdInputArea = (
    <div className="relative" {...mdDrop}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-purple/60" />
          <span className="font-mono text-sm font-semibold text-accent-purple">Markdown</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => mdFileRef.current?.click()}
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors inline-flex items-center gap-1"
          >
            <FolderOpen size={12} /> {t("loadFile")}
          </button>
          {mdContent.trim() && (
            <>
              <button
                type="button"
                onClick={() => downloadFile(mdContent, "table.md")}
                className="text-fg-secondary text-xs hover:text-fg-primary transition-colors inline-flex items-center gap-1"
              >
                <Download size={12} /> {t("download")}
              </button>
              <button
                type="button"
                onClick={() => { setMdContent(""); setMdError(null); }}
                className="text-danger/70 text-xs hover:text-danger transition-colors inline-flex items-center gap-1"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="relative">
        {mdPreviewMode === "edit" ? (
          <div className="relative">
            <StyledTextarea
              value={mdContent}
              onChange={(e) => setMdContent(e.target.value)}
              placeholder={t("mdPlaceholder")}
              className="font-mono text-sm"
              rows={isMobile ? 10 : undefined}
              style={!isMobile ? { height: "50vh" } : undefined}
            />
            <div className="absolute end-2 top-2">
              <CopyButton getContent={() => mdContent} />
            </div>
          </div>
        ) : (
          <div
            className="prose-md min-h-[50vh] bg-bg-input border border-border-default rounded-lg p-4 overflow-auto"
            style={!isMobile ? { height: "50vh" } : undefined}
          >
            {mdHtml ? (
              <div dangerouslySetInnerHTML={{ __html: mdHtml }} />
            ) : (
              <p className="text-fg-muted text-center mt-20">{t("emptyPreview")}</p>
            )}
          </div>
        )}
        {mdToggle}
      </div>
      <input
        ref={mdFileRef}
        type="file"
        accept=".md,.txt"
        className="hidden"
        onChange={handleMdFileLoad}
      />
      {mdError && (
        <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
          ⚠ {mdError.message}
        </div>
      )}
      {mdDrop.isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-purple bg-accent-purple/5 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Upload size={40} className="mx-auto mb-3 text-accent-purple" />
            <p className="text-lg font-semibold text-accent-purple">{tc("dropActive")}</p>
            <p className="text-sm text-fg-muted mt-1">{t("dropZoneMd")}</p>
          </div>
        </div>
      )}
    </div>
  );

  // --- Action Buttons ---

  const actionButtons = (
    <div className="flex flex-col gap-3 items-center justify-center">
      <Button
        variant="primary"
        disabled={isDisabledCsvToMd}
        onClick={doCsvToMd}
        className="rounded-full font-bold w-full"
      >
        {t("csvToMd")}
      </Button>
      <Button
        variant="secondary"
        disabled={isDisabledMdToCsv}
        onClick={doMdToCsv}
        className="rounded-full font-bold w-full"
      >
        {t("mdToCsv")}
      </Button>
      <Button
        variant="danger"
        disabled={isDisabledClear}
        onClick={doClearAll}
        className="rounded-full font-bold w-full"
      >
        {tc("clearAll")} <X size={16} className="ms-1" />
      </Button>
    </div>
  );

  const actionButtonsRow = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
      <Button variant="primary" disabled={isDisabledCsvToMd} onClick={doCsvToMd} className="rounded-full font-bold">
        {t("csvToMd")}
      </Button>
      <Button variant="secondary" disabled={isDisabledMdToCsv} onClick={doMdToCsv} className="rounded-full font-bold">
        {t("mdToCsv")}
      </Button>
      <Button variant="danger" disabled={isDisabledClear} onClick={doClearAll} className="rounded-full font-bold">
        {tc("clearAll")} <X size={16} className="ms-1" />
      </Button>
    </div>
  );

  return (
    <>
      {/* Privacy Banner */}
      <div className="border-l-4 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg px-4 py-2 mb-4">
        <p className="text-sm text-fg-secondary">{ts("privacyNote")}</p>
      </div>

      {/* Dual Panel */}
      {isMobile ? (
        <div className="flex flex-col gap-4">
          {csvInputArea}
          {actionButtonsRow}
          {mdInputArea}
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
          {csvInputArea}
          {actionButtons}
          {mdInputArea}
        </div>
      )}

      {/* Advanced Settings */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-4 rounded-full bg-accent-purple" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            {t("advancedSettings")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6 px-3">
          {/* Delimiter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-fg-secondary">{t("delimiter")}</span>
            <div role="radiogroup" className="inline-flex rounded-full border border-border-default p-0.5 text-xs font-mono font-semibold">
              {DELIMITERS.map((d) => (
                <button
                  key={d.value}
                  role="radio"
                  aria-checked={delimiter === d.value}
                  onClick={() => setDelimiter(d.value)}
                  className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                    delimiter === d.value
                      ? "bg-accent-cyan text-bg-base shadow-glow"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                >
                  {t(d.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-fg-secondary">{t("alignment")}</span>
            <div role="radiogroup" className="inline-flex rounded-full border border-border-default p-0.5 text-xs font-mono font-semibold">
              {ALIGNMENTS.map((a) => (
                <button
                  key={a.value}
                  role="radio"
                  aria-checked={alignment === a.value}
                  onClick={() => setAlignment(a.value)}
                  className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                    alignment === a.value
                      ? "bg-accent-cyan text-bg-base shadow-glow"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                >
                  {t(a.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CsvPreview */}
      <CsvPreview csvContent={csvContent} csvError={csvError} />
    </>
  );
}

// --- Description Component ---

function Description() {
  const t = useTranslations("csv-md");

  return (
    <div className="mt-8 space-y-4 text-fg-secondary text-sm">
      <h3 className="text-fg-primary font-semibold text-base">{t("descriptions.whatIsTitle")}</h3>
      <p>{t("descriptions.whatIsP1")}</p>

      <h3 className="text-fg-primary font-semibold text-base">{t("descriptions.useCasesTitle")}</h3>
      <p>{t("descriptions.useCasesP1")}</p>

      <h3 className="text-fg-primary font-semibold text-base">{t("descriptions.limitationsTitle")}</h3>
      <p>{t("descriptions.limitationsP1")}</p>
    </div>
  );
}

// --- Main Page Component ---

export default function CsvMdPage() {
  const t = useTranslations("tools");

  return (
    <Layout title={t("csv-md.shortTitle")}>
      <Conversion />
      <Description />
    </Layout>
  );
}
```

- [ ] **Step 2: Run LSP diagnostics**

Run: Check for TypeScript errors in `app/[locale]/csv-md/csv-md-page.tsx`
Expected: No errors. All imports resolve. All translation keys match locale files.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds. The `/csv-md` route is generated.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Open: `http://localhost:3000/csv-md`
Verify:

- Page loads with dual-panel layout
- CSV → MD button converts CSV text to Markdown table
- MD → CSV button converts Markdown table to CSV
- Edit/Preview toggle on Markdown side works
- CsvPreview shows when CSV content exists
- Advanced settings (delimiter, alignment) work
- File drag-and-drop works on both sides
- CopyButton works on both sides
- File download works (data.csv / table.md)
- Clear All resets both sides

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/csv-md/csv-md-page.tsx
git commit -m "feat(csv-md): add main page component with dual-panel UI"
```

---

### Task 9: Run all tests and final build

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (including new csv-md-convert tests, csv-parse tests, markdown-table tests).

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors. All routes compile correctly.

- [ ] **Step 3: Verify i18n for all locales**

Open each locale URL and verify translations load:

- `http://localhost:3000/csv-md` (English)
- `http://localhost:3000/zh-CN/csv-md` (Simplified Chinese)
- `http://localhost:3000/zh-TW/csv-md` (Traditional Chinese)

Expected: All three locales display correctly with no missing translation keys.
