# Diff Tool Design Specification

## Overview

A browser-only text/code diff tool. Two inputs (Original / Modified) are compared with line-level pairing and intra-line word-level highlighting, rendered in either side-by-side or inline layout. All processing happens client-side; no data ever leaves the browser.

## Project Context

- **Project**: ByteCraft — Browser-based developer utilities
- **Tech Stack**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + next-intl
- **UI**: Project-internal components under `components/ui/` (no Bootstrap, no third-party UI kit)
- **Theme**: Global theme via `libs/theme.tsx` — tools do not implement their own theme switch
- **i18n layout**: One JSON file per tool under `public/locales/{en,zh-CN,zh-TW}/<tool>.json`, **flat keys**; consumed via `useTranslations("<tool>")`
- **Data Processing**: All operations run entirely in the browser — no data sent to any server

## Goals

1. Make textual differences immediately legible (line + word level), matching the visual convention developers know from GitHub PRs.
2. Stay responsive on inputs up to 5MB without freezing the page.
3. Match the look-and-feel of existing tools (`base64`, `urlencoder`, `hashing`, …) — same `Layout`, same alert banner, same description-section pattern.
4. Add zero new heavyweight dependencies. Diff engine ≈ 30KB; virtualization ≈ 8KB. No syntax-highlighting library.

## Non-Goals (explicit)

- General syntax highlighting (no prism / highlight.js / shiki). JSON is special-cased via a tiny built-in tokenizer.
- A per-tool theme switch (the site already has a global theme).
- Character-level diff (visually noisy in CJK and rarely useful).
- Three-way diff, multi-file diff, directory diff.
- Algorithm options beyond Myers (no patience / histogram toggle).
- Exporting diff as a downloadable patch file (clipboard copy is enough).
- Extra whitespace toggles beyond _Ignore whitespace_ and _Ignore case_ (CRLF normalization and trailing-whitespace trim are always on, never exposed).

## Functional Requirements

### Core Features

| Feature                | Description                                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two text inputs        | Left = Original, Right = Modified, using `StyledTextarea`                                                                                                                                 |
| File upload            | Any file accepted; binary files are sniffed and rejected; size capped at 5MB per side                                                                                                     |
| Auto compute (small)   | Inputs `< 512KB` per side: 300ms debounce, runs automatically                                                                                                                             |
| Manual compute (large) | Either side `≥ 512KB`: auto-compute disabled; user clicks a "Compare" button                                                                                                              |
| Web Worker             | All `jsdiff` calls run in a dedicated worker; main thread never blocks                                                                                                                    |
| Line + word highlight  | `diffLines` for line pairing, then `diffWordsWithSpace` re-highlights changed line pairs                                                                                                  |
| Side-by-side view      | Two columns with line numbers, virtualized when row count > 2000                                                                                                                          |
| Inline view            | Single-column unified diff, virtualized when row count > 2000                                                                                                                             |
| View toggle            | Button to switch between side-by-side and inline; **hidden on viewports `< 768px` and forced to inline**                                                                                  |
| Ignore whitespace      | Checkbox; passes `ignoreWhitespace: true` to jsdiff                                                                                                                                       |
| Ignore case            | Checkbox; passes `ignoreCase: true` to jsdiff                                                                                                                                             |
| Format JSON            | Per-input button at the textarea's top-right; if input parses as JSON, rewrite the textarea with `JSON.stringify(parsed, null, 2)`; on parse failure, toast with the parser error message |
| Swap                   | Exchange Original and Modified contents                                                                                                                                                   |
| Clear (single)         | Per-input clear link                                                                                                                                                                      |
| Clear all              | Toolbar button to clear both sides                                                                                                                                                        |
| Copy diff              | Copy the unified-diff representation to clipboard                                                                                                                                         |
| Empty / equal states   | Both empty → placeholder, no diff. Non-empty but identical (under current options) → "No differences found"                                                                               |
| Persistence            | View mode and the two option toggles persisted via `libs/storage-keys.ts`                                                                                                                 |

### Always-On Normalization (no UI)

- **CRLF → LF**: All inputs are normalized before diffing (`text.replace(/\r\n/g, "\n")`). Line-ending mismatches must never be presented as differences.
- **Trailing whitespace trim**: Each line has trailing space/tab removed before diffing (`text.replace(/[ \t]+$/gm, "")`).

### Edge Cases

