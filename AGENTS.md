# AGENTS.md — OmniKit

## Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with CSS variables
- **i18n**: next-intl (English, 简体中文, 繁體中文)
- **Crypto**: CryptoJS, jose (JWT)
- **PWA**: Serwist (Service Worker)
- **Testing**: Vitest
- **Linting**: ESLint (eslint-config-next/core-web-vitals + eslint-config-prettier)
- **Commit Convention**: commitlint + Husky + lint-staged

## Project Overview

OmniKit is a collection of browser-based developer utilities. All operations run entirely in the browser — no data is sent to any server.

Site URL: `omnikit.run`

## Available Tools

| Route          | Tool                  | Description                                                                            |
| -------------- | --------------------- | -------------------------------------------------------------------------------------- |
| `/json`        | JSON                  | Format, minify, validate JSON/JSON5, configurable indentation                          |
| `/base64`      | Base64                | Base64 encoding/decoding, Basic Auth header                                            |
| `/jwt`         | JWT                   | Encode, decode, verify JWT (HS/RS/ES/PS 256/384/512)                                   |
| `/urlencoder`  | URL Encoder           | URL encoding/decoding with Component, Whole URL, Form modes                            |
| `/uuid`        | UUID                  | UUID v1/v3/v4/v5/v7 generation (RFC 4122/9562)                                         |
| `/regex`       | Regex Tester          | Regex testing with real-time matching, presets, explain mode, Web Worker               |
| `/qrcode`      | QR Code Generator     | QR code generation with logo, custom styling, SVG/PNG export                           |
| `/diff`        | Text Diff             | Side-by-side or inline diff with word-level highlights, Web Worker powered             |
| `/hashing`     | Hashing               | MD5, SHA-1/224/256/384/512, SHA3, Keccak, RIPEMD-160                                   |
| `/password`    | Password Generator    | Secure, memorable password generation                                                  |
| `/textcase`    | Text Case Converter   | camelCase, PascalCase, snake_case, kebab-case, and more                                |
| `/cipher`      | Encrypt/Decrypt       | AES, DES, Triple DES, Rabbit, RC4, RC4Drop                                             |
| `/cron`        | Cron                  | Build/decode Cron expressions (Standard, Spring, Quartz), next-run preview             |
| `/unixtime`    | Unix Timestamp        | Timestamp ↔ date conversion, live clock, seconds/milliseconds, local/UTC               |
| `/markdown`    | Markdown              | Editor & live preview with GFM, syntax highlighting, PDF/PNG export                    |
| `/dbviewer`    | DB Viewer             | SQLite viewer with SQL editor, autocomplete, pagination, CSV/JSON export               |
| `/checksum`    | File Checksum         | Unlimited file size checksums                                                          |
| `/storageunit` | Storage Unit          | Byte, KB, MB, GB, TB, PB conversion                                                    |
| `/color`       | Color Tool            | Color picker, HEX/RGB/HSL/OKLCH conversion, image palette, contrast, vision simulation |
| `/ascii`       | ASCII Table           | ASCII reference with conversions                                                       |
| `/htmlcode`    | HTML Code             | HTML special characters reference                                                      |
| `/httpstatus`  | HTTP Status Codes     | HTTP status code reference with categories, search, spec links                         |
| `/numbase`     | Number Base Converter | BIN/OCT/DEC/HEX conversion, two's complement, bit editor                               |
| `/csv`         | CSV Converter         | CSV ↔ JSON / Markdown Table / TSV format conversion                                    |

## Architecture Rules

### React Compiler memoization

This project uses React Compiler (via `eslint-config-next/core-web-vitals`). The compiler automatically memoizes values — **never manually write `useMemo`, `useCallback`, or `React.memo`**.

```tsx
// ❌ WRONG — will fail eslint
const filtered = useMemo(() => list.filter(...), [list, search]);

// ✅ CORRECT — let React Compiler auto-memoize
const q = search.trim().toLowerCase();
const filtered = !q ? list : list.filter(...);
```

### Simplicity first

Follow Go's "less is more" philosophy. Never abstract prematurely.

- **YAGNI**: Implement only what the requirements document explicitly asks for.
- **Anti over-engineering**: Simple functions and plain structs beat complex interface hierarchies.

## Page Structure

Each tool has **two files** in its directory:

```
app/[locale]/base64/
├── page.tsx          # Route entry - loads data/hydration
└── base64-page.tsx   # Page component with business logic
```

**Pattern:**

- `page.tsx` — route entry with optional static params, loads initial data
- `<tool>-page.tsx` — default export page component, contains all UI and logic

### Page Component Structure

Each page follows a consistent structure:

