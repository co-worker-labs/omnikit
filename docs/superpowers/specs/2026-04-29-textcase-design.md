# Text Case Converter — Design Spec

**Date**: 2026-04-29
**Status**: Approved
**Route**: `/textcase`

## Overview

A browser-based text case converter that transforms a single-line identifier into 11 common case formats simultaneously. All processing runs client-side.

## Requirements

### Core Interaction

- **Single-line input**: User types or pastes one identifier
- **Real-time full conversion**: All 11 formats displayed simultaneously on every keystroke
- **Auto-detection**: Automatically identifies the input's current case format and highlights it
- **Copy per format**: Each result row has a copy button

### Supported Formats (11)

| #   | Format        | Example            | change-case Function                    |
| --- | ------------- | ------------------ | --------------------------------------- |
| 1   | camelCase     | `myVariableName`   | `camelCase`                             |
| 2   | PascalCase    | `MyVariableName`   | `pascalCase`                            |
| 3   | snake_case    | `my_variable_name` | `snakeCase`                             |
| 4   | CONSTANT_CASE | `MY_VARIABLE_NAME` | `constantCase`                          |
| 5   | kebab-case    | `my-variable-name` | `kebabCase`                             |
| 6   | dot.case      | `my.variable.name` | `dotCase`                               |
| 7   | lower case    | `my variable name` | Hand-written (space-join + toLowerCase) |
| 8   | UPPER CASE    | `MY VARIABLE NAME` | Hand-written (space-join + toUpperCase) |
| 9   | Title Case    | `My Variable Name` | `titleCase` (separate package)          |
| 10  | Sentence case | `My variable name` | `sentenceCase`                          |
| 11  | path/case     | `my/variable/name` | `pathCase`                              |

### Non-Goals

- Multi-line batch conversion
- Custom delimiter support
- Historical conversion log
- Server-side processing

## Architecture

### File Structure

```
app/[locale]/textcase/
├── page.tsx              # Route entry — SEO metadata, imports page component
└── textcase-page.tsx     # Client component — all UI and logic

libs/textcase/
├── main.ts               # Case format definitions, detection, conversion logic
└── __tests__/
    └── main.test.ts      # Unit tests for conversion + detection (project convention)

public/locales/
├── en/textcase.json
├── zh-CN/textcase.json
└── zh-TW/textcase.json
```

### Tool Registration

**`libs/tools.ts`** — add entry:

```typescript
{ key: "textcase", path: "/textcase" }
```

**`public/locales/{en,zh-CN,zh-TW}/tools.json`** — add `textcase` object with `title`, `shortTitle`, `description`.

**`app/[locale]/home-page.tsx`** — add Lucide icon mapping. Note: `<Type>` is already used by `/ascii`, so use `<CaseSensitive>` (the A↔a icon) which is more semantically aligned with case conversion:

```typescript
import { CaseSensitive } from "lucide-react";

"/textcase": <CaseSensitive size={28} className="text-accent-cyan" />
```

### Page Structure

Follows the established OmniKit pattern (same as `storageunit`):

- `page.tsx` — server component, generates metadata via `generatePageMeta`, renders `<TextCasePage />`
- `textcase-page.tsx` — `"use client"`, exports `TextCasePage` as default, wrapped in `<Layout>`

### Conversion Logic (`libs/textcase/main.ts`)

**Data structures**:

```typescript
interface CaseFormat {
  key: string; // i18n key (e.g., "camelCase")
  label: string; // Display name
  convert: (input: string) => string;
}

interface ConversionResult {
  format: CaseFormat;
  output: string;
  isCurrentFormat: boolean;
}
```

**Detection algorithm**: Convert the input string through all 11 format functions. If a function's output exactly matches the input, the input is detected as that format. Multiple matches are possible (e.g., a single word matches many formats) — all matches are flagged.

**lower case / UPPER CASE**: Use `noCase` from change-case to split into words, then join with spaces and apply `toLowerCase` / `toUpperCase`. These two are the only hand-written converters.

**Dependencies** (pin major versions to avoid v4↔v5 API drift):

```
npm install change-case@^5.4 title-case@^4
```

`change-case` v5+ provides: `camelCase`, `pascalCase`, `snakeCase`, `constantCase`, `kebabCase`, `dotCase`, `pathCase`, `sentenceCase`, `noCase`.
**Breaking change vs v4**: `paramCase` was renamed to `kebabCase`. Do not use the `paramCase` import — it does not exist in v5.
`title-case` is an **independent npm package** by the same author (not a sub-package of change-case). It applies English capitalization rules (lowercases articles, prepositions, conjunctions).

