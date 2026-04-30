# YAML Converter — Design Spec

## Overview

Add a JSON ↔ YAML bidirectional conversion tool to OmniKit at route `/yaml`. Supports complete YAML 1.2 spec including multi-document YAML, anchors/aliases, and custom tags. Includes real-time syntax validation. All processing is client-side.

## Scope

- **In scope**: JSON → YAML conversion, YAML → JSON conversion, real-time validation, JSON5 input support, multi-document YAML, YAML 1.2 anchors/aliases
- **Out of scope**: YAML editor with syntax highlighting/line numbers, YAML lint/style checking, YAML Schema validation, TOML/other formats

## Technical Decision

**Library**: `yaml` (eemeli/yaml)

| Considered | Rejected because                                                              |
| ---------- | ----------------------------------------------------------------------------- |
| `js-yaml`  | No full YAML 1.2 support (only 1.2 JSON schema subset); not TypeScript-native |
| `yamljs`   | Unmaintained since 2018; no YAML 1.2 support                                  |
| `yaml-ast` | Parser-only, no stringify; not suitable for bidirectional conversion          |

`yaml` is the only JS library with complete YAML 1.2 compliance, TypeScript-native types, zero dependencies, and both parse + stringify support.

## UI Layout

Dual-panel layout (following JSON tool conventions) with cyan/purple panel indicators:

```
┌─ ● Input ───────────── [JSON5] [Clear] ──────────────────┐
│  StyledTextarea (rows=13, font-mono)                      │
│  ↑ drag-and-drop overlay      ↑ CopyButton               │
└───────────────────────────────────────────────────────────┘
  Options: [Indent 2|4|8]  [Sort Keys □]
  ──────────────────────────────────────────────────
  [  JSON → YAML ↓  ] [  YAML → JSON ↑  ] [Clear All]
  ──────────────────────────────────────────────────
  ⚠ Error display (line + column, aria-live)
┌─ ● Output ────────────────── [Backfill] [Clear] ─────────┐
│  StyledTextarea (rows=13, font-mono, readOnly)            │
│  ↑ CopyButton                                             │
└───────────────────────────────────────────────────────────┘

[Description Section]
  - What is YAML
  - YAML vs JSON
  - YAML 1.2 Features (anchors, aliases, multi-doc)
  - Use Cases
  - Limitations
```

### Indent Selector

Pill-shaped radio group: **2 | 4 | 8** only. No TAB option — YAML spec recommends space indentation, and the `yaml` library's `stringify` requires numeric indent. This avoids a Tab→2-space silent fallback that would confuse users.

### Panel Color Indicators

- **Input panel**: cyan dot (`bg-accent-cyan/60`) — matches JSON/Base64 tools
- **Output panel**: purple dot (`bg-accent-purple/60`) — matches JSON/Base64 tools

## File Structure

```
app/[locale]/yaml/
  page.tsx              # Route entry (generateMetadata + renders YamlPage)
  yaml-page.tsx         # Main page component — all UI and logic inline

public/locales/
  en/yaml.json          # English translations
  zh-CN/yaml.json       # Simplified Chinese translations
  zh-TW/yaml.json       # Traditional Chinese translations
```

All conversion/validation logic is inline in `yaml-page.tsx` (same pattern as JSON tool — no `libs/yaml/` directory). The JSON tool has `tryParse`, `deepSortKeys`, `extractError`, `stringify` all inline in `json-page.tsx`; we follow the same pattern.

### Tool Registration

1. Add `{ key: "yaml", path: "/yaml", icon: FileBraces }` to `libs/tools.ts` TOOLS array (after `urlencoder`, before `uuid`).
2. Add entries to `public/locales/{en,zh-CN,zh-TW}/tools.json`.
3. Import `FileBraces` from `lucide-react` in `libs/tools.ts`. (`FileJson` is used by JSON tool, `FileCode` by Base64 — both already taken. `FileBraces` visually represents `{ }` which fits JSON/YAML.)

#### en/tools.json

```json
"yaml": {
  "title": "YAML Converter - JSON to YAML & YAML to JSON",
  "shortTitle": "JSON / YAML Converter",
  "description": "Convert between JSON and YAML formats with full YAML 1.2 support. Handles multi-document YAML, anchors, and aliases. 100% client-side."
}
```

#### zh-CN/tools.json