```tsx
"use client";

import { useState } from "react";
import Layout from "../../../components/layout";
import { useTranslations } from "next-intl";
// ... UI components

function Conversion() {
  const t = useTranslations("tool-name");
  // ... state and handlers
}

function Description() {
  // ... optional description/help section
}

export default function ToolPage() {
  const t = useTranslations("tools");
  return (
    <Layout title={t("tool.shortTitle")}>
      <Conversion />
      <Description />
    </Layout>
  );
}
```

## UI Components

### Primitives (components/ui/)

| Component              | Usage                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`               | Action buttons (`variant="primary \| secondary \| danger \| outline \| outline-blue \| outline-cyan \| outline-purple"`, `size="sm \| md \| lg"`) |
| `Input`                | Text input fields (StyledInput alias)                                                                                                             |
| `Textarea`             | Multi-line text areas (StyledTextarea alias, `rows={n}`)                                                                                          |
| `LineNumberedTextarea` | Textarea with line numbers, auto-grow, scroll sync                                                                                                |
| `CopyButton`           | Copy to clipboard (`getContent={() => text}`)                                                                                                     |
| `Card`                 | Container with shadow/hover effects                                                                                                               |
| `Badge`                | Small label/tag                                                                                                                                   |
| `Tabs`                 | Tab navigation (`NeonTabs`, Headless UI `Tab` wrapper)                                                                                            |
| `Accordion`            | Collapsible sections (Headless UI `Disclosure` wrapper)                                                                                           |
| `Dropdown`             | Dropdown menu                                                                                                                                     |
| `Toast`                | Notification (via `showToast(message, type, duration)`)                                                                                           |

### Color components (components/color/)

| Component              | Usage                                      |
| ---------------------- | ------------------------------------------ |
| `ColorPicker`          | Full-featured color picker                 |
| `ColorHistoryBar`      | Recent color history display               |
| `ImagePaletteDropzone` | Image drag-and-drop for palette extraction |
| `VisionFilterDefs`     | SVG filters for color vision simulation    |

### Shared components (components/)

| Component          | Usage                               |
| ------------------ | ----------------------------------- |
| `Layout`           | Page layout wrapper                 |
| `Header`           | Site header                         |
| `Footer`           | Site footer                         |
| `ToolsDrawer`      | Fuzzy-search tool navigation drawer |
| `LanguageSwitcher` | Locale switcher                     |
| `FloatingToolbar`  | Floating action toolbar             |
| `JsonLd`           | JSON-LD structured data (SEO)       |
| `IosSplashLinks`   | iOS PWA splash screen link tags     |

## Theme & Styling

**Colors** (defined in `app/globals.css`):

### Core palette

| Variable           | Light     | Dark      | Usage            |
| ------------------ | --------- | --------- | ---------------- |
| `--bg-base`        | `#f8fafc` | `#0b0f1a` | Background       |
| `--bg-surface`     | `#ffffff` | `#111827` | Cards            |
| `--bg-elevated`    | `#ffffff` | `#1e293b` | Elevated         |
| `--bg-input`       | `#f1f5f9` | `#0d1117` | Input fields     |
| `--fg-primary`     | `#0f172a` | `#f1f5f9` | Main text        |
| `--fg-secondary`   | `#475569` | `#94a3b8` | Secondary text   |
| `--fg-muted`       | `#94a3b8` | `#64748b` | Muted text       |
| `--border-default` | `#e2e8f0` | `#1e293b` | Borders          |
| `--border-subtle`  | `#f1f5f9` | `#334155` | Subtle borders   |
| `--accent-cyan`    | `#06d6a0` | `#06d6a0` | Primary accent   |
| `--accent-purple`  | `#8b5cf6` | `#8b5cf6` | Secondary accent |
| `--danger`         | `#ef4444` | `#ef4444` | Danger/delete    |

### Semantic variables

| Variable                            | Usage                                  |
| ----------------------------------- | -------------------------------------- |
| `--json-*`                          | JSON viewer syntax highlighting colors |
| `--cron-hour`                       | Cron expression hour field color       |
| `--cron-dom`                        | Cron expression day-of-month color     |
| `--cron-month`                      | Cron expression month color            |
| `--cron-dow`                        | Cron expression day-of-week color      |
| `--tool-icon-0` to `--tool-icon-19` | Tool icon color palette (20 colors)    |

### Tailwind custom utilities

| Utility class        | Effect                      |
| -------------------- | --------------------------- |
| `text-shadow-glow`   | Cyan text glow              |
| `border-glow`        | Subtle cyan border glow     |
| `border-glow-strong` | Strong cyan border glow     |
| `bg-grid-pattern`    | Subtle cyan grid background |

