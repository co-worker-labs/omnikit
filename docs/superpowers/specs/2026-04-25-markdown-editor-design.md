# Markdown Editor & Preview — Design Spec

**Created**: 2026-04-25
**Updated**: 2026-04-26
**Status**: Approved

---

## Overview

Add a Markdown editor and preview tool to ByteCraft. Users write/edit Markdown and see a live GFM-rendered preview. All processing is client-side only.

## Routes

| Locale   | URL               |
| -------- | ----------------- |
| English  | `/markdown`       |
| 简体中文 | `/zh-CN/markdown` |
| 繁體中文 | `/zh-TW/markdown` |

---

## Out of Scope

Explicitly NOT supported in this iteration:

- Math (KaTeX / MathJax)
- Mermaid / diagrams
- Footnotes (`markdown-it-footnote`)
- Custom containers / admonitions
- Multi-document tabs
- Realtime collaboration

---

## Core Design Decisions

| Decision            | Choice                                                       |
| ------------------- | ------------------------------------------------------------ |
| Interaction         | Tab switcher (Edit / Preview); optional Split view           |
| Markdown engine     | markdown-it ^14 + markdown-it-task-lists                     |
| Syntax highlighting | Prism (11 languages, custom theme via CSS variables)         |
| Toolbar             | Inline toolbar (no formatting buttons; Tab indent in editor) |
| File load           | Upload .md (5MB max, binary detection)                       |
| File download       | Download .md                                                 |
| Copy                | Copy rendered HTML (use shared `CopyButton`)                 |
| Export PDF          | window.print() (zero deps)                                   |
| Export PNG          | modern-screenshot @2x scale                                  |
| Mobile              | Tab-only mode, hide split controls                           |
| XSS                 | `html: false` + explicit `validateLink` allowlist            |
| Render perf         | 200ms debounce + manual hint above 512KB                     |
| Scroll sync         | Proportional, last-active-source wins (Split only)           |

## Dependencies

### New runtime dependencies (sizes are min+gzip)

| Package                   | Size   | Purpose                             |
| ------------------------- | ------ | ----------------------------------- |
| markdown-it ^14           | ~28 KB | Markdown → HTML                     |
| markdown-it-task-lists ^2 | ~2 KB  | GFM `- [ ] todo` support            |
| prismjs ^1                | ~25 KB | Code highlighting (core + 11 langs) |
| modern-screenshot ^4      | ~9 KB  | Preview → PNG export                |

Total bundle increment (realistic, gzipped): **~65 KB**.

### New dev dependencies

| Package                | Purpose          |
| ---------------------- | ---------------- |
| @types/markdown-it ^14 | TypeScript types |

### i18n config

`i18n/request.ts` **MUST** have `"markdown"` appended to its `namespaces` array. The namespaces list is explicit (not auto-discovered from the filesystem); without registration, `markdown.json` is never loaded into the runtime messages dictionary and `useTranslations("markdown")` will throw.

---

## File Structure

```
app/[locale]/markdown/
├── page.tsx                  # Route entry + generateMetadata
├── markdown-page.tsx         # Main page (default export)
└── components/
    ├── EditorView.tsx        # Edit panel (Tab indent, line-number guard)
    └── PreviewView.tsx       # Preview panel (dangerouslySetInnerHTML, scroll sync)

libs/markdown/
├── render.ts                 # markdown-it config + renderMarkdown()
├── highlight.ts              # Prism setup + LANGUAGE_ALIASES + resolveLanguage()
└── export.ts                 # downloadMd(), exportPng()

libs/file/                    # NEW — extracted from libs/diff/
├── limits.ts                 # MAX_FILE_BYTES (shared by Diff + Markdown)
└── binary-sniff.ts           # isBinaryFile (moved from libs/diff/)

hooks/                        # NEW directory
└── use-is-mobile.ts          # Lifted from diff-page.tsx (shared)

styles/
└── prism-theme.css           # Custom Prism theme using ByteCraft CSS vars

public/locales/en/markdown.json
public/locales/zh-CN/markdown.json
public/locales/zh-TW/markdown.json
```

### Refactor side effects (prep step before Markdown work)

