# CSV File Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible read-only table preview to the CSV Converter tool that auto-expands when a CSV file is loaded.

**Architecture:** New `CsvPreview` component defined inline in `csv-page.tsx`. Receives `csvContent` and `csvError` as props, parses CSV via existing `csvParse()`, renders a native `<table>` with sticky headers, zebra stripes, and 100-row truncation. Sits below the action buttons area at full content width.

**Tech Stack:** React, TypeScript, Tailwind CSS, papaparse (existing), lucide-react, next-intl

---

### Task 1: Add i18n keys

**Files:**

- Modify: `public/locales/en/csv.json`
- Modify: `public/locales/zh-CN/csv.json`
- Modify: `public/locales/zh-TW/csv.json`

- [ ] **Step 1: Add keys to English locale**

Add 4 new keys after the `"invalidInput"` line in `public/locales/en/csv.json`:

```json
{
  "jsonPlaceholder": "Paste or type JSON here...",
  "csvPlaceholder": "Paste or type CSV here...",
  "loadFile": "Load",
  "download": "Download",
  "layoutHorizontal": "Side",
  "layoutVertical": "Stack",
  "jsonToCsv": "JSON → CSV",
  "csvToJson": "JSON ← CSV",
  "dropZone": "Drop .json, .csv, or .tsv file",
  "convertedToCsv": "Converted to CSV",
  "convertedToJson": "Converted to JSON",
  "invalidInput": "Invalid input",
  "preview": "Preview",
  "showingRows": "Showing {shown} of {total} rows",
  "rows": "{count} rows",
  "noData": "No data",
  "descriptions": {
    ...
  }
}
```

- [ ] **Step 2: Add keys to Simplified Chinese locale**

Same additions in `public/locales/zh-CN/csv.json`:

```json
{
  ...existing keys...,
  "preview": "预览",
  "showingRows": "显示前 {shown} / 共 {total} 行",
  "rows": "{count} 行",
  "noData": "无数据",
  "descriptions": {
    ...
  }
}
```

- [ ] **Step 3: Add keys to Traditional Chinese locale**

Same additions in `public/locales/zh-TW/csv.json`:

```json
{
  ...existing keys...,
  "preview": "預覽",
  "showingRows": "顯示前 {shown} / 共 {total} 行",
  "rows": "{count} 行",
  "noData": "無資料",
  "descriptions": {
    ...
  }
}
```

- [ ] **Step 4: Commit i18n changes**

```bash
git add public/locales/en/csv.json public/locales/zh-CN/csv.json public/locales/zh-TW/csv.json
git commit -m "feat(csv): add preview i18n keys for table preview"
```

---

### Task 2: Implement CsvPreview component

**Files:**

- Modify: `app/[locale]/csv/csv-page.tsx`

- [ ] **Step 1: Update imports**

At the top of `app/[locale]/csv/csv-page.tsx`, add `ChevronDown` and `Table2` to the lucide-react import, and add `csvParse` import:

```typescript
import {
  Columns2,
  ArrowUpDown,
  ChevronDown,
  Download,
  FolderOpen,
  Table2,
  Upload,
  X,
} from "lucide-react";
```

Add the csvParse import after the existing `convert` import:

```typescript
import { convert } from "../../../libs/csv/convert";
import { csvParse } from "../../../libs/csv/csv-parse";
```

- [ ] **Step 2: Add CsvPreview component**

Insert the `CsvPreview` component between the `useDropZone` hook and the `Conversion` component (after the closing `}` of `useDropZone` and before `// --- Conversion Component ---`). Place it after the `// --- Types ---` section and before `// --- Conversion Component ---`:

```tsx
// --- CSV Preview Component ---

interface CsvPreviewProps {
  csvContent: string;
  csvError: ParseError | null;
}

function CsvPreview({ csvContent, csvError }: CsvPreviewProps) {
  const t = useTranslations("csv");
  const [isExpanded, setIsExpanded] = useState(false);
  const prevEmptyRef = useRef(true);

  // Auto-expand when content transitions from empty to non-empty
  useEffect(() => {
    const isEmpty = !csvContent.trim() || !!csvError;
    if (prevEmptyRef.current && !isEmpty) {
      setIsExpanded(true);
    }
    prevEmptyRef.current = isEmpty;
  }, [csvContent, csvError]);

  // Don't render if no content or error
  if (!csvContent.trim() || csvError) return null;

  // Parse CSV content
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
      {/* Title bar */}
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

      {/* Table content */}
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
```

- [ ] **Step 3: Integrate CsvPreview into Conversion component**

In the `Conversion` component's return JSX, add `<CsvPreview />` between the layout grid and the layout toggle section. Find the existing return block and modify it:

**Current code** (the return block inside `Conversion`):

```tsx
  return (
    <section id="conversion">
      {effectiveLayout === "horizontal" ? (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
          {jsonInputArea}
          <div className="flex items-center">{actionButtons}</div>
          {csvInputArea}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {jsonInputArea}
          {actionButtonsRow}
          {csvInputArea}
        </div>
      )}

      {/* Layout toggle */}
      <div className="mt-6 px-1">
```

**Replace with** (insert CsvPreview between layout and toggle):

```tsx
  return (
    <section id="conversion">
      {effectiveLayout === "horizontal" ? (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
          {jsonInputArea}
          <div className="flex items-center">{actionButtons}</div>
          {csvInputArea}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {jsonInputArea}
          {actionButtonsRow}
          {csvInputArea}
        </div>
      )}

      {/* CSV table preview */}
      <CsvPreview csvContent={csvContent} csvError={csvError} />

      {/* Layout toggle */}
      <div className="mt-6 px-1">
```

The only change is inserting `<CsvPreview csvContent={csvContent} csvError={csvError} />` between the layout section and the layout toggle.

- [ ] **Step 4: Run LSP diagnostics**

Run diagnostics on the modified file to verify no type errors:

```bash
# Use lsp_diagnostics tool on app/[locale]/csv/csv-page.tsx
```

Expected: No errors, no warnings.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/csv/csv-page.tsx
git commit -m "feat(csv): add collapsible table preview below action buttons"
```

---

### Task 3: Verify end-to-end

- [ ] **Step 1: Run build check**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual verification checklist**

Start dev server (`npm run dev`) and verify:

1. Load a CSV file via file picker → preview auto-expands below the action buttons, full width
2. Table shows headers + data rows with zebra stripes
3. Table scrolls vertically within 50vh max height
4. Footer shows "X rows" when under 100 rows
5. Footer shows "Showing 100 of X rows" when over 100 rows
6. Click title bar → preview collapses with animation
7. Click again → preview expands
8. Clear CSV content → preview disappears
9. Enter invalid CSV → preview hides, error shows
10. Type/edit CSV in textarea → preview updates in real-time
11. Preview spans full content width in both horizontal and vertical layouts
12. Mobile layout works correctly (preview below stacked panels)