**Tailwind usage:**

- Use Tailwind utility classes
- Reference CSS variables via Tailwind theme: `bg-bg-base`, `text-fg-primary`, etc.
- Avoid custom CSS unless necessary
- Follow existing patterns in page components

**Fonts:**

- **Sans**: Inter
- **Mono**: JetBrains Mono

## i18n

Supports three locales with next-intl:

| Locale              | Code    | URL             |
| ------------------- | ------- | --------------- |
| English             | `en`    | `/` (no prefix) |
| Simplified Chinese  | `zh-CN` | `/zh-CN`        |
| Traditional Chinese | `zh-TW` | `/zh-TW`        |

**i18n routing**: `as-needed` - default locale has no prefix.

### Using Translations

```tsx
const t = useTranslations("tool-name"); // tool-specific namespace
const tc = useTranslations("common"); // shared translations
const ts = useTranslations("site"); // site config
```

Translation files located in `public/locales/` directory.

### Tool searchTerms (`tools.json`)

`searchTerms` is an **optional** field in `public/locales/{locale}/tools.json`. It powers the ToolsDrawer fuzzy search via fuzzysort, matching against both `title` and `searchTerms`.

**Rules:**

- **English (`en`)**: Omit `searchTerms` entirely. The `shortTitle` is already English and fuzzysort matches it directly.
- **Chinese (`zh-CN` / `zh-TW`)**: Include `searchTerms` with space-separated tokens. **Maximum 5 tokens.** Format:

```
"<pinyin full> <pinyin initials> <keyword1> <keyword2> <keyword3>"
```

| Position | Token type         | Description                                                                                     | Example (密码生成器)    |
| -------- | ------------------ | ----------------------------------------------------------------------------------------------- | ----------------------- |
| 1        | Pinyin full        | Full pinyin of the tool's `shortTitle`, no spaces                                               | `mimashengchengqi`      |
| 2        | Pinyin initials    | First letter of each character's pinyin                                                         | `mmscq`                 |
| 3–5      | Long-tail keywords | Pinyin of **tool-specific** functional keywords derived from the tool's title and core features | `suiji` `mima` `anquan` |

**Keyword selection rules:**

Keywords must be **specific enough to discriminate** — they should strongly associate with THIS tool rather than being applicable to many tools.

| ✅ Good keyword                                 | ❌ Bad keyword                 | Why                                                       |
| ----------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| `suiji` (随机 — random, for Password)           | `shengcheng` (生成 — generate) | "Generate" applies to UUID, QR Code, Password, etc.       |
| `sanlie` (散列 — hash, for Hashing)             | `jisuan` (计算 — compute)      | Too generic, matches Checksum, Hashing, Number Base, etc. |
| `pipei` (匹配 — match, for Regex)               | `chaxun` (查询 — query)        | Matches DB Viewer, Regex, Cron, etc.                      |
| `jsonzhuancsv` (JSON 转 CSV, for CSV Converter) | `zhuanhuan` (转换 — convert)   | Matches Color, Storage Unit, NumBase, Text Case, etc.     |

**Derivation strategy:** Look at the tool's `shortTitle` + `description` and pick keywords that are:

1. Unique to this tool's domain (e.g. `sanlie` for hashing, `pipei` for regex)
2. A specific sub-action users would search for (e.g. `yasuo` for JSON compression)
3. A recognizable English term used in the Chinese title (e.g. `json`, `base64`, `jwt`)

If fewer than 3 good keywords exist, use fewer — do not pad with generic terms.

**Example:**

```json
// zh-CN/tools.json
{
  "password": {
    "shortTitle": "密码生成器",
    "searchTerms": "mimashengchengqi mmscq suiji mima anquan"
  },
  "json": {
    "shortTitle": "JSON 格式化/压缩",
    "searchTerms": "jsongeshihua jsgsh yasuo meihua json5"
  },
  "regex": {
    "shortTitle": "正则测试器",
    "searchTerms": "zhengzeceshiqi zzcsq pipei zhengze tubiao"
  }
}
```

```json
// en/tools.json — no searchTerms needed
{
  "password": {
    "shortTitle": "Password Generator"
  }
}
```

**Code path**: `libs/tools.ts` → `getToolCards()` reads `searchTerms` with `t.has()` guard. `libs/tools-search.ts` → `searchTools()` searches `["title", "searchTerms"]` via fuzzysort.

## Business Logic

Libraries in `libs/`:

