# YAML Converter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a JSON ↔ YAML bidirectional conversion tool at route `/yaml` with full YAML 1.2 support.

**Architecture:** Single page component (`yaml-page.tsx`) with all logic inline (matching JSON tool pattern — no `libs/yaml/` directory). Dual-panel UI with JSON5 input support, auto-revalidation on option changes, and 500ms debounce validation using yaml.parse (YAML is JSON superset).

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS 4, next-intl, yaml (eemeli/yaml), json5, Lucide icons

---

## Task 1: Install yaml Dependency

**Files:**

- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install yaml package**

```bash
npm install yaml
```

`json5` is already installed (used by JSON tool). No additional dependencies needed.

- [ ] **Step 2: Verify installation**

Run: `grep '"yaml"' package.json`
Expected: Shows `"yaml": "^x.x.x"` in dependencies

- [ ] **Step 3: Commit dependency**

```bash
git add package.json package-lock.json
git commit -m "chore: add yaml dependency for YAML converter tool"
```

---

## Task 2: Register Tool

**Files:**

- Modify: `libs/tools.ts`
- Modify: `i18n/request.ts`

- [ ] **Step 1: Add tool entry to `libs/tools.ts`**

Import `FileBraces` from lucide-react and add the yaml entry after `urlencoder`, before `uuid`:

```ts
// Add FileBraces to the import block at top of file
import {
  FileJson,
  FileCode,
  FileBraces, // ← ADD THIS
  ShieldCheck,
  // ... rest unchanged
} from "lucide-react";
```

```ts
// Insert after urlencoder entry, before uuid entry
  { key: "urlencoder", path: "/urlencoder", icon: Percent },
  { key: "yaml", path: "/yaml", icon: FileBraces },       // ← ADD THIS LINE
  { key: "uuid", path: "/uuid", icon: FingerprintPattern },
```

`FileBraces` is chosen because `FileJson` is used by JSON tool and `FileCode` by Base64 — both already taken. `FileBraces` renders a file icon with `{ }` which fits JSON/YAML.

- [ ] **Step 2: Add namespace to `i18n/request.ts`**

Append `"yaml"` to the `namespaces` array (after `"urlencoder"`, before `"diff"`):

```ts
const namespaces = [
  "common",
  "tools",
  // ... existing entries ...
  "urlencoder",
  "yaml", // ← ADD THIS LINE
  "diff",
  // ... rest unchanged
];
```

- [ ] **Step 3: Commit registration**

```bash
git add libs/tools.ts i18n/request.ts
git commit -m "feat(yaml): register YAML converter tool and i18n namespace"
```

---

## Task 3: Add Tool Entries to tools.json

**Files:**

- Modify: `public/locales/en/tools.json`
- Modify: `public/locales/zh-CN/tools.json`
- Modify: `public/locales/zh-TW/tools.json`

- [ ] **Step 1: Add entry to `public/locales/en/tools.json`**

Add after the `"urlencoder"` entry (no `searchTerms` for English — shortTitle is already searchable):

```json
"yaml": {
  "title": "YAML Converter - JSON to YAML & YAML to JSON",
  "shortTitle": "JSON / YAML Converter",
  "description": "Convert between JSON and YAML formats with full YAML 1.2 support. Handles multi-document YAML, anchors, and aliases. 100% client-side."
},
```

- [ ] **Step 2: Add entry to `public/locales/zh-CN/tools.json`**

```json
"yaml": {
  "title": "YAML 转换器 - JSON 转 YAML & YAML 转 JSON",
  "shortTitle": "JSON / YAML 转换",
  "description": "在 JSON 和 YAML 格式之间双向转换，支持完整 YAML 1.2 规范。处理多文档 YAML、锚点和别名。100% 浏览器端处理。",
  "searchTerms": "yamlzhuanhuanqi ylzhq jsonzhuanyaml yamlzhuanjson"
},
```

- [ ] **Step 3: Add entry to `public/locales/zh-TW/tools.json`**