1. Move `libs/diff/binary-sniff.ts` → `libs/file/binary-sniff.ts`. Update `app/[locale]/diff/components/DiffInput.tsx` import.
2. Move `MAX_FILE_BYTES` from `libs/diff/compute.ts` to `libs/file/limits.ts`. Update Diff's single import site (`app/[locale]/diff/components/DiffInput.tsx`) — no re-export needed.
3. Extract `useIsMobile` from `app/[locale]/diff/diff-page.tsx` (lines 52-62) to `hooks/use-is-mobile.ts`. Update Diff import.

---

## Component Tree

```
MarkdownPage (default export)
├── Layout (header + footer)
├── Alert Banner ("100% client-side")     [data-no-print]
├── Toolbar                                [data-no-print]
│   ├── Tab switcher: [Edit] [Preview]
│   ├── View mode: Tab | Split ↔ | Split ↕
│   ├── Actions:
│   │   ├── Load .md   (hidden <input type="file">)
│   │   ├── Download .md
│   │   ├── Copy HTML  (<CopyButton getContent={() => renderedHtml}>)
│   │   ├── Export PDF (window.print)
│   │   └── Export PNG (modern-screenshot)
│   └── Clear (setMarkdown(""))
├── Content Area
│   ├── EditorView                         [data-no-print]
│   └── PreviewView (always rendered, hidden in Edit-only tab via CSS)
├── Status bar: "{words} words · {chars} chars · {min} min read"  [data-no-print]
└── Description Section
```

---

## State Management (markdown-page.tsx)

```ts
// Single-source text
const [markdown, setMarkdown] = useState("");

// Persisted preferences — gated by `hydrated` to avoid SSR/CSR mismatch
const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_PERSISTED.viewMode);
const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  setViewMode(readPersisted().viewMode);
  setHydrated(true);
}, []);

useEffect(() => {
  if (!hydrated) return;
  window.localStorage.setItem(STORAGE_KEYS.markdown, JSON.stringify({ viewMode }));
}, [viewMode, hydrated]);

// Session-only (NOT persisted)
const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

// Debounced render (200ms); skipped above AUTO_RENDER_MAX_BYTES
const [renderedHtml, setRenderedHtml] = useState("");
const tooLargeForAuto = markdown.length > AUTO_RENDER_MAX_BYTES; // 512 * 1024

useEffect(() => {
  if (!markdown) {
    setRenderedHtml("");
    return;
  }
  if (tooLargeForAuto) return; // wait for manual render
  const id = setTimeout(() => setRenderedHtml(renderMarkdown(markdown)), 200);
  return () => clearTimeout(id);
}, [markdown, tooLargeForAuto]);

// Mobile detection (shared hook from hooks/use-is-mobile.ts)
const isMobile = useIsMobile();
const effectiveViewMode = isMobile ? "tab" : viewMode;
```

### View-mode state machine

| Field               | Lifetime     | Notes                                                            |
| ------------------- | ------------ | ---------------------------------------------------------------- |
| `viewMode`          | Persisted    | User-controlled. Values: `tab` / `horizontal` / `vertical`       |
| `activeTab`         | Session      | Only consulted when `effectiveViewMode === 'tab'`                |
| `effectiveViewMode` | Derived      | Mobile forces `tab` WITHOUT mutating `viewMode`                  |
| Mobile → desktop    | Auto-restore | Persisted `viewMode` re-applies (the mobile override is virtual) |

Storage key: `STORAGE_KEYS.markdown = "bc:md"` (add to `libs/storage-keys.ts`).

`readPersisted()` returns `{ viewMode: 'tab' }` as default; rejects unknown values.

---

## Data Flow

```
User types in EditorView
  → setMarkdown(text)
    → 200ms debounce (skipped if length > 512KB)
      → renderMarkdown(markdown)
        → setRenderedHtml(html)
          → PreviewView dangerouslySetInnerHTML
```

Single source of truth (`markdown`); render is a debounced side-effect.

---

## View Modes

| Mode             | Desktop                               | Mobile         |
| ---------------- | ------------------------------------- | -------------- |
| Tab              | Single panel, Edit/Preview tab toggle | Same (default) |
| Horizontal Split | Left: Editor, Right: Preview (50/50)  | Not available  |
| Vertical Split   | Top: Editor, Bottom: Preview (50/50)  | Not available  |

