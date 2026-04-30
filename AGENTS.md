# AGENTS.md — OmniKit

## Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with CSS variables
- **i18n**: next-intl
- **Crypto**: CryptoJS

## Project Overview

OmniKit is a collection of browser-based developer utilities. All operations run entirely in the browser — no data is sent to any server.

## Available Tools

| Route          | Tool                  | Description                                                                |
| -------------- | --------------------- | -------------------------------------------------------------------------- |
| `/json`        | JSON                  | Format, minify, validate JSON/JSON5, configurable indentation              |
| `/base64`      | Base64                | Base64 encoding/decoding, Basic Auth header                                |
| `/jwt`         | JWT                   | Encode, decode, verify JWT (HS/RS/ES/PS 256/384/512)                       |
| `/urlencoder`  | URL Encoder           | URL encoding/decoding with Component, Whole URL, Form modes                |
| `/uuid`        | UUID                  | UUID v1/v3/v4/v5/v7 generation (RFC 4122/9562)                             |
| `/diff`        | Text Diff             | Side-by-side or inline diff with word-level highlights, Web Worker powered |
| `/hashing`     | Hashing               | MD5, SHA-1/224/256/384/512, SHA3, Keccak, RIPEMD-160                       |
| `/password`    | Password Generator    | Secure, memorable password generation                                      |
| `/cipher`      | Encrypt/Decrypt       | AES, DES, Triple DES, Rabbit, RC4, RC4Drop                                 |
| `/cron`        | Cron                  | Build/decode Cron expressions (Standard, Spring, Quartz), next-run preview |
| `/unixtime`    | Unix Timestamp        | Timestamp ↔ date conversion, live clock, seconds/milliseconds, local/UTC   |
| `/markdown`    | Markdown              | Editor & live preview with GFM, syntax highlighting, PDF/PNG export        |
| `/dbviewer`    | DB Viewer             | SQLite viewer with SQL editor, autocomplete, pagination, CSV/JSON export   |
| `/checksum`    | File Checksum         | Unlimited file size checksums                                              |
| `/storageunit` | Storage Unit          | Byte, KB, MB, GB, TB, PB conversion                                        |
| `/ascii`       | ASCII Table           | ASCII reference with conversions                                           |
| `/htmlcode`    | HTML Code             | HTML special characters reference                                          |
| `/numbase`     | Number Base Converter | BIN/OCT/DEC/HEX conversion, two's complement, bit editor                   |

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

Located in `components/ui/`:

| Component              | Usage                                                               |
| ---------------------- | ------------------------------------------------------------------- |
| `Button`               | Primary action buttons (`variant="primary \| danger"`, `size="md"`) |
| `Input`                | Text input fields (StyledInput alias)                               |
| `Textarea`             | Multi-line text areas (StyledTextarea alias, `rows={n}`)            |
| `LineNumberedTextarea` | Textarea with line numbers, auto-grow, scroll sync                  |
| `Select`               | Dropdown select (`value`, `onChange`)                               |
| `Checkbox`             | Checkbox (`checked`, `onChange`)                                    |
| `CopyButton`           | Copy to clipboard (`getContent={() => text}`)                       |
| `Card`                 | Container with shadow/hover effects                                 |
| `Badge`                | Small label/tag                                                     |
| `Tabs`                 | Tab navigation                                                      |
| `Accordion`            | Collapsible sections                                                |
| `Dropdown`             | Dropdown menu                                                       |
| `Toast`                | Notification (via `showToast(message, type, duration)`)             |

Shared components in `components/`:

- `Layout` — page layout wrapper
- `Header` — site header
- `Footer` — site footer
- `LanguageSwitcher` — locale switcher
- `FloatingToolbar` — floating action toolbar
- `IosSplashLinks` — iOS PWA splash screen link tags

## Theme & Styling

**Colors** (defined in `app/globals.css`):

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

**Tailwind Classes:**

- Use Tailwind utility classes
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

## Business Logic

Libraries in `libs/`:

| File                              | Purpose                                  |
| --------------------------------- | ---------------------------------------- |
| `tools.ts`                        | Tool registry (name, route, icon)        |
| `site.ts`                         | Site metadata                            |
| `theme.tsx`                       | Theme provider (light/dark)              |
| `toast.ts`                        | Toast notification system                |
| `storage-keys.ts`                 | localStorage key constants               |
| `json-view-theme.ts`              | JSON viewer theme config                 |
| `uuid/main.ts`                    | UUID v4/v7 generation                    |
| `password/main.ts`, `wordlist.ts` | Password generation                      |
| `ascii.ts`                        | ASCII table data                         |
| `htmlcode.ts`                     | HTML entities data                       |
| `jwt/main.ts`                     | JWT encode/decode/verify                 |
| `diff/`                           | Text diff computation (Web Worker)       |
| `markdown/`                       | Markdown rendering, highlight, export    |
| `dbviewer/`                       | SQLite engine, SQL autocomplete, export  |
| `cron/`                           | Cron parser, generator, describer        |
| `unixtime/main.ts`                | Timestamp conversion logic               |
| `file/`                           | File type detection, size limits         |
| `pwa/`                            | PWA splash screen config                 |
| `numbase/main.ts`                 | Number base conversion (BIN/OCT/DEC/HEX) |

## Hooks

Custom React hooks in `hooks/`:

| Hook            | Purpose                                    |
| --------------- | ------------------------------------------ |
| `useFullscreen` | Fullscreen toggle with session persistence |
| `useIsMobile`   | Responsive breakpoint detection (768px)    |

## Utilities

Pure functions in `utils/`:

| File         | Purpose              |
| ------------ | -------------------- |
| `storage.ts` | localStorage wrapper |
| `math.ts`    | Math utilities       |
| `path.ts`    | Path utilities       |

## Version Control

### Commit Message Format

Strictly follow Conventional Commits:

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

- Prettier on `*.{js,jsx,ts,tsx,mjs,js,css,scss,md}`
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