```json
"yaml": {
  "title": "YAML 转换器 - JSON 转 YAML & YAML 转 JSON",
  "shortTitle": "JSON / YAML 转换",
  "description": "在 JSON 和 YAML 格式之间双向转换，支持完整 YAML 1.2 规范。处理多文档 YAML、锚点和别名。100% 浏览器端处理。",
  "searchTerms": "yamlzhuanhuanqi ylzhq jsonzhuanyaml yamlzhuanjson"
}
```

#### zh-TW/tools.json

```json
"yaml": {
  "title": "YAML 轉換器 - JSON 轉 YAML & YAML 轉 JSON",
  "shortTitle": "JSON / YAML 轉換",
  "description": "在 JSON 和 YAML 格式之間雙向轉換，支援完整 YAML 1.2 規範。處理多文件 YAML、錨點和別名。100% 瀏覽器端處理。",
  "searchTerms": "yamlzhuanhuanqi ylzhq jsonzhuanyaml yamlzhuanjson"
}
```

**searchTerms breakdown**:

| Token             | Type            | Rationale                          |
| ----------------- | --------------- | ---------------------------------- |
| `yamlzhuanhuanqi` | Full pinyin     | From shortTitle "JSON/YAML 转换"   |
| `ylzhq`           | Pinyin initials | Quick abbreviation                 |
| `jsonzhuanyaml`   | Keyword         | Tool-specific: JSON→YAML direction |
| `yamlzhuanjson`   | Keyword         | Tool-specific: YAML→JSON direction |

## Core Logic (inline in yaml-page.tsx)

### Type Definitions

```typescript
type IndentSize = 2 | 4 | 8;

type YamlError = {
  message: string;
  line?: number;
  column?: number;
};
```

### Helper Functions

```typescript
// Try strict JSON first, fallback to JSON5 (matches JSON tool pattern)
function tryParseJson(input: string, json5Mode: boolean): unknown {
  if (json5Mode) return json5.parse(input);
  try {
    return JSON.parse(input);
  } catch {
    return json5.parse(input);
  }
}

// Deep sort object keys recursively (copied from JSON tool pattern)
function deepSortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepSortKeys);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = deepSortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

// Extract error info from yaml library errors
// linePos is optional on YAMLError — only populated when prettyErrors=true (default)
function extractYamlError(e: unknown): YamlError {
  if (e && typeof e === "object" && "message" in e) {
    const err = e as { message: string; linePos?: [{ line: number; col: number }] };
    if (err.linePos?.[0]) {
      return { message: err.message, line: err.linePos[0].line, column: err.linePos[0].col };
    }
    return { message: err.message };
  }
  return { message: String(e) };
}
```

### Conversion Functions

```typescript
// JSON (or JSON5) → YAML
function jsonToYaml(
  input: string,
  options: { indent: IndentSize; sortKeys: boolean; json5Mode: boolean }
): string {
  const parsed = tryParseJson(input, options.json5Mode);
  const target = options.sortKeys ? deepSortKeys(parsed) : parsed;
  return stringify(target, { indentSeq: true, lineWidth: 120, indent: options.indent });
}

// YAML → JSON
function yamlToJson(input: string, options: { indent: IndentSize; sortKeys: boolean }): string {
  const docs = parseAllDocuments(input); // strict defaults to true
  const results = docs.map((d) => d.toJSON());
  const target = options.sortKeys ? deepSortKeys(results) : results;
  return JSON.stringify(results.length === 1 ? results[0] : results, null, options.indent);
}
```

**Notes**:

- `lineWidth: 120` (not 0) — preserves readability for long strings while still wrapping excessively long lines. YAML default is 80 which is too aggressive.
- `parseAllDocuments(input)` — `strict` defaults to `true` in yaml library, no need to pass explicitly.
- No TAB handling — indent is always a number (2/4/8).

## State Management

```typescript
// yaml-page.tsx Conversion component
const [rawContent, setRawContent] = useState("");
const [outputContent, setOutputContent] = useState("");
const [indentSize, setIndentSize] = useState<IndentSize>(2);
const [sortKeys, setSortKeys] = useState(false);
const [json5Mode, setJson5Mode] = useState(false);
const [error, setError] = useState<YamlError | null>(null);
const [isDragging, setIsDragging] = useState(false);
const [outputMode, setOutputMode] = useState<"none" | "json-to-yaml" | "yaml-to-json">("none");

const dragCounterRef = useRef(0);

// Derived state for button disable logic
const isDisabledAction = !rawContent.trim();
const isDisabledClear = !rawContent.trim() && !outputContent.trim();
const isOutputEmpty = !outputContent.trim();
```

