# DB Viewer — Design Spec

## Overview

A browser-based SQLite database viewer and SQL query tool. Users upload `.db` / `.sqlite` files, browse tables / views / indexes / triggers, run read-only SQL with autocomplete, format SQL, page through large result sets, and export results. All processing happens client-side — no data leaves the browser, no remote endpoints involved.

## Core Requirements

| Requirement             | Detail                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| File upload             | Drag-and-drop with visual feedback; click to upload `.db`, `.sqlite`, `.sqlite3` (≤ 200 MB)                            |
| Database info bar       | File name, size, table/view counts, "Close" action to release memory                                                   |
| Sample database         | One-click load of a bundled Chinook-style sample DB for first-time users                                               |
| Schema browsing         | Sidebar listing tables / views / indexes / triggers; click to expand schema inline                                     |
| Schema inspection       | Columns (name, type, nullable, default, PK), foreign keys, index list per table                                        |
| SQL editor              | CodeMirror 6 with SQL syntax highlighting, line numbers, theme bound to global light/dark, table & column autocomplete |
| Multi-statement support | Editor accepts multiple statements; each result rendered in its own tab                                                |
| SQL format / compress   | Toolbar buttons to beautify or single-line SQL                                                                         |
| Read-only enforcement   | SAVEPOINT-based isolation + keyword whitelist + statement-level rejection                                              |
| Web Worker execution    | sql.js runs in a worker; main thread can abort long-running queries                                                    |
| Result table            | Streaming pagination via `prepare` + `step`; virtual-scroll grid; client-side sort of current page                     |
| Type-aware rendering    | NULL, BLOB, JSON-in-TEXT, BigInt, long text all rendered distinctly                                                    |
| Export                  | CSV (RFC 4180) and JSON for the current result set                                                                     |
| Query history           | Last 50 queries persisted in `localStorage` (SQL text only, no data)                                                   |
| i18n                    | English, Simplified Chinese, Traditional Chinese                                                                       |
| Mobile responsive       | Sidebar collapses; schema opens via tap; table scrolls horizontally                                                    |
| Accessibility           | ARIA roles on sidebar / grid / tabs; keyboard navigation; visible focus rings                                          |

## Architecture

### File Structure

```
app/[locale]/dbviewer/
├── page.tsx                         # Route entry — generateMetadata + render DbViewerPage
├── dbviewer-page.tsx                # Client component — wires components + Worker hook
└── components/
    ├── file-upload.tsx              # Drop zone (drag state, click, sample DB button)
    ├── database-info-bar.tsx        # Filename / size / counts / close
    ├── table-sidebar.tsx            # Tables / Views / Indexes / Triggers, search filter
    ├── schema-inspector.tsx         # Inline expanded schema for a sidebar item
    ├── sql-editor.tsx               # CodeMirror 6 instance + toolbar + autocomplete
    ├── result-tabs.tsx              # Tab strip for multi-statement results
    ├── result-table.tsx             # Virtual-scroll grid + sort + pagination + cell renderers
    ├── export-buttons.tsx           # CSV / JSON download
    ├── query-history.tsx            # Recent queries dropdown
    └── status-overlay.tsx           # Loading / aborting / error banner

libs/dbviewer/
├── engine.ts                        # Main-thread façade over the Worker (typed message API)
├── worker.ts                        # Web Worker entry — owns sql.js + Database instance
├── safety.ts                        # SAVEPOINT wrapping + keyword whitelist + statement split
├── format.ts                        # sql-formatter wrappers (beautify / compress)
├── export.ts                        # CSV (RFC 4180) and JSON serializers, BLOB-aware
├── history.ts                       # localStorage-backed query history (capped, deduped)
├── codemirror-theme.ts              # Light / dark theme extensions bound to ByteCraft tokens
└── autocomplete.ts                  # Schema-driven completion source

public/dbviewer/
├── sql-wasm.wasm                    # sql.js WASM (self-hosted, no CDN)
└── sample.db                        # Chinook-style sample database (~1 MB)

public/locales/{en,zh-CN,zh-TW}/
└── dbviewer.json                    # Tool i18n translations
```