| Case                                                        | Behavior                                                                                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Both inputs empty                                           | Show input placeholders, no diff rendered, no "No differences found" message                                               |
| One side empty, other non-empty                             | Run diff normally — every line of the non-empty side appears as add/delete                                                 |
| Both inputs non-empty and identical (under current options) | Show "No differences found"                                                                                                |
| File `> 5MB`                                                | Reject with toast "File too large (max 5MB)"; input unchanged                                                              |
| File detected as binary                                     | Reject with toast "Binary file detected"; input unchanged                                                                  |
| File read encoding                                          | Read as UTF-8 (`FileReader.readAsText(file, "utf-8")`); replacement chars are accepted (browser handles invalid sequences) |
| Format JSON on invalid JSON                                 | Toast with the parse error; input unchanged                                                                                |
| Diff result with > 2000 rows                                | Switch to virtualized rendering automatically                                                                              |
| Worker error                                                | Toast generic failure message; clear diff state                                                                            |

### Binary Sniffing Rule

A file is classified as binary if **either** holds for the first 8KB read:

1. The byte sequence contains a NUL byte (`0x00`).
2. After UTF-8 decoding (`new TextDecoder("utf-8", { fatal: false })`), more than 5% of decoded code units are the replacement character `U+FFFD`.

This is a heuristic — sufficient for common binaries (executables, images, archives) without false-positiving UTF-8 source files.

## Architecture

### File Structure

```
app/[locale]/diff/
├── page.tsx                      # Route + SEO metadata
├── diff-page.tsx                 # Main client component ("use client")
└── components/
    ├── DiffInput.tsx             # textarea + file upload + Format JSON button
    ├── DiffToolbar.tsx           # view toggle / swap / clear all / copy / option toggles
    ├── DiffViewer.tsx            # branches between SideBySide and Inline
    ├── DiffSideBySide.tsx        # two-column virtualized list
    ├── DiffInline.tsx            # single-column virtualized list
    └── DiffRow.tsx               # per-row renderer with word-level spans

app/[locale]/diff/worker/
└── diff.worker.ts                # Worker entry: receives request, runs jsdiff, posts result

libs/diff/
├── compute.ts                    # Main-thread wrapper: spawns/holds the Worker, marshals messages
├── normalize.ts                  # CRLF → LF, trailing-whitespace trim
├── binary-sniff.ts               # First-8KB binary detection
├── json-format.ts                # JSON.parse + stringify(2) with friendly error
└── json-tokenizer.ts             # ~60-line tokenizer producing colored spans for JSON inputs

# Site-wide registration
- libs/tools.ts                   # Append diff entry
- app/[locale]/home-page.tsx      # Append icon card
- public/locales/{en,zh-CN,zh-TW}/tools.json   # Append diff title/shortTitle/description
- public/locales/{en,zh-CN,zh-TW}/diff.json    # Tool's own translations (flat keys)
- libs/storage-keys.ts            # Append DIFF_VIEW_MODE, DIFF_OPTIONS keys
```

### Component Hierarchy

```
DiffPage (Layout-wrapped)
├── alert banner (tc("alert.notTransferred"))
├── DiffToolbar
│   ├── view toggle (hidden when viewport < 768px)
│   ├── swap / clear all / copy
│   └── ignore-whitespace / ignore-case checkboxes
├── DiffInput (Original)
│   ├── header (label + Format JSON + clear)
│   └── StyledTextarea + file upload (drag/click)
├── DiffInput (Modified)        // same shape
├── DiffViewer
│   ├── DiffSideBySide  OR  DiffInline
│   │   └── virtualized rows of DiffRow
│   └── empty / equal / computing / manual-compute states
└── Description section (five subsections, see below)
```

### Data Flow

```
User input / file upload
        │
        ▼
normalize.ts  (CRLF → LF, trim trailing whitespace)
        │
        ├──[ size < 512KB per side ]──> debounce 300ms ──┐
        └──[ size ≥ 512KB any side ]──> show "Compare"   │
                                          button click ──┤
                                                         ▼
                                          libs/diff/compute.ts
                                                         │
                                                postMessage to Worker
                                                         ▼
                                          diff.worker.ts
                                            jsdiff.diffLines(opts)
                                            pair add/del runs → diffWordsWithSpace
                                            build unified-diff string
                                                         │
                                                postMessage result
                                                         ▼
                                          React state
                                                         │
                                                 ┌───────┴────────┐
                                                 ▼                ▼
                                       row count ≤ 2000      row count > 2000
                                       direct render        virtualized render
```

### Worker Protocol

```ts
// Request
type DiffRequest = {
  id: number;
  original: string;
  modified: string;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
};

// Response
type DiffResponse = {
  id: number;
  rows: DiffRowData[]; // unified row stream, see below
  unifiedPatch: string; // text representation for Copy
  hasChanges: boolean;
};

type DiffRowData =
  | { kind: "context"; oldNo: number; newNo: number; text: string }
  | { kind: "del"; oldNo: number; segments: WordSeg[] }
  | { kind: "add"; newNo: number; segments: WordSeg[] };

type WordSeg = { text: string; changed: boolean };
```