```json
"yaml": {
  "title": "YAML 轉換器 - JSON 轉 YAML & YAML 轉 JSON",
  "shortTitle": "JSON / YAML 轉換",
  "description": "在 JSON 和 YAML 格式之間雙向轉換，支援完整 YAML 1.2 規範。處理多文件 YAML、錨點和別名。100% 瀏覽器端處理。",
  "searchTerms": "yamlzhuanhuanqi ylzhq jsonzhuanyaml yamlzhuanjson"
},
```

- [ ] **Step 4: Commit tools.json entries**

```bash
git add public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
git commit -m "feat(yaml): add tool card entries with searchTerms for all locales"
```

---

## Task 4: Create i18n Translation Files

**Files:**

- Create: `public/locales/en/yaml.json`
- Create: `public/locales/zh-CN/yaml.json`
- Create: `public/locales/zh-TW/yaml.json`

- [ ] **Step 1: Create `public/locales/en/yaml.json`**

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

- [ ] **Step 2: Create `public/locales/zh-CN/yaml.json`**

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

- [ ] **Step 3: Create `public/locales/zh-TW/yaml.json`**

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

- [ ] **Step 4: Commit i18n files**

```bash
git add public/locales/en/yaml.json public/locales/zh-CN/yaml.json public/locales/zh-TW/yaml.json
git commit -m "feat(yaml): add translation files for en, zh-CN, zh-TW"
```

---

## Task 5: Create Route Entry (page.tsx)

**Files:**

- Create: `app/[locale]/yaml/page.tsx`

- [ ] **Step 1: Create `app/[locale]/yaml/page.tsx`**

Follow the current pattern from JSON tool — uses `generatePageMeta` for SEO metadata:

```tsx
import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import YamlPage from "./yaml-page";

const PATH = "/yaml";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("yaml.title"),
    description: t("yaml.description"),
  });
}

export default function YamlRoute() {
  return <YamlPage />;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -5`
Expected: May show errors for missing yaml-page module (expected — created in Task 6)

- [ ] **Step 3: Commit page.tsx**

```bash
git add app/\[locale\]/yaml/page.tsx
git commit -m "feat(yaml): add route entry with SEO metadata"
```

---

## Task 6: Create Page Component (yaml-page.tsx)

**Files:**

- Create: `app/[locale]/yaml/yaml-page.tsx`

This is the main component. It follows the JSON tool pattern exactly, with YAML-specific adaptations: no TAB option, no JsonView, bidirectional buttons, and yaml.parse for validation.

- [ ] **Step 1: Create `app/[locale]/yaml/yaml-page.tsx`**

