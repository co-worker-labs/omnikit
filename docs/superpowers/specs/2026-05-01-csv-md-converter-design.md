# CSV ↔ Markdown Table Converter — Design Spec

## Overview

Add a standalone bidirectional converter tool at route `/csv-md`. Users convert between CSV and Markdown Table formats via explicit button clicks. The Markdown Table side includes an edit/preview toggle (referencing the Markdown Editor pattern). All processing is client-side.

## Scope

- **In scope**: CSV → Markdown Table, Markdown Table → CSV bidirectional conversion; CSV delimiter selection (comma, tab, semicolon, pipe); Markdown column alignment; Markdown preview rendering; drag-and-drop file upload on both panels; file download; collapsible CSV table preview; Privacy Alert Banner
- **Out of scope**: JSON conversion (handled by existing `/csv` tool); export to PDF/PNG; conversion history persistence; nested JSON flattening. Note: TSV is not listed as a separate format, but Tab-delimited input is supported via the delimiter option.

## Technical Decisions

### Reuse existing libraries

All core logic already exists in `libs/csv/`:

| Module               | Function                      | Status                                         |
| -------------------- | ----------------------------- | ---------------------------------------------- |
| `csv-parse.ts`       | CSV → JSON via papaparse      | **Modify**: add optional `delimiter` parameter |
| `csv-stringify.ts`   | JSON → CSV                    | Existing, reuse                                |
| `markdown-table.ts`  | Markdown Table ↔ JSON         | **Modify**: extend with alignment support      |
| `markdown/render.ts` | Markdown → HTML (markdown-it) | Existing, reuse for preview                    |

No new npm dependencies needed.

### Extract shared hook: `hooks/useDropZone.ts`

The `useDropZone` hook is currently inline in `csv-page.tsx` (lines 44-82). Extract it to `hooks/useDropZone.ts` so both `csv-page.tsx` and `csv-md-page.tsx` can import it. This is a backward-compatible refactor — `csv-page.tsx` will import the extracted hook instead of defining it inline.

```typescript
// hooks/useDropZone.ts
function useDropZone(onFile: (file: File) => void): {
  isDragging: boolean;
  onDragOver: ReactDragEventHandler;
  onDragEnter: ReactDragEventHandler;
  onDragLeave: ReactDragEventHandler;
  onDrop: ReactDragEventHandler;
};
```

### New conversion orchestrator: `libs/csv/csv-md-convert.ts`

A thin wrapper that calls the existing parse/stringify functions. Does NOT modify `convert.ts` (which handles JSON ↔ CSV only).

```typescript
type CsvMdFormat = "csv" | "markdown";

type ColumnAlignment = "left" | "center" | "right" | "none";

interface CsvMdConvertOptions {
  delimiter?: string; // CSV delimiter (default: ",")
  alignment?: ColumnAlignment; // Global alignment applied to all columns
}

interface CsvMdConvertResult {
  output: string;
  error?: string;
}

function csvMdConvert(
  input: string,
  from: CsvMdFormat,
  to: CsvMdFormat,
  options?: CsvMdConvertOptions
): CsvMdConvertResult;
```

**Conversion path**: `csvParse()` → intermediate JSON array → `markdownTableStringify()` (or reverse).

**Alignment mapping**: The UI provides a single global `alignment` value. Internally, `csvMdConvert()` expands it to a per-column array and passes to `markdownTableStringify({ alignment: Array(columns).fill(alignment) })`.

### UI: Dual-panel with Markdown preview (referencing Markdown Editor)

Two panels side-by-side (desktop) or stacked (mobile):

- **Left (CSV)**: Textarea with file load/download/copy/clear. Cyan accent.
- **Right (Markdown Table)**: Textarea with file load/download/copy/clear. Purple accent. Includes edit/preview toggle.

The Markdown side's edit/preview toggle follows the Markdown Editor's `modeToolbarEl` pattern:

- **edit mode**: Raw Markdown Table source in textarea, editable
- **preview mode**: Rendered HTML via `renderMarkdown()` + `dangerouslySetInnerHTML` with `prose-md` styling

### CsvPreview (referencing CSV tool)

Below the dual-panel, a collapsible `<table>` preview (same pattern as `CsvPreview` in `csv-page.tsx`). **Only populates when the CSV side has data** — parses CSV content via `csvParse()` and shows first 100 rows. Auto-expands when CSV content transitions from empty to non-empty.

## File Structure

```
app/[locale]/csv-md/
  page.tsx              # Route entry (generatePageMeta + renders CsvMdPage)
  csv-md-page.tsx       # Main page component with all UI and logic

hooks/
  useDropZone.ts        # NEW: Extracted from csv-page.tsx (shared drag-and-drop hook)

libs/csv/
  csv-md-convert.ts     # NEW: CSV ↔ Markdown Table conversion orchestrator
  csv-parse.ts          # MODIFY: add optional delimiter parameter
  csv-stringify.ts      # Existing: reuse
  markdown-table.ts     # MODIFY: extend stringify with alignment, extend parse to return alignment
  __tests__/
    csv-md-convert.test.ts  # NEW: unit tests for the converter

public/locales/
  en/csv-md.json        # NEW: English translations
  zh-CN/csv-md.json     # NEW: Simplified Chinese translations
  zh-TW/csv-md.json     # NEW: Traditional Chinese translations
  en/tools.json         # MODIFY: add csv-md tool entry
  zh-CN/tools.json      # MODIFY: add csv-md tool entry with searchTerms
  zh-TW/tools.json      # MODIFY: add csv-md tool entry with searchTerms

libs/tools.ts           # MODIFY: register new tool (key: "csv-md", path: "/csv-md")
app/sitemap.ts          # No change needed (reads from TOOLS array dynamically)
vitest.config.ts        # No change needed (existing "libs/csv/**/*.test.ts" glob covers the new test)
```

## Component Design

### CsvMdPage (csv-md-page.tsx)

Five sub-components:

1. **Conversion** — The main dual-panel converter
   - State: `csvContent`, `mdContent`, `csvError`, `mdError`, `delimiter`, `alignment`, `mdPreviewMode` ("edit" | "preview")
   - Uses extracted `useDropZone` hook from `hooks/useDropZone.ts`
   - Validation: 500ms debounce on each side (same pattern as csv-page.tsx)
   - Layout: `grid-cols-[1fr_auto_1fr]` on desktop, flex-col on mobile
   - Each panel includes: header with colored dot indicator, file load/download/copy/clear buttons, textarea, drag-and-drop overlay, error display

2. **MdPreview** — Markdown rendered HTML preview
   - Calls `renderMarkdown(mdContent)` to get HTML
   - Renders via `dangerouslySetInnerHTML` with `prose-md` class
   - Empty state: centered muted text message

3. **CsvPreview** — Collapsible CSV table preview (same pattern as csv-page.tsx)
   - Parses the CSV content via `csvParse()`
   - Shows first 100 rows in an HTML table with fixed header, zebra-striping
   - Auto-expands when CSV content transitions from empty to non-empty
   - Only populates when CSV side has data (ignores Markdown-only content)

4. **Description** — Static help text section

5. **Privacy Banner** — Alert banner at top (same pattern as csv-page.tsx, left cyan border)

### Input Panel Pattern (each side)

Each panel follows the same structure as csv-page.tsx:

- **Header**: Colored dot indicator (`w-2.5 h-2.5 rounded-full`) + label in accent color (`font-mono text-sm font-semibold`)
- **Action buttons**: Inline row of text-xs buttons — Load File (FolderOpen icon), Download (Download icon), Clear (Trash2 icon)
- **Textarea**: `StyledTextarea` with `font-mono text-sm`, height `h-[50vh]` in horizontal mode
- **CopyButton**: `absolute end-2 top-2` — copies panel content to clipboard
- **Hidden file input**: `<input type="file" accept="..." className="hidden" />`
  - CSV side accepts: `.csv,.tsv,.txt`
  - Markdown side accepts: `.md,.txt`