The same `DiffRowData[]` is consumed by both `DiffSideBySide` (which slots `del`/`add` into left/right columns by pairing) and `DiffInline` (which renders sequentially). The `DiffRow.tsx` component file holds the per-row React renderer; the type and the component intentionally do not share a name.

### Word-Level Pairing Rule

After `diffLines`, walk the result. Whenever a run of `del` lines is immediately followed by a run of `add` lines, **pair them index-by-index** (line _i_ of the del run with line _i_ of the add run, up to `min(len)`). For each paired `(delLine, addLine)`, run `diffWordsWithSpace` to produce `WordSeg[]` for both sides. Unpaired tail lines (when del and add runs differ in length) get a single `WordSeg` covering the full line, marked `changed: true`.

This is the standard GitHub/GitLab approach and degrades gracefully when add/del counts don't match.

## UI / UX

### Layout

- Max-width: 1400px centered (matches existing tools)
- Two `DiffInput` blocks: stacked vertically on `< 1024px`, side-by-side on `≥ 1024px`
- Diff result area below the inputs, full-width
- Each `StyledTextarea` min-height 240px, resizable
- Toolbar sticky-top within the page container is **out of scope** — keep it as a normal block

### Visual Tokens (use existing project tokens, not hardcoded hex)

- Add highlight: `bg-success-dim` background, `text-success` text (whatever tokens the project already exposes for success/positive)
- Delete highlight: `bg-danger-dim` background, `text-danger` text
- Word-level emphasis within a row: deeper variant of the same family
- Line numbers: `text-fg-muted`, monospace
- Use the same accent dot pattern as `urlencoder-page.tsx` for input section headers (`bg-accent-cyan/60`, `bg-accent-purple/60`)

The exact token names must be aligned with what already exists in the project's Tailwind config during implementation. The plan step will read the config and pin them.

### Mobile (`< 768px`)

- Inputs stack
- View toggle is **hidden**, layout forced to inline
- Toolbar buttons wrap to multiple rows; option checkboxes go below

### Accessibility

- All buttons have visible focus indicators (existing `Button` component handles this)
- View toggle is a `role="radiogroup"` with two `role="radio"` buttons (mirrors `urlencoder-page.tsx` mode toggle)
- Diff rows in side-by-side view get `aria-label` describing kind ("Added line", "Removed line", "Unchanged")
- File upload `<input type=file>` has an associated label
- Ensure foreground/background contrast for add/delete tokens meets WCAG AA

## Translations

### Translation Files

`public/locales/{en,zh-CN,zh-TW}/diff.json` — **flat keys**, consumed via `useTranslations("diff")`:

```json
{
  "originalText": "Original Text",
  "modifiedText": "Modified Text",
  "originalPlaceholder": "Paste or type the original text here, or drop a file",
  "modifiedPlaceholder": "Paste or type the modified text here, or drop a file",
  "uploadFile": "Upload file",
  "formatJson": "Format JSON",
  "formatJsonInvalid": "Not valid JSON: {message}",
  "swap": "Swap",
  "copyDiff": "Copy diff",
  "compare": "Compare",
  "view": {
    "label": "View",
    "sideBySide": "Side by side",
    "inline": "Inline"
  },
  "options": {
    "ignoreWhitespace": "Ignore whitespace",
    "ignoreCase": "Ignore case"
  },
  "noChanges": "No differences found",
  "computing": "Computing diff...",
  "tooLarge": "File too large (max 5MB)",
  "binaryRejected": "Binary file detected, please upload a text file",
  "manualHint": "Large input — auto-compare disabled. Click Compare when ready.",
  "workerFailed": "Diff failed, please try again",
  "descriptions": {
    "whatIsTitle": "What is a diff?",
    "whatIsP1": "A diff is a structured comparison between two pieces of text that highlights what was added, what was removed, and what stayed the same. Developers use it every day to review code changes, audit configuration drift, and reconcile two versions of a document.",
    "whatIsP2": "This tool runs the comparison entirely in your browser using the jsdiff library. Nothing you paste or upload is sent to any server.",
    "howTitle": "How to use",
    "howP1": "Paste or drop your two inputs into the Original and Modified fields. The diff computes automatically for inputs under 512KB; for larger inputs a Compare button appears so you stay in control.",
    "howP2": "Toggle between side-by-side and inline views, ignore whitespace or case when needed, and use Format JSON to normalize JSON inputs before comparing.",
    "algorithmTitle": "Algorithm",
    "algorithmP1": "Built on the Myers diff algorithm via jsdiff. The tool first computes a line-level diff, then for each pair of adjacent removed-and-added lines runs a second word-level pass to highlight which words actually changed — the same convention used by GitHub pull requests.",
    "useCasesTitle": "Common Use Cases",
    "useCasesP1": "Comparing two configuration files (JSON, YAML, .env) to spot drift between environments.",
    "useCasesP2": "Reviewing a code change before pasting it into a commit, especially when working outside an editor.",
    "useCasesP3": "Reconciling two versions of a document, log, or query result side by side.",
    "limitationsTitle": "Limitations",
    "limitationsP1": "The tool diffs text only. Binary files are detected and rejected to keep the result meaningful.",
    "limitationsP2": "Inputs are capped at 5MB per side. Inputs above 512KB run in a background Web Worker; the page stays responsive but the diff itself takes proportionally longer for very large inputs.",
    "limitationsP3": "Differences in line endings (CRLF vs LF) and trailing whitespace are normalized away — they will never appear as changes."
  }
}
```