### Technology Stack

| Layer            | Choice                                                            | Rationale                                                                                                                      |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| SQL engine       | `sql.js` (WASM)                                                   | Most mature browser SQLite; WASM **self-hosted** under `/public/dbviewer/` to keep the "no third-party request" guarantee      |
| Execution thread | Web Worker                                                        | sql.js is synchronous; running it in a worker keeps the UI responsive and allows `worker.terminate()` to abort runaway queries |
| SQL editor       | CodeMirror 6 (`@codemirror/lang-sql`, `@codemirror/autocomplete`) | Lightweight, modular, schema-aware completion                                                                                  |
| SQL formatter    | `sql-formatter` (SQLite dialect)                                  | Battle-tested pretty-printer                                                                                                   |
| Virtual scroll   | `@tanstack/react-virtual`                                         | Already in `package.json` — no new dependency                                                                                  |
| Styling          | Tailwind CSS + existing CSS variables                             | Consistent with ByteCraft theme                                                                                                |
| i18n             | `next-intl`                                                       | Consistent with ByteCraft                                                                                                      |

### New Dependencies

- `sql.js` — SQLite WASM engine
- `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-sql`, `@codemirror/autocomplete` — editor + completion
- `sql-formatter` — beautify / compress

### Registration Points

1. `libs/tools.ts` — append `dbviewer` entry (key, path, icon, category — match existing tool shape)
2. `i18n/request.ts` — add `"dbviewer"` to the `namespaces` array
3. `public/locales/{en,zh-CN,zh-TW}/tools.json` — add `dbviewer` section (`title`, `shortTitle`, `description`)
4. `public/locales/{en,zh-CN,zh-TW}/dbviewer.json` — tool-specific translations
5. `next.config.*` — ensure `.wasm` MIME and `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers if needed for Worker + WASM (verify on first integration, not assumed)

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  File upload zone (drag-drop / click / "Try sample DB")       │
│  "All data processed locally in your browser"                 │
├──────────────────────────────────────────────────────────────┤
│  📄 demo.db · 4.3 MB · 8 tables · 1 view  [Close]            │
├──────────────┬───────────────────────────────────────────────┤
│ Sidebar      │  SQL Editor (CodeMirror 6)                    │
│ [search...]  │  [▶ Run] [■ Stop] [Format] [Compress] [Clear] │
│              │  [History ▼]                                  │
│ TABLES (8)   ├───────────────────────────────────────────────┤
│ ▸ users      │  Result tabs:  [Result 1] [Result 2*]          │
│   ▾ orders   │  ┌──────────────────────────────────────────┐ │
│     id  INT  │  │ id │ name        │ created_at  │ data    │ │
│     uid INT  │  │ 1  │ alice       │ 2026-01-12  │ <BLOB>  │ │
│     FK→users │  │ 2  │ bob         │ NULL        │ {json}  │ │
│ ▸ products   │  └──────────────────────────────────────────┘ │
│ VIEWS (1)    │  Rows 1–100 · 0.03 s · [Load more] [All]      │
│ INDEXES (5)  │  [Export CSV] [Export JSON]                   │
│ TRIGGERS (2) │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

### Component Breakdown

Each component lives in its own file under `app/[locale]/dbviewer/components/`. The `dbviewer-page.tsx` only wires them together and owns the `useDatabase()` hook returned by `engine.ts`.

| Component         | Responsibility                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `FileUpload`      | Drop zone, drag-over state, file picker, "Try sample DB" button                               |
| `DatabaseInfoBar` | Shows filename / size / counts; "Close" releases worker memory                                |
| `TableSidebar`    | Lists tables / views / indexes / triggers; search box; click expands `SchemaInspector` inline |
| `SchemaInspector` | Renders columns, FKs, index list for the selected item                                        |
| `SqlEditor`       | CodeMirror 6, schema-aware autocomplete, toolbar, history dropdown, theme-bound               |
| `ResultTabs`      | Tab strip (one per executed statement); badge for the active / errored tab                    |
| `ResultTable`     | Virtual-scroll grid, type-aware cell renderers, current-page sort, pagination footer          |
| `ExportButtons`   | CSV / JSON download for the active result tab                                                 |
| `QueryHistory`    | Dropdown listing the last 50 SQL strings; click to load into editor                           |
| `StatusOverlay`   | Spinner during WASM init / file parse / query exec; abort affordance                          |

## Read-only Defense Strategy

The first-keyword check is unsafe (comments, CTEs wrapping DML, multi-statement bypass). Defense is layered:

1. **Statement split** — split the editor SQL into individual statements using `sql.js`'s `iterateStatements` (or fall back to scanning with `sqlite3_complete` to find statement boundaries that respect string literals and comments). Splitting on raw `;` is **not** acceptable.
2. **Per-statement keyword whitelist** — after stripping leading comments, the first SQL keyword of each statement must be one of: `SELECT`, `WITH` (further checked — see below), `EXPLAIN`, `PRAGMA` (only the read-only PRAGMA whitelist below). Anything else (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`, `ATTACH`, `DETACH`, `REINDEX`, `VACUUM`, `REPLACE`, `TRUNCATE`) is rejected immediately with a per-tab error.
3. **CTE inspection** — `WITH` statements are scanned for `INSERT|UPDATE|DELETE` keywords inside the CTE bodies. If found, reject. (We accept that a sufficiently adversarial SQL could still slip past textual scanning; layer 4 catches it.)
4. **SAVEPOINT isolation (the real guarantee)** — every accepted statement is executed inside:
   ```sql
   SAVEPOINT s_query;
   -- user statement
   ROLLBACK TO s_query;
   RELEASE s_query;
   ```
   Even if a write somehow runs, it is rolled back before the worker returns. `SELECT` inside a `SAVEPOINT` is a no-op for rollback purposes.
