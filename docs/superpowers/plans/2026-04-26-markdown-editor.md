# Markdown Editor & Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-only Markdown editor + live GFM preview at `/markdown` with tab/split views, file upload/download, copy HTML, export PDF/PNG, and proportional scroll sync.

**Architecture:** Next.js App Router route under `app/[locale]/markdown/`. Pure utilities in `libs/markdown/`. Single-source `markdown` state drives a 200ms-debounced `renderMarkdown()` (markdown-it + Prism + task-lists plugin) → HTML written into preview via `dangerouslySetInnerHTML`. Above 512 KB, auto-render is suspended in favor of a manual "Render now" button. Shared file-handling primitives (`MAX_FILE_BYTES`, `isBinaryFile`) and the `useIsMobile` hook are extracted from the existing Diff tool to `libs/file/` and `hooks/` so both tools consume them.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, next-intl 4. New deps: `markdown-it@14.1.0`, `markdown-it-task-lists@2.1.1`, `prismjs@1.29.0`, `modern-screenshot@4.4.39`, `@types/markdown-it@14.1.2` (dev), `@types/markdown-it-task-lists@2.1.0` (dev), `@types/prismjs@1.26.5` (dev).

---

## Project conventions you must follow

**Read these before writing a single line** — breaking them will cause lint/build to fail or runtime to malfunction:

1. **React Compiler is enabled.** Never write `useMemo`, `useCallback`, or `React.memo` manually. Plain values re-derived on each render are fine — the compiler memoizes them. ESLint rule `react-hooks/preserve-manual-memoization` will fail otherwise.
2. **No external UI libs beyond `@headlessui/react`.** Use `components/ui/*` (Button, CopyButton, …) and raw Tailwind utilities. Don't pull in Radix, shadcn/ui, etc.
3. **Theme.** Global theme is set by `libs/theme.tsx` + `.dark` class on `<html>`. Tool pages **never** render their own theme switch. Tokens are exposed via `@theme` in `app/globals.css` (Tailwind 4 pattern).
4. **i18n.** Each tool has its own flat-key JSON namespace under `public/locales/{en,zh-CN,zh-TW}/<tool>.json`. **The namespace must be added to `i18n/request.ts`'s `namespaces` array** — without that, the JSON file is never loaded. Page components call `useTranslations("<tool>")`.
5. **Sitemap is auto-generated** from `libs/tools.ts`'s `TOOLS` array (see `app/sitemap.ts`). Adding `{ key, path }` to `TOOLS` is sufficient — no separate sitemap edit. (The spec's "Update `app/sitemap.ts`" step is therefore a no-op; ignore it.)
6. **Paths.** Always use the project-root-relative form used by siblings (e.g. `../../../components/ui/button`, `../../../libs/toast`). No `@/…` aliases exist in `tsconfig.json`.
7. **Comments in English.** Per `AGENTS.md`. Avoid Chinese comments in source.
8. **Commits.** Conventional Commits (`feat(markdown): …`, `refactor(file): …`). Always use `rtk git …` per user rules.
9. **No test framework.** Project has no jest/vitest/playwright. Verification per task is `rtk npx tsc --noEmit` + `rtk npx next lint` + manual behavior check via `rtk npm run dev` in a browser. Treat "run tests" steps as "run type-check + exercise the feature".

---

## Design decisions pinned by this plan

These are decisions the spec left to the implementation plan. They are **locked** — do not re-debate them while executing.

