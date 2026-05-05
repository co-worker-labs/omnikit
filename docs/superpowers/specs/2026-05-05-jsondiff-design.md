# JSON Diff Tool — Design Spec

## Summary

A new standalone tool at `/jsondiff` that performs semantic-level comparison of two JSON objects. Unlike the existing Text Diff tool (which does line-level text comparison), this tool parses JSON into structured data and compares by field, recognizing that key-order differences and whitespace differences are not meaningful changes.

**Target users**: Developers debugging APIs, comparing configuration files, validating JSON changes.

**Key differentiator from Text Diff**: `{ "a": 1, "b": 2 }` and `{ "b": 2, "a": 1 }` are reported as **identical**.

## Architecture

### Route & File Structure

```
app/[locale]/jsondiff/
├── page.tsx                    # Route entry (generateMetadata + ToolPage)
└── jsondiff-page.tsx           # Page component with all UI and logic

libs/jsondiff/
├── compare.ts                  # Core comparison logic (wraps json-diff-ts)
├── tree.ts                     # Side-by-side merged tree builder
├── types.ts                    # TypeScript type definitions
└── __tests__/
    └── compare.test.ts         # Unit tests for comparison logic
```

### Data Flow

```
User input (left/right textarea)
        ↓
parseBoth() → { left: parsed, right: parsed } | ParseError
        ↓
diff(left, right)  ← json-diff-ts (nested changeset)
        ↓
├─ atomizeChangeset()  → Summary view data (flat atomic change list with JSONPath)
├─ buildMergedTree()   → Side-by-side view data (recursive merged tree)
        ↓
Render
```

### Dependencies

- **`json-diff-ts`** (`^4.8.0`): Zero-dependency TypeScript library (~6KB gzipped). Provides `diff()`, `atomizeChangeset()`, `applyChangeset()`, `revertChangeset()`. Does NOT provide `comparisonToDict` or `comparisonToFlatList` — side-by-side tree must be built by our `tree.ts`.
- **`json5`**: Already in project, used for lenient JSON parsing fallback.
- **Note**: Project already has `diff` (v7.0.0) for the Text Diff tool, but it is a line-level text diffing library, unsuitable for semantic JSON comparison. No conflict.

### Relationship to Existing Tools

- **Completely independent** from the existing Text Diff tool. No shared code or workers.
- Reuses the standard page pattern (`page.tsx` + `*-page.tsx`), `Layout`, and shared UI components (`Button`, `Textarea`, `Tabs`, `Toast`, `CopyButton`).

## Core Comparison Logic

### API (`libs/jsondiff/compare.ts`)

```ts
import { diff, atomizeChangeset } from "json-diff-ts";

interface JsonDiffResult {
  changeset: Change[]; // nested changeset from json-diff-ts
  flatList: AtomicChange[]; // flat list for summary view
  mergedTree: MergedTreeNode; // recursive tree for side-by-side view
  stats: {
    updates: number;
    adds: number;
    removes: number;
  };
}

function compareJson(left: unknown, right: unknown): JsonDiffResult;
```

### Implementation

1. Call `diff(left, right)` from `json-diff-ts` to produce a nested changeset. Each entry has `{ type: Operation, key, value?, oldValue? }` where `Operation` is `ADD | UPDATE | REMOVE`.
2. Call `atomizeChangeset(changeset)` to flatten into atomic changes with full JSONPath. Each entry has `{ type, key, value, oldValue, path, valueType }`.
3. Call `buildMergedTree(left, right, changeset)` (our `tree.ts`) to construct a recursive merged tree for side-by-side rendering. This walks all keys from both objects, tags each with `UNCHANGED | UPDATE | ADD | REMOVE`, and recurses into nested objects/arrays.
4. Count each type for stats.

### Diff Types