5. **Original-buffer recovery** — the original uploaded `ArrayBuffer` is retained in the worker. If `db.getRowsModified()` is non-zero after a query (sanity check), the worker discards the current `Database` instance and reconstructs from the original buffer before returning the result. This is the last line of defense and should never trigger; if it does, an internal warning is logged.

**Read-only PRAGMA whitelist:** `table_info`, `table_list`, `foreign_key_list`, `index_list`, `index_info`, `index_xinfo`, `integrity_check`, `database_list`, `collation_list`, `compile_options`. Any other PRAGMA is rejected (some PRAGMAs like `journal_mode` are writes).

**Note on `PRAGMA table_list`:** introduced in SQLite 3.37 (2021); the build of sql.js may predate this. Schema enumeration uses `SELECT name, type FROM sqlite_master WHERE type IN ('table','view','index','trigger') AND name NOT LIKE 'sqlite_%'` for guaranteed compatibility. `PRAGMA table_info` is universally available and used per-table.

## Web Worker Isolation

`engine.ts` exposes a typed message API; the worker owns all sql.js state.

```ts
// Message types (illustrative)
type Req =
  | { id: string; type: "init" }
  | { id: string; type: "open"; buffer: ArrayBuffer } // transferable
  | { id: string; type: "close" }
  | { id: string; type: "schema" }
  | { id: string; type: "exec"; sql: string; pageSize: number }
  | { id: string; type: "fetchMore"; cursorId: string; pageSize: number }
  | { id: string; type: "abort" };

type Res =
  | { id: string; type: "ready" }
  | { id: string; type: "opened"; info: DbInfo }
  | { id: string; type: "schema"; items: SchemaItem[] }
  | {
      id: string;
      type: "rows";
      cursorId: string;
      columns: ColumnMeta[];
      rows: Cell[][];
      done: boolean;
      elapsedMs: number;
    }
  | { id: string; type: "error"; message: string; statementIndex?: number };
```

**Abort semantics:** sql.js execution is synchronous inside the worker; mid-statement abort requires `worker.terminate()`. The engine façade therefore:

1. Saves the original buffer in `IndexedDB` or keeps a `Blob` reference on the main thread when `open` succeeds.
2. On `abort`: terminates the worker, spawns a fresh one, replays the `open` from the saved buffer.
3. The user sees a "Query aborted" toast; the database state is exactly as it was before the query (free thanks to SAVEPOINT, but worker restart guarantees it even if SAVEPOINT was bypassed).

**Pagination via cursors:** `exec` calls `db.prepare(sql)` and steps `pageSize` rows, then returns `{ rows, done: false, cursorId }`. The prepared statement is held in a `Map<cursorId, Statement>` inside the worker. `fetchMore` continues stepping. `close` / new query frees the previous statement.

## Feature Details

### File Upload

- Accept: `.db`, `.sqlite`, `.sqlite3` (also accept any file ≤ 200 MB and let `sql.js` decide; the SQLite header check (`SQLite format 3\0`) runs in the worker)
- Hard size cap: **200 MB** before reading; larger files are rejected with a clear toast (memory budget = 2× file size due to original-buffer retention)
- Read via `FileReader.readAsArrayBuffer()` (or `Blob.arrayBuffer()`)
- Transfer buffer to worker as transferable
- Worker validates header, opens DB, returns `DbInfo { name, sizeBytes, tableCount, viewCount, indexCount, triggerCount }`
- Failure modes: invalid header, sql.js exception, OOM — all surfaced via `error` message
- "Close" action: worker calls `db.close()`, drops the original buffer reference, returns to empty state

**Drag-and-drop visual feedback:**

| State                           | Treatment                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Idle                            | Dashed border, muted text, upload icon                                          |
| `dragenter` over window         | Drop zone scales 1.02x, border becomes solid `--accent-cyan`, background tinted |
| `dragover` (file is valid type) | Border pulses; helper text changes to "Release to load"                         |
| `dragover` (invalid type)       | Border `--danger`; helper text "Unsupported file type"                          |
| `drop`                          | Brief flash → spinner                                                           |

### Sample Database

- Bundled at `public/dbviewer/sample.db` (~1 MB Chinook-style)
- "Try sample DB" button next to the drop zone
- Loaded via `fetch('/dbviewer/sample.db').then(r => r.arrayBuffer())` then through the same worker flow

### Database Info Bar

- Single horizontal strip above the sidebar/editor split
- Shows: filename · human-readable size · table count · view count · index count · trigger count
- "Close" button (right-aligned) — releases worker memory and returns to upload state
- Hidden when no DB is loaded

### Table Sidebar

- Four sections: **TABLES**, **VIEWS**, **INDEXES**, **TRIGGERS** (each with count)
- Search box filters across all sections (case-insensitive substring)
- System tables (`sqlite_*`) are filtered out by default; toggle "Show system" reveals them
- Click an item to **expand inline** (no popover) → renders `SchemaInspector` below the item
- Double-click a table or view → fills editor with `SELECT * FROM "{name}" LIMIT 100;` and runs it
- Long lists virtualize past 200 items

### Schema Inspector (inline expansion)

For tables and views:

| Column        | Source                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| Columns table | `PRAGMA table_info("name")` → name, type, notnull, dflt_value, pk                   |
| Foreign keys  | `PRAGMA foreign_key_list("name")` → from, to_table, to_column, on_delete, on_update |
| Indexes       | `PRAGMA index_list("name")` + `PRAGMA index_info(...)` for column membership        |
| Row count     | `SELECT COUNT(*) FROM "name"` (lazy, only when expanded)                            |

For indexes: shows table, columns, uniqueness.
For triggers: shows table, event (INSERT/UPDATE/DELETE), timing (BEFORE/AFTER), and the SQL body from `sqlite_master.sql`.

### SQL Editor