| Decision                                                                      | Value                                                                      | Rationale                                                                                                                        |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Add dep                                                                       | `markdown-it@14.1.0`                                                       | Exact pin (matches sibling plans' convention)                                                                                    |
| Add dep                                                                       | `markdown-it-task-lists@2.1.1`                                             | GFM `- [ ]` checkboxes                                                                                                           |
| Add dep                                                                       | `prismjs@1.29.0`                                                           | Syntax highlighting; current stable                                                                                              |
| Add dep                                                                       | `modern-screenshot@4.4.39`                                                 | DOM → PNG export                                                                                                                 |
| Dev dep                                                                       | `@types/markdown-it@14.1.2`                                                | TS types for markdown-it                                                                                                         |
| Dev dep                                                                       | `@types/markdown-it-task-lists@2.1.0`                                      | TS types for plugin                                                                                                              |
| Dev dep                                                                       | `@types/prismjs@1.26.5`                                                    | TS types for Prism                                                                                                               |
| Storage key                                                                   | `markdown: "bc:md"`                                                        | Single JSON object stores `{ viewMode }`. Mirrors `bc:diff` pattern.                                                             |
| Auto-render threshold                                                         | `AUTO_RENDER_MAX_BYTES = 512 * 1024`                                       | per spec                                                                                                                         |
| Debounce                                                                      | `RENDER_DEBOUNCE_MS = 200`                                                 | per spec                                                                                                                         |
| Editor line-number guard                                                      | `lineCount <= 5000 && length < 512 * 1024`                                 | mirrors `DiffInput.tsx:77`                                                                                                       |
| Home icon                                                                     | `FileText` from `lucide-react`                                             | Generic Markdown affordance, not yet used by another tool                                                                        |
| Print page margin                                                             | `1.5cm`                                                                    | per spec                                                                                                                         |
| PNG scale                                                                     | `2`                                                                        | Retina output                                                                                                                    |
| File size cap                                                                 | `MAX_FILE_BYTES = 5 * 1024 * 1024` (relocated from `libs/diff/compute.ts`) | per spec                                                                                                                         |
| Mobile breakpoint                                                             | `768` px (default of `useIsMobile`)                                        | matches `md:` Tailwind breakpoint, same as Diff                                                                                  |
| `validateLink` allowlist                                                      | `http(s)`, `mailto`, `tel`, `data:image/{gif,png,jpe?g,webp};base64`, `#/` | Defense-in-depth over markdown-it's default `BAD_PROTO_RE`. Whitelist is provably exhaustive.                                    |
| Task-list plugin opts                                                         | `{ enabled: false }`                                                       | Render checkboxes as read-only (markdown is for display, not form input)                                                         |
| Sitemap                                                                       | Auto via `TOOLS` array                                                     | No separate edit to `app/sitemap.ts`                                                                                             |
| Container max-width                                                           | None — only `container mx-auto px-4` (sibling default)                     | Matches Diff and other tools                                                                                                     |
| `prismjs/components/*` imports for core langs (`javascript`, `css`, `markup`) | Imported anyway for explicitness                                           | These are technically already in Prism core; importing the component file is a no-op but documents the intent. Cost: zero bytes. |

---

## File structure

```
app/[locale]/markdown/
├── page.tsx                      # Server Component: generateMetadata + <MarkdownPage />
├── markdown-page.tsx             # Client Component: state, debounce, persistence, layout, scroll sync
└── components/
    ├── EditorView.tsx            # Edit panel: LineNumberedTextarea + Tab indent + line-number guard
    └── PreviewView.tsx           # Preview panel: dangerouslySetInnerHTML + scroll sync target

libs/markdown/
├── render.ts                     # MarkdownIt config + validateLink + fence rule + renderMarkdown()
├── highlight.ts                  # Prism imports + LANGUAGE_ALIASES + resolveLanguage()
└── export.ts                     # downloadMd(), exportPng(), printPdf()

libs/file/                        # NEW — shared with Diff
├── limits.ts                     # MAX_FILE_BYTES (moved from libs/diff/compute.ts)
└── binary-sniff.ts               # isBinaryFile (moved from libs/diff/binary-sniff.ts)

hooks/                            # NEW directory
└── use-is-mobile.ts              # Extracted from app/[locale]/diff/diff-page.tsx

styles/
└── prism-theme.css               # Custom Prism theme using ByteCraft CSS variables

# Glue / registration
app/globals.css                   # +@media print block
app/[locale]/home-page.tsx        # +1 toolIcons entry
libs/tools.ts                     # +1 TOOLS entry
libs/storage-keys.ts              # +1 key (markdown)
i18n/request.ts                   # +1 namespace ("markdown")
public/locales/{en,zh-CN,zh-TW}/tools.json   # +markdown entry in each
public/locales/{en,zh-CN,zh-TW}/markdown.json # new file in each
package.json, package-lock.json   # deps

# Modified by Phase 0 refactor
libs/diff/compute.ts              # Remove MAX_FILE_BYTES (moved to libs/file/limits.ts)
libs/diff/binary-sniff.ts         # DELETED (moved to libs/file/binary-sniff.ts)
app/[locale]/diff/components/DiffInput.tsx  # Update imports
app/[locale]/diff/diff-page.tsx   # Remove inline useIsMobile, import from hooks/
```

---

# PHASE 0 — Refactor prep

Before adding Markdown code, extract three pieces of Diff that Markdown will reuse. Each refactor task ends in a green Diff build to lock in zero regression.

---

## Task 1: Extract `MAX_FILE_BYTES` to `libs/file/limits.ts`

**Files:**

- Create: `libs/file/limits.ts`
- Modify: `libs/diff/compute.ts` (remove the constant)
- Modify: `app/[locale]/diff/components/DiffInput.tsx:9` (update import path)

- [ ] **Step 1: Create the new module**

Create `libs/file/limits.ts` with:

```ts
// Maximum size of a user-uploaded text file (bytes).
// Shared by the Diff and Markdown tools.
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
```

- [ ] **Step 2: Remove the constant from `libs/diff/compute.ts`**

Open `libs/diff/compute.ts`. Find the line that defines `MAX_FILE_BYTES` (around line 5):

```ts
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
```

Delete that line. Do NOT add a re-export — there is only one consumer and it will be updated next.

- [ ] **Step 3: Update Diff's import site**

Open `app/[locale]/diff/components/DiffInput.tsx`. Replace line 9:

```ts
import { MAX_FILE_BYTES } from "../../../../libs/diff/compute";
```

with:

```ts
import { MAX_FILE_BYTES } from "../../../../libs/file/limits";
```

- [ ] **Step 4: Verify build**

Run:

```bash
rtk npx tsc --noEmit
```

Expected: no errors.

```bash
rtk npx next lint
```

Expected: no new errors related to `MAX_FILE_BYTES`.

- [ ] **Step 5: Smoke test Diff tool**

Run:

```bash
rtk npm run dev
```

Visit `http://localhost:3000/diff`. Drop a small text file into either input. Confirm it loads. Drop a >5MB file. Confirm the "File too large" toast still fires.

Stop the dev server with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
rtk git add libs/file/limits.ts libs/diff/compute.ts app/[locale]/diff/components/DiffInput.tsx
rtk git commit -m "refactor(file): extract MAX_FILE_BYTES to libs/file/limits.ts"
```

---

## Task 2: Move `binary-sniff.ts` to `libs/file/`

**Files:**

- Create: `libs/file/binary-sniff.ts` (copy of current `libs/diff/binary-sniff.ts`)
- Delete: `libs/diff/binary-sniff.ts`
- Modify: `app/[locale]/diff/components/DiffInput.tsx` (update import path)

- [ ] **Step 1: Create the new file with the existing content**

Create `libs/file/binary-sniff.ts` with the verbatim contents of the current `libs/diff/binary-sniff.ts`:

```ts
// Heuristic binary detection on the first 8KB of a file.
// A file is binary if either:
//   (a) any byte is NUL (0x00), or
//   (b) > 5% of decoded UTF-8 code units are the replacement char U+FFFD.

const SAMPLE_BYTES = 8 * 1024;
const REPLACEMENT_RATIO_THRESHOLD = 0.05;

export async function isBinaryFile(file: File): Promise<boolean> {
  const slice = file.slice(0, SAMPLE_BYTES);
  const buf = new Uint8Array(await slice.arrayBuffer());

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x00) return true;
  }

  if (buf.length === 0) return false;

  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  let replacements = 0;
  for (const ch of decoded) {
    if (ch === "�") replacements++;
  }
  return replacements / decoded.length > REPLACEMENT_RATIO_THRESHOLD;
}
```

- [ ] **Step 2: Delete the old file**

Run:

```bash
rtk git rm libs/diff/binary-sniff.ts
```

- [ ] **Step 3: Update Diff's import site**

Open `app/[locale]/diff/components/DiffInput.tsx`. Find the import (around line 8):

```ts
import { isBinaryFile } from "../../../../libs/diff/binary-sniff";
```

Replace with:

```ts
import { isBinaryFile } from "../../../../libs/file/binary-sniff";
```

- [ ] **Step 4: Search for any other references**

Run:

```bash
rtk grep "libs/diff/binary-sniff" /Users/kang/Workspace/codes/ByteCraft --include="*.ts" --include="*.tsx"
```

Expected: zero matches (besides comments/docs). If any source file matches, update its import to `libs/file/binary-sniff`.

- [ ] **Step 5: Verify build**

```bash
rtk npx tsc --noEmit && rtk npx next lint
```

Expected: clean.

- [ ] **Step 6: Smoke test Diff tool**

```bash
rtk npm run dev
```

Visit `/diff`. Try uploading a binary file (any image). Confirm "Binary file rejected" toast still fires. Stop dev server.

- [ ] **Step 7: Commit**

```bash
rtk git add libs/file/binary-sniff.ts app/[locale]/diff/components/DiffInput.tsx
rtk git commit -m "refactor(file): move binary-sniff to libs/file/ for cross-tool reuse"
```

(`git rm` already staged the deletion.)

---

## Task 3: Extract `useIsMobile` to `hooks/use-is-mobile.ts`

**Files:**

- Create: `hooks/use-is-mobile.ts`
- Modify: `app/[locale]/diff/diff-page.tsx` (remove inline definition; add import)

- [ ] **Step 1: Create the hook**

Create `hooks/use-is-mobile.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

