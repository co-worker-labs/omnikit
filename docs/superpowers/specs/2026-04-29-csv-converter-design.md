# CSV Converter — Design Spec

## Overview

Add a bidirectional format converter tool to OmniKit at route `/csv`. Users can convert between JSON (object arrays), CSV, and Markdown Table formats in real-time. All processing is client-side.

## Scope

- **In scope**: JSON ↔ CSV, JSON ↔ Markdown Table bidirectional conversion; nested JSON dot-notation flattening; drag-and-drop file upload; file download
- **Out of scope**: Excel (.xlsx) support, CSV custom delimiter selector, data preview table, conversion history persistence

## Technical Decisions

### Library: `papaparse` for CSV parsing

| Considered          | Decision                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `papaparse`         | **Selected**. ~25KB gzip, industry-standard CSV parser. Handles quoted fields, embedded newlines, escaped quotes, auto-detects delimiters. |
| Hand-written parser | Rejected. CSV spec edge cases (RFC 4180) are numerous and error-prone to implement from scratch.                                           |
| `csv-parse` (node)  | Rejected. Node.js oriented, heavier than papaparse for browser use.                                                                        |

**Dependency installation**: `npm install papaparse && npm install -D @types/papaparse`

No library needed for Markdown Table — pipe-delimited table parsing/generation is straightforward.

No library needed for JSON flattening — recursive dot-notation is a simple function.

### Architecture: Dual-panel format selector (Approach A)

Two panels (left = input, right = output). Each panel has a format selector (JSON / CSV / Markdown Table). Input changes trigger real-time conversion to the output format.

**Why this approach**: Consistent with OmniKit's existing dual-panel tools (Diff). Users control both sides explicitly. No "conversion direction" concept needed — all 4 paths are covered by format combinations.

## File Structure

```
app/[locale]/csv/
  page.tsx              # Route entry (generateMetadata + renders CsvPage)
  csv-page.tsx          # Main page component

libs/csv/
  flatten.ts            # JSON nested object → dot-notation flattening
  csv-stringify.ts      # JSON array → CSV string generation
  csv-parse.ts          # CSV string → JSON array (via papaparse)
  markdown-table.ts     # Markdown Table ↔ JSON array bidirectional
  convert.ts            # Unified conversion entry point

public/locales/
  en/csv.json           # English translations
  zh-CN/csv.json        # Simplified Chinese translations
  zh-TW/csv.json        # Traditional Chinese translations
```

### Tool Registration

1. Add `{ key: "csv", path: "/csv" }` to `libs/tools.ts` TOOLS array.
2. Add i18n keys to `public/locales/{en,zh-CN,zh-TW}/tools.json`:
   ```json
   "csv": {
     "title": "CSV Converter - JSON to CSV, Markdown Table Online",
     "shortTitle": "CSV Converter",
     "description": "Convert between JSON, CSV and Markdown Table formats. Bidirectional, real-time, client-side."
   }
   ```
3. Lucide icon: **`Table2`** (shipped with `lucide-react`).
4. No localStorage key needed (no persistence requirement).

## UI Layout

### Desktop: Side-by-side panels

```
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ [JSON] [CSV] [Markdown]      │  │ [JSON] [CSV] [Markdown]      │
│  ↑ input format (Button grp)│  │  ↑ output format(Button grp)│
│ ┌──────────────────────────┐ │  │ ┌──────────────────────────┐ │
│ │                          │ │  │ │                          │ │
│ │     StyledTextarea       │ │  │ │     StyledTextarea       │ │
│ │     (editable)           │ │  │ │     (read-only)          │ │
│ │                          │ │  │ │                          │ │
│ └──────────────────────────┘ │  │ └──────────────────────────┘ │
│ [Clear] [Upload] [Paste]     │  │ [Copy] [Download]            │
└──────────────────────────────┘  └──────────────────────────────┘
```

### Mobile: Stacked top-bottom (via `useIsMobile` hook)

### Format Selector Rules