- CodeMirror 6 with `@codemirror/lang-sql` (SQLite dialect) + `@codemirror/autocomplete`
- Line numbers, bracket matching, code folding
- Shortcut: `Ctrl/Cmd + Enter` to run; `Esc` to abort a running query
- Toolbar: **Run · Stop · Format · Compress · Clear · History ▾**
- The **Stop** button is enabled only while a query is running and triggers worker abort

**Schema-aware autocomplete (`autocomplete.ts`):**

- Source built from the DB schema after `open`: table names, column names per table, common SQL keywords
- Trigger contexts: after `FROM`/`JOIN`/`UPDATE`/`INTO` → tables; after `SELECT`/`WHERE`/`ON`/`GROUP BY`/`ORDER BY` → columns (filtered by tables already in the query when feasible)
- Falls back to keyword + table list if context detection is uncertain

### CodeMirror 6 Theme Integration

- `codemirror-theme.ts` exports `lightTheme` and `darkTheme` extensions bound to ByteCraft CSS variables (background = `--bg-input`, foreground = `--fg-primary`, selection / cursor / matching brackets all token-aligned)
- `SqlEditor` subscribes to the global theme context (`libs/theme.tsx`) and reconfigures the editor via a compartmentalized `Compartment` on theme change

### SQL Format / Compress

- `format.ts` wraps `sql-formatter` with the SQLite dialect preset
- **Format**: keyword uppercase, clause-per-line, 2-space indent
- **Compress**: single line, single-space separators, comments stripped
- Both replace the editor content via a single CodeMirror transaction so undo restores the prior text

### Pagination Strategy

The previous "auto-append `LIMIT 10000`" idea is dropped — string-level LIMIT detection is unreliable (literals, sub-queries) and clamping is surprising. Replaced by **streaming pagination**:

- Default `pageSize = 100`
- Worker `prepare`s the statement and `step`s `pageSize` rows, then returns with `done: false` and a `cursorId`
- Footer shows `Rows 1–100 · 0.03 s · [Load more] [Load all (max 100k)]`
- "Load more" issues `fetchMore` and appends; "Load all" loops until done or 100,000 rows (hard ceiling, surfaces a banner if hit)
- `cursorId` is invalidated on next `exec` or `close`

### Sort Strategy

- Click a column header → sort the **currently loaded rows** ascending / descending
- Sort never re-issues SQL; if the user wants a full-dataset sort, they should add `ORDER BY` to the query
- Sort indicator (arrow) on the active column; second click flips, third click clears
- Stable sort; type-aware comparator (numbers numerically, strings via `Intl.Collator`, NULLs last)

### Result Table — Type-Aware Rendering

| Cell value                                  | Rendering                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `null`                                      | Italic muted `NULL`                                                                                                            |
| Empty string `""`                           | Italic muted `(empty)` to distinguish from NULL                                                                                |
| `BLOB` (`Uint8Array`)                       | `<BLOB · {n} B>` chip; click → download as binary                                                                              |
| Long text (> 200 chars)                     | Truncate with ellipsis; click → modal with full text + copy                                                                    |
| TEXT that parses as JSON                    | Render as collapsed JSON tree; raw view available                                                                              |
| `BigInt` (sql.js BigInt mode)               | Rendered as monospace string; right-aligned                                                                                    |
| Numbers near 2^53                           | Worker opens prepared statements with `useBigInt64: true` so INTEGER values are returned as BigInt; renderer handles uniformly |
| Date-like text (ISO 8601 / SQLite datetime) | Detected and tagged; tooltip shows local TZ render                                                                             |
| Other primitives                            | Plain text, monospace, right-aligned for numbers                                                                               |

Column header shows name + a small type badge inferred from the first non-null value (`INT` / `REAL` / `TEXT` / `BLOB` / `JSON` / `NULL?`).

### Multi-Statement Tabs

- After statement split + safety checks, the worker executes each accepted statement in order
- Each produces its own result tab with title `Result {n}` (or the leading comment if the user wrote `-- name: monthly_orders`)
- Rejected statements appear as tabs with a red badge and the rejection reason
- The first tab is auto-selected; tab order matches statement order
- Footer pagination, sort, export are scoped to the active tab