export function useIsMobile(breakpointPx = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const listener = () => setIsMobile(mq.matches);
    listener();
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [breakpointPx]);
  return isMobile;
}
```

- [ ] **Step 2: Update Diff to use the shared hook**

Open `app/[locale]/diff/diff-page.tsx`.

Delete the inline `useIsMobile` function definition (lines 52-62 — the entire block from `function useIsMobile(breakpointPx = 768) {` through its closing `}`).

Add an import near the top of the file (after the existing relative imports, around line 6):

```ts
import { useIsMobile } from "../../../hooks/use-is-mobile";
```

The existing call site `const isMobile = useIsMobile();` (around line 80) remains unchanged.

- [ ] **Step 3: Verify build**

```bash
rtk npx tsc --noEmit && rtk npx next lint
```

Expected: clean.

- [ ] **Step 4: Smoke test Diff tool**

```bash
rtk npm run dev
```

Visit `/diff` on desktop (browser >= 768px wide). Confirm side-by-side layout. Resize browser below 768px. Confirm layout switches to vertical/inline. Stop dev server.

- [ ] **Step 5: Commit**

```bash
rtk git add hooks/use-is-mobile.ts app/[locale]/diff/diff-page.tsx
rtk git commit -m "refactor(hooks): extract useIsMobile for cross-tool reuse"
```

---

# PHASE 1 — Markdown core libs

---

## Task 4: Install dependencies

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install runtime deps**

```bash
rtk npm install markdown-it@14.1.0 markdown-it-task-lists@2.1.1 prismjs@1.29.0 modern-screenshot@4.4.39
```

Expected: four packages added under `"dependencies"` with the pinned versions. If npm writes a caret (`^`), edit `package.json` back to exact versions.

- [ ] **Step 2: Install dev deps**

```bash
rtk npm install --save-dev @types/markdown-it@14.1.2 @types/markdown-it-task-lists@2.1.0 @types/prismjs@1.26.5
```

Expected: three `@types/*` packages under `"devDependencies"`.

- [ ] **Step 3: Verify lockfile is consistent**

```bash
rtk npm ls markdown-it prismjs modern-screenshot markdown-it-task-lists
```

Expected: each package resolves to the pinned version with no `UNMET DEPENDENCY` warnings.

- [ ] **Step 4: Commit**

```bash
rtk git add package.json package-lock.json
rtk git commit -m "chore(deps): add markdown-it, prismjs, modern-screenshot for markdown editor"
```

---

## Task 5: Add storage key

**Files:**

- Modify: `libs/storage-keys.ts`

- [ ] **Step 1: Add the new key**

Open `libs/storage-keys.ts`. Replace its contents with:

```ts
export const STORAGE_KEYS = {
  savedPasswords: "bc:sp",
  diff: "bc:diff",
  markdown: "bc:md",
} as const;

export const COOKIE_KEYS = {
  theme: "bc-th",
} as const;
```

- [ ] **Step 2: Verify**

```bash
rtk npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
rtk git add libs/storage-keys.ts
rtk git commit -m "feat(markdown): add bc:md storage key"
```

---

## Task 6: Add `@media print` block to `app/globals.css`

**Files:**

- Modify: `app/globals.css` (append a new `@media print` block at end of file)

- [ ] **Step 1: Append the print rules**

Open `app/globals.css`. Append at the very end of the file:

```css
/* Print styles — applies to all pages, used primarily by /markdown's "Export PDF". */
@media print {
  /* Hide global chrome and any opt-out node */
  header,
  footer,
  [data-no-print] {
    display: none !important;
  }

  /* Force light surfaces regardless of theme */
  html,
  body {
    background: #fff !important;
    color: #000 !important;
  }

  /* Ensure code/blockquote stay together when paginated */
  pre,
  blockquote {
    page-break-inside: avoid;
  }

  @page {
    margin: 1.5cm;
  }
}
```

- [ ] **Step 2: Verify dev server still runs**

```bash
rtk npm run dev
```

Visit `/`, `/diff`, any other page. Confirm normal rendering is unchanged. Use the browser's "Print preview" (Cmd+P) on `/diff` and confirm header/footer are absent. Stop dev server.

- [ ] **Step 3: Commit**

```bash
rtk git add app/globals.css
rtk git commit -m "feat(markdown): add @media print rules for PDF export"
```

---

## Task 7: Custom Prism theme (`styles/prism-theme.css`)

**Files:**

- Create: `styles/prism-theme.css`

- [ ] **Step 1: Create the directory and theme file**

```bash
rtk mkdir -p /Users/kang/Workspace/codes/ByteCraft/styles
```

Create `styles/prism-theme.css`:

```css
/* Custom Prism theme using ByteCraft CSS variables.
   Works with both light and dark themes via existing var indirection in app/globals.css. */

pre[class*="language-"],
code[class*="language-"] {
  color: var(--fg-primary);
  background: var(--bg-input);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.875rem;
  line-height: 1.6;
  text-shadow: none;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  tab-size: 2;
  hyphens: none;
}

pre[class*="language-"] {
  padding: 0.9rem 1rem;
  margin: 0.75rem 0;
  border: 1px solid var(--border-default);
  border-radius: 0.5rem;
  overflow: auto;
}

:not(pre) > code[class*="language-"] {
  padding: 0.15em 0.4em;
  border-radius: 0.25rem;
  border: 1px solid var(--border-default);
}

/* Tokens */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: var(--fg-muted);
  font-style: italic;
}

.token.punctuation {
  color: var(--fg-secondary);
}

.token.namespace {
  opacity: 0.7;
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: var(--accent-purple);
}

.token.boolean,
.token.number {
  color: var(--accent-cyan);
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: var(--accent-cyan);
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string,
.token.variable {
  color: var(--fg-secondary);
}

.token.atrule,
.token.attr-value,
.token.keyword {
  color: var(--accent-purple);
}

.token.function,
.token.class-name {
  color: var(--accent-cyan);
}

.token.regex,
.token.important {
  color: var(--danger);
}

.token.important,
.token.bold {
  font-weight: 600;
}
.token.italic {
  font-style: italic;
}
```

- [ ] **Step 2: Verify file is reachable from a Next.js client component**

(No need to import it yet — Task 13 will import it from `markdown-page.tsx`. This step just verifies the file is syntactically valid CSS.)

```bash
rtk npx prettier --check styles/prism-theme.css
```

Expected: file is well-formed (Prettier may report formatting; if so, run `rtk npx prettier --write styles/prism-theme.css` and re-check).

- [ ] **Step 3: Commit**

```bash
rtk git add styles/prism-theme.css
rtk git commit -m "feat(markdown): add custom Prism theme using ByteCraft CSS variables"
```

---

## Task 8: `libs/markdown/highlight.ts`

**Files:**

- Create: `libs/markdown/highlight.ts`

- [ ] **Step 1: Create the highlight module**

```bash
rtk mkdir -p /Users/kang/Workspace/codes/ByteCraft/libs/markdown
```

Create `libs/markdown/highlight.ts`:

```ts
import Prism from "prismjs";

// Core langs (javascript, css, markup, clike) are bundled in prism core.
// We import the component file anyway for explicitness — these are no-ops.
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";

// Extra langs (require explicit import).
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  golang: "go",
  rs: "rust",
  html: "markup",
  xml: "markup",
};

/** Resolve a fence info-string lang to a registered Prism grammar key, or null. */
export function resolveLanguage(raw: string): string | null {
  if (!raw) return null;
  const normalized = LANGUAGE_ALIASES[raw] ?? raw;
  return Prism.languages[normalized] ? normalized : null;
}

export { Prism };
```

- [ ] **Step 2: Verify**

```bash
rtk npx tsc --noEmit
```

Expected: clean. If TypeScript complains about missing `prismjs` types, confirm `@types/prismjs@1.26.5` is in `devDependencies` from Task 4.

- [ ] **Step 3: Commit**

```bash
rtk git add libs/markdown/highlight.ts
rtk git commit -m "feat(markdown): add Prism setup with language aliases"
```

---

## Task 9: `libs/markdown/render.ts`

**Files:**

- Create: `libs/markdown/render.ts`

- [ ] **Step 1: Create the render module**

Create `libs/markdown/render.ts`:

```ts
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import { Prism, resolveLanguage } from "./highlight";

const SAFE_PROTOCOL = /^(https?|mailto|tel):/i;
const SAFE_DATA_IMAGE = /^data:image\/(gif|png|jpe?g|webp);base64,/i;
const RELATIVE_OR_ANCHOR = /^(#|\/|\.\.?\/)/;

const md: MarkdownIt = new MarkdownIt({
  html: false, // No raw HTML — XSS protection layer 1
  linkify: true, // Auto-link URLs
  typographer: true, // Smart quotes, dashes
  breaks: true, // GFM newline → <br>
});

// XSS protection layer 2: explicit allowlist (defense-in-depth).
md.validateLink = (url: string): boolean => {
  if (RELATIVE_OR_ANCHOR.test(url)) return true;
  if (SAFE_PROTOCOL.test(url)) return true;
  if (SAFE_DATA_IMAGE.test(url)) return true;
  return false;
};

// GFM checkbox list (read-only render).
md.use(taskLists, { enabled: false });

// Code block highlighting via Prism.
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const code = token.content;
  const raw = (token.info || "").trim().toLowerCase();
  const lang = resolveLanguage(raw);
  const escaped = md.utils.escapeHtml(code);

  if (!lang) {
    return `<pre class="language-text"><code>${escaped}</code></pre>`;
  }

  const highlighted = Prism.highlight(code, Prism.languages[lang], lang);
  return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
};

export function renderMarkdown(input: string): string {
  return md.render(input);
}
```

- [ ] **Step 2: Verify types**

```bash
rtk npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Sanity-check the XSS guard manually**