No `useMemo`, `useCallback`, or `React.memo` — React Compiler handles memoization automatically.

### Validation useEffect (500ms debounce)

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    if (!rawContent.trim()) {
      setError(null);
      return;
    }
    // Always use yaml.parse for validation — YAML is a superset of JSON
    try {
      parse(rawContent);
      setError(null);
    } catch (e) {
      setError(extractYamlError(e));
    }
  }, 500);
  return () => clearTimeout(timer);
}, [rawContent]);
```

Validation always uses `yaml.parse` regardless of input format — YAML is a superset of JSON, so valid JSON is also valid YAML. This avoids the need for format auto-detection during validation.

### Option Change useEffect (auto-reconvert)

```typescript
useEffect(() => {
  if (outputMode === "json-to-yaml") {
    doJsonToYaml();
  } else if (outputMode === "yaml-to-json") {
    doYamlToJson();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [indentSize, sortKeys]);
```

When indent or sortKeys changes while output is already populated, re-run the active conversion automatically (matches JSON tool pattern).

## Component Structure

Follows the established page component pattern:

```tsx
"use client";

import { useState, useEffect, useRef, type DragEvent } from "react";
import { parse, stringify, parseAllDocuments } from "yaml";
import json5 from "json5";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledTextarea } from "../../../components/ui/input";
import { showToast } from "../../../libs/toast";

// ... helper functions (tryParseJson, deepSortKeys, extractYamlError, jsonToYaml, yamlToJson)

function Conversion() {
  // ... state, effects, handlers
  // Input area (drag-and-drop, JSON5 toggle, clear, copy)
  // Options row (indent selector, sort keys toggle)
  // Action buttons (JSON→YAML, YAML→JSON, Clear All)
  // Error display (role="alert", aria-live="polite")
  // Output area (read-only, copy, backfill)
}

function Description() {
  // What is YAML
  // YAML vs JSON comparison
  // YAML 1.2 Features
  // Use Cases
  // Limitations
}

export default function YamlPage() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  const title = t("yaml.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        {/* Privacy alert banner */}
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <Conversion />
        <Description />
      </div>
    </Layout>
  );
}
```

## Behavior Details

### Conversion Flow

1. User pastes or types input into the input textarea
2. 500ms debounce validation runs (always uses `yaml.parse` — YAML is JSON superset)
3. User clicks "JSON → YAML" or "YAML → JSON"
4. Output appears in the output textarea, `outputMode` is set to track active direction
5. Success/error toast notification

### Real-Time Validation

- 500ms debounce on input change (matches JSON tool pattern)
- Always uses `yaml.parse` for validation (YAML is a superset of JSON)
- Errors displayed inline with line/column numbers using `role="alert"` and `aria-live="polite"`

### Option Change Auto-Reconvert

When indent or sortKeys changes while output is populated, the active conversion re-runs automatically. This matches the JSON tool pattern where changing indent while formatted output is showing re-formats immediately.

### JSON5 Toggle Behavior

When JSON5 toggle changes: clear output content and reset `outputMode` to `"none"` (matches JSON tool pattern).

### Multi-Document YAML

When converting YAML → JSON:

- If the YAML contains multiple documents (separated by `---`), `parseAllDocuments` is used
- Single document → plain JSON object/array
- Multiple documents → JSON array of the parsed documents
- **Round-trip limitation**: Multi-document YAML → JSON array → YAML produces a single-document YAML containing the array, not the original multi-document structure. This is noted in the Description section.

### Anchors/Aliases

The `yaml` library resolves anchors (`&anchor`) and aliases (`*alias`) automatically during parsing. When converting YAML → JSON, the resolved values are emitted. No special handling needed.

### Backfill

The "Backfill" button copies output content back to the input area (same as JSON tool), allowing chained conversions. Only visible when output is non-empty.

### Drag-and-Drop

Same pattern as JSON tool: accept any file dropped into the input textarea. Uses `dragCounterRef` (useRef) to prevent drag-leave flicker from nested elements. No file type filtering — any text file is accepted.

```typescript
const dragCounterRef = useRef(0);