| File                              | Purpose                                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `tools.ts`                        | Tool registry (name, route, icon, color)                                                                   |
| `tools-search.ts`                 | Fuzzy search for tools (fuzzysort)                                                                         |
| `site.ts`                         | Site metadata (`SITE_URL`)                                                                                 |
| `seo.ts`                          | SEO metadata generation (OG, Twitter, alternates)                                                          |
| `theme.tsx`                       | Theme provider (light/dark)                                                                                |
| `toast.ts`                        | Toast notification system                                                                                  |
| `storage-keys.ts`                 | localStorage key constants                                                                                 |
| `json-view-theme.ts`              | JSON viewer theme config                                                                                   |
| `uuid/main.ts`                    | UUID v4/v7 generation                                                                                      |
| `password/main.ts`, `wordlist.ts` | Password generation                                                                                        |
| `ascii.ts`                        | ASCII table data                                                                                           |
| `htmlcode.ts`                     | HTML entities data                                                                                         |
| `httpstatus.ts`                   | HTTP status code registry with categories                                                                  |
| `jwt/main.ts`                     | JWT encode/decode/verify                                                                                   |
| `diff/`                           | Text diff computation (Web Worker)                                                                         |
| `markdown/`                       | Markdown rendering, highlight, export                                                                      |
| `dbviewer/`                       | SQLite engine, SQL autocomplete, export                                                                    |
| `cron/`                           | Cron parser, generator, describer                                                                          |
| `unixtime/main.ts`                | Timestamp conversion logic                                                                                 |
| `file/`                           | File type detection, binary sniffing, size limits                                                          |
| `pwa/`                            | PWA splash screen config                                                                                   |
| `numbase/main.ts`                 | Number base conversion (BIN/OCT/DEC/HEX)                                                                   |
| `color/`                          | Color conversion (HEX/RGB/HSL/OKLCH), contrast (APCA), named colors, palette extraction, vision simulation |
| `regex/`                          | Regex engine, match/explain/replace, pattern presets, Web Worker                                           |
| `qrcode/`                         | QR code encoding, styling, capacity calculation                                                            |
| `textcase/main.ts`                | Text case conversion (camel, pascal, snake, etc.)                                                          |
| `csv/`                            | CSV parse/stringify, format conversion, flatten                                                            |

## Hooks

Custom React hooks in `hooks/`:

| Hook            | Purpose                                    |
| --------------- | ------------------------------------------ |
| `useFullscreen` | Fullscreen toggle with session persistence |
| `useIsMobile`   | Responsive breakpoint detection (768px)    |
| `useDraggable`  | Drag-to-move with position persistence     |

## Utilities

Pure functions in `utils/`:

| File         | Purpose              |
| ------------ | -------------------- |
| `storage.ts` | localStorage wrapper |
| `math.ts`    | Math utilities       |
| `path.ts`    | Path utilities       |

## Testing

Test framework: **Vitest**

```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
```

Test files are co-located in `libs/` subdirectories as `__tests__/` folders.

Configured test scopes (`vitest.config.ts`): `dbviewer`, `unixtime`, `cron`, `qrcode`, `textcase`, `color`, `regex`, `csv`, `numbase`.

## SEO

- `libs/seo.ts` — `generatePageMeta()` generates canonical URLs, alternates (all locales), OG, and Twitter metadata
- `components/json-ld.tsx` — JSON-LD structured data (WebSite, WebApplication, BreadcrumbList schemas)
- `app/sitemap.ts` — Dynamic sitemap generation for all tools across all locales

## Version Control

### Commit Message Format

Strictly follow Conventional Commits (enforced by commitlint):

```
<type>(<scope>): <subject>
```

| Type       | Usage                |
| ---------- | -------------------- |
| `feat`     | New tool, feature    |
| `fix`      | Bug fix              |
| `refactor` | Code refactor        |
| `test`     | Test changes         |
| `chore`    | Dependencies, config |
| `docs`     | Documentation        |
| `perf`     | Performance          |

### Git Hooks

Husky + lint-staged configured:

- Prettier on `*.{js,jsx,ts,tsx,mjs,json,css,scss,md}`
- ESLint fix on `*.{js,jsx,ts,tsx,mjs}`

## Response Protocol

### Before Making Changes

1. State which files you will read and modify, and why.
2. Read the relevant source files first. Never assume structure.

### Code Quality

- Show diffs or complete functions, never decontextualized snippets.
- After changes: list every file modified and any required follow-up steps.
- Flag trade-offs explicitly: `// TODO(claude): review this tradeoff`

### Never Do Without Asking

- Rename exported symbols
- Delete files or remove exported functions

### Solution Quality

Always produce the technically correct solution for the problem. Do not cut corners. Correctness and simplicity are not in conflict.