Create a throwaway scratch file `/tmp/md-xss-check.ts`:

```ts
import { renderMarkdown } from "./libs/markdown/render";

const cases = [
  "[js](javascript:alert(1))",
  "[ok](https://example.com)",
  "[anchor](#section)",
  "[mail](mailto:a@b.com)",
  "[bad](vbscript:alert(1))",
  "[img](data:text/html,alert(1))",
  "![pic](data:image/png;base64,iVBOR...)",
  "<script>alert(1)</script>",
];

for (const c of cases) {
  console.log(c, "=>", renderMarkdown(c).trim());
}
```

(You don't need to actually run this — it's a mental walkthrough. Verify by reading `validateLink` that:)

- `javascript:`, `vbscript:`, `data:text/html` → `validateLink` returns false → markdown-it strips the href and renders the link text only.
- `https:`, `mailto:`, `#section`, `data:image/png;base64,...` → pass.
- `<script>` → `html: false` strips it (renders as escaped text).

- [ ] **Step 4: Commit**

```bash
rtk git add libs/markdown/render.ts
rtk git commit -m "feat(markdown): add markdown-it config with validateLink allowlist + fence highlighter"
```

---

## Task 10: `libs/markdown/export.ts`

**Files:**

- Create: `libs/markdown/export.ts`

- [ ] **Step 1: Create the export module**

Create `libs/markdown/export.ts`:

```ts
import { domToPng } from "modern-screenshot";

/** Trigger a download of `text` as `filename`.md. */
export function downloadMd(text: string, filename = "document.md"): void {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Open the browser's print dialog. CSS @media print handles layout. */
export function printPdf(): void {
  window.print();
}

/** Capture `el` as a PNG and trigger a download. Throws on failure. */
export async function exportPng(el: HTMLElement, filename = "preview.png"): Promise<void> {
  const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
  const dataUrl = await domToPng(el, {
    scale: 2,
    backgroundColor: bg,
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
```

- [ ] **Step 2: Verify types**

```bash
rtk npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
rtk git add libs/markdown/export.ts
rtk git commit -m "feat(markdown): add download/print/PNG export helpers"
```

---

# PHASE 2 — UI

---

## Task 11: `EditorView` component

**Files:**

- Create: `app/[locale]/markdown/components/EditorView.tsx`

- [ ] **Step 1: Create the directory**

```bash
rtk mkdir -p /Users/kang/Workspace/codes/ByteCraft/app/\[locale\]/markdown/components
```

- [ ] **Step 2: Create the component**

Create `app/[locale]/markdown/components/EditorView.tsx`:

```tsx
"use client";

import { useRef, type KeyboardEvent } from "react";
import { LineNumberedTextarea } from "../../../../components/ui/line-numbered-textarea";

const TAB_INDENT = "  "; // two spaces

export interface EditorViewProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  scrollRef?: React.RefObject<HTMLTextAreaElement | null>;
  onScroll?: (ev: React.UIEvent<HTMLTextAreaElement>) => void;
}

export function EditorView({ value, onChange, placeholder, scrollRef, onScroll }: EditorViewProps) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = scrollRef ?? localRef;

  const lineCount = value.split("\n").length;
  const showLineNumbers = lineCount <= 5000 && value.length < 512 * 1024;

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (!e.shiftKey && start === end) {
      // Simple insert
      const next = value.slice(0, start) + TAB_INDENT + value.slice(end);
      onChange(next);
      // Restore caret after React updates DOM
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + TAB_INDENT.length;
      });
      return;
    }

    // Indent or dedent the selected line range
    const before = value.slice(0, start);
    const lineStart = before.lastIndexOf("\n") + 1;
    const block = value.slice(lineStart, end);
    const lines = block.split("\n");

    let modified: string[];
    let delta = 0;
    if (e.shiftKey) {
      // Dedent: strip up to 2 leading spaces per line
      modified = lines.map((line) => {
        if (line.startsWith(TAB_INDENT)) {
          delta -= TAB_INDENT.length;
          return line.slice(TAB_INDENT.length);
        }
        if (line.startsWith(" ")) {
          delta -= 1;
          return line.slice(1);
        }
        return line;
      });
    } else {
      // Indent
      modified = lines.map((line) => {
        delta += TAB_INDENT.length;
        return TAB_INDENT + line;
      });
    }

    const next = value.slice(0, lineStart) + modified.join("\n") + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      const firstLineDelta = e.shiftKey
        ? -Math.min(TAB_INDENT.length, lines[0].match(/^ */)![0].length)
        : TAB_INDENT.length;
      ta.selectionStart = start + firstLineDelta;
      ta.selectionEnd = end + delta;
    });
  }

  return (
    <LineNumberedTextarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onScroll={onScroll}
      placeholder={placeholder}
      showLineNumbers={showLineNumbers}
      spellCheck={false}
      className="h-full"
    />
  );
}
```

- [ ] **Step 3: Verify**

```bash
rtk npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
rtk git add app/\[locale\]/markdown/components/EditorView.tsx
rtk git commit -m "feat(markdown): add EditorView with Tab indent and line-number guard"
```

---

## Task 12: `PreviewView` component

**Files:**

- Create: `app/[locale]/markdown/components/PreviewView.tsx`

- [ ] **Step 1: Create the component**

Create `app/[locale]/markdown/components/PreviewView.tsx`:

```tsx
"use client";

import { forwardRef, type UIEvent } from "react";

export interface PreviewViewProps {
  html: string;
  emptyMessage: string;
  onScroll?: (ev: UIEvent<HTMLDivElement>) => void;
  className?: string;
}

export const PreviewView = forwardRef<HTMLDivElement, PreviewViewProps>(
  ({ html, emptyMessage, onScroll, className = "" }, ref) => {
    if (!html) {
      return (
        <div
          ref={ref}
          className={`flex items-center justify-center h-full bg-bg-input border border-border-default rounded-lg text-fg-muted text-sm ${className}`}
        >
          {emptyMessage}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className={`prose-md h-full overflow-auto bg-bg-input border border-border-default rounded-lg p-4 scrollbar-thin ${className}`}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
);

PreviewView.displayName = "PreviewView";
```

- [ ] **Step 2: Add minimal `prose-md` styles to `app/globals.css`**

Open `app/globals.css`. Append (before the `@media print` block added in Task 6):

```css
/* Markdown rendered preview — minimal typography that respects ByteCraft tokens. */
.prose-md {
  color: var(--fg-primary);
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 0.95rem;
  line-height: 1.65;
}
.prose-md h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 1.25rem 0 0.75rem;
  border-bottom: 1px solid var(--border-default);
  padding-bottom: 0.3rem;
}
.prose-md h2 {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 1.1rem 0 0.6rem;
  border-bottom: 1px solid var(--border-default);
  padding-bottom: 0.25rem;
}
.prose-md h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}
.prose-md h4,
.prose-md h5,
.prose-md h6 {
  font-weight: 600;
  margin: 0.9rem 0 0.4rem;
}
.prose-md p {
  margin: 0.6rem 0;
}
.prose-md a {
  color: var(--accent-cyan);
  text-decoration: underline;
}
.prose-md a:hover {
  filter: brightness(1.15);
}
.prose-md ul,
.prose-md ol {
  margin: 0.6rem 0;
  padding-left: 1.5rem;
}
.prose-md li {
  margin: 0.2rem 0;
}
.prose-md blockquote {
  margin: 0.75rem 0;
  padding: 0.5rem 0.9rem;
  border-left: 3px solid var(--accent-purple);
  color: var(--fg-secondary);
  background: color-mix(in oklab, var(--accent-purple) 6%, transparent);
}
.prose-md table {
  border-collapse: collapse;
  margin: 0.75rem 0;
}
.prose-md th,
.prose-md td {
  border: 1px solid var(--border-default);
  padding: 0.4rem 0.7rem;
}
.prose-md th {
  background: var(--bg-elevated);
  font-weight: 600;
}
.prose-md hr {
  border: none;
  border-top: 1px solid var(--border-default);
  margin: 1rem 0;
}
.prose-md code:not([class*="language-"]) {
  background: var(--bg-elevated);
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.85em;
}
.prose-md img {
  max-width: 100%;
  height: auto;
}
.prose-md input[type="checkbox"] {
  margin-right: 0.4rem;
}
```