// onDragEnter: increment counter, check for Files type, set isDragging
// onDragLeave: decrement counter, clear isDragging when counter reaches 0
// onDrop: reset counter, read file.text(), set rawContent
```

### Clear All

`doClearAll()` clears both input and output, resets error and outputMode. Shows toast with `tc("allCleared")`, type "danger", duration 2000ms (matches JSON tool).

## Edge Cases

| Scenario                           | Behavior                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Multi-document YAML (`---`)        | Converted to JSON array; round-trip loses multi-doc structure (becomes single-doc with array) |
| YAML anchors (`&`) / aliases (`*`) | Automatically resolved by the library                                                         |
| YAML custom tags (`!!timestamp`)   | Resolved to native types where possible; string fallback                                      |
| Invalid input                      | Inline error display with line/column + toast                                                 |
| Empty input                        | Silent, no error                                                                              |
| Very large files (>1MB)            | Processed normally (client-side only)                                                         |
| Input that looks like neither      | Treated as YAML by default (YAML is very permissive)                                          |
| JSON5 with trailing commas         | Handled when JSON5 toggle is on                                                               |
| Tab input in YAML                  | Not supported — indent selector only offers 2/4/8 spaces                                      |

## Error Handling

```typescript
// Inline error display (matches JSON tool)
{error && (
  <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
    ⚠ {error.message}
    {error.line != null && ` (line ${error.line}${error.column != null ? `, col ${error.column}` : ""})`}
  </div>
)}

