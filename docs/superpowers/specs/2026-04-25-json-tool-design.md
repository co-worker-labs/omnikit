# JSON Format / Compress Tool — Design Spec

> **Date**: 2026-04-25  
> **Branch**: `feature/json`  
> **Scope**: New tool for ByteCraft  
> **Status**: Reviewed — decisions locked

---

## 1. Overview

Add a JSON tool to ByteCraft supporting **formatting** (pretty-print) and **compression** (minify). All operations run entirely in the browser — zero server-side processing.

### Key Features

| Feature             | Description                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Format**          | Pretty-print JSON with configurable indentation and optional key sorting                                                                           |
| **Compress**        | Minify JSON to a single line                                                                                                                       |
| **Validate**        | Deferred validation with error location (line/column) display (hidden feature — triggered on input change, not a separate button)                  |
| **JSON5 Mode**      | Toggle to parse JSON5 input (comments, trailing commas, single quotes, unquoted keys, hex numbers, NaN, Infinity) — output is always standard JSON |
| **Auto-Fallback**   | When JSON5 mode is off, Format/Compress first try strict `JSON.parse`; on failure, silently retry with `json5.parse` and toast a notification      |
| **Copy / Backfill** | Copy input/output to clipboard; fill output back into input                                                                                        |

### Why No Separate "Auto-Fix" Button

The `json5` dependency already provides correct relaxed parsing for all common non-standard JSON patterns (trailing commas, comments, single quotes, unquoted keys). Rather than maintaining fragile regex-based fixes, Format and Compress auto-fallback to `json5.parse` when strict parsing fails. This eliminates an entire class of correctness bugs while preserving the user-facing distinction between "I want strict mode" and "just make it work."

---

## 2. File Structure

```
app/[locale]/json/
├── page.tsx              # Route entry — metadata (title/description/keywords), loads page component
└── json-page.tsx         # Page component — all UI and business logic

public/locales/{en,zh-CN,zh-TW}/
└── json.json             # Tool-specific translations (new file)

Modified files:
├── libs/tools.ts         # Add { key: "json", path: "/json" }
├── i18n/request.ts       # Add "json" to namespaces array
└── public/locales/{en,zh-CN,zh-TW}/tools.json  # Add "json" entry
```

### Registration Points

1. **`libs/tools.ts`**: Append `{ key: "json", path: "/json" }` to `TOOLS` array
2. **`i18n/request.ts`**: Append `"json"` to `namespaces` array
3. **`public/locales/*/tools.json`**: Add `"json"` entry with `title`, `shortTitle`, `description`

---

## 3. Route

| Route         | Tool                                     |
| ------------- | ---------------------------------------- |
| `/json`       | JSON Format / Compress                   |
| `/zh-CN/json` | JSON 格式化 / 压缩 (Chinese)             |
| `/zh-TW/json` | JSON 格式化 / 壓縮 (Traditional Chinese) |

---

## 4. New Dependency

| Package | Version | Size (minified) | Purpose                                                                                   |
| ------- | ------- | --------------- | ----------------------------------------------------------------------------------------- |
| `json5` | `^2.x`  | ~25 KB          | JSON5 relaxed parser — used for JSON5 mode + auto-fallback when strict `JSON.parse` fails |