- [ ] **Step 3: Verify**

```bash
rtk npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
rtk git add app/\[locale\]/markdown/components/PreviewView.tsx app/globals.css
rtk git commit -m "feat(markdown): add PreviewView and prose-md typography"
```

---

## Task 13: `markdown-page.tsx` (main page)

**Files:**

- Create: `app/[locale]/markdown/markdown-page.tsx`

- [ ] **Step 1: Create the page component**

Create `app/[locale]/markdown/markdown-page.tsx`:

```tsx
"use client";

import "../../../styles/prism-theme.css";

import { useEffect, useRef, useState, type ChangeEvent, type UIEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  Download,
  FileImage,
  Printer,
  Trash2,
  Columns2,
  Rows2,
  PanelTop,
} from "lucide-react";
import Layout from "../../../components/layout";
import { Button } from "../../../components/ui/button";
import { CopyButton } from "../../../components/ui/copy-btn";
import { showToast } from "../../../libs/toast";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import { MAX_FILE_BYTES } from "../../../libs/file/limits";
import { isBinaryFile } from "../../../libs/file/binary-sniff";
import { renderMarkdown } from "../../../libs/markdown/render";
import { downloadMd, printPdf, exportPng } from "../../../libs/markdown/export";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { EditorView } from "./components/EditorView";
import { PreviewView } from "./components/PreviewView";

type ViewMode = "tab" | "horizontal" | "vertical";
type ActiveTab = "edit" | "preview";

interface Persisted {
  viewMode: ViewMode;
}

const DEFAULT_PERSISTED: Persisted = { viewMode: "tab" };
const RENDER_DEBOUNCE_MS = 200;
const AUTO_RENDER_MAX_BYTES = 512 * 1024;

function readPersisted(): Persisted {
  if (typeof window === "undefined") return DEFAULT_PERSISTED;
  const raw = window.localStorage.getItem(STORAGE_KEYS.markdown);
  if (!raw) return DEFAULT_PERSISTED;
  try {
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const vm = parsed.viewMode;
    return {
      viewMode: vm === "horizontal" || vm === "vertical" || vm === "tab" ? vm : "tab",
    };
  } catch {
    return DEFAULT_PERSISTED;
  }
}

function MarkdownPageBody() {
  const t = useTranslations("markdown");
  const tc = useTranslations("common");

  const [markdown, setMarkdown] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_PERSISTED.viewMode);
  const [activeTab, setActiveTab] = useState<ActiveTab>("edit");
  const [renderedHtml, setRenderedHtml] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pendingLargeRender, setPendingLargeRender] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const scrollLockRef = useRef(false);

  const isMobile = useIsMobile();
  const effectiveViewMode: ViewMode = isMobile ? "tab" : viewMode;

  const tooLargeForAuto = markdown.length > AUTO_RENDER_MAX_BYTES;
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const charCount = markdown.length;
  const readMin = Math.max(1, Math.ceil(wordCount / 200));

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const persisted = readPersisted();
    setViewMode(persisted.viewMode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEYS.markdown, JSON.stringify({ viewMode }));
  }, [viewMode, hydrated]);

  useEffect(() => {
    if (!markdown) {
      setRenderedHtml("");
      setPendingLargeRender(false);
      return;
    }
    if (tooLargeForAuto) {
      setPendingLargeRender(true);
      return;
    }
    setPendingLargeRender(false);
    const id = setTimeout(() => {
      setRenderedHtml(renderMarkdown(markdown));
    }, RENDER_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [markdown, tooLargeForAuto]);

  function manualRender() {
    setRenderedHtml(renderMarkdown(markdown));
    setPendingLargeRender(false);
  }

  // ---- File ops ----

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      showToast(t("tooLarge"), "danger", 3000);
      return;
    }
    const binary = await isBinaryFile(file);
    if (binary) {
      showToast(t("binaryRejected"), "danger", 3000);
      return;
    }
    const text = await file.text();
    setMarkdown(text);
    showToast(t("fileLoaded"), "success", 2000);
  }

  function onPickFile(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (file) void handleFile(file);
  }

  function onDownload() {
    if (!markdown) {
      showToast(t("nothingToExport"), "danger", 2000);
      return;
    }
    downloadMd(markdown);
  }

  async function onExportPng() {
    if (!renderedHtml || !previewRef.current) {
      showToast(t("nothingToExport"), "danger", 2000);
      return;
    }
    try {
      await exportPng(previewRef.current);
      showToast(t("pngFontNotice"), "success", 3500);
    } catch {
      showToast(t("exportFailed"), "danger", 3000);
    }
  }

  function onClearAll() {
    setMarkdown("");
    setRenderedHtml("");
    showToast(tc("allCleared"), "danger", 2000);
  }

  // ---- Scroll sync (Split modes only) ----

  function syncScroll(src: HTMLElement, dst: HTMLElement) {
    if (scrollLockRef.current) return;
    scrollLockRef.current = true;
    const denom = src.scrollHeight - src.clientHeight;
    const ratio = denom > 0 ? src.scrollTop / denom : 0;
    dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight);
    requestAnimationFrame(() => {
      scrollLockRef.current = false;
    });
  }

  function onEditorScroll(ev: UIEvent<HTMLTextAreaElement>) {
    if (effectiveViewMode === "tab") return;
    if (!previewRef.current) return;
    syncScroll(ev.currentTarget, previewRef.current);
  }

  function onPreviewScroll(ev: UIEvent<HTMLDivElement>) {
    if (effectiveViewMode === "tab") return;
    if (!editorRef.current) return;
    syncScroll(ev.currentTarget, editorRef.current);
  }

  // ---- Layout ----

  const editorEl = (
    <EditorView
      value={markdown}
      onChange={setMarkdown}
      placeholder={t("placeholder")}
      scrollRef={editorRef}
      onScroll={onEditorScroll}
    />
  );

  const previewEl = (
    <PreviewView
      ref={previewRef}
      html={renderedHtml}
      emptyMessage={pendingLargeRender ? t("renderTooLarge") : t("emptyPreview")}
      onScroll={onPreviewScroll}
    />
  );

  let contentArea;
  if (effectiveViewMode === "tab") {
    contentArea = (
      <div className="h-[55vh]">
        {activeTab === "edit" ? (
          <div data-no-print className="h-full">
            {editorEl}
          </div>
        ) : (
          previewEl
        )}
      </div>
    );
  } else if (effectiveViewMode === "horizontal") {
    contentArea = (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[55vh]">
        <div data-no-print className="h-full min-h-0">
          {editorEl}
        </div>
        <div className="h-full min-h-0">{previewEl}</div>
      </div>
    );
  } else {
    contentArea = (
      <div className="flex flex-col gap-4">
        <div data-no-print className="h-[28vh]">
          {editorEl}
        </div>
        <div className="h-[28vh]">{previewEl}</div>
      </div>
    );
  }

  // ---- Render ----

  return (
    <>
      <div
        data-no-print
        className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4"
      >
        <span className="text-sm text-fg-secondary leading-relaxed">
          {tc("alert.notTransferred")}
        </span>
      </div>

      <div data-no-print className="flex flex-wrap items-center gap-2 my-3">
        {/* Tab switcher */}
        {effectiveViewMode === "tab" && (
          <div className="inline-flex border border-border-default rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`px-3 py-1.5 text-sm transition-colors ${activeTab === "edit" ? "bg-accent-cyan text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
            >
              {t("edit")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 text-sm transition-colors ${activeTab === "preview" ? "bg-accent-cyan text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
            >
              {t("preview")}
            </button>
          </div>
        )}

        {/* View mode (desktop only) */}
        {!isMobile && (
          <div className="inline-flex border border-border-default rounded-lg overflow-hidden">
            <button
              type="button"
              title={t("viewMode.tab")}
              onClick={() => setViewMode("tab")}
              className={`px-2 py-1.5 transition-colors ${viewMode === "tab" ? "bg-accent-purple-dim text-accent-purple" : "text-fg-muted hover:bg-bg-elevated"}`}
            >
              <PanelTop size={16} />
            </button>
            <button
              type="button"
              title={t("viewMode.horizontal")}
              onClick={() => setViewMode("horizontal")}
              className={`px-2 py-1.5 transition-colors ${viewMode === "horizontal" ? "bg-accent-purple-dim text-accent-purple" : "text-fg-muted hover:bg-bg-elevated"}`}
            >
              <Columns2 size={16} />
            </button>
            <button
              type="button"
              title={t("viewMode.vertical")}
              onClick={() => setViewMode("vertical")}
              className={`px-2 py-1.5 transition-colors ${viewMode === "vertical" ? "bg-accent-purple-dim text-accent-purple" : "text-fg-muted hover:bg-bg-elevated"}`}
            >
              <Rows2 size={16} />
            </button>
          </div>
        )}

        {/* Actions */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          className="hidden"
          onChange={onPickFile}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} />
          {t("loadFile")}
        </Button>
        <Button variant="outline" size="sm" onClick={onDownload} disabled={!markdown}>
          <Download size={14} />
          {t("downloadFile")}
        </Button>
        <CopyButton getContent={() => renderedHtml} />
        <Button variant="outline" size="sm" onClick={printPdf} disabled={!renderedHtml}>
          <Printer size={14} />
          {t("exportPdf")}
        </Button>
        <Button variant="outline" size="sm" onClick={onExportPng} disabled={!renderedHtml}>
          <FileImage size={14} />
          {t("exportPng")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onClearAll}
          disabled={!markdown}
          className="ml-auto"
        >
          <Trash2 size={14} />
          {tc("clearAll")}
        </Button>
      </div>

      {pendingLargeRender && (
        <div
          data-no-print
          className="flex items-center justify-between gap-3 my-2 px-3 py-2 border border-accent-purple/50 rounded-lg bg-accent-purple-dim/20 text-sm text-fg-secondary"
        >
          <span>{t("renderTooLarge")}</span>
          <Button variant="primary" size="sm" onClick={manualRender}>
            {t("renderNow")}
          </Button>
        </div>
      )}

      {contentArea}

      <div
        data-no-print
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted font-mono"
      >
        <span>{t("wordsCount", { count: wordCount })}</span>
        <span>·</span>
        <span>{t("charsCount", { count: charCount })}</span>
        <span>·</span>
        <span>{t("readTime", { min: readMin })}</span>
      </div>
    </>
  );
}