### Page Component (`textcase-page.tsx`)

**Container**: matching `storageunit-page.tsx`, wrap content in `<Layout>` → `<div className="container mx-auto px-4 pt-3 pb-6">…</div>`. Auto-focus the input on mount.

**Layout** (top to bottom):

1. **Input section** — single-line `StyledInput`, auto-focused on mount, with clear button (×). Placeholder text via i18n.
2. **Detection badge** — small text below input in `text-fg-muted` font-mono style. Display rules:
   - Empty / whitespace-only input → hidden
   - Exactly one format matches → show `"Detected: {format}"`
   - Two or more formats match (e.g., a single lowercase word matches camelCase + snake_case + kebab-case + dot.case + lower case + path/case) → hidden. The in-row "Current" highlights already convey ambiguity; a single-format badge would be misleading.
3. **Results table** — bordered table matching `storageunit` style. Wrap in `overflow-x-auto` to keep long outputs from breaking the mobile layout:
   - Each row: format name (left, font-mono) | converted output (right, font-mono, break-all) | CopyButton
   - Every row whose format matches the detected input is highlighted: format name in `text-accent-cyan` + small "Current" badge (multiple rows may be highlighted simultaneously)
   - Hover effect: `hover:bg-bg-elevated/60`
   - Borders: `border-b border-border-default`
4. **Reference table** (Description section below divider) — static table showing format name, example, and common use case:

   | Format        | Example            | Common Use                                      |
   | ------------- | ------------------ | ----------------------------------------------- |
   | camelCase     | `myVariableName`   | JavaScript / Java variables, methods            |
   | PascalCase    | `MyVariableName`   | Class names, React components, TypeScript types |
   | snake_case    | `my_variable_name` | Python / Ruby variables, SQL columns            |
   | CONSTANT_CASE | `MY_VARIABLE_NAME` | Environment variables, constants                |
   | kebab-case    | `my-variable-name` | URL slugs, CSS class names, HTML attributes     |
   | dot.case      | `my.variable.name` | Config keys (e.g. `i18n.message.error`)         |
   | lower case    | `my variable name` | Plain prose                                     |
   | UPPER CASE    | `MY VARIABLE NAME` | Emphasized titles, acronyms                     |
   | Title Case    | `My Variable Name` | Article / book titles                           |
   | Sentence case | `My variable name` | Sentence-leading capitalization                 |
   | path/case     | `my/variable/name` | File paths, API routes                          |

**State management**:

```typescript
const [input, setInput] = useState("");
```

No debounce needed — conversion of a single identifier is sub-millisecond.

**React Compiler**: No manual `useMemo` or `useCallback`. The compiler auto-memoizes the conversion results.

### i18n

**Tool registry** (`tools.json`):

```json
{
  "textcase": {
    "title": "Text Case Converter - camelCase, snake_case, kebab-case",
    "shortTitle": "Text Case Converter",
    "description": "Convert text between camelCase, PascalCase, snake_case, CONSTANT_CASE, kebab-case, dot.case, Title Case and more. Free online text case converter, 100% client-side."
  }
}
```

**Tool-specific** (`textcase.json`):

`clear` and `reset` are **not** defined here — they are reused from `common.json` (already used by `storageunit-page.tsx` via `tc("reset")`).

```json
// en/textcase.json
{
  "inputPlaceholder": "Enter text or identifier...",
  "detectedFormat": "Detected: {format}",
  "current": "Current",
  "referenceTable": "Case Format Reference",
  "camelCase": "camelCase",
  "pascalCase": "PascalCase",
  "snakeCase": "snake_case",
  "constantCase": "CONSTANT_CASE",
  "kebabCase": "kebab-case",
  "dotCase": "dot.case",
  "lowerCase": "lower case",
  "upperCase": "UPPER CASE",
  "titleCase": "Title Case",
  "sentenceCase": "Sentence case",
  "pathCase": "path/case",
  "useCase": "Common Use",
  "example": "Example"
}
```

