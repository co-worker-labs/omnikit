# Deduplicate Lines Tool — Design Spec

## Overview

A browser-based tool to remove duplicate lines from text. Targets users processing logs, config files, and CSV data. Common search queries: "remove duplicate lines online", "在线去重行", "text deduplicator".

All processing runs client-side. No data leaves the browser.

## Scope

Pure line-by-line deduplication. No word-level, column-level, or custom delimiter modes.

## Route & Registration

- **Route**: `/deduplines`
- **Key**: `deduplines`
- **Category**: `text` (alongside json, regex, diff, markdown, textcase)
- **Icon**: `ListFilter` from lucide-react

## File Structure

| Operation | Path                                           | Purpose                                   |
| --------- | ---------------------------------------------- | ----------------------------------------- |
| New       | `app/[locale]/deduplines/page.tsx`             | Route entry — metadata + mount            |
| New       | `app/[locale]/deduplines/deduplines-page.tsx`  | Page component (Conversion + Description) |
| New       | `libs/deduplines/main.ts`                      | Pure dedup logic + stats computation      |
| New       | `public/locales/{locale}/deduplines.json` × 10 | Tool-specific translations                |
| Modify    | `libs/tools.ts`                                | Add to TOOLS array + TOOL_CATEGORIES      |
| Modify    | `public/locales/{locale}/tools.json` × 10      | Add title/shortTitle/description          |

## Core Logic (`libs/deduplines/main.ts`)

### Interface

```ts
interface DedupOptions {
  caseSensitive: boolean; // default: true
  trimLines: boolean; // default: true
  removeEmpty: boolean; // default: true
}

interface DedupResult {
  output: string; // deduplicated text, joined by \n
  originalCount: number; // total lines before dedup
  resultCount: number; // lines after dedup
  removedCount: number; // number of removed duplicates
}
```

### Algorithm

1. Normalize line endings: replace `\r\n` and `\r` with `\n`, then split by `\n`.
2. If `removeEmpty`: filter out lines that are empty or whitespace-only.
3. Build a comparison key for each line:
   - If `trimLines`: key = `line.trim()`
   - If `!caseSensitive`: key = `key.toLowerCase()`
4. Track seen keys with a `Set`. Only keep the first occurrence of each key.
5. Output preserves the original line text (comparison keys are separate from output).
6. First-occurrence order is preserved (no sorting).

### Design Decisions

- Comparison keys and original text are handled separately. Trimming and case folding apply only to comparison — the output retains original text.
- Pure function, no side effects, easily testable.

## UI Layout (`deduplines-page.tsx`)

### Approach

Top-to-bottom layout, consistent with textcase and other text tools. Real-time computation (no button — results update as the user types or changes options).

### Component Structure

Three components: `Conversion`, `Description`, `DeduplinesPage`.

### Conversion Component

```
┌──────────────────────────────────────────┐
│ ● Plain Text                    [Clear]  │  ← header with cyan dot + clear
├──────────────────────────────────────────┤
│ StyledTextarea (rows=8, font-mono)       │  ← input area
│                               [Copy]     │
├──────────────────────────────────────────┤
│ ☑ Case Sensitive  ☑ Trim  ☑ Remove Empty│  ← 3x StyledCheckbox
├──────────────────────────────────────────┤
│ Stats: 100 → 73 (-27)       [Copy Result]│  ← stats + output copy
├──────────────────────────────────────────┤
│ StyledTextarea (readOnly, rows=8)        │  ← output area
└──────────────────────────────────────────┘
```

**Key behaviors**:

- Input textarea: editable, placeholder text, monospace font.
- Three checkboxes control `DedupOptions`. All default to checked.
- Output textarea: read-only, auto-populated from `dedupLines(input, options)`.
- Stats line: shows `"100 lines → 73 lines (-27 duplicates)"` or `"100 lines → no duplicates found"`.
- Stats and output copy button share a row between checkboxes and output textarea.
- Clear button resets input textarea only.

### Description Component

Standard description section following the project pattern:

- "What is Line Deduplication?" — brief explanation
- "How to Use" — explains each option
- "Common Use Cases" — log cleanup, config dedup, CSV row dedup, removing duplicates from lists

## Translations

### `deduplines.json` (English baseline)

```json
{
  "inputPlaceholder": "Paste your text here...",
  "outputPlaceholder": "Unique lines will appear here...",
  "stats": "{original} lines → {result} lines (-{removed} duplicates)",
  "statsNoDupes": "{original} lines → no duplicates found",
  "options": {
    "caseSensitive": "Case Sensitive",
    "trimLines": "Trim Whitespace",
    "removeEmpty": "Remove Empty Lines"
  },
  "descriptions": {
    "whatIsTitle": "What is Line Deduplication?",
    "whatIsP1": "Line deduplication removes duplicate lines from text, keeping only the first occurrence of each unique line. The original order is preserved.",
    "howTitle": "How to Use",
    "howP1": "Paste your text in the input area. The result updates in real time. Use the options to control comparison behavior.",
    "howCase": "Case Sensitive: When checked, 'Hello' and 'hello' are treated as different lines.",
    "howTrim": "Trim Whitespace: When checked, leading and trailing spaces are ignored during comparison.",
    "howEmpty": "Remove Empty Lines: When checked, empty lines and whitespace-only lines are removed.",
    "useCasesTitle": "Common Use Cases",
    "useCasesP1": "Removing duplicate entries from log files.",
    "useCasesP2": "Cleaning up configuration files with repeated directives.",
    "useCasesP3": "Deduplicating rows in CSV data before processing."
  }
}
```

### `tools.json` Entry

```json
"deduplines": {
  "title": "Remove Duplicate Lines - Deduplicate Text Online",
  "shortTitle": "Deduplicate Lines",
  "description": "Remove duplicate lines from text. Options for case sensitivity, trim, empty lines. 100% client-side."
}
```

### searchTerms (CJK only)

| Locale | searchTerms                                   |
| ------ | --------------------------------------------- |
| zh-CN  | `quchonghang qrch quchong wenben shanchu`     |
| zh-TW  | `quchonghang qrch quchong wenben shanchu`     |
| ja     | `jufukudousakujyo jfkdsk dyuipuriku joufuku`  |
| ko     | `jungbokjegaeseol jbjgs dedupeuraein jungbok` |

Latin-script locales (en, es, pt-BR, fr, de, ru): no searchTerms needed — the shortTitle is already searchable.

## Tool Registration

### `libs/tools.ts`

Add to `TOOLS` array:

```ts
{ key: "deduplines", path: "/deduplines", icon: ListFilter }
```

Add `"deduplines"` to the `"text"` category in `TOOL_CATEGORIES`.

## Testing

Add test file at `libs/deduplines/__tests__/main.test.ts`.

Test cases:

- Empty input → empty output, 0 counts
- No duplicates → identical output, stats show "no duplicates found"
- Basic dedup with all options on
- Case sensitivity toggle: "Hello" vs "hello"
- Trim toggle: " hello " vs "hello"
- Remove empty toggle: empty lines preserved or removed
- Mixed line endings (\r\n, \r, \n) all handled
- Output preserves original text (not trimmed/lowercased version)
- Order preservation: first occurrence wins

Add `"deduplines"` to test scopes in `vitest.config.ts`.