function Description() {
  const t = useTranslations("markdown");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whatIsP1")}</p>
        </div>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.howTitle")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.howP1")}</p>
        </div>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.gfmTitle")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.gfmP1")}</p>
        </div>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">
          {t("descriptions.privacyTitle")}
        </h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.privacyP1")}</p>
        </div>
      </div>
    </section>
  );
}

export default function MarkdownPage() {
  const tTools = useTranslations("tools");
  const title = tTools("markdown.shortTitle");
  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <MarkdownPageBody />
        <Description />
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
rtk npx tsc --noEmit
```

Expected: errors about missing i18n keys in `markdown` namespace are OK at this stage (they will be added in Phase 3); other errors are not. Specifically watch for missing icon names in `lucide-react` — if `PanelTop` is missing in your lucide version, replace with `Square` and document.

- [ ] **Step 3: Commit**

```bash
rtk git add app/\[locale\]/markdown/markdown-page.tsx
rtk git commit -m "feat(markdown): add main page component with toolbar, scroll sync, status bar"
```

---

## Task 14: `page.tsx` (route entry)

**Files:**

- Create: `app/[locale]/markdown/page.tsx`

- [ ] **Step 1: Create the route entry**

Create `app/[locale]/markdown/page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import MarkdownPage from "./markdown-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return {
    title: t("markdown.title"),
    description: t("markdown.description"),
    keywords: "",
  };
}