### Site-Wide Registration Strings

Append to each locale's `tools.json`:

```json
{
  "diff": {
    "title": "Diff Comparison",
    "shortTitle": "Diff",
    "description": "Compare two texts and highlight differences with line and word-level precision."
  }
}
```

`zh-CN` and `zh-TW` translations to be authored at implementation time; English shown above as the canonical source.

## Dependencies

```json
{
  "dependencies": {
    "diff": "^7.0.0",
    "@tanstack/react-virtual": "^3.0.0"
  },
  "devDependencies": {
    "@types/diff": "^7.0.0"
  }
}
```

**Not added** (explicitly): `react-diff-viewer`, `react-diff-viewer-continued`, `prismjs`, `highlight.js`, `shiki`.

Pin exact versions during the install step in the implementation plan.

## Acceptance Criteria

1. Two text input areas accept paste, type, drag-and-drop file, and click-to-upload file.
2. File upload reads content client-side; nothing is uploaded.
3. Files detected as binary are rejected with a toast.
4. Files exceeding 5MB are rejected with a toast.
5. With both sides under 512KB, the diff recomputes 300ms after the user stops typing.
6. With either side ≥ 512KB, auto-compute is disabled and a Compare button appears; clicking it runs the diff.
7. The diff computation runs in a Web Worker; the main thread never blocks for more than a frame.
8. Side-by-side view shows two columns with line numbers and per-row coloring; inline view shows a single column.
9. Within paired removed/added lines, word-level differences are highlighted in a deeper variant of the row's color.
10. The view toggle switches modes; on viewports `< 768px` it is hidden and the layout is forced to inline.
11. _Ignore whitespace_ and _Ignore case_ checkboxes change the diff result on next compute.
12. _Format JSON_ on each input parses and pretty-prints valid JSON in place; on invalid JSON it toasts the parser error and leaves the input unchanged.
13. _Swap_ exchanges Original and Modified.
14. Per-input clear empties one side; _Clear all_ empties both.
15. _Copy diff_ copies the unified-diff text to the clipboard.
16. With both sides empty, only placeholders show; no diff and no "No differences found" message.
17. With both sides non-empty and identical under the active options, "No differences found" is displayed.
18. When the diff produces > 2000 rows, the result list is virtualized; DOM node count stays bounded.
19. The page includes the project-standard "data not transferred" alert banner at the top.
20. View mode and the two option toggles persist via keys defined in `libs/storage-keys.ts`.
21. The tool is registered in `libs/tools.ts`, `app/[locale]/home-page.tsx` (icon card), and each locale's `tools.json`.
22. `app/[locale]/diff/page.tsx` exports SEO metadata (title, description, openGraph) consistent with sibling tools.
23. CRLF vs LF differences and trailing whitespace differences never appear as changes (always normalized).
24. The description section renders five subsections: What / How / Algorithm / Use cases / Limitations.
25. Translations exist and pass type checking for `en`, `zh-CN`, and `zh-TW`.

## Implementation Notes

- The Worker is implemented as a Next.js native worker (`new Worker(new URL("./diff.worker.ts", import.meta.url), { type: "module" })`). No Comlink unless the protocol grows beyond two message types.
- `libs/diff/compute.ts` should hold a single Worker instance for the page's lifetime, debounce/cancel in-flight requests by id, and only deliver the most recent response.
- React Compiler handles memoization: per project rules, do **not** write `useMemo` / `useCallback` / `React.memo` manually.
- Virtualization threshold (2000) lives as a named constant in `libs/diff/compute.ts`.
- Token names in the visual design (`bg-success-dim`, `bg-danger-dim`, etc.) are placeholders; the implementation plan must verify the actual token names against the Tailwind config and adjust before coding.
- The Worker must be careful with input size: passing strings via `postMessage` copies them. For our 5MB ceiling this is acceptable (~10MB transferred max per request); no need for `Transferable` ArrayBuffers.