```json
// zh-CN/textcase.json
{
  "inputPlaceholder": "输入文本或标识符...",
  "detectedFormat": "已识别: {format}",
  "current": "当前格式",
  "referenceTable": "命名格式参考",
  "camelCase": "camelCase",
  "pascalCase": "PascalCase",
  "snakeCase": "snake_case",
  "constantCase": "CONSTANT_CASE",
  "kebabCase": "kebab-case",
  "dotCase": "dot.case",
  "lowerCase": "lower case",
  "upperCase": "UPPER CASE",
  "titleCase": "Title Case",
  "sentenceCase": "Sentence case",
  "pathCase": "path/case",
  "useCase": "常见用途",
  "example": "示例"
}
```

```json
// zh-TW/textcase.json
{
  "inputPlaceholder": "輸入文字或識別字...",
  "detectedFormat": "已偵測: {format}",
  "current": "目前格式",
  "referenceTable": "命名格式參考",
  "camelCase": "camelCase",
  "pascalCase": "PascalCase",
  "snakeCase": "snake_case",
  "constantCase": "CONSTANT_CASE",
  "kebabCase": "kebab-case",
  "dotCase": "dot.case",
  "lowerCase": "lower case",
  "upperCase": "UPPER CASE",
  "titleCase": "Title Case",
  "sentenceCase": "Sentence case",
  "pathCase": "path/case",
  "useCase": "常見用途",
  "example": "範例"
}
```

**Tool registry** translations (`tools.json`):

```json
// zh-CN/tools.json
"textcase": {
  "title": "文本大小写转换 - camelCase、snake_case、kebab-case",
  "shortTitle": "文本大小写转换",
  "description": "在 camelCase、PascalCase、snake_case、CONSTANT_CASE、kebab-case、dot.case、Title Case 等 11 种命名格式之间互转。免费在线工具，100% 客户端处理。"
}

// zh-TW/tools.json
"textcase": {
  "title": "文字大小寫轉換 - camelCase、snake_case、kebab-case",
  "shortTitle": "文字大小寫轉換",
  "description": "在 camelCase、PascalCase、snake_case、CONSTANT_CASE、kebab-case、dot.case、Title Case 等 11 種命名格式間互轉。免費線上工具，100% 客戶端處理。"
}
```

All three locales (`en`, `zh-CN`, `zh-TW`) must have matching keys. Format names (camelCase, snake_case, etc.) remain in English across all locales since they are programming conventions.

## Edge Cases

- **Empty input**: Hide results table and detection badge
- **Whitespace-only input**: Treated as empty (`input.trim() === ""`)
- **Max input length**: Soft cap at 1,000 characters. The tool is identifier-focused, not document-focused; longer pastes are clipped to 1,000 chars before conversion with a subtle hint near the input
- **Single word** (e.g., `abc`): All separator-free lowercase formats match; per the multi-match rule, the detection badge is hidden and multiple rows show the "Current" highlight
- **Already uppercase word** (e.g., `JSON`): Matches both UPPER CASE and CONSTANT_CASE — both rows highlighted, badge hidden
- **Mixed separators** (e.g., `my-variable_name`): `noCase` normalizes mixed separators; output is deterministic
- **Numbers** (e.g., `utf8Encoding`): `change-case` v5 splits on number boundaries by default → `utf_8_encoding`. Locked-in by tests so future version bumps surface any behavior change
- **Non-ASCII characters** (e.g., `用户_name`): `change-case` preserves non-ASCII codepoints unchanged; separator-based detection still works
- **Mobile layout**: Results table wrapper uses `overflow-x-auto`; long converted strings stay scrollable rather than blowing out the viewport
- **Auto-focus**: Input is auto-focused on mount (single-input tool, no focus competition)

## Design Decisions

1. **`change-case` over hand-rolling**: The library handles word splitting, number boundaries, consecutive capitals, and Unicode edge cases. For 11 formats, the maintenance cost of hand-rolling outweighs the ~5KB tree-shaken bundle cost.

2. **Single-line only**: Keeps the UI simple and focused. Multi-line batch conversion is a different tool with different UX needs.

3. **No debounce**: Single identifier conversion is O(11 function calls), negligible cost. Immediate feedback is better UX.

4. **Title Case as separate package**: `title-case` follows proper English capitalization rules (lowercases articles, prepositions, conjunctions), which `change-case` alone doesn't provide.

5. **Detection via round-trip**: Converting input through each format function and checking if output matches input is simpler and more accurate than regex-based detection. It naturally handles ambiguous cases.