`json5` is a pure-JS library with zero dependencies. It parses the [JSON5 specification](https://json5.org/) (comments, trailing commas, single quotes, unquoted keys, hexadecimal numbers, NaN, Infinity, explicit + sign, leading/trailing decimal points).

---

## 5. Page Layout

```
┌──────────────────────────────────────┐
│  ● JSON Input              [Clear]   │
│  ┌────────────────────────────────┐  │
│  │  Input Textarea (10 rows)      │  │  ← CopyButton (top-right)
│  └────────────────────────────────┘  │
│                                      │
│  Indent: (2) (4) (8)    ▢ Use Tab   ▢ Sort Keys   ▢ JSON5
│  [Format] [Compress] [Clear All]
│  ⚠ Invalid JSON at line 5, col 12    │  ← Error message (visible only on parse failure)
│                                      │
│  ● JSON Output       [回填] [Clear]   │
│  ┌────────────────────────────────┐  │
│  │  Output Textarea (10 rows)     │  │  ← CopyButton (top-right)
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Visual Pattern

Follow the existing `urlencoder-page.tsx` pattern exactly:

- Section labels with colored dot indicators (cyan for input, purple for output)
- `StyledTextarea` with `font-mono text-sm` and `rows={10}`
- `rounded-full` buttons with Lucide icons
- `CopyButton` positioned absolutely (`end-2 top-2`) inside textarea containers
- "privacy notice" alert banner using `tc("alert.notTransferred")` below the title

### Indent Selector

Use a **pill-shaped radio group** (matching `urlencoder-page`'s mode selector pattern), not a `<select>` dropdown:

```tsx
<div role="radiogroup" aria-label="Indent size"
     className="inline-flex rounded-full border border-border-default overflow-hidden">
  {([2, 4, 8] as const).map((n) => (
    <button key={n} role="radio" aria-checked={indentSize === n}
            disabled={useTab}
            onClick={() => setIndentSize(n)}
            className={...} >
      {n}
    </button>
  ))}
</div>
```

When `useTab` is true, the indent radio group is **disabled** (grayed out with reduced opacity) since `\t` overrides indent size.

### Button Row

Three buttons in a `grid grid-cols-3 gap-3` layout (matching `urlencoder-page`):

| Button    | Variant | Icon           |
| --------- | ------- | -------------- |
| Format    | primary | `ChevronsDown` |
| Compress  | primary | `ChevronsUp`   |
| Clear All | danger  | `X`            |

All buttons are `rounded-full font-bold` with `size="md"`.

---

## 6. Component Structure

```tsx
// json-page.tsx
"use client";

function Conversion() {
  // ... all state and handlers
  return (
    <section id="conversion">
      {/* Input area */}
      {/* Options row: indent radio group, useTab checkbox, sortKeys checkbox, json5 toggle */}
      {/* Action buttons row */}
      {/* Error display */}
      {/* Output area */}
    </section>
  );
}

function Description() {
  // ... tool documentation
}

export default function JsonPage() {
  return (
    <Layout title={t("json.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        {/* Privacy notice: tc("alert.notTransferred") */}
        <Conversion />
        <Description />
      </div>
    </Layout>
  );
}
```

---

## 7. State Design

| State           | Type                | Default | Description                                       |
| --------------- | ------------------- | ------- | ------------------------------------------------- |
| `rawContent`    | `string`            | `""`    | Raw JSON input text                               |
| `outputContent` | `string`            | `""`    | Formatted/compressed output                       |
| `indentSize`    | `2 \| 4 \| 8`       | `2`     | Number of spaces for indentation                  |
| `useTab`        | `boolean`           | `false` | Use `\t` instead of spaces (overrides indentSize) |
| `sortKeys`      | `boolean`           | `false` | Sort object keys alphabetically (recursive)       |
| `json5Mode`     | `boolean`           | `false` | Use JSON5 parser for relaxed input                |
| `error`         | `JsonError \| null` | `null`  | Validation error with message/line/column         |

```ts
type JsonError = {
  message: string; // Human-readable error description
  line?: number; // 1-based line number (best-effort; may be unavailable from json5.parse)
  column?: number; // 1-based column (best-effort; may be unavailable from json5.parse)
};
```

### JSON5 Toggle Side-Effect

Toggling `json5Mode` clears `outputContent` so stale output from the previous parser mode doesn't persist:

```ts
function handleJson5Toggle(checked: boolean) {
  setJson5Mode(checked);
  setOutputContent("");
}
```

---

## 8. Core Logic

### 8.1 Parsing with Auto-Fallback

When JSON5 mode is off, parsing uses a two-tier strategy:

```
function tryParse(input: string, json5Mode: boolean): { value: unknown; usedRelaxed: boolean } {
  if (json5Mode) {
    return { value: json5.parse(input), usedRelaxed: true };
  }
  try {
    return { value: JSON.parse(input), usedRelaxed: false };
  } catch {
    // Auto-fallback: try JSON5 parser
    return { value: json5.parse(input), usedRelaxed: true };
  }
}
```

- **Format/Compress** call `tryParse`. If `usedRelaxed` is `true`, toast `"Relaxed JSON5 parsing applied"` (info type, 3s).
- **Deferred validation** (the error display on input change) does NOT auto-fallback — it parses with `JSON.parse` when JSON5 mode is off, and with `json5.parse` when JSON5 mode is on. The point of live validation is to surface the parser the user actually selected; auto-fallback is a Format/Compress affordance, not a validation one.

### 8.2 Sort Keys (Pre-Processing)

Keys must be sorted before `JSON.stringify`, not via replacer (which cannot reorder existing object keys):

```
function deepSortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepSortKeys);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = deepSortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
```

Usage:

```
function stringify(value: unknown, sortKeys: boolean, indent: string | number): string {
  const target = sortKeys ? deepSortKeys(value) : value;
  return JSON.stringify(target, undefined, indent);
}
```

### 8.3 Indent Computation

```
const indent = useTab ? "\t" : indentSize;  // indentSize ∈ {2, 4, 8}
```

### 8.4 Compress

```
JSON.stringify(sortKeys ? deepSortKeys(value) : value)  // no indent arg
```

### 8.5 Deferred Validation

```
useEffect(() => {
  const timer = setTimeout(() => {
    if (!rawContent.trim()) { setError(null); return; }
    try {
      if (json5Mode) json5.parse(rawContent);
      else JSON.parse(rawContent);
      setError(null);
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError(extractError(e));
      }
    }
  }, 500);
  return () => clearTimeout(timer);  // Cleanup on re-render or unmount
}, [rawContent, json5Mode]);
```

Error position extraction must handle two distinct shapes:

| Parser          | Where line/column lives                                          | Example                                                                           |
| --------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| V8 `JSON.parse` | Embedded in `error.message` as `(line L column C)`               | `"Expected property name or '}' in JSON at position 1 (line 1 column 2)"`         |
| `json5.parse`   | Attached as `error.lineNumber` / `error.columnNumber` properties | `message: "JSON5: invalid end of input at 1:5"`, `lineNumber: 1, columnNumber: 5` |

```ts
function extractError(e: SyntaxError): JsonError {
  const e2 = e as SyntaxError & { lineNumber?: number; columnNumber?: number };
  if (typeof e2.lineNumber === "number") {
    return { message: e.message, line: e2.lineNumber, column: e2.columnNumber };
  }
  const lc = e.message.match(/line (\d+) column (\d+)/i);
  if (lc) return { message: e.message, line: Number(lc[1]), column: Number(lc[2]) };
  return { message: e.message };
}
```

> **Do not** treat V8's `at position N` as a column number — it's a byte/character offset from the start of the input, not a column. If neither shape is available, fall back to message-only display.

Error display appears between the button row and the output area, styled with `text-danger text-sm mt-2`.

---

## 9. Button Behaviors

| Button        | Enabled When                                            | Action                                                                                  | Toast                                                            |
| ------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Format**    | `rawContent.trim()` non-empty                           | `tryParse` → `deepSortKeys` (if enabled) → `JSON.stringify` with indent → set output    | "Formatted" (success) or "Relaxed JSON5 parsing applied" (info)  |
| **Compress**  | `rawContent.trim()` non-empty                           | `tryParse` → `deepSortKeys` (if enabled) → `JSON.stringify` without indent → set output | "Compressed" (success) or "Relaxed JSON5 parsing applied" (info) |
| **Clear All** | `rawContent.trim()` or `outputContent.trim()` non-empty | Clear both textareas and error                                                          | "All Cleared" via `tc("allCleared")` — danger                    |
| **回填**      | `outputContent.trim()` non-empty                        | `setRawContent(outputContent)`                                                          | "Filled to input" (success)                                      |

### Auto-Fallback Toast

When `json5Mode` is off and `tryParse` falls back to `json5.parse`, show:

```
showToast(t("relaxedParse"), "info", 3000)
```

This gives the user visibility that their input wasn't strict JSON without interrupting their workflow.

---

## 10. Error Display

Error message shown between the button row and the output area. Uses `role="alert"` + `aria-live="polite"` so screen readers announce errors that appear via debounced validation:

```tsx
{
  error && (
    <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
      ⚠ {error.message}
      {error.line != null &&
        ` (line ${error.line}${error.column != null ? `, col ${error.column}` : ""})`}
    </div>
  );
}
```

---

## 11. Boundary Cases

| Scenario                                               | Behavior                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Empty input                                            | Format/Compress/Clear All buttons disabled                                               |
| Whitespace-only input                                  | Same as empty (after trim)                                                               |
| Valid JSON primitive (`42`, `"hello"`, `true`, `null`) | Process normally                                                                         |
| Non-JSON, non-JSON5 text                               | Display error, keep output unchanged                                                     |
| JSON5-like text with JSON5 mode off                    | Format/Compress auto-fallback to json5.parse, toast notification, produce standard JSON  |
| Empty output                                           | Backfill and Copy buttons hidden                                                         |
| Very large input (10+ MB)                              | Browser naturally handles; no artificial limit. Description section notes potential lag  |
| JSON5 mode toggled                                     | `outputContent` cleared                                                                  |
| `useTab` enabled                                       | Indent radio group disabled (grayed out)                                                 |
| Large numbers (beyond safe integer)                    | Handled by `JSON.stringify` normally; Description section notes potential precision loss |

---

## 12. Copy & Backfill

- **Input CopyButton**: positioned `absolute end-2 top-2` inside input textarea container. Copies `rawContent`.
- **Output CopyButton**: positioned `absolute end-2 top-2` inside output textarea container. Copies `outputContent`.
- **Backfill button**: positioned in output header row, left of the Clear button. Copies `outputContent` into `rawContent`.
- **Clear buttons**: each section has its own Clear (input: clear rawContent; output: clear outputContent). "Clear All" clears both and the error.

---

## 13. i18n Keys

### 13.1 `tools.json` — New Entry

```json
{
  "json": {
    "title": "JSON Formatter / Compressor - Free Online Tool",
    "shortTitle": "JSON Format / Compress",
    "description": "Format, compress, and validate JSON online. Pretty-print with configurable indentation, minify to single line, or parse JSON5. 100% client-side."
  }
}
```

### 13.2 `json.json` — Tool Namespace (en)

Required key shape (English shown; `zh-CN` and `zh-TW` mirror this structure with translated values — see plan for full prose):

```json
{
  "input": "JSON Input",
  "output": "JSON Output",
  "inputPlaceholder": "Paste or type your JSON here",
  "format": "Format",
  "compress": "Compress",
  "indent": "Indent",
  "useTab": "Use Tab",
  "sortKeys": "Sort Keys",
  "json5": "JSON5",
  "backfill": "Fill to Input",
  "formatted": "Formatted",
  "compressed": "Compressed",
  "relaxedParse": "Relaxed JSON5 parsing applied",
  "filled": "Filled to input",
  "invalid": "Invalid JSON",
  "largeFileWarning": "Large JSON files may cause browser lag",
  "descriptions": {
    "whatIsTitle": "What is JSON Formatting?",
    "whatIsP1": "Intro paragraph explaining JSON as the universal data interchange format and what pretty-printing does.",
    "whatIsP2": "Paragraph explaining minification and why it matters in production.",
    "whatIsP3": "Privacy note — tool runs entirely in the browser.",
    "json5Title": "What is JSON5?",
    "json5P1": "JSON5 superset overview: comments, trailing commas, single-quoted strings, unquoted keys, hex, NaN, Infinity.",
    "json5P2": "How auto-fallback works when JSON5 mode is off; output is always standard JSON.",
    "useCasesTitle": "Common Use Cases",
    "useCasesP1": "Formatting API responses for readability.",
    "useCasesP2": "Minifying for production deployment.",
    "useCasesP3": "Cleaning up hand-edited JSON5 input.",
    "useCasesP4": "Sorting object keys for stable diffs in version control.",
    "limitationsTitle": "Limitations",
    "limitationsP1": "Very large JSON files (>10MB) may cause browser lag during formatting.",
    "limitationsP2": "Numbers beyond JavaScript's safe integer range may lose precision after round-tripping.",
    "limitationsP3": "JSON5 error messages may not include exact line/column positions."
  }
}
```

> The "Cleared" / "All Cleared" toasts reuse `common.json`'s existing `cleared` and `allCleared` keys — no `cleared` key in `json.json`. All other toast messages use `useTranslations("json")`.

---

## 14. Description Section

Follow the same pattern as `urlencoder-page.tsx`'s `Description()` component. Four sections, each backed by an `h5` title and consecutive `<p>` paragraphs:

1. **What is JSON Formatting?** (`whatIsP1`, `whatIsP2`, `whatIsP3`) — purpose, what pretty-print and minify do, privacy note
2. **What is JSON5?** (`json5P1`, `json5P2`) — JSON5 spec overview, auto-fallback behavior when JSON5 mode is off
3. **Common Use Cases** (`useCasesP1` through `useCasesP4`) — formatting API responses, minifying for production, cleaning up hand-edited JSON5, sorting keys for stable diffs
4. **Limitations** (`limitationsP1`, `limitationsP2`, `limitationsP3`) — large files may lag, number precision, JSON5 error positions may be approximate

---

## 15. Design Decisions (Reviewed 2026-04-25)

| #   | Decision                                                                                                  | Rationale                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No separate Auto-Fix button                                                                               | `json5.parse` already handles all relaxed syntax correctly; regex-based fixes are fragile                                                                               |
| 2   | Auto-fallback toast on relaxed parse                                                                      | User should know their input wasn't strict JSON                                                                                                                         |
| 3   | Sort keys via pre-processing, not replacer                                                                | `JSON.stringify` replacer cannot reorder existing object keys                                                                                                           |
| 4   | Indent selector as radio group (not `<select>`)                                                           | Matches urlencoder-page pattern; 3 options is ideal for radio group                                                                                                     |
| 5   | Indent radio group disabled when `useTab` is true                                                         | Prevents confusion about which setting takes effect                                                                                                                     |
| 6   | Clear `outputContent` on JSON5 toggle                                                                     | Stale output from old parser mode is misleading                                                                                                                         |
| 7   | Deferred validation parses with the user-selected parser, no auto-fallback                                | Validation surfaces feedback for the parser the user chose; auto-fallback is a Format/Compress affordance only                                                          |
| 8   | No `keywords` metadata yet                                                                                | Deferred until SEO strategy is defined                                                                                                                                  |
| 9   | `extractError` reads `e.lineNumber`/`columnNumber` first, then matches `(line L column C)` in `e.message` | json5 attaches structured fields on the error; V8 embeds them in the message — both must be supported. `at position N` is NOT a column and must not be displayed as one |
| 10  | Error display uses `role="alert"` + `aria-live="polite"`                                                  | Errors appear via 500ms debounce; screen readers need an aria-live region to announce them                                                                              |
| 11  | "Clear All" toast uses `common.json`'s `allCleared` key                                                   | Match the urlencoder pattern; avoid duplicate translation keys                                                                                                          |

---

## 16. Implementation Checklist

1. Install `json5` npm package
2. Create `app/[locale]/json/` directory
3. Create `app/[locale]/json/page.tsx` (metadata — `title`, `description`, `keywords: ""`)
4. Create `app/[locale]/json/json-page.tsx` (Conversion + Description + JsonPage)
5. Register tool in `libs/tools.ts`
6. Add namespace in `i18n/request.ts`
7. Create `public/locales/en/json.json`
8. Create `public/locales/zh-CN/json.json`
9. Create `public/locales/zh-TW/json.json`
10. Add `json` entry to `public/locales/en/tools.json`
11. Add `json` entry to `public/locales/zh-CN/tools.json`
12. Add `json` entry to `public/locales/zh-TW/tools.json`
13. **Smoke-test error position extraction** — confirm `extractError(e)` produces `(line, column)` for both `JSON.parse` (from `e.message`) and `json5.parse` (from `e.lineNumber`/`columnNumber`)
14. **Preserve all existing TOOLS entries** — the new `json` entry is an addition, never a replacement; `checksum` (and every other existing tool) must remain in the list
15. Build and verify: `npm run build`
16. Manual QA at `/json` route, including JSON5 error position display