```tsx
"use client";

import { useState, useEffect, useRef, type DragEvent } from "react";
import { parse, stringify, parseAllDocuments } from "yaml";
import json5 from "json5";
import { ChevronsDown, ChevronsUp, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";

import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledTextarea } from "../../../components/ui/input";
import { showToast } from "../../../libs/toast";

// --- Types ---

type IndentSize = 2 | 4 | 8;

type YamlError = {
  message: string;
  line?: number;
  column?: number;
};

const INDENT_SIZES: IndentSize[] = [2, 4, 8];

// --- Core Logic ---

// Try strict JSON first, fallback to JSON5 (matches JSON tool pattern)
function tryParseJson(input: string, json5Mode: boolean): unknown {
  if (json5Mode) return json5.parse(input);
  try {
    return JSON.parse(input);
  } catch {
    return json5.parse(input);
  }
}

// Deep sort object keys recursively (same as JSON tool)
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

// --- Conversion Component ---

function Conversion() {
  const t = useTranslations("yaml");
  const tc = useTranslations("common");

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

  // --- Validation: 500ms debounce, always use yaml.parse (YAML is JSON superset) ---

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!rawContent.trim()) {
        setError(null);
        return;
      }
      try {
        parse(rawContent);
        setError(null);
      } catch (e) {
        setError(extractYamlError(e));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [rawContent]);

  // --- Option change: auto-reconvert when indent/sortKeys changes ---

  useEffect(() => {
    if (outputMode === "json-to-yaml") {
      doJsonToYaml();
    } else if (outputMode === "yaml-to-json") {
      doYamlToJson();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indentSize, sortKeys]);

  // --- Conversion Functions ---

  function doJsonToYaml() {
    const input = rawContent.trim();
    if (!input) return;
    try {
      const parsed = tryParseJson(input, json5Mode);
      const target = sortKeys ? deepSortKeys(parsed) : parsed;
      const out = stringify(target, { indentSeq: true, lineWidth: 120, indent: indentSize });
      setOutputContent(out);
      setOutputMode("json-to-yaml");
      showToast(t("convertedToYaml"), "success", 2000);
    } catch (e) {
      if (e instanceof SyntaxError || (e && typeof e === "object" && "message" in e)) {
        setError(extractYamlError(e));
        showToast(t("invalidInput"), "danger", 3000);
      }
    }
  }

  function doYamlToJson() {
    const input = rawContent.trim();
    if (!input) return;
    try {
      const docs = parseAllDocuments(input);
      const results = docs.map((d) => d.toJSON());
      const target = sortKeys ? deepSortKeys(results) : results;
      const out = JSON.stringify(results.length === 1 ? results[0] : results, null, indentSize);
      setOutputContent(out);
      setOutputMode("yaml-to-json");
      showToast(t("convertedToJson"), "success", 2000);
    } catch (e) {
      if (e && typeof e === "object" && "message" in e) {
        setError(extractYamlError(e));
        showToast(t("invalidInput"), "danger", 3000);
      }
    }
  }

  // --- Handlers ---

  function handleJson5Toggle(checked: boolean) {
    setJson5Mode(checked);
    setOutputContent("");
    setOutputMode("none");
  }

  function doClearAll() {
    setRawContent("");
    setOutputContent("");
    setOutputMode("none");
    setError(null);
    showToast(tc("allCleared"), "danger", 2000);
  }

  function doBackfill() {
    setRawContent(outputContent);
    showToast(t("filled"), "success", 2000);
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setRawContent(text);
    setError(null);
    showToast(tc("fileLoaded"), "success", 2000);
  }

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.dataTransfer.dropEffect = "copy";
  }

  function onDragEnter(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    dragCounterRef.current++;
    if (ev.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  async function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = ev.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  // --- Render ---

  return (
    <section id="conversion">
      {/* Input Area */}
      <div
        className="relative"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-cyan bg-accent-cyan/5 backdrop-blur-sm pointer-events-none">
            <div className="text-center">
              <Upload size={40} className="mx-auto mb-3 text-accent-cyan" />
              <p className="text-lg font-semibold text-accent-cyan">{tc("dropActive")}</p>
              <p className="text-sm text-fg-muted mt-1">{t("dropZone")}</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
            <span className="font-mono text-sm font-semibold text-accent-cyan">{t("input")}</span>
            <span className="w-px h-4 bg-border-default mx-0.5" />
            <button
              type="button"
              role="switch"
              aria-checked={json5Mode}
              aria-label={t("json5")}
              onClick={() => handleJson5Toggle(!json5Mode)}
              className={
                "rounded-full px-2 py-0.5 text-xs font-semibold transition-colors cursor-pointer border " +
                (json5Mode
                  ? "bg-accent-purple text-bg-base border-accent-purple"
                  : "bg-transparent text-fg-muted border-border-default hover:text-fg-secondary hover:bg-bg-elevated")
              }
            >
              {t("json5")}
            </button>
          </div>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setRawContent("");
              setError(null);
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
        <div className="relative mt-1">
          <StyledTextarea
            id="rawContentTextarea"
            placeholder={t("inputPlaceholder")}
            rows={13}
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => rawContent} className="absolute end-2 top-2" />
        </div>
      </div>

      {/* Options Row — Indent only (no TAB — YAML requires spaces) */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-fg-muted">{t("indent")}</span>
          <div
            role="radiogroup"
            aria-label={t("indent")}
            className="inline-flex rounded-full border border-border-default overflow-hidden"
          >
            {INDENT_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={indentSize === n}
                onClick={() => setIndentSize(n)}
                className={
                  "px-3 py-1 text-sm font-semibold transition-colors cursor-pointer " +
                  (indentSize === n
                    ? "bg-accent-cyan text-bg-base"
                    : "bg-transparent text-fg-secondary hover:bg-bg-elevated")
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={sortKeys}
          aria-label={t("sortKeys")}
          onClick={() => setSortKeys(!sortKeys)}
          className={
            "rounded-full px-3 py-1 text-sm font-semibold transition-colors cursor-pointer border " +
            (sortKeys
              ? "bg-accent-cyan text-bg-base border-accent-cyan"
              : "bg-transparent text-fg-secondary border-border-default hover:bg-bg-elevated")
          }
        >
          {t("sortKeys")}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 grid grid-cols-3 gap-3 items-center">
        <Button
          variant="primary"
          size="md"
          disabled={isDisabledAction}
          onClick={doJsonToYaml}
          className="rounded-full font-bold"
        >
          {t("jsonToYaml")}
          <ChevronsDown size={16} className="ms-1" />
        </Button>
        <Button
          variant="secondary"
          size="md"
          disabled={isDisabledAction}
          onClick={doYamlToJson}
          className="rounded-full font-bold"
        >
          {t("yamlToJson")}
          <ChevronsUp size={16} className="ms-1" />
        </Button>
        <Button
          variant="danger"
          size="md"
          disabled={isDisabledClear}
          onClick={doClearAll}
          className="rounded-full font-bold"
        >
          {tc("clearAll")}
          <X size={16} className="ms-1" />
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
          ⚠ {error.message}
          {error.line != null &&
            ` (line ${error.line}${error.column != null ? `, col ${error.column}` : ""})`}
        </div>
      )}

      {/* Output Area */}
      <div className="mt-4">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-purple/60" />
            <span className="font-mono text-sm font-semibold text-accent-purple">
              {t("output")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!isOutputEmpty && (
              <button
                type="button"
                className="text-accent-cyan text-xs hover:text-accent-cyan/80 transition-colors cursor-pointer"
                onClick={doBackfill}
              >
                {t("backfill")}
              </button>
            )}
            <button
              type="button"
              className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
              onClick={() => {
                setOutputContent("");
                setOutputMode("none");
                showToast(tc("cleared"), "danger", 2000);
              }}
            >
              {tc("clear")}
            </button>
          </div>
        </div>
        <div className="relative mt-1">
          <StyledTextarea
            id="outputContentTextarea"
            placeholder=""
            rows={13}
            value={outputContent}
            readOnly
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => outputContent} className="absolute end-2 top-2" />
        </div>
      </div>
    </section>
  );
}

// --- Description Component ---

function Description() {
  const t = useTranslations("yaml");

  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whatIsP1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.yamlVsJsonTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.yamlVsJsonP1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.yaml12Title")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.yaml12P1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.useCasesTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.useCasesP1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.limitationsTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.limitationsP1")}</p>
        </div>
      </div>
    </section>
  );
}

// --- Page Export ---

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

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Clean — no errors

- [ ] **Step 3: Commit page component**

```bash
git add app/\[locale\]/yaml/yaml-page.tsx
git commit -m "feat(yaml): add YAML converter page component with full UI"
```

---

## Task 7: Verify Build

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds with no errors. The `/yaml` route is included in the output.

- [ ] **Step 2: Run dev server and verify manually**

```bash
npm run dev
```

Open `http://localhost:3000/yaml` and verify:

1. Page loads with correct title "JSON / YAML Converter"
2. Privacy banner visible at top
3. Input textarea accepts typing
4. JSON → YAML button converts JSON to YAML
5. YAML → JSON button converts YAML to JSON
6. Indent selector (2/4/8) works — no TAB option
7. Sort Keys toggle works
8. JSON5 toggle works
9. Error display shows on invalid input with line/column
10. Backfill button copies output to input
11. Clear All clears everything
12. Drag-and-drop file loading works
13. Tool appears in ToolsDrawer search
14. Language switching works (en, zh-CN, zh-TW)
15. Description section renders with content

- [ ] **Step 3: Commit if any fixes were needed**

If the manual QA uncovered any issues, fix them and commit:

```bash
git add -A
git commit -m "fix(yaml): address QA findings"
```