// Toast notifications
showToast(t("convertedToYaml"), "success", 2000);  // JSON → YAML success
showToast(t("convertedToJson"), "success", 2000);   // YAML → JSON success
showToast(t("relaxedParse"), "info", 3000);          // JSON parsed as JSON5 fallback
showToast(t("filled"), "success", 2000);             // Backfill success
showToast(tc("allCleared"), "danger", 2000);         // Clear all
showToast(t("invalidInput"), "danger", 3000);        // Parse error
```

## i18n Keys

### en/yaml.json

```json
{
  "input": "Input",
  "inputPlaceholder": "Paste JSON or YAML here...",
  "output": "Output",
  "jsonToYaml": "JSON → YAML",
  "yamlToJson": "YAML → JSON",
  "json5": "JSON5",
  "indent": "Indent",
  "sortKeys": "Sort Keys",
  "backfill": "Fill to Input",
  "dropZone": "Drop .json, .yaml, or .yml file",
  "convertedToYaml": "Converted to YAML",
  "convertedToJson": "Converted to JSON",
  "invalidInput": "Invalid input",
  "relaxedParse": "Parsed as JSON5 (relaxed mode)",
  "filled": "Output filled to input",
  "descriptions": {
    "whatIsTitle": "What is YAML?",
    "whatIsP1": "YAML (YAML Ain't Markup Language) is a human-readable data serialization format commonly used for configuration files, data exchange, and structured content. It uses indentation to denote structure, making it more readable than JSON for complex nested data.",
    "yamlVsJsonTitle": "YAML vs JSON",
    "yamlVsJsonP1": "YAML is a superset of JSON — every valid JSON document is also valid YAML. YAML adds comments (#), multi-document support (---), anchors & aliases (&/*), and a more relaxed syntax. JSON is simpler and more universally supported by programming languages.",
    "yaml12Title": "YAML 1.2 Features",
    "yaml12P1": "YAML 1.2 (2009) is the current specification. Key features include: anchors (&) and aliases (*) for DRY content, multi-document streams separated by ---, explicit type tags (!!str, !!int, !!seq), and block/flow scalar styles.",
    "useCasesTitle": "Use Cases",
    "useCasesP1": "Configuration files (Docker Compose, Kubernetes, CI/CD pipelines), API definitions (OpenAPI/Swagger), data serialization, log file formats, and cross-language data exchange.",
    "limitationsTitle": "Limitations",
    "limitationsP1": "Multi-document YAML converts to a JSON array and cannot be round-tripped back to multi-document YAML. YAML's flexibility can lead to ambiguity — the same data can be represented in multiple ways. Tab indentation is not supported (YAML spec recommends spaces)."
  }
}
```

### zh-CN/yaml.json

```json
{
  "input": "输入",
  "inputPlaceholder": "在此粘贴 JSON 或 YAML...",
  "output": "输出",
  "jsonToYaml": "JSON → YAML",
  "yamlToJson": "YAML → JSON",
  "json5": "JSON5",
  "indent": "缩进",
  "sortKeys": "排序键名",
  "backfill": "回填到输入",
  "dropZone": "拖放 .json、.yaml 或 .yml 文件",
  "convertedToYaml": "已转换为 YAML",
  "convertedToJson": "已转换为 JSON",
  "invalidInput": "输入无效",
  "relaxedParse": "已使用 JSON5 宽松模式解析",
  "filled": "输出已回填到输入",
  "descriptions": {
    "whatIsTitle": "什么是 YAML？",
    "whatIsP1": "YAML（YAML Ain't Markup Language）是一种人类可读的数据序列化格式，广泛用于配置文件、数据交换和结构化内容。它使用缩进表示层级结构，对于复杂的嵌套数据比 JSON 更易读。",
    "yamlVsJsonTitle": "YAML 与 JSON",
    "yamlVsJsonP1": "YAML 是 JSON 的超集——每个合法的 JSON 文档同时也是合法的 YAML。YAML 增加了注释（#）、多文档支持（---）、锚点和别名（&/*）以及更宽松的语法。JSON 更简洁，被更多编程语言原生支持。",
    "yaml12Title": "YAML 1.2 特性",
    "yaml12P1": "YAML 1.2（2009）是当前规范。主要特性包括：锚点（&）和别名（*）实现内容复用、--- 分隔多文档流、显式类型标签（!!str、!!int、!!seq）以及块/流式标量风格。",
    "useCasesTitle": "使用场景",
    "useCasesP1": "配置文件（Docker Compose、Kubernetes、CI/CD 流水线）、API 定义（OpenAPI/Swagger）、数据序列化、日志文件格式和跨语言数据交换。",
    "limitationsTitle": "局限性",
    "limitationsP1": "多文档 YAML 会转换为 JSON 数组，无法无损地转回多文档 YAML。YAML 的灵活性可能导致歧义——相同的数据可以有多种表示方式。不支持 Tab 缩进（YAML 规范推荐使用空格）。"
  }
}
```

### zh-TW/yaml.json

```json
{
  "input": "輸入",
  "inputPlaceholder": "在此貼上 JSON 或 YAML...",
  "output": "輸出",
  "jsonToYaml": "JSON → YAML",
  "yamlToJson": "YAML → JSON",
  "json5": "JSON5",
  "indent": "縮排",
  "sortKeys": "排序鍵名",
  "backfill": "回填到輸入",
  "dropZone": "拖放 .json、.yaml 或 .yml 檔案",
  "convertedToYaml": "已轉換為 YAML",
  "convertedToJson": "已轉換為 JSON",
  "invalidInput": "輸入無效",
  "relaxedParse": "已使用 JSON5 寬鬆模式解析",
  "filled": "輸出已回填到輸入",
  "descriptions": {
    "whatIsTitle": "什麼是 YAML？",
    "whatIsP1": "YAML（YAML Ain't Markup Language）是一種人類可讀的資料序列化格式，廣泛用於設定檔、資料交換和結構化內容。它使用縮排表示層級結構，對於複雜的巢狀資料比 JSON 更易讀。",
    "yamlVsJsonTitle": "YAML 與 JSON",
    "yamlVsJsonP1": "YAML 是 JSON 的超集——每個合法的 JSON 文件同時也是合法的 YAML。YAML 增加了註解（#）、多文件支援（---）、錨點和別名（&/*）以及更寬鬆的語法。JSON 更簡潔，被更多程式語言原生支援。",
    "yaml12Title": "YAML 1.2 特性",
    "yaml12P1": "YAML 1.2（2009）是當前規範。主要特性包括：錨點（&）和別名（*）實現內容複用、--- 分隔多文件流、顯式類型標籤（!!str、!!int、!!seq）以及區塊/流式純量風格。",
    "useCasesTitle": "使用場景",
    "useCasesP1": "設定檔（Docker Compose、Kubernetes、CI/CD 管線）、API 定義（OpenAPI/Swagger）、資料序列化、日誌檔案格式和跨語言資料交換。",
    "limitationsTitle": "限制",
    "limitationsP1": "多文件 YAML 會轉換為 JSON 陣列，無法無損地轉回多文件 YAML。YAML 的靈活性可能導致歧義——相同的資料可以有多種表示方式。不支援 Tab 縮排（YAML 規範推薦使用空格）。"
  }
}
```

## Out of Scope (Explicitly Not Doing)

- YAML code editor (syntax highlighting, line numbers) — would require CodeMirror integration
- YAML linting / style checking
- YAML Schema validation (JSON Schema, etc.)
- TOML, XML, or other format conversion
- YAML merge key (`<<:`) special UI
- Server-side processing
- Tab indentation option (YAML spec recommends spaces; library requires numeric indent)