Mobile (< 768px) always uses Tab mode. Split controls hidden.

### Scroll sync (Split mode only)

Bidirectional, last-active-source wins.

```ts
// Pseudocode in PreviewView / EditorView wiring
function syncScroll(src: HTMLElement, dst: HTMLElement) {
  if (lockRef.current) return; // ignore programmatic scroll bounce-back
  lockRef.current = true;
  const denom = src.scrollHeight - src.clientHeight;
  const ratio = denom > 0 ? src.scrollTop / denom : 0;
  dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight);
  requestAnimationFrame(() => {
    lockRef.current = false;
  });
}
```

The `lockRef` flag prevents the destination's `scroll` event from echoing back. Disabled in Tab mode.

---

## markdown-it Configuration (libs/markdown/render.ts)

```ts
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import Prism from "prismjs";
import { resolveLanguage } from "./highlight";

const SAFE_PROTOCOL = /^(https?|mailto|tel):/i;
const SAFE_DATA_IMAGE = /^data:image\/(gif|png|jpe?g|webp);base64,/i;

const md = MarkdownIt({
  html: false, // No raw HTML
  linkify: true, // Auto-link URLs
  typographer: true, // Smart quotes, dashes
  breaks: true, // GFM newline → <br>
});

// Explicit allowlist (defense-in-depth over markdown-it's default BAD_PROTO_RE)
md.validateLink = (url) => {
  if (/^(#|\/|\.\.?\/)/.test(url)) return true; // anchors / relative paths
  if (SAFE_PROTOCOL.test(url)) return true; // http(s) / mailto / tel
  if (SAFE_DATA_IMAGE.test(url)) return true; // inline images
  return false;
};

md.use(taskLists, { enabled: false }); // GFM `- [ ] todo`

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const code = token.content;
  const raw = (token.info || "").trim().toLowerCase();
  const lang = resolveLanguage(raw); // null if unknown
  const escaped = md.utils.escapeHtml(code);
  if (!lang) return `<pre class="language-text"><code>${escaped}</code></pre>`;
  const highlighted = Prism.highlight(code, Prism.languages[lang], lang);
  return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
};

export function renderMarkdown(input: string): string {
  return md.render(input);
}
```

### Why explicit allowlist (not the default BAD_PROTO_RE)

A whitelist is provably exhaustive over legitimate input; a blacklist is not. Custom URI schemes (`intent:`, `chrome-extension:`, future XSS vectors) periodically surface as attack surfaces. Cost: ~10 lines. Default stance: reject unknown schemes.

---

## Prism Languages & Aliases (libs/markdown/highlight.ts)

Bundled (11 canonical languages):

```
javascript, typescript, python, bash, json, css, html, sql, yaml, go, rust
```

```ts
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup"; // html
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
};

export function resolveLanguage(raw: string): string | null {
  const normalized = LANGUAGE_ALIASES[raw] ?? raw;
  return Prism.languages[normalized] ? normalized : null;
}
```

Unknown language → `<pre class="language-text">`, no highlight, no error.

### Custom Prism theme (styles/prism-theme.css)

Hand-rolled file mapping Prism token classes (`.token.keyword`, `.token.string`, `.token.comment`, `.token.function`, ...) to ByteCraft CSS variables (`--accent-cyan`, `--accent-purple`, `--fg-secondary`, `--fg-muted`). One CSS file works for both light and dark because it consumes theme variables defined in `app/globals.css`.

Imported once at the top of `markdown-page.tsx`:

```ts
import "../../../styles/prism-theme.css";
```

---

## File Operations

### Load .md

```
User clicks "Load .md" → <input type="file" accept=".md,.markdown,.txt">
  → Size check (MAX_FILE_BYTES from libs/file/limits.ts)
  → Binary detection (isBinaryFile from libs/file/binary-sniff.ts)
  → FileReader.readAsText() → setMarkdown(text)
  → Toast: "File loaded"
```

Error handling: "File too large (max 5MB)", "Binary file rejected".

### Download .md

```ts
const blob = new Blob([markdown], { type: "text/markdown" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "document.md";
a.click();
URL.revokeObjectURL(url);
```