### Export

- **CSV (RFC 4180):** UTF-8 with BOM (Excel-friendly), `\r\n` line endings, fields containing `,` `"` `\r` `\n` quoted, `"` escaped as `""`. NULL → empty field. BLOB → `0x{hex}` literal. JSON columns → raw JSON string (still quoted per RFC).
- **JSON:** array of objects keyed by column name. NULL → `null`. BLOB → `{ "$blob": "{base64}" }`. BigInt → string.
- Filename: `{db-stem}-{tab-name}-{timestamp}.{csv|json}`
- Export operates on the **fully loaded** rows of the active tab. If the cursor isn't done, a confirm dialog: "Export current 200 rows, or load all first?"
- Implementation: `Blob` + `URL.createObjectURL` + invisible `<a>` (revoked after click)

### Query History

- `history.ts` keeps the last **50** distinct SQL strings in `localStorage` under key `bytecraft:dbviewer:history`
- Stored: SQL text, timestamp, success flag, row count. **No data values, no schema, no filename.**
- Dropdown in the editor toolbar; click an entry to load (does not auto-run)
- "Clear history" action; respects ByteCraft's existing privacy posture (text-only, opt-out via clearing)

## Data Flow

```
User uploads .db (or clicks "Try sample DB")
    → Main: read ArrayBuffer; retain reference for restart
    → postMessage("open", buffer) [transferable]
    → Worker: validate header, new sql.js Database, enumerate schema
    → Main: render DatabaseInfoBar + populated TableSidebar

User clicks sidebar item
    → SchemaInspector expands; lazy PRAGMA queries
    → Double-click table → editor filled, query auto-run

User types SQL
    → CodeMirror lints + autocompletes from cached schema
    → Format/Compress operate in-place

User runs query (Ctrl+Enter or Run)
    → Main: postMessage("exec", { sql, pageSize: 100 })
    → Worker: split → safety check per statement
        → For each accepted statement:
            SAVEPOINT s_query
            prepare + step pageSize rows → { columns, rows, cursorId, done }
            if rowsModified > 0: rebuild from original buffer (defensive)
            ROLLBACK TO s_query; RELEASE s_query
        → For each rejected: emit error tab
    → Main: render ResultTabs + ResultTable
    → User clicks "Load more" → postMessage("fetchMore", { cursorId, pageSize })

User clicks Stop (or Esc)
    → Main: worker.terminate(); spawn fresh; replay open from saved buffer
    → Toast: "Query aborted"

User exports
    → If cursor not done: confirm "load all first?"
    → Serialize via export.ts → Blob → download

User closes DB
    → postMessage("close") → worker drops Database; main drops buffer reference
```

## Loading & Error States

| Stage                            | UI                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| WASM not yet initialized         | Drop zone disabled with subtitle "Initializing engine…"; spinner overlay (~1.5 MB WASM)       |
| File parsing                     | Drop zone shows progress: "Reading file… {MB} / {MB}"                                         |
| Query running                    | StatusOverlay over the result area: "Running query… [Stop]"                                   |
| Query aborted                    | Toast (info): "Query aborted"                                                                 |
| Worker crashed                   | Banner: "Database engine restarted — your data was reloaded"; auto-recovery from saved buffer |
| WASM load failure                | Inline error: "Could not load SQLite engine. Check network or reload." with reload button     |
| File too large (> 200 MB)        | Toast (danger): "File exceeds 200 MB limit."                                                  |
| Invalid SQLite header            | Toast (danger): "Not a valid SQLite database file."                                           |
| Per-statement SQL error          | Result tab with red badge: error message + line/column from sql.js if available               |
| Per-statement rejected by safety | Result tab with red badge: "Only read-only statements are allowed (got: UPDATE)"              |
| Empty result                     | "No results" empty state inside table                                                         |

## Mobile Responsive