- Input and output each have 3 options: JSON, CSV, Markdown Table.
- Format selector uses a **Button group** (inline buttons with `variant="primary"` for selected, `variant="outline"` for unselected).
- Output format matching the input format is **disabled** (greyed out, not clickable).
- Default state: input = JSON, output = CSV.

### Interaction

- **Real-time conversion**: Input changes trigger output update with 500ms debounce (matches JSON tool pattern).
- **No "Convert" button**: Conversion is automatic and continuous.
- **Format switch**: Changing input or output format immediately re-converts current input.

### Input Panel Actions

| Action      | Behavior                                                                                                                                                                                                                                                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clear       | Clears input textarea and output textarea                                                                                                                                                                                                                                                                                                                                          |
| Upload      | Opens file picker. Accepted types depend on input format selector: JSON → `.json`, CSV → `.csv,.tsv,.txt`, Markdown → `.md,.txt`                                                                                                                                                                                                                                                   |
| Paste       | Pastes clipboard content into input textarea                                                                                                                                                                                                                                                                                                                                       |
| Drag & Drop | Full drag-and-drop support on the input panel. Drag-over shows highlighted border (accent-cyan). Accepted file types match input format selector. Uses `dragCounterRef` pattern from JSON tool to handle nested drag events correctly. File read via `file.text()`. Max file size: 5MB (reuse `libs/file/limits.ts` `MAX_FILE_BYTES`). Binary file rejection via `isBinaryFile()`. |

### Output Panel Actions

| Action   | Behavior                                                                                     |
| -------- | -------------------------------------------------------------------------------------------- |
| Copy     | Copies output content to clipboard (uses `CopyButton` component)                             |
| Download | Downloads output as file. Filename extension matches output format: `.json` / `.csv` / `.md` |

## Conversion Logic

### Conversion Matrix

```
Input Format × Output Format → 6 paths (4 unique + 2 same-format blocked):

  JSON → CSV           : flatten → csvStringify
  JSON → Markdown      : flatten → markdownTableStringify
  CSV → JSON           : csvParse → jsonSerialize
  CSV → Markdown       : csvParse → markdownTableStringify
  Markdown → JSON      : markdownTableParse → jsonSerialize
  Markdown → CSV       : markdownTableParse → csvStringify
```

### JSON Flattening (`libs/csv/flatten.ts`)

Recursive dot-notation flattening for nested JSON objects:

```typescript
// Input:  { "user": { "name": "John", "age": 30 }, "tags": ["a", "b"] }
// Output: { "user.name": "John", "user.age": 30, "tags.0": "a", "tags.1": "b" }
```

Rules:

- Nested objects → dot-separated keys (`parent.child.grandchild`)
- Arrays → numeric index as key (`items.0`, `items.1`)
- Array of primitives → semicolon-joined string (`"a;b;c"`)
- Empty array → `""`
- Empty object → `""`
- null / boolean / number → preserved as-is

Input must be a JSON array of objects. Single object input is auto-wrapped into an array `[obj]`.

When array elements have inconsistent keys, the union of all unique keys across objects defines the column set. Missing keys in any element are filled with `""`.

### CSV Stringify (`libs/csv/csv-stringify.ts`)

Generates CSV string from JSON object array:

```
1. Flatten all objects (via flatten.ts)
2. Collect all unique keys across objects as column headers
3. Emit header row (comma-separated, escaped)
4. Emit data rows (one per object, values escaped)
```