### Copy HTML

Use the existing `<CopyButton getContent={() => renderedHtml} />` from `components/ui/copy-btn.tsx`. Disabled when `!renderedHtml`. Toast and icon feedback handled inside the component (no custom clipboard call).

---

## Export Operations

### Export PDF (window.print)

```
User clicks "Export PDF" → window.print() → user picks "Save as PDF"
```

Print CSS lives in `app/globals.css` under `@media print`:

```css
@media print {
  /* Hide global chrome and any opt-out node */
  header,
  footer,
  [data-no-print] {
    display: none !important;
  }
  /* Force light surfaces */
  body {
    background: #fff !important;
    color: #000 !important;
  }
  /* Page margins */
  @page {
    margin: 1.5cm;
  }
  /* Preview should print full width without page-break inside code blocks where possible */
  pre,
  blockquote {
    page-break-inside: avoid;
  }
}
```

Toolbar, alert banner, status bar, and the editor area all carry `data-no-print` so only the rendered preview prints (regardless of current view mode).

### Export PNG (modern-screenshot)

```ts
import { domToPng } from "modern-screenshot";

const dataUrl = await domToPng(previewRef.current!, {
  scale: 2, // retina output
  backgroundColor: getComputedStyle(document.body).backgroundColor,
});
const a = document.createElement("a");
a.href = dataUrl;
a.download = "preview.png";
a.click();
```

**Font handling**: `next/font` injects Inter / JetBrains Mono via CSS. `modern-screenshot` may fall back to system fonts on capture. Acceptable trade-off; show a one-time toast on first export: `"Exported (system fonts may substitute)"`. Do NOT block on font embedding.

If `!renderedHtml` → toast "Nothing to export". Captures full preview area including overflow content.

---

## Performance

### Debounce

- 200 ms on input → render. Cancellable via cleanup.

### Manual render hint