| Element           | Desktop                    | Mobile (< 768 px)                                                                                     |
| ----------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| File upload       | Full-width drop zone       | Same                                                                                                  |
| Database info bar | Single row                 | Wraps; "Close" right                                                                                  |
| Sidebar           | Fixed left column (220 px) | Collapses to a top accordion / drawer; tap section header to expand; tap item → schema expands inline |
| Schema inspector  | Inline below sidebar item  | Full-width sheet pushed under the tapped item                                                         |
| SQL editor        | Resizable height           | Fixed height, scrollable                                                                              |
| Toolbar           | Single row                 | Wraps; History collapses to overflow menu                                                             |
| Result tabs       | Horizontal strip           | Horizontal scroll with shadow edges                                                                   |
| Result table      | Full virtual grid          | Horizontal scroll, sticky first column                                                                |
| Export            | Inline                     | Stacked below table                                                                                   |

## Accessibility

- Sidebar implemented as `<nav>` with sections as `<h3>` + `<ul role="tree">`; expanded items use `aria-expanded`
- Drop zone has `role="button"`, keyboard `Enter`/`Space` opens picker, drag handlers paired with click handler
- Result table: `role="grid"`, headers `role="columnheader" aria-sort`, cells `role="gridcell"`, full keyboard navigation (arrow keys move focus, `Enter` opens long-text modal)
- Tabs: `role="tablist"` with `aria-controls` / `aria-selected`
- All interactive controls have visible focus rings using ByteCraft tokens
- Color is never the sole signal (icons accompany red error states)

## Performance

- WASM (~1.5 MB) self-hosted and cached by the browser; loaded once per session via dynamic import inside the worker
- CodeMirror 6 tree-shaken — only `view`, `state`, `lang-sql`, `autocomplete`
- Virtual scrolling renders only visible rows; column virtualization deferred (not needed for typical schemas)
- Streaming pagination keeps memory bounded even for million-row tables
- BigInt mode adds tiny per-cell overhead; acceptable
- Original buffer retention doubles peak memory; offset by 200 MB cap
- The worker boundary keeps the main thread responsive; `worker.terminate()` is the abort primitive
- Bundle: editor + autocomplete + sql-formatter loaded via `next/dynamic` so the route shell paints first

## Testing Strategy

| Area                               | Tests                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `safety.ts`                        | Adversarial bypass corpus: comment prefix, multi-statement, CTE-wrapped DML, ATTACH, write PRAGMA, mixed DML+SELECT. All must be rejected. |
| `safety.ts` SAVEPOINT path         | Run a malicious-but-allowed DML disguised as SELECT (constructed in a test fixture) and assert `db.export()` byte-equality before/after.   |
| `export.ts` CSV                    | RFC 4180 fixtures: comma, quote, CRLF, NULL, BLOB, BigInt, JSON. Round-trip into a CSV parser to verify.                                   |
| `export.ts` JSON                   | NULL, BLOB → base64, BigInt → string, nested JSON columns.                                                                                 |
| `engine.ts` worker protocol        | Mock worker; verify message ordering, cursor lifecycle, abort + reopen replays correctly.                                                  |
| `format.ts`                        | Idempotency: format(format(x)) == format(x); compress(format(x)) collapses; comments preserved by format, stripped by compress.            |
| `history.ts`                       | 50-entry cap, dedupe, malformed-stored-data tolerance.                                                                                     |
| `autocomplete.ts`                  | Context detection: after FROM → tables only; after SELECT → keywords + columns.                                                            |
| Integration (Playwright, optional) | Open sample DB, run query, paginate, export CSV, close DB.                                                                                 |

Test framework follows ByteCraft's existing setup; if none, introduce Vitest under `libs/dbviewer/__tests__/` (verify on first integration).

## Out of Scope

- Writing or modifying database files (INSERT / UPDATE / DELETE / DDL)
- Connecting to remote databases
- Multiple databases open simultaneously (one DB per session)
- Schema diagrams / ER visualizations
- Encrypted databases (SQLCipher) — would require a different WASM build
- Persisting the database file itself (only SQL text history is stored)
- Importing CSV/JSON into a new SQLite DB
