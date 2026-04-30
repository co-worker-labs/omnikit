# CSV File Preview — Design Spec

## Overview

Add a read-only table preview to the CSV Converter tool. When a CSV file is loaded (via file picker or drag-and-drop), a collapsible table preview automatically appears below the action buttons area, spanning the full tool content width. The preview displays parsed CSV data as a rendered HTML table.

## Scope

- **In scope**: Collapsible table preview below action buttons; auto-expand on file load; truncate large files to first 100 rows; read-only rendering
- **Out of scope**: Editable table cells, column sorting, search/filter, JSON side preview, virtual scrolling

## Design Decisions

### Position: Below action buttons, full width

The preview table sits below the action buttons area (both horizontal and vertical layouts), spanning the full tool content width. This gives the table maximum horizontal space for columns, independent of the left/right panel split.

```
┌─────────────────────────────────────────────┐
│  JSON textarea  │  buttons  │  CSV textarea  │  ← existing layout
├─────────────────────────────────────────────┤
│  ▼ Table Preview (full width)               │  ← new
│  ┌──────┬───────┬───────┬───────┐           │
│  │ Col1 │ Col2  │ Col3  │ Col4  │ (sticky)  │
│  ├──────┼───────┼───────┼───────┤           │
│  │ ...  │ ...   │ ...   │ ...   │           │
│  └──────┴───────┴───────┴───────┘           │
│  Showing 100 of 5,230 rows                  │
├─────────────────────────────────────────────┤
│  Layout toggle (horizontal/vertical)        │  ← existing
└─────────────────────────────────────────────┘
```

### Trigger: Automatic on file load

- Preview auto-expands when a CSV file is loaded (file picker or drag-and-drop)
- Preview updates in real-time as textarea content changes (reuses existing 500ms debounce)
- Preview hides when csvContent is empty or csvError is present
- User can manually collapse/expand via title bar click

### Rendering: Lightweight inline table

- Uses existing `csvParse()` from `libs/csv/csv-parse.ts` to parse CSV content
- Renders a native HTML `<table>` with Tailwind styling
- No external table library needed
- Visual style references DB Viewer's `ResultTable.tsx` patterns

## Component Structure

New `CsvPreview` component inside `csv-page.tsx` (same file, not extracted). Rendered inside `Conversion` component, between the action buttons area and the layout toggle:

```
Conversion (existing)
├── jsonInputArea
├── actionButtons / actionButtonsRow
├── csvInputArea
└── CsvPreview (new — rendered here, inside Conversion)
    ├── Title bar (collapsible toggle)
    │   ├── Table icon + "Preview" label
    │   ├── Row count summary
    │   └── Chevron icon (expand/collapse)
    └── Table content
        ├── <table> with sticky header
        └── Footer: "Showing X of Y rows"
```

Props interface:

```typescript
interface CsvPreviewProps {
  csvContent: string;
  csvError: ParseError | null;
}
```

The component receives `csvContent` and `csvError` from the parent `Conversion` component. Parsing is done inside `CsvPreview` using `csvParse()`.

### State management

- `isExpanded: boolean` — controls collapse/expand, defaults to `false`
- When a file is loaded, the parent sets a callback or the component auto-detects content change and expands

Auto-expand strategy: The component watches `csvContent` via useEffect. When content transitions from empty to non-empty (and no error), it auto-expands. Manual collapse is respected until the next file load.

## Table Rendering

### Parse and display

1. Call `csvParse(csvContent)` to get `Record<string, unknown>[]` and headers
2. Extract headers from the first object's keys (or all unique keys)
3. Truncate to first 100 rows for rendering
4. Render `<table>` with headers and data rows

### Styling

| Element      | Style                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Container    | `overflow-auto max-h-[50vh] rounded-lg border border-border-default`                            |
| Table header | `sticky top-0 bg-bg-elevated z-10`, font-semibold, text-fg-secondary                            |
| Data rows    | Even rows: `bg-bg-input/30`, hover: `hover:bg-bg-input/50 transition-colors`                    |
| Cells        | `px-3 py-2 text-sm font-mono`, truncate long text with `max-w-[300px] truncate` + title tooltip |
| Borders      | `border-b border-border-default` between rows, `border-r` between columns                       |
| Footer       | `text-fg-muted text-xs py-2 px-3`, shows row count info                                         |

### Truncation

- Display first 100 rows
- Footer shows "Showing 100 of {total} rows" when truncated
- Footer shows "{total} rows" when all rows fit
- Rows beyond 100 are not rendered (no hidden DOM elements)

### Empty / error states

| Condition            | Behavior                             |
| -------------------- | ------------------------------------ |
| csvContent empty     | Entire preview section hidden        |
| csvError present     | Entire preview section hidden        |
| Parse returns 0 rows | Show "No data" message in table area |
| Headers empty        | Don't render table                   |

## Collapse/Expand Interaction

- Title bar is clickable to toggle expand/collapse
- Title bar content: `Table2` icon + "Preview" text + row count badge + `ChevronDown`/`ChevronUp` icon
- Expand animation: `transition-all duration-200` on height + `overflow-hidden`
- When collapsed, only the title bar is visible
- Auto-expand triggers: file load (csvContent transitions from empty to non-empty)

## i18n Keys

Add to `csv` namespace in all 3 locale files:

| Key           | English                         | 简体中文                       | 繁體中文                       |
| ------------- | ------------------------------- | ------------------------------ | ------------------------------ |
| `preview`     | Preview                         | 预览                           | 預覽                           |
| `showingRows` | Showing {shown} of {total} rows | 显示前 {shown} / 共 {total} 行 | 顯示前 {shown} / 共 {total} 行 |
| `rows`        | {count} rows                    | {count} 行                     | {count} 行                     |
| `noData`      | No data                         | 无数据                         | 無資料                         |

## Files Modified

| File                            | Change                                            |
| ------------------------------- | ------------------------------------------------- |
| `app/[locale]/csv/csv-page.tsx` | Add `CsvPreview` component, integrate into layout |
| `public/locales/en/csv.json`    | Add preview, showingRows, rows, noData keys       |
| `public/locales/zh-CN/csv.json` | Add preview, showingRows, rows, noData keys       |
| `public/locales/zh-TW/csv.json` | Add preview, showingRows, rows, noData keys       |

No new dependencies. No new files.

## Performance Considerations

- Table rendering is capped at 100 rows — no risk of DOM explosion
- Parsing reuses existing `csvParse()` which is synchronous and fast
- Debounce (500ms) prevents excessive re-parses during typing
- No virtual scrolling needed at 100-row cap