- `AUTO_RENDER_MAX_BYTES = 512 * 1024` (512 KB).
- Above threshold: auto-render suspended, preview shows "Content too large for live preview. [Render now]" button (mirrors Diff's `manualHint` state in `diff-page.tsx:174`).

### Editor protection (mirrors `DiffInput.tsx:77`)

- `LineNumberedTextarea` already supports `showLineNumbers` toggle.
- EditorView passes `showLineNumbers={lineCount <= 5000 && length < 512 * 1024}`.

### Tab indent (UX)

- EditorView intercepts `Tab` keydown in textarea: insert two spaces, prevent default focus shift.
- `Shift+Tab`: dedent up to two leading spaces from each selected line.
- Preserves selection range after edit.

### Status bar (live counts)

- Below editor area: `{words} words · {chars} chars · {min} min read` where `min = Math.max(1, Math.ceil(words / 200))`.
- Computed directly from `markdown` (React Compiler memoizes; no `useMemo`).

---

## Edge Cases

| Scenario                  | Behavior                                                           |
| ------------------------- | ------------------------------------------------------------------ |
| Empty markdown            | Preview shows "Nothing to preview" (i18n key `emptyPreview`)       |
| Editor empty              | Placeholder "Write or paste your Markdown here..." (`placeholder`) |
| Very large text (>512KB)  | Auto render suspended; manual `[Render now]` button                |
| Binary file upload        | Rejected with toast                                                |
| File too large (>5MB)     | Rejected with toast                                                |
| No content → export PNG   | Toast "Nothing to export"                                          |
| Unsupported code language | `<pre class="language-text">`, no error                            |
| Mobile viewport           | Tab-only mode, split controls hidden                               |
| XSS via raw HTML          | Blocked by `html: false`                                           |
| XSS via link protocol     | Blocked by `validateLink` allowlist                                |
| Copy HTML with no content | `CopyButton` disabled (component handles state)                    |
| Returning to desktop      | Persisted `viewMode` restored (mobile override was virtual)        |

---

## i18n Keys (markdown.json)

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
  "nothingToCopy": "Nothing to copy",
  "tooLarge": "File too large (max 5MB)",
  "binaryRejected": "Binary file rejected",
  "exportPdf": "Export PDF",
  "exportPng": "Export PNG",
  "pngFontNotice": "Exported (system fonts may substitute)",
  "nothingToExport": "Nothing to export",
  "renderTooLarge": "Content too large for live preview",
  "renderNow": "Render now",
  "wordsCount": "{count} words",
  "charsCount": "{count} chars",
  "readTime": "{min} min read",
  "viewMode": {
    "tab": "Tab",
    "horizontal": "Split ↔",
    "vertical": "Split ↕"
  },
  "descriptions": {
    "whatIsTitle": "What is Markdown?",
    "whatIsP1": "Markdown is a lightweight markup language...",
    "howTitle": "How to use",
    "howP1": "Write or paste your Markdown text in the editor...",
    "gfmTitle": "GitHub Flavored Markdown",
    "gfmP1": "Supports tables, task lists, strikethrough, and autolinks. Math, Mermaid diagrams, and footnotes are out of scope for this iteration.",
    "privacyTitle": "Privacy",
    "privacyP1": "All processing happens in your browser..."
  }
}
```

Translations needed for zh-CN and zh-TW.

---

## tools.ts Registration

```ts
// In libs/tools.ts TOOLS array, add:
{ key: "markdown", path: "/markdown" }
```

### SEO Metadata (tools.json)

```json
"markdown": {
  "title": "Markdown Editor & Preview - Free Online Tool",
  "shortTitle": "Markdown Editor",
  "description": "Write and preview Markdown with GitHub Flavored Markdown support. Free online Markdown editor with live preview, 100% client-side."
}
```

### Sitemap

Add `/markdown` to `app/sitemap.ts` route enumeration alongside other tools.

---

## Implementation Order

### Phase 0 — Refactor prep (do first; verify build green before moving on)

1. Create `libs/file/limits.ts` with `MAX_FILE_BYTES`. Migrate Diff's import sites (single ref in `app/[locale]/diff/components/DiffInput.tsx`); remove the constant from `libs/diff/compute.ts`.
2. Move `libs/diff/binary-sniff.ts` → `libs/file/binary-sniff.ts`. Update `app/[locale]/diff/components/DiffInput.tsx` import.
3. Extract `useIsMobile` from `app/[locale]/diff/diff-page.tsx:52-62` to `hooks/use-is-mobile.ts`. Update Diff import.
4. Run build + visit `/diff` to confirm no regression.

### Phase 1 — Markdown core

5. Install: `markdown-it`, `markdown-it-task-lists`, `prismjs`, `modern-screenshot`, `@types/markdown-it`.
6. Create `styles/prism-theme.css` (custom theme using `--fg-*` / `--accent-*` vars).
7. Create `libs/markdown/highlight.ts` — Prism imports, `LANGUAGE_ALIASES`, `resolveLanguage()`.
8. Create `libs/markdown/render.ts` — markdown-it config, `validateLink` allowlist, fence rule, `renderMarkdown()`.
9. Create `libs/markdown/export.ts` — `downloadMd()`, `exportPng()`.
10. Add `markdown: "bc:md"` to `libs/storage-keys.ts`.
11. Add `@media print` block to `app/globals.css`.

### Phase 2 — UI

12. Create `app/[locale]/markdown/components/EditorView.tsx` — Tab indent, line-number guard, line-numbered textarea wrapping.
13. Create `app/[locale]/markdown/components/PreviewView.tsx` — `dangerouslySetInnerHTML`, scroll-sync hooks, empty-state.
14. Create `app/[locale]/markdown/markdown-page.tsx` — state, debounce, view mode logic, scroll sync, status bar, toolbar.
15. Create `app/[locale]/markdown/page.tsx` — route entry + `generateMetadata`.

### Phase 3 — i18n & registration

16. Create `public/locales/{en,zh-CN,zh-TW}/markdown.json`.
17. Update `public/locales/{locale}/tools.json` — add markdown entry.
18. Update `libs/tools.ts` — register tool.
19. Update `app/sitemap.ts` — add `/markdown` route.

### Phase 4 — Verify

20. Build & smoke-test: light + dark, mobile + desktop, all three locales, PDF print, PNG export, file upload, large-file manual render, scroll sync, Tab indent, XSS link rejection (`[x](javascript:alert(1))` should render as plain text without a working link).