export default function MarkdownRoute() {
  return <MarkdownPage />;
}
```

- [ ] **Step 2: Verify**

```bash
rtk npx tsc --noEmit
```

Expected: clean (assuming i18n keys will be added in Phase 3 — `tsc` does not validate next-intl key existence).

- [ ] **Step 3: Commit**

```bash
rtk git add app/\[locale\]/markdown/page.tsx
rtk git commit -m "feat(markdown): add /markdown route entry with metadata"
```

---

# PHASE 3 — i18n & registration

---

## Task 15: English i18n — `en/markdown.json`

**Files:**

- Create: `public/locales/en/markdown.json`

- [ ] **Step 1: Create the file**

Create `public/locales/en/markdown.json`:

```json
{
  "edit": "Edit",
  "preview": "Preview",
  "placeholder": "Write or paste your Markdown here...",
  "emptyPreview": "Nothing to preview",
  "loadFile": "Load .md",
  "downloadFile": "Download .md",
  "copyHtml": "Copy HTML",
  "copiedHtml": "HTML copied to clipboard",
  "fileLoaded": "File loaded",
  "tooLarge": "File too large (max 5MB)",
  "binaryRejected": "Binary file rejected",
  "exportPdf": "Export PDF",
  "exportPng": "Export PNG",
  "pngFontNotice": "PNG exported (system fonts may substitute)",
  "exportFailed": "Export failed, please try again",
  "nothingToExport": "Nothing to export",
  "renderTooLarge": "Content too large for live preview",
  "renderNow": "Render now",
  "wordsCount": "{count} words",
  "charsCount": "{count} chars",
  "readTime": "{min} min read",
  "viewMode": {
    "tab": "Tab",
    "horizontal": "Split horizontal",
    "vertical": "Split vertical"
  },
  "descriptions": {
    "whatIsTitle": "What is Markdown?",
    "whatIsP1": "Markdown is a lightweight markup language that lets you format plain text using simple, readable syntax. It's the de-facto standard for READMEs, documentation, and notes — easy to write, easy to diff, and renders beautifully across platforms.",
    "howTitle": "How to use",
    "howP1": "Type or paste Markdown into the editor. The preview updates as you type. Switch between Tab, horizontal Split, and vertical Split layouts. Export to .md, copy the rendered HTML, or save the preview as PDF or PNG. All processing happens in your browser.",
    "gfmTitle": "GitHub Flavored Markdown",
    "gfmP1": "Supports tables, task lists (- [ ] todo), strikethrough, and autolinks. Math, Mermaid diagrams, and footnotes are out of scope for this iteration.",
    "privacyTitle": "Privacy",
    "privacyP1": "All processing happens in your browser. No content is sent to any server."
  }
}
```

- [ ] **Step 2: Verify JSON syntax**

```bash
rtk npx prettier --check public/locales/en/markdown.json
```

Expected: file is valid (Prettier may report formatting; if so, run `rtk npx prettier --write public/locales/en/markdown.json`).

- [ ] **Step 3: Commit**

```bash
rtk git add public/locales/en/markdown.json
rtk git commit -m "feat(markdown): add English i18n strings"
```

---

## Task 16: Simplified Chinese i18n — `zh-CN/markdown.json`

**Files:**

- Create: `public/locales/zh-CN/markdown.json`

- [ ] **Step 1: Create the file**

```json
{
  "edit": "编辑",
  "preview": "预览",
  "placeholder": "在此输入或粘贴 Markdown 内容...",
  "emptyPreview": "暂无内容可预览",
  "loadFile": "加载 .md",
  "downloadFile": "下载 .md",
  "copyHtml": "复制 HTML",
  "copiedHtml": "HTML 已复制到剪贴板",
  "fileLoaded": "文件已加载",
  "tooLarge": "文件过大（上限 5MB）",
  "binaryRejected": "已拒绝二进制文件",
  "exportPdf": "导出 PDF",
  "exportPng": "导出 PNG",
  "pngFontNotice": "PNG 已导出（字体可能由系统替代）",
  "exportFailed": "导出失败，请重试",
  "nothingToExport": "无内容可导出",
  "renderTooLarge": "内容过大，已暂停实时预览",
  "renderNow": "立即渲染",
  "wordsCount": "{count} 词",
  "charsCount": "{count} 字符",
  "readTime": "{min} 分钟阅读",
  "viewMode": {
    "tab": "切页",
    "horizontal": "横向分屏",
    "vertical": "纵向分屏"
  },
  "descriptions": {
    "whatIsTitle": "什么是 Markdown？",
    "whatIsP1": "Markdown 是一种轻量级标记语言，可用简洁可读的语法格式化纯文本。它是 README、文档与笔记的事实标准——易写、易 diff，跨平台渲染一致。",
    "howTitle": "如何使用",
    "howP1": "在编辑器中输入或粘贴 Markdown，预览随输入更新。可在切页、横向分屏、纵向分屏之间切换。可导出 .md、复制渲染后的 HTML、或将预览保存为 PDF / PNG。所有处理均在浏览器中完成。",
    "gfmTitle": "GitHub Flavored Markdown",
    "gfmP1": "支持表格、任务清单（- [ ] todo）、删除线和自动链接。本版本暂不支持数学公式、Mermaid 图表和脚注。",
    "privacyTitle": "隐私",
    "privacyP1": "所有处理均在浏览器中完成，不会向任何服务器发送内容。"
  }
}
```

- [ ] **Step 2: Verify JSON syntax**

```bash
rtk npx prettier --check public/locales/zh-CN/markdown.json
```

- [ ] **Step 3: Commit**

```bash
rtk git add public/locales/zh-CN/markdown.json
rtk git commit -m "feat(markdown): add zh-CN i18n strings"
```

---

## Task 17: Traditional Chinese i18n — `zh-TW/markdown.json`

**Files:**

- Create: `public/locales/zh-TW/markdown.json`

- [ ] **Step 1: Create the file**

```json
{
  "edit": "編輯",
  "preview": "預覽",
  "placeholder": "在此輸入或貼上 Markdown 內容...",
  "emptyPreview": "尚無內容可預覽",
  "loadFile": "載入 .md",
  "downloadFile": "下載 .md",
  "copyHtml": "複製 HTML",
  "copiedHtml": "HTML 已複製到剪貼簿",
  "fileLoaded": "檔案已載入",
  "tooLarge": "檔案過大（上限 5MB）",
  "binaryRejected": "已拒絕二進位檔案",
  "exportPdf": "匯出 PDF",
  "exportPng": "匯出 PNG",
  "pngFontNotice": "PNG 已匯出（字型可能由系統替代）",
  "exportFailed": "匯出失敗，請重試",
  "nothingToExport": "無內容可匯出",
  "renderTooLarge": "內容過大，已暫停即時預覽",
  "renderNow": "立即渲染",
  "wordsCount": "{count} 詞",
  "charsCount": "{count} 字元",
  "readTime": "{min} 分鐘閱讀",
  "viewMode": {
    "tab": "切頁",
    "horizontal": "橫向分割",
    "vertical": "縱向分割"
  },
  "descriptions": {
    "whatIsTitle": "什麼是 Markdown？",
    "whatIsP1": "Markdown 是一種輕量級標記語言，可用簡潔可讀的語法格式化純文字。它是 README、文件與筆記的事實標準——易寫、易 diff，跨平台渲染一致。",
    "howTitle": "如何使用",
    "howP1": "在編輯器中輸入或貼上 Markdown，預覽會隨輸入更新。可在切頁、橫向分割、縱向分割間切換。可匯出 .md、複製渲染後的 HTML、或將預覽儲存為 PDF / PNG。所有處理皆在瀏覽器中完成。",
    "gfmTitle": "GitHub Flavored Markdown",
    "gfmP1": "支援表格、任務清單（- [ ] todo）、刪除線和自動連結。本版本暫不支援數學公式、Mermaid 圖表與註腳。",
    "privacyTitle": "隱私",
    "privacyP1": "所有處理皆在瀏覽器中完成，不會將內容傳送至任何伺服器。"
  }
}
```

- [ ] **Step 2: Verify**

```bash
rtk npx prettier --check public/locales/zh-TW/markdown.json
```

- [ ] **Step 3: Commit**

```bash
rtk git add public/locales/zh-TW/markdown.json
rtk git commit -m "feat(markdown): add zh-TW i18n strings"
```

---

## Task 18: Add `markdown` SEO entry to all `tools.json`

**Files:**

- Modify: `public/locales/en/tools.json`
- Modify: `public/locales/zh-CN/tools.json`
- Modify: `public/locales/zh-TW/tools.json`

- [ ] **Step 1: English (`en/tools.json`)**

Open `public/locales/en/tools.json`. Insert before the closing brace `}`:

```json
,
  "markdown": {
    "title": "Markdown Editor & Preview - Free Online Tool",
    "shortTitle": "Markdown Editor",
    "description": "Write and preview Markdown with GitHub Flavored Markdown support. Free online Markdown editor with live preview, 100% client-side."
  }
```

(Make sure the previous entry — `"diff": { ... }` — has a trailing comma after its closing brace so the JSON is valid.)

- [ ] **Step 2: Simplified Chinese (`zh-CN/tools.json`)**

Insert the corresponding entry:

```json
,
  "markdown": {
    "title": "Markdown 编辑器与预览 - 免费在线工具",
    "shortTitle": "Markdown 编辑器",
    "description": "使用支持 GitHub Flavored Markdown 的在线编辑器编写和预览 Markdown。免费在线 Markdown 编辑器，实时预览，100% 客户端处理。"
  }
```

- [ ] **Step 3: Traditional Chinese (`zh-TW/tools.json`)**

```json
,
  "markdown": {
    "title": "Markdown 編輯器與預覽 - 免費線上工具",
    "shortTitle": "Markdown 編輯器",
    "description": "使用支援 GitHub Flavored Markdown 的線上編輯器撰寫並預覽 Markdown。免費線上 Markdown 編輯器，即時預覽，100% 客戶端處理。"
  }