| Type      | Condition             | Source                 | UI Color     |
| --------- | --------------------- | ---------------------- | ------------ |
| UNCHANGED | Values are identical  | `tree.ts` (self-built) | Default      |
| UPDATE    | Values differ         | `json-diff-ts`         | Yellow/amber |
| ADD       | Present in right only | `json-diff-ts`         | Green        |
| REMOVE    | Present in left only  | `json-diff-ts`         | Red          |

Note: `json-diff-ts` only outputs `ADD`, `UPDATE`, `REMOVE`. The `UNCHANGED` type is computed by our `buildMergedTree()` — it walks all keys from both sides and tags fields not present in the changeset.

### Side-by-Side Merged Tree (`libs/jsondiff/tree.ts`)

```ts
interface MergedTreeNode {
  key: string;
  type: "UNCHANGED" | "UPDATE" | "ADD" | "REMOVE";
  children?: MergedTreeNode[]; // present for objects/arrays
  leftValue?: unknown; // value from left JSON
  rightValue?: unknown; // value from right JSON
}

function buildMergedTree(left: unknown, right: unknown, changeset: Change[]): MergedTreeNode;
```

Algorithm:

1. Collect all unique keys from both `left` and `right` objects.
2. For each key: if present in changeset → use its type; else → `UNCHANGED`.
3. If both values are objects → recurse into children.
4. If both values are arrays → recurse index-by-index.
5. For leaf values → store `leftValue` and `rightValue`.

### Nested Path Display

- Side-by-side view: nested objects/arrays are collapsible; child fields inherit parent change markers.
- Summary view: each atomic change displays its full JSONPath (e.g., `$.user.address.city`), provided by `atomizeChangeset()`.

### Array Comparison

- Arrays are compared index-by-index (positional matching) by default.
- `json-diff-ts` supports key-based array identity tracking via `embeddedObjKeys` option (e.g., `{ items: "id" }`). This is deferred to a future enhancement (YAGNI for v1), but the option is documented here for later use.

### Type Changes

- `treatTypeChangeAsReplace: true` (default) — a value changing from `"123"` to `123` produces a REMOVE + ADD pair.
- In the summary view, consecutive REMOVE/ADD pairs at the same path are merged into a single UPDATE display: `"123"` (string) → `123` (number).

## UI Layout

```
┌─────────────────────────────────────────────────┐
│  Toolbar: [Swap] [Format Both] [Copy Result]    │
├────────────────────┬────────────────────────────┤
│  Left textarea      │  Right textarea            │
│  (file drag-drop)   │  (file drag-drop)          │
├────────────────────┴────────────────────────────┤
│  [Side-by-Side] [Summary]  ← Tab switch         │
├─────────────────────────────────────────────────┤
│  Diff result area                                │
├─────────────────────────────────────────────────┤
│  Stats bar: N updates | M adds | K removes       │
└─────────────────────────────────────────────────┘
```

### Toolbar

| Button      | Action                                   |
| ----------- | ---------------------------------------- |
| Swap        | Exchange left and right JSON inputs      |
| Format Both | Pretty-print both sides (2-space indent) |
| Copy Result | Copy summary as plain text to clipboard  |

### Copy Result Format

```
[UPDATE] $.name: "Luke" → "Luke Skywalker"
[ADD] $.rank: "Commander"
[REMOVE] $.ship
```

### Side-by-Side View

- Two columns, each rendering a JSON tree.
- Each field row is color-coded by change type.
- Nested objects/arrays are collapsible (expand/collapse toggle).
- Shows: key name, value, and change indicator.

### Summary View

- Flat list, one row per change.
- Format: `[TYPE] $.path  oldValue → value`
- Types shown as badges: `[UPDATE]` `[ADD]` `[REMOVE]`.

### Stats Bar

- Fixed at bottom of result area.
- Displays: `N updates | M adds | K removes` (zero-count items hidden).

### Mobile Adaptation

- Input textareas stack vertically (top/bottom).
- Side-by-side view becomes top/bottom layout.
- Summary view remains a single list.

### Input

- Two textareas (left/right) with file drag-and-drop support.
- File drop reads `.json` or `.txt` files via `FileReader`.
- Parse error shown below the offending textarea (line + column).