CSV conventions (matching dbviewer's `csvField` logic):

- UTF-8 BOM prefix (`\uFEFF`) for Excel compatibility
- CRLF line endings (`\r\n`)
- Fields containing comma, quote, or newline → wrapped in double quotes
- Double quotes within fields → escaped as `""`
- Null/undefined → empty string
- Boolean → `"true"` / `"false"`

### CSV Parse (`libs/csv/csv-parse.ts`)

Uses `papaparse` to parse CSV string into JSON object array:

```typescript
import Papa from "papaparse";

function csvParse(csv: string): { data: Record<string, unknown>[]; errors: string[] } {
  const result = Papa.parse(csv, {
    header: true, // First row = column names
    skipEmptyLines: true,
    dynamicTyping: true, // Auto-convert numbers, booleans
    transformHeader: (h: string) => h.trim(),
  });
  // Return parsed data + any error messages
}
```

Auto-detection: papaparse auto-detects delimiter (comma, tab, semicolon, pipe).

### Markdown Table (`libs/csv/markdown-table.ts`)

**Stringify** (JSON → Markdown Table):

```markdown
| name  | age | active |
| ----- | --- | ------ |
| John  | 30  | true   |
| Alice | 25  | false  |
```

Rules:

- Columns aligned with padding to widest value
- Separator row uses `---` (no alignment specifiers — YAGNI)
- Values stringified: null → `""`, boolean → `true`/`false`

**Parse** (Markdown Table → JSON):

1. Split input into lines
2. Detect table lines: must contain `|` characters
3. Skip separator lines (matching `/^\s*\|?\s*[-:]+[-|\s:]*\s*\|?\s*$/`)
4. First non-separator table line = headers
5. Remaining non-separator table lines = data rows
6. Trim whitespace and outer `|` from each cell
7. Auto-type values: numeric strings → number, `"true"`/`"false"` → boolean

### Type Coercion (reverse direction: CSV/Markdown → JSON)

When converting from CSV or Markdown Table to JSON:

- Numeric strings → `number` (handled by papaparse `dynamicTyping` and manual parse)
- `"true"` / `"false"` → `boolean`
- `"null"` → `null`
- Empty string → `""` (no coercion)
- All other strings → `string` (no coercion)

### Unified Convert Entry (`libs/csv/convert.ts`)

```typescript
type Format = "json" | "csv" | "markdown";

function convert(
  input: string,
  from: Format,
  to: Format
): {
  output: string;
  error?: string;
};
```

Routes to the appropriate conversion path. Returns error message on parse failure instead of throwing.

## Error Handling

| Scenario                                    | Behavior                                                    |
| ------------------------------------------- | ----------------------------------------------------------- |
| Empty input                                 | Clear output, no error                                      |
| Single JSON object (not array)              | Auto-wrap in array `[obj]` then convert                     |
| Invalid JSON                                | Show parse error in output panel with position info         |
| Inconsistent array element keys             | Use first element's keys as columns; missing keys → `""`    |
| CSV parse error (malformed)                 | papaparse returns error with row/message; display in output |
| Invalid Markdown table (no pipe delimiters) | Show "Cannot detect Markdown table format" in output        |
| File too large (> 5MB)                      | Show toast "File too large" (reuse common i18n key)         |
| Binary file dropped                         | Show toast "Binary file rejected" (reuse common i18n key)   |
| Input format === Output format              | Output format button disabled, cannot be selected           |

## Drag & Drop Implementation

Follows the JSON tool's drag pattern:

```typescript
const dragCounterRef = useRef(0);
const [isDragging, setIsDragging] = useState(false);

// dragenter: dragCounterRef.current++; if === 1, setIsDragging(true)
// dragleave: dragCounterRef.current--; if === 0, setIsDragging(false)
// dragover:  e.preventDefault()
// drop:      e.preventDefault(), dragCounterRef.current = 0, setIsDragging(false), readFile(e.dataTransfer.files[0])
```

Visual feedback: Input panel border changes to `border-accent-cyan` with subtle glow when `isDragging === true`.

File reading: `file.text()` API (same as Markdown tool). Binary rejection via `isBinaryFile()`. Size limit via `MAX_FILE_BYTES`.

## Components Used

| Component        | Usage                                                   |
| ---------------- | ------------------------------------------------------- |
| `Layout`         | Page wrapper                                            |
| `StyledTextarea` | Input and output text areas                             |
| `Button`         | Format selector groups, Clear, Upload, Download actions |
| `CopyButton`     | Copy output to clipboard                                |
| `showToast`      | Error/success notifications                             |
| `useIsMobile`    | Responsive layout switching                             |

## Out of Scope (YAGNI)

- Excel (.xlsx) read/write
- CSV delimiter configuration UI
- Data preview table view
- Conversion history persistence (localStorage)
- URL-encoded CSV support
- TSV explicit mode (papaparse auto-detects tabs)