- **Error display**: `text-danger text-sm mt-2` with ⚠ icon, `role="alert"` + `aria-live="polite"`

### Drag-and-drop overlay (each side)

When dragging files over a panel, show overlay (same pattern as csv-page.tsx):

```
absolute inset-0 z-50 + border-2 border-dashed border-accent-cyan
+ bg-accent-cyan/5 backdrop-blur-sm + Upload icon + prompt text
```

The overlay uses `pointer-events-none` so the drop event still fires on the parent.

### Markdown preview toggle

The edit/preview toggle on the Markdown side, following the Markdown Editor's `modeToolbarEl` pattern:

```tsx
<div className="inline-flex border border-border-default rounded-lg overflow-hidden bg-bg-surface/90 shadow-sm">
  <button
    onClick={() => setMdPreviewMode("edit")}
    className={`px-2 py-1 text-xs transition-colors ${mdPreviewMode === "edit" ? "bg-accent-purple text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
  >
    Edit
  </button>
  <button
    onClick={() => setMdPreviewMode("preview")}
    className={`px-2 py-1 text-xs transition-colors ${mdPreviewMode === "preview" ? "bg-accent-purple text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
  >
    Preview
  </button>
</div>
```

Accent color for Markdown side is purple (`bg-accent-purple`), consistent with the CSV tool's right panel. The toggle is positioned `absolute top-3 right-3 z-10` within the Markdown panel (same as Markdown Editor).

### Advanced Settings

Below the dual-panel, same structure and styling as csv-page.tsx:

- **Header**: Purple vertical bar (`w-1.5 h-4 rounded-full bg-accent-purple`) + label
- **Settings Grid**: `flex flex-wrap gap-6`
- **Radio button groups**: `rounded-full border border-border-default p-0.5` container, each option `px-3 py-1 rounded-full`, selected state `bg-accent-cyan text-bg-base shadow-glow`, with `role="radiogroup"` / `role="radio"` / `aria-checked` ARIA attributes
- **CSV Delimiter**: Radio button group — Comma `,` / Tab `\t` / Semicolon `;` / Pipe `|`
- **Markdown Alignment**: Radio button group — Left / Center / Right / None (default: Left)

### Conversion Buttons

Conversion is triggered by explicit button clicks (not auto-convert on input change).

Center column between the two panels (desktop, vertical flex column) or full-width row (mobile, `grid grid-cols-1 md:grid-cols-3`):

- **CSV → MD** (primary button, cyan accent, `rounded-full font-bold`)
- **MD → CSV** (secondary button, purple accent, `rounded-full font-bold`)
- **Clear All** (danger button, `rounded-full`, with X icon)

Buttons are disabled when source side is empty.

## Data Flow

```
CSV → Markdown Table:
  csvContent → csvParse({ delimiter }) → JSON array → markdownTableStringify({ alignment }) → mdContent

Markdown Table → CSV:
  mdContent → markdownTableParse() → JSON array → csvStringify(delimiter) → csvContent

Markdown Preview:
  mdContent → renderMarkdown() → HTML → dangerouslySetInnerHTML

CsvPreview:
  csvContent → csvParse() → HTML table (first 100 rows)
```

## File Download

File download uses the Blob + URL.createObjectURL pattern (same as csv-page.tsx):

```typescript
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
```

Download filenames:

- CSV side: `data.csv`
- Markdown side: `table.md`

## Tool Registration

### libs/tools.ts

```typescript
// Add to TOOLS array (before the CSV tool entry for logical grouping)
{ key: "csv-md", path: "/csv-md", icon: FileSpreadsheet }
```

### Route entry (page.tsx)

Follow existing pattern — use `generatePageMeta()` for SEO metadata (OG, Twitter, canonical URL, alternates for all locales).

```typescript
import CsvMdPage from "./csv-md-page";
import { generatePageMeta } from "@/libs/seo";

export async function generateMetadata() {
  return generatePageMeta({ key: "csv-md", path: "/csv-md" });
}

export default function Page() {
  return <CsvMdPage />;
}
```

### i18n tools.json entries

**English** (`en/tools.json`):

```json
"csv-md": {
  "title": "CSV ↔ Markdown Table Converter",
  "shortTitle": "CSV / Markdown Table",
  "description": "Convert between CSV and Markdown Table formats. Bidirectional, real-time, 100% client-side."
}
```

**Simplified Chinese** (`zh-CN/tools.json`):

```json
"csv-md": {
  "title": "CSV ↔ Markdown 表格转换器",
  "shortTitle": "CSV / Markdown 表格",
  "description": "在 CSV 和 Markdown 表格格式之间双向转换。实时转换，100% 浏览器端处理。",
  "searchTerms": "csvzhuanmarkdown csvzmd markdownbiaoge biaogezhuanhuan"
}
```

**Traditional Chinese** (`zh-TW/tools.json`):

```json
"csv-md": {
  "title": "CSV ↔ Markdown 表格轉換器",
  "shortTitle": "CSV / Markdown 表格",
  "description": "在 CSV 和 Markdown 表格格式之間雙向轉換。即時轉換，100% 瀏覽器端處理。",
  "searchTerms": "csvzhuanmarkdown csvzmd markdownbiaoge biaogezhuanhuan"
}
```

## Error Handling

- Invalid CSV → `csvParse()` returns errors → display in red below CSV textarea (`text-danger text-sm`, ⚠ icon, `role="alert"`)
- Invalid Markdown Table → `markdownTableParse()` returns errors → display in red below MD textarea
- Empty input → no error, clear output
- Mismatched columns → handled by papaparse and markdown-table parser
- Empty source for conversion → conversion button disabled

## Testing

- Unit tests for `csvMdConvert()` covering:
  - CSV → Markdown Table with various delimiters
  - Markdown Table → CSV with various alignments
  - Round-trip fidelity (CSV → MD → CSV)
  - Edge cases: empty input, single column, special characters, quoted fields
- Tests live at `libs/csv/__tests__/csv-md-convert.test.ts`
- No vitest.config.ts change needed — existing `"libs/csv/**/*.test.ts"` glob covers it

## What This Does NOT Change

- `libs/csv/convert.ts` — untouched
- `app/[locale]/csv/` — existing CSV tool untouched (except extracting inline useDropZone to shared hook)
- `libs/csv/csv-stringify.ts` — used as-is

## Modifications to Existing Files

### `libs/csv/csv-parse.ts`

Add optional `delimiter` parameter for explicit delimiter selection. When provided, overrides papaparse's auto-detection:

```typescript
export function csvParse(csv: string, delimiter?: string): CsvParseResult {
  const result = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h: string) => h.trim(),
    ...(delimiter ? { delimiter } : {}),
  });
  // ... rest unchanged
}
```

Backward-compatible — omitting `delimiter` preserves auto-detection behavior.

### `libs/csv/markdown-table.ts`

#### Extend `markdownTableStringify()` with alignment support

```typescript
type ColumnAlignment = "left" | "center" | "right" | "none";

interface MarkdownStringifyOptions {
  alignment?: ColumnAlignment[]; // per-column alignment
}

export function markdownTableStringify(
  data: Record<string, unknown>[],
  options?: MarkdownStringifyOptions
): string;
```

The separator line changes based on alignment:

- `left` → `:---`
- `center` → `:---:`
- `right` → `---:`
- `none` → `---`

Backward-compatible — omitting `options` preserves current behavior (all columns `---`).

#### Extend `markdownTableParse()` to return alignment info

```typescript
export interface MarkdownParseResult {
  data: Record<string, unknown>[];
  errors: string[];
  alignments?: ColumnAlignment[]; // NEW: extracted from separator line
}
```

The parser extracts alignment from the separator line (`:---:` → center, `---:` → right, `:---` → left, `---` → none). This preserves alignment info for round-trip conversions.