```

- [ ] **Step 4: Verify all three are valid JSON**

```bash
rtk npx prettier --write public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
rtk npx prettier --check public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
```

Expected: all three pass.

- [ ] **Step 5: Commit**

```bash
rtk git add public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
rtk git commit -m "feat(markdown): add SEO metadata for /markdown to all locales"
```

---

## Task 19: Register tool in `libs/tools.ts`, `i18n/request.ts`, and `home-page.tsx`

**Files:**

- Modify: `libs/tools.ts`
- Modify: `i18n/request.ts`
- Modify: `app/[locale]/home-page.tsx`

- [ ] **Step 1: Register the tool route**

Open `libs/tools.ts`. Add a new entry to the `TOOLS` array, after the existing `diff` entry:

```ts
export const TOOLS: { key: string; path: string }[] = [
  { key: "base64", path: "/base64" },
  { key: "urlencoder", path: "/urlencoder" },
  { key: "uuid", path: "/uuid" },
  { key: "password", path: "/password" },
  { key: "hashing", path: "/hashing" },
  { key: "checksum", path: "/checksum" },
  { key: "htmlcode", path: "/htmlcode" },
  { key: "storageunit", path: "/storageunit" },
  { key: "ascii", path: "/ascii" },
  { key: "cipher", path: "/cipher" },
  { key: "diff", path: "/diff" },
  { key: "markdown", path: "/markdown" },
] as const;
```

- [ ] **Step 2: Register the i18n namespace**

Open `i18n/request.ts`. Find the `namespaces` array and add `"markdown"` at the end:

```ts
const namespaces = [
  "common",
  "tools",
  "home",
  "password",
  "hashing",
  "base64",
  "ascii",
  "htmlcode",
  "checksum",
  "cipher",
  "storageunit",
  "terms",
  "privacy",
  "uuid",
  "urlencoder",
  "diff",
  "markdown",
];
```

- [ ] **Step 3: Add the home-page icon**

Open `app/[locale]/home-page.tsx`.

In the `lucide-react` import block (around line 9-21), add `FileText`:

```ts
import {
  Hash,
  FileCode,
  Lock,
  KeyRound,
  FileCheck,
  Type,
  Code,
  HardDrive,
  FingerprintPattern,
  Percent,
  GitCompare,
  FileText,
} from "lucide-react";
```

In the `toolIcons` map (around line 23-35), add the `/markdown` entry:

```ts
const toolIcons: Record<string, React.ReactNode> = {
  // ...existing entries...
  "/diff": <GitCompare size={28} className="text-accent-cyan" />,
  "/markdown": <FileText size={28} className="text-accent-cyan" />,
};
```

- [ ] **Step 4: Verify**

```bash
rtk npx tsc --noEmit && rtk npx next lint
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
rtk git add libs/tools.ts i18n/request.ts app/\[locale\]/home-page.tsx
rtk git commit -m "feat(markdown): register tool, i18n namespace, and home-page icon"
```

---

# PHASE 4 — Verification

---

## Task 20: Build, lint, and full smoke test

**Files:** none modified — this task is verification only.

- [ ] **Step 1: Production build**

```bash
rtk npm run build
```

Expected: build succeeds with no errors. Look for the route line `/markdown` in the build output (it should be a static or dynamic route depending on i18n config).

- [ ] **Step 2: Lint**

```bash
rtk npx next lint
```

Expected: zero new warnings or errors in `app/[locale]/markdown/`, `libs/markdown/`, `libs/file/`, `hooks/`, `styles/prism-theme.css`.

- [ ] **Step 3: Boot dev server**

```bash
rtk npm run dev
```

- [ ] **Step 4: Functional walkthrough — desktop, light theme, English**

Visit `http://localhost:3000/markdown`. Confirm in order:

| Check                        | Expected                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Empty state                  | Editor shows placeholder. Preview shows "Nothing to preview".                                      |
| Type a heading + paragraph   | After ~200ms preview shows rendered `<h1>` and `<p>`.                                              |
| Tab indent                   | In a code block paragraph, press Tab. Cursor advances 2 spaces, NOT to the next focusable element. |
| Shift+Tab                    | Select a 2-space-indented line and press Shift+Tab. Indent removed.                                |
| Toggle to "Split horizontal" | Editor + preview side-by-side.                                                                     |
| Scroll the editor            | Preview scrolls proportionally.                                                                    |
| Scroll the preview           | Editor scrolls proportionally.                                                                     |
| Toggle to "Split vertical"   | Editor on top, preview on bottom.                                                                  |
| Code fence ` ```js `         | Renders with Prism JS coloring (cyan/purple tokens).                                               |
| Code fence with unknown lang | Renders as `<pre class="language-text">`, no error.                                                |
| Task list `- [ ] todo`       | Renders with a disabled checkbox.                                                                  |
| Status bar                   | Shows accurate `words · chars · min read`.                                                         |

- [ ] **Step 5: XSS test**

Paste:

```
[click](javascript:alert(1))

<script>alert(2)</script>

[ok](https://example.com)
```

Expected:

- The `javascript:` link renders as the text "click" with no `href` (or with `href="#"` depending on markdown-it's stripping behavior — verify by inspecting the rendered DOM in DevTools that the link does NOT contain `javascript:`).
- The `<script>` tag renders as escaped text (visible `<script>...</script>` in the preview, no execution).
- The `https://example.com` link is clickable.

- [ ] **Step 6: File operations**

| Action                                 | Expected                                       |
| -------------------------------------- | ---------------------------------------------- |
| Click "Load .md" → upload a .md file   | Editor populates. Toast: "File loaded".        |
| Upload a >5MB text file                | Toast: "File too large (max 5MB)".             |
| Upload an image file (e.g. .png)       | Toast: "Binary file rejected".                 |
| Click "Download .md" with content      | Browser downloads `document.md`.               |
| Click "Download .md" with empty editor | Toast: "Nothing to export".                    |
| `<CopyButton>` (with content)          | Click copies HTML, icon flips, "Copied" toast. |

- [ ] **Step 7: Export PDF**

Click "Export PDF". Browser print dialog opens. In the preview pane:

- Header and footer are absent.
- Toolbar, alert banner, status bar absent.
- Editor area absent.
- Only the rendered preview shows.

Cancel the print dialog.

- [ ] **Step 8: Export PNG**

Type some content. Click "Export PNG". Browser downloads `preview.png`. Open the file:

- Image shows the rendered preview at 2x resolution.
- Toast appears: "PNG exported (system fonts may substitute)".

- [ ] **Step 9: Large content (manual render)**

Open browser DevTools console. Paste a >512KB chunk of markdown into the editor (you can generate one with `"# Heading\n\n".repeat(50000)`).

Expected:

- Auto-render is suspended.
- A purple banner shows "Content too large for live preview" + "Render now" button.
- Empty preview area shows the same `renderTooLarge` text.
- Click "Render now" → full preview renders.

- [ ] **Step 10: Mobile viewport**

Resize browser to <768px wide (or use DevTools device emulation).

Expected:

- View-mode toggle (Tab/Split↔/Split↕) is hidden.
- Tab switcher is visible.
- Effective view is "tab" regardless of stored preference.
- Resize back above 768px → previously selected view-mode (e.g. horizontal) is restored.

- [ ] **Step 11: Locale switching**

Visit `http://localhost:3000/zh-CN/markdown` and `http://localhost:3000/zh-TW/markdown`. Confirm UI strings render correctly in both.

- [ ] **Step 12: Dark theme**

Toggle dark theme via the global theme switcher in the header. Confirm:

- Editor background and preview background switch correctly.
- Code fence Prism colors remain readable (CSS variables propagate).
- Print preview still produces a white-on-black-text output (per `@media print` rule).

- [ ] **Step 13: Diff regression check**

Visit `/diff`. Confirm:

- Side-by-side layout works.
- File upload (text + binary detection) works.
- Mobile viewport switches to vertical layout (the shared `useIsMobile` hook is wired correctly).

- [ ] **Step 14: Stop dev server and final commit**

If everything passes, no further code changes are needed. If any check failed, return to the relevant Phase task, fix, and re-run from Step 1.

```bash
# Already committed at end of each task. Confirm clean tree:
rtk git status
```

Expected: clean.

```bash
rtk git log --oneline | head -25
```

Expected: ~20 commits for this feature, plus the prior Diff/spec commits.

---

# Done

The Markdown editor is live at `/markdown`, `/zh-CN/markdown`, `/zh-TW/markdown`. Sitemap auto-includes it. All processing is client-side. XSS protection is two-layered (`html: false` + `validateLink` allowlist). Performance has a 200ms debounce + manual hint above 512KB. The Diff tool now shares `MAX_FILE_BYTES`, `isBinaryFile`, and `useIsMobile` with Markdown via `libs/file/` and `hooks/`.

If a future iteration adds Math/Mermaid/Footnotes, the integration points are:

- `libs/markdown/render.ts` — register additional `markdown-it.use(...)` plugins.
- `libs/markdown/highlight.ts` — extend `LANGUAGE_ALIASES` for new code-block grammars.
- `styles/prism-theme.css` — extend if new token classes appear.