### Persistence

- Tab selection (side-by-side vs summary) persisted to `localStorage`.
- Key: `okrun:jdiff` (follows `libs/storage-keys.ts` short-name convention: `okrun:sp`, `okrun:md`, `okrun:cron`).

## Error Handling

| Scenario              | Behavior                                         |
| --------------------- | ------------------------------------------------ |
| Invalid JSON          | Show parse error with line/column below textarea |
| Empty/missing input   | No diff triggered, show placeholder text         |
| JSON > 1MB            | Show warning suggesting Text Diff tool instead   |
| Both JSON identical   | Show success toast "JSON objects are identical"  |
| `null` vs missing key | Compared by actual value                         |

## Performance

- 300ms debounce on input change (matches existing diff tool).
- No Web Worker needed — `json-diff-ts` is synchronous and fast (~6KB gzipped).
- Large JSON (>1MB) shows a warning before computing.

## Tool Registration

### `libs/tools.ts`

```ts
{ key: "jsondiff", path: "/jsondiff", icon: ArrowLeftRight }
```

- Category: `text` (same as JSON, Text Diff)
- Icon: `ArrowLeftRight` from Lucide (`GitCompare` is already used by the existing Text Diff tool)

### Tool ordering position

Insert after `json` in the `text` category. Result: `["json", "jsondiff", "regex", "diff", "markdown", "textcase"]`.

## i18n

### Tool Card (`public/locales/{locale}/tools.json`)

```json
// en
{
  "jsondiff": {
    "title": "JSON Diff - Semantic JSON Comparison Tool",
    "shortTitle": "JSON Diff",
    "description": "Compare two JSON objects semantically. Detects value, added, and removed fields with nested path support."
  }
}

// zh-CN
{
  "jsondiff": {
    "title": "JSON Diff - JSON 语义比较工具",
    "shortTitle": "JSON Diff",
    "description": "语义级比较两个 JSON 对象，检测值变更、新增和删除字段，支持嵌套路径展示。",
    "searchTerms": "jsonbijiao jsonchayi chabie duibi"
  }
}
```

### Tool Internal (`public/locales/{locale}/jsondiff.json`)

Strings for: tab labels, toolbar buttons, stats bar, placeholder text, error messages, success messages.

All 10 locales: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `pt-BR`, `fr`, `de`, `ru`.

### Search Terms Strategy

| Locale | Strategy                                       |
| ------ | ---------------------------------------------- |
| en     | No searchTerms needed                          |
| zh-CN  | `jsonbijiao jsonchayi chabie duibi`            |
| zh-TW  | Same romanization as zh-CN                     |
| ja     | `jsonhikaku hikaku sa`                         |
| ko     | `jsonbigyo bigyo chaiji`                       |
| es     | No searchTerms needed (Latin script)           |
| pt-BR  | No searchTerms needed                          |
| fr     | No searchTerms needed                          |
| de     | No searchTerms needed                          |
| ru     | No searchTerms needed (Cyrillic matches title) |

## SEO

- `page.tsx` uses `generatePageMeta()` for OG, Twitter, and alternate URLs.
- Sitemap auto-generated from TOOLS array (no manual changes needed).
- JSON-LD structured data injected by Layout component.

## Testing

- Test files in `libs/jsondiff/__tests__/compare.test.ts`.
- Add `"libs/jsondiff/**/*.test.ts"` to `vitest.config.ts` include array.
- Test cases: identical objects, added/removed/updated fields, nested objects, arrays, type changes, empty inputs, null values.

## Out of Scope

- JSON Path extraction (separate tool, to be designed later).
- Key-based array identity tracking via `embeddedObjKeys` (supported by `json-diff-ts`, deferred to future enhancement).
- Web Worker for diff computation.
- Patch/apply functionality (`applyChangeset`, `revertChangeset` — available in library but not exposed in UI).
- Exporting diff as JSON Patch (RFC 6902).
