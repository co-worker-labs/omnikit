# Cron Expression Generator/Parser — Design Spec

## Overview

A browser-based Cron expression tool that supports generation (via presets + visual editors) and parsing (with human-readable descriptions + next execution times). Runs entirely client-side with zero external Cron dependencies.

## Requirements

### Functional

1. **Three Cron modes** — switchable via radio pills at the top of the page:
   - **Standard** (5 fields): `minute hour dom month dow`
   - **Spring** (6 fields): `second minute hour dom month dow`
   - **Quartz** (7 fields): `second minute hour dom month dow year`

2. **Generate tab** — build Cron expressions through UI:
   - Preset templates as one-click pills (every minute, every hour, weekdays 09:00, etc.)
   - Visual field cards: each card shows current value + value-type label (any/specific/range/step/list/special)
   - Clicking a card opens an inline editor (popover on desktop, bottom sheet on mobile) with type-appropriate controls
   - Generated expression updates in real-time

3. **Parse tab** — analyze existing Cron expressions:
   - Text input with debounced (150ms) parsing as the user types
   - Supports raw expressions and macros (`@yearly`, `@hourly`, etc.)
   - Output: human-readable description + next 5 execution times
   - Invalid expressions produce a precise inline error

4. **Shared output area** — both tabs render the same output, derived from a single state source (see "State Model"):
   - The expression itself (color-coded by field, see "Field Color Coding")
   - Human-readable description
   - Next 5 execution times table (date-time + relative time)
   - Copy button for the expression
   - Share-link button (copies URL with `?mode=…&expr=…`)

### Non-functional

- Zero external Cron dependencies — all parsing/generating/describing/next-execution logic is self-contained TypeScript
- All processing runs in the browser, no data sent to any server
- i18n for `en`, `zh-CN`, `zh-TW`
- Follows ByteCraft's existing page/component/i18n patterns
- Performance: compute next 5 executions within 100ms for any well-formed expression
- Search bound: 4 calendar years from `from` date (covers leap-year cycle and most sparse patterns); if fewer than N matches found, return what was found and surface a notice

## Architecture

### File Structure

```
app/[locale]/cron/
├── page.tsx              # Route entry, generateMetadata
└── cron-page.tsx         # Client component, all UI and logic

libs/cron/
├── main.ts               # Public API barrel: parse, generate, describe, nextExecutions
├── parser.ts             # Expression string → ParsedCron
├── generator.ts          # CronFieldValue[] → expression string
├── describer.ts          # ParsedCron → human-readable string (i18n-aware)
├── executor.ts           # ParsedCron → next N execution times
├── types.ts              # CronMode, CronField, CronFieldValue, ParsedCron
├── presets.ts            # Preset definitions (i18n-keyed labels)
├── field-spec.ts         # Per-mode field metadata: range, allowed special chars, DOW base
└── __tests__/
    ├── parser.test.ts
    ├── generator.test.ts
    ├── describer.test.ts
    └── executor.test.ts

public/locales/{en,zh-CN,zh-TW}/
└── cron.json             # Tool-specific translations
```

### Project Integration (must-do)

| File                                         | Change                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `libs/tools.ts`                              | Insert `{ key: "cron", path: "/cron" }` after `dbviewer` (last entry — appended)       |
| `i18n/request.ts`                            | Add `"cron"` to the `namespaces` array                                                 |
| `public/locales/{en,zh-CN,zh-TW}/tools.json` | Add `cron.title`, `cron.shortTitle`, `cron.description` per locale                     |
| `libs/storage-keys.ts`                       | Add `cron: "bc:cron"` entry to `STORAGE_KEYS`                                          |
| `package.json`                               | No new runtime deps. Uses existing `@headlessui/react` for popover; `vitest` for tests |

**Shared keys reuse (do NOT duplicate in `cron.json`):**

- `clear`, `copy`, `generate`, `cleared`, `copied`, `copyFailed`, `noData`, `cancel`, `save`, `close`, `language` — pull via `useTranslations("common")`
- `alert.notTransferred` — pull via `useTranslations("common")` for the privacy banner

This matches the consolidation done in commit `9cbb02a`.

### Core Types

```typescript
// types.ts

export type CronMode = "standard" | "spring" | "quartz";

export type CronFieldKind =
  | "second"
  | "minute"
  | "hour"
  | "dayOfMonth"
  | "month"
  | "dayOfWeek"
  | "year";

export type FieldValueType =
  | "any" // *
  | "noSpecific" // ? (Quartz only, in dom or dow)
  | "specific" // single number
  | "range" // n-m
  | "step" // n/k or n-m/k or */k
  | "list" // n,m,p (each item can itself be specific/range/step)
  | "lastDay" // L (dom: last day of month) or nL (dow: last <weekday> of month)
  | "weekday" // nW (nearest weekday to nth) / LW (last weekday of month)
  | "nthDayOfWeek" // n#m (mth occurrence of weekday n in the month)
  | "lastDayOffset"; // L-n (n days before last day, Quartz extension)

export interface CronFieldValue {
  type: FieldValueType;
  values?: number[]; // specific / list members
  range?: { from: number; to: number }; // range
  step?: { start: number | "*"; interval: number };
  // For lists: each item is itself a CronFieldValue (recursive list)
  listItems?: CronFieldValue[];
  // Specials
  lastDayOffset?: number; // L-N (Quartz dom)
  weekdayDay?: number | "L"; // nW where n is dom-of-month, or "L" for LW
  nthDayOfWeek?: { weekday: number; n: number }; // 6#3 = 3rd Friday
}

export interface ParsedCron {
  mode: CronMode;
  fields: Record<CronFieldKind, CronFieldValue | undefined>; // undefined for fields not in mode
  expression: string; // canonicalized form (macros expanded, aliases normalized)
  raw: string; // exactly what the user entered
  valid: boolean;
  errors: ParseError[]; // empty if valid
  warnings: string[]; // non-fatal i18n keys (e.g. "warn.feb30Unreachable")
}

export interface ParseError {
  field?: CronFieldKind;
  messageKey: string; // i18n key under errors.*
  params?: Record<string, string | number>;
}

export interface ExecutionResult {
  executions: Date[];
  searchExhausted: boolean; // true if we hit the 4-year window without finding all N
  notice?: string; // i18n key, e.g. "executor.searchWindowExhausted"
}
```

### Core Modules

1. **parser.ts** — `parseCron(expression: string, mode: CronMode): ParsedCron`
   - Trim & normalize whitespace
   - **Macro expansion** before tokenizing (see "Macros" table)
   - **Alias normalization**: case-insensitive `JAN-DEC`, `MON-SUN` → numbers (per-mode DOW base)
   - Tokenize by whitespace; assert field count matches mode
   - Per-field parse using `field-spec.ts` metadata (range + allowed special chars)
   - Validates DOM/DOW interaction per mode (Quartz requires exactly one `?`)
   - Returns structured data with errors/warnings; never throws

2. **generator.ts** — `generateCron(fields: Record<CronFieldKind, CronFieldValue>, mode: CronMode): string`
   - Pure inverse of parser
   - Always emits canonical form (numeric, no aliases) — describer is what humans read

3. **describer.ts** — `describeCron(parsed: ParsedCron, t: TranslateFn, locale: string): string`
   - i18n-aware: month/weekday names from translations; `Intl.DateTimeFormat` for time formatting hints
   - `TranslateFn` is `(key: string, params?: object) => string` (compatible with `next-intl`'s `useTranslations` return type)
   - Composes per-field phrases via translation keys (`describe.everyMinute`, `describe.atMinute`, `describe.fromTo`, etc.)
   - Examples (English): "Every minute", "At 09:00, Monday through Friday", "At 00:00 on day 1 of every month"

4. **executor.ts** — `nextExecutions(parsed: ParsedCron, count: number, opts: { from?: Date; tz?: "local" | "utc"; maxYears?: number }): ExecutionResult`
   - Smart iteration (NOT minute-by-minute brute force):
     1. Round `from` up to the next allowed second/minute
     2. For each candidate, check year → month → day-of-month/day-of-week → hour → minute → second; on mismatch, skip to the next valid value of the failing field and reset lower fields to their first allowed value
     3. Re-check after each skip to handle cascading carries (e.g., advancing month resets day to 1)
   - Default `maxYears = 4`. Returns `searchExhausted: true` when window hits before `count` matches found.
   - Handles all special chars (`L`, `W`, `#`, `L-N`, `LW`).
   - DOM/DOW interaction enforced per mode (see "Cron Semantics").
   - DST handled via the chosen timezone semantics (see "Time Zone & DST").

5. **field-spec.ts** — Static per-mode metadata used by parser/generator/describer/executor:

   ```typescript
   export interface FieldSpec {
     kind: CronFieldKind;
     min: number;
     max: number;
     allowedTypes: FieldValueType[];
     aliases?: Record<string, number>; // JAN→1, MON→1 (mode-dependent)
   }
   export const FIELD_SPECS: Record<CronMode, FieldSpec[]>;
   ```

6. **presets.ts** — Each preset references an i18n label key:
   ```typescript
   export interface Preset {
     id: string;
     labelKey: string; // e.g. "presets.everyMinute"
     mode: CronMode; // preset's native mode
     expression: string; // canonical form for that mode
   }
   ```
   When a preset is clicked while a different mode is active, the expression is converted (see "Mode Switching Behavior") before being applied.

## Cron Semantics

### Field Definitions per Mode

| Field        | Standard (5)  | Spring (6)         | Quartz (7)           |
| ------------ | ------------- | ------------------ | -------------------- |
| Second       | —             | `0-59`             | `0-59`               |
| Minute       | `0-59`        | `0-59`             | `0-59`               |
| Hour         | `0-23`        | `0-23`             | `0-23`               |
| Day of Month | `1-31`        | `1-31`             | `1-31`               |
| Month        | `1-12`        | `1-12`             | `1-12`               |
| Day of Week  | `0-6` (Sun=0) | `0-7` (Sun=0 or 7) | `1-7` (Sun=1, Sat=7) |
| Year         | —             | —                  | `1970-2099`          |

**Critical:** the DOW base differs by mode. Parser normalizes input aliases to the mode's numeric base; describer/executor consume the normalized numbers. Generator emits the mode-correct numbers.

### Day-of-Month ↔ Day-of-Week Interaction

| Mode     | Rule                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------ |
| Standard | If both DOM and DOW are non-`*`, **OR** semantics — fire if EITHER matches (Vixie cron behavior) |
| Spring   | Same as Standard — OR semantics                                                                  |
| Quartz   | Exactly one of DOM or DOW must be `?`. Other must be a real value. Validation rejects otherwise  |

Executor must implement OR semantics for Standard/Spring. Quartz simplifies to a single matching path because one field is `?` (no constraint).

### Special Characters by Mode

| Symbol | Meaning                                           | Allowed In | Modes           |
| ------ | ------------------------------------------------- | ---------- | --------------- |
| `*`    | Any value                                         | All fields | All modes       |
| `,`    | List separator                                    | All fields | All modes       |
| `-`    | Range                                             | All fields | All modes       |
| `/`    | Step (with `*`, range, or `start/k`)              | All fields | All modes       |
| `?`    | No specific value                                 | DOM, DOW   | **Quartz only** |
| `L`    | Last day of month (DOM) / last `nL` weekday (DOW) | DOM, DOW   | **Quartz only** |
| `W`    | Nearest weekday (`15W`, `LW`)                     | DOM        | **Quartz only** |
| `#`    | Nth weekday in month (`6#3`)                      | DOW        | **Quartz only** |
| `L-N`  | N days before last day of month                   | DOM        | **Quartz only** |

Standard and Spring do NOT support `?`, `L`, `W`, `#`, `L-N`. Parser rejects with field-specific errors.

### Macros (Pre-tokenization)

| Macro      | Expansion (Standard) | Notes                                                                         |
| ---------- | -------------------- | ----------------------------------------------------------------------------- |
| `@yearly`  | `0 0 1 1 *`          | Also: `@annually`                                                             |
| `@monthly` | `0 0 1 * *`          |                                                                               |
| `@weekly`  | `0 0 * * 0`          | Sunday in Standard/Spring base                                                |
| `@daily`   | `0 0 * * *`          | Also: `@midnight`                                                             |
| `@hourly`  | `0 * * * *`          |                                                                               |
| `@reboot`  | _rejected_           | Error: `errors.macroRebootUnsupported` (browser tool can't model boot events) |

For Spring/Quartz, parser prepends `0` (and appends `*` for Quartz year) after expansion.

### Aliases

| Domain      | Tokens                                                     | Notes                      |
| ----------- | ---------------------------------------------------------- | -------------------------- |
| Month       | `JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC` → `1-12` | Case-insensitive           |
| Day of Week | `SUN MON TUE WED THU FRI SAT`                              | Mapped per mode's DOW base |

Aliases work in ranges and lists (`MON-FRI`, `SAT,SUN`). Mixing aliases and numbers is allowed.

### Quartz Special-Character Edge Cases

- `5#5` (5th occurrence of weekday 5) — many months don't have a 5th. Executor skips to next month, never errors.
- `LW` — last weekday of the month. If month-end is Saturday, fire Friday; if Sunday, fire Friday. (Standard Quartz behavior — never crosses into adjacent months.)
- `1W` — nearest weekday to day 1. If day 1 is Saturday, fire Monday day 3; if Sunday, fire Monday day 2. (Quartz behavior: `W` never crosses a month boundary.)
- `L-3` — exactly 3 days before the month's last day. For 31-day months, fires on day 28; for Feb (28 days), day 25.
- `0L` (Sunday-L) through `7L` — last occurrence of that weekday in the month.

## Execution Computation

### Time Zone

- Default: **browser local time** (`Date` semantics).
- User-selectable dropdown: `Local` / `UTC`.
- The selection only affects the executor and the displayed date-time format. Stored expression is unchanged.
- Timezone choice persists in localStorage with the rest of the state.

> Why no full IANA timezone picker? YAGNI. The two choices cover 95% of debugging needs; a full picker can be added in v2 if asked.

### DST Handling

The executor uses `Date` arithmetic exclusively, so DST behavior follows the JavaScript runtime:

| Scenario                                | Behavior                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| Spring-forward gap (e.g. 02:30 skipped) | A match at the missing wall-clock time fires at the next valid wall-clock time |
| Fall-back overlap (02:30 occurs twice)  | Fires at the first occurrence (the earlier UTC instant)                        |
| Tool in `UTC` mode                      | DST does not apply — UTC has no DST transitions                                |

This matches how most production cron daemons behave and is documented in the tool's description section. We do NOT attempt to "make up" missed runs from a DST gap.

### Search Window

- Default search bound: **4 calendar years** from `from`.
- Covers a full leap-year cycle so patterns like `0 0 29 2 ?` find at least one match.
- If fewer than `count` matches are found within the window, returns the partial list with `searchExhausted: true` and a notice (e.g., "Only 1 match in the next 4 years").
- Patterns that provably never trigger (e.g., `0 0 30 2 ?` — Feb 30 doesn't exist) cause the executor to exit immediately with `executions: []` and a "never triggers" notice. Generator/describer surface this as a warning before the user even runs.

### Smart Iteration Algorithm (executor.ts)

```
function next(parsed, from):
  candidate = ceilToSecond(from)
  for iter in 0..MAX_ITER:               // safety cap, ~10000
    if !matchesYear(candidate):  candidate = jumpToNextYear(candidate); continue
    if !matchesMonth(candidate): candidate = jumpToNextMonth(candidate); continue
    if !matchesDayConjunction(candidate, mode):
      candidate = jumpToNextDay(candidate); continue
    if !matchesHour(candidate):  candidate = jumpToNextHour(candidate); continue
    if !matchesMinute(candidate): candidate = jumpToNextMinute(candidate); continue
    if mode != "standard" && !matchesSecond(candidate):
      candidate = jumpToNextSecond(candidate); continue
    return candidate
  return null  // exhausted
```

`matchesDayConjunction` encapsulates the per-mode DOM/DOW rule (OR for Standard/Spring, single-side for Quartz). Special characters (`L`, `W`, `#`, `L-N`, `LW`) are evaluated inside the day-matching function.

## State Model

### Single Source of Truth

The page state is:

```typescript
{
  mode: CronMode;
  expression: string; // canonical form
  timezone: "local" | "utc";
}
```

Everything else is **derived**:

| Derived value          | From                                             |
| ---------------------- | ------------------------------------------------ |
| `parsed: ParsedCron`   | `parseCron(expression, mode)`                    |
| `fields: …`            | `parsed.fields` (used by Generate tab UI)        |
| `description: string`  | `describeCron(parsed, t, locale)`                |
| `executions: ...`      | `nextExecutions(parsed, 5, { tz: timezone })`    |
| Color-coded expression | tokenize `expression` by whitespace, color spans |

This means the Output area is identical between tabs — both tabs read from the same state. The tabs differ only in HOW they edit it:

- **Generate tab**: clicking a field card → editing field → `generateCron(...)` → updates `expression`. Always valid by construction.
- **Parse tab**: typing in the textarea (debounced 150ms) → `parseCron(...)` → if valid, updates `expression`; if invalid, keeps last-valid `expression` but shows error. The textarea retains the user's raw input via a separate `rawInput` state.

### Mode Switching Behavior

When the user changes mode, the current expression is **migrated** rather than discarded:

| From → To         | Migration                                                                     |
| ----------------- | ----------------------------------------------------------------------------- |
| Standard → Spring | Prepend `0` (second=0)                                                        |
| Standard → Quartz | Prepend `0`, append `*` (year=any), then apply the **DOM/DOW `?` rule** below |
| Spring → Standard | Drop second (warn if non-zero: `warn.secondDropped`)                          |
| Spring → Quartz   | Append `*`, then apply the **DOM/DOW `?` rule** below                         |
| Quartz → Standard | Drop second & year (warn if either non-trivial); convert any `?` back to `*`  |
| Quartz → Spring   | Drop year (warn if non-trivial); convert any `?` back to `*`                  |

**DOM/DOW `?` rule** (when entering Quartz):

| DOM is `*`? | DOW is `*`? | Result                                                                                                                           |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| yes         | yes         | DOW becomes `?`, DOM stays `*`                                                                                                   |
| yes         | no          | DOM becomes `?`, DOW stays                                                                                                       |
| no          | yes         | DOW becomes `?`, DOM stays                                                                                                       |
| no          | no          | DOW stays, DOM becomes `?`, emit `warn.orSemanticsLost` (Standard/Spring OR-semantics not representable in Quartz; choosing DOW) |

DOW base is renumbered when crossing the Standard/Spring (0=Sun) ↔ Quartz (1=Sun) boundary. Migrations that lose information (e.g., a Quartz `L` going to Standard) drop those tokens with a `warn.specialDroppedFromMode` warning. A toast surfaces all warnings on switch.

### Persistence

`localStorage` key `bc:cron`:

```json
{ "mode": "quartz", "expression": "0 0 9 ? * MON-FRI *", "timezone": "local" }
```

Saved on every state change (debounced 500ms). Loaded on first mount.

### URL Sharing

On page load, query parameters take precedence over localStorage:

```
/cron?mode=quartz&expr=0+0+9+%3F+*+MON-FRI+*&tz=local
```

A "Share Link" button next to the expression's CopyButton serializes the current state into the URL and copies the result to the clipboard. Reading is permissive (unknown `mode` falls back to `standard`; unparseable `expr` is shown in the Parse textarea with its error).

## UI Layout & Components

### Page Container (matching JWT/cipher pattern)

```tsx
<Layout title={t("cron.shortTitle")}>
  <div className="container mx-auto px-4 pt-3 pb-6">
    {/* Privacy banner (inline, NOT a separate component) */}
    <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
      <span className="text-sm text-fg-secondary leading-relaxed">
        {tc("alert.notTransferred")}
      </span>
    </div>
    <ModeSelector /> {/* radio pills: Standard / Spring / Quartz */}
    <Tabs>
      {" "}
      {/* Generate / Parse */}
      <Generate />
      <Parse />
    </Tabs>
    <OutputArea /> {/* shared, derived from state */}
    <Description /> {/* what is Cron, field reference, special chars */}
  </div>
</Layout>
```

**No `PrivacyBanner` component** — that component does not exist; we use the inline banner pattern from JWT/cipher.

### UI Components Used

From existing `components/ui/`:

| Component                                  | Usage                                                            |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `Button`                                   | Action buttons (clear, share)                                    |
| `StyledInput` / `StyledTextarea`           | Parse tab input                                                  |
| `StyledSelect`                             | Mode selector fallback (mobile), timezone dropdown               |
| `StyledCheckbox`                           | List value selection inside field editor                         |
| `CopyButton`                               | Copy expression                                                  |
| `Tabs`                                     | Generate / Parse                                                 |
| `Card`                                     | Field cards in Generate tab                                      |
| `Badge`                                    | Field-type label on each card ("range", "every", etc.)           |
| `Dropdown`                                 | Field-editor popover trigger                                     |
| `showToast` (`libs/toast.ts`)              | Mode-switch warnings, share-link copied                          |
| `@headlessui/react`'s `Popover` / `Dialog` | Field editor (Popover desktop, Dialog as bottom-sheet on mobile) |

### Field Color Coding

Each token in the rendered expression gets a color from a fixed palette mapped by field kind. Uses CSS variables already defined in `globals.css` plus a small set of new tokens scoped to the cron page:

| Field        | Color token (light/dark)    | CSS class on the span |
| ------------ | --------------------------- | --------------------- |
| Second       | `--accent-cyan` (#06d6a0)   | `text-accent-cyan`    |
| Minute       | `--accent-purple` (#8b5cf6) | `text-accent-purple`  |
| Hour         | amber `#f59e0b` / `#fbbf24` | `text-cron-hour`      |
| Day of Month | rose `#e11d48` / `#fb7185`  | `text-cron-dom`       |
| Month        | green `#10b981` / `#34d399` | `text-cron-month`     |
| Day of Week  | blue `#3b82f6` / `#60a5fa`  | `text-cron-dow`       |
| Year         | `--fg-secondary`            | `text-fg-secondary`   |

The new `--cron-*` variables are added to `app/globals.css` under `:root` and `.dark`. Each card in the Generate tab uses the same color for its left border and the value-type Badge.

### Editor UX (Generate tab)

**Field card** (default, collapsed state):

```
┌─────────────────────┐
│ ● Minute            │   ← color dot + i18n field name
│ ━━━━━━━━━━━━━━━━━━ │
│ 0,15,30,45          │   ← current value, monospace
│ [list]              │   ← Badge showing FieldValueType
└─────────────────────┘
```

**Editor** (opens on card click):

- **Desktop (`md` and up)**: `Popover` anchored below the card, max-width 360px
- **Mobile (`< md`)**: `Dialog` slide-up bottom sheet, full-width

Editor content (driven by `field-spec.ts.allowedTypes` for the active mode):

```
┌─────────────────────────────────┐
│ [any] [specific] [range] [step] │   ← StyledSelect (or pill row on desktop)
│ [list] [special]                │
├─────────────────────────────────┤
│ {type-specific controls}        │
│  - any: nothing                 │
│  - specific: number input       │
│  - range: from/to inputs        │
│  - step: start + interval       │
│  - list: multi-checkbox grid    │
│  - special: Quartz-only sub-UI  │
│    (L / W / # / L-N controls)   │
├─────────────────────────────────┤
│ Preview: 0,15,30,45             │
│ [Cancel] [Apply]                │
└─────────────────────────────────┘
```

Apply commits to state (which regenerates the expression). Cancel discards.

### Generate Tab Validation Warnings

Even though Generate-built expressions are syntactically valid by construction, semantic dead-ends are still possible (e.g., `month=2, dom=30`). The describer's `nextExecutions` call surfaces these:

| Condition                                                           | UX                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `searchExhausted` with 0 executions                                 | Red banner: "This expression will never trigger"                     |
| `searchExhausted` with >0 but <5 executions                         | Yellow banner: "Only N executions in the next 4 years"               |
| Quartz: both DOM and DOW set without `?`                            | Inline error in field card; expression flagged invalid               |
| Standard/Spring: warning if DOM is restrictive AND DOW also non-`*` | Yellow banner: "Both day fields are set — fires when EITHER matches" |

### Parse Tab

```
┌────────────────────────────────────────────┐
│ ● Cron expression                          │
│ ┌────────────────────────────────────────┐ │
│ │ 0 9 * * MON-FRI                        │ │  ← StyledTextarea, 1-line auto-grow
│ └────────────────────────────────────────┘ │
│ [inline error if invalid]                  │
└────────────────────────────────────────────┘
```

Real-time parsing with 150ms debounce. The Output area below stays mounted; on parse error, it shows the last-valid output dimmed with a "showing previous" tag.

### Output Area (shared between tabs)

```
┌────────────────────────────────────────────┐
│ Expression  [color-coded]    [Copy] [Share]│
│ ──────────────────────────────────────────│
│ Description                                │
│ "At 09:00, Monday through Friday"          │
│ ──────────────────────────────────────────│
│ Next 5 Executions  [tz: Local ▾]           │
│ #  Date & Time            Relative         │
│ 1  2026-04-29 09:00:00   in 19h 32m        │
│ 2  2026-04-30 09:00:00   in 1d 19h         │
│ ...                                        │
│ [notice if searchExhausted]                │
└────────────────────────────────────────────┘
```

## i18n

### Locale Files

Single new file: `public/locales/{en,zh-CN,zh-TW}/cron.json`. All cron-specific keys here. Shared keys reused from `common.json` via `useTranslations("common")`.

### Cron-specific Keys (reference shape)

```json
{
  "mode": {
    "label": "Mode",
    "standard": "Standard (5 fields)",
    "spring": "Spring (6 fields)",
    "quartz": "Quartz (7 fields)"
  },
  "tab": {
    "generate": "Generate",
    "parse": "Parse"
  },
  "timezone": {
    "label": "Timezone",
    "local": "Local",
    "utc": "UTC"
  },
  "field": {
    "second": "Second",
    "minute": "Minute",
    "hour": "Hour",
    "dayOfMonth": "Day",
    "month": "Month",
    "dayOfWeek": "Weekday",
    "year": "Year"
  },
  "fieldType": {
    "any": "Any",
    "noSpecific": "No specific",
    "specific": "Specific",
    "range": "Range",
    "step": "Step",
    "list": "List",
    "lastDay": "Last day",
    "weekday": "Nearest weekday",
    "nthDayOfWeek": "Nth weekday",
    "lastDayOffset": "Days before last"
  },
  "monthShort": [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ],
  "weekdayShort": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  "weekdayLong": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  "presets": {
    "everyMinute": "Every minute",
    "every5Minutes": "Every 5 minutes",
    "every15Minutes": "Every 15 minutes",
    "everyHour": "Every hour",
    "every2Hours": "Every 2 hours",
    "everyDay": "Every day at 00:00",
    "everyMondayMorning": "Every Monday at 09:00",
    "weekdays9am": "Weekdays at 09:00",
    "firstOfMonth": "First day of month",
    "lastOfMonth": "Last day of month",
    "everyQuarter": "Every quarter (Jan/Apr/Jul/Oct 1st)"
  },
  "describe": {
    "everyMinute": "Every minute",
    "everySecond": "Every second",
    "atTime": "At {time}",
    "everyN": "Every {n} {unit}",
    "fromTo": "from {from} to {to}",
    "onDays": "on {days}",
    "throughDays": "{from} through {to}",
    "andList": "{prefix} and {item}",
    "ofEveryMonth": "of every month",
    "lastDayOfMonth": "the last day of the month",
    "nthWeekday": "the {ordinal} {weekday} of the month",
    "nearestWeekdayTo": "the nearest weekday to day {day}",
    "lastWeekdayOfMonth": "the last weekday of the month",
    "lastDayMinusN": "{n} days before the last day of the month"
  },
  "ordinal": {
    "1": "first",
    "2": "second",
    "3": "third",
    "4": "fourth",
    "5": "fifth"
  },
  "output": {
    "expression": "Expression",
    "description": "Description",
    "nextExecutions": "Next 5 executions",
    "header": {
      "num": "#",
      "dateTime": "Date & Time",
      "relative": "Relative"
    },
    "relative": {
      "in": "in {value}",
      "now": "now",
      "past": "past"
    }
  },
  "share": {
    "button": "Share link",
    "copied": "Share link copied"
  },
  "parse": {
    "placeholder": "Paste or type a Cron expression",
    "showingPrevious": "Showing last valid output"
  },
  "warn": {
    "neverTriggers": "This expression will never trigger",
    "searchWindowExhausted": "Only {found} of {requested} executions found in the next 4 years",
    "secondDropped": "Second field was dropped (was: {value})",
    "yearDropped": "Year field was dropped (was: {value})",
    "specialDroppedFromMode": "Special character {token} is not supported in {mode} mode and was removed",
    "bothDayFieldsSet": "Both day-of-month and day-of-week are set — expression fires when EITHER matches",
    "orSemanticsLost": "Quartz cannot represent OR semantics across day fields — keeping day-of-week, setting day-of-month to '?'"
  },
  "errors": {
    "wrongFieldCount": "Expected {expected} fields for {mode} mode, got {got}",
    "outOfRange": "{field} must be {min}-{max}, got {value}",
    "invalidSyntax": "Unexpected character '{char}' in {field} field",
    "invalidStep": "Step value must be positive, got {value}",
    "rangeReversed": "Range start ({from}) is greater than end ({to}) in {field}",
    "specialNotAllowed": "'{token}' is not allowed in {field} field for {mode} mode",
    "quartzNeedsQuestionMark": "Quartz mode requires either day-of-month or day-of-week to be '?'",
    "quartzBothQuestionMarks": "Day-of-month and day-of-week cannot both be '?'",
    "macroRebootUnsupported": "@reboot is not supported (browser cannot detect system boot)",
    "unknownMacro": "Unknown macro '{macro}'",
    "unknownAlias": "Unknown name '{name}' in {field} field",
    "weekdayOnNonDom": "'W' is only allowed in day-of-month field",
    "nthOnNonDow": "'#' is only allowed in day-of-week field"
  },
  "descriptions": {
    "whatIsTitle": "What is a Cron Expression?",
    "whatIs": "A Cron expression is a string of fields that describes a schedule. Each field controls a unit of time (minute, hour, day, month, weekday). Originally from Unix cron, the syntax has been extended by Spring (adds seconds) and Quartz (adds seconds and year, plus special characters L, W, #).",
    "fieldRefTitle": "Field Reference",
    "specialCharsTitle": "Special Characters",
    "modesTitle": "Modes",
    "dstTitle": "Daylight Saving Time",
    "dst": "When the active timezone observes DST, schedules within the spring-forward gap fire at the next valid time, and schedules within the fall-back overlap fire at the first occurrence. Switch to UTC to avoid DST entirely."
  }
}
```

`zh-CN` and `zh-TW` mirror the structure with translated values. Month/weekday names use locale-appropriate forms.

### `tools.json` Addition

```json
{
  "cron": {
    "shortTitle": "Cron",
    "title": "Cron Expression Generator & Parser",
    "description": "Build and decode Cron expressions for Standard, Spring, and Quartz schedulers. See human-readable explanations and the next 5 execution times."
  }
}
```

## Error Handling

All errors are returned as structured `ParseError` objects with i18n keys; functions never throw. UI surfaces them by tier:

| Tier        | Source                               | UX                                                               |
| ----------- | ------------------------------------ | ---------------------------------------------------------------- |
| Field error | Per-field parse failure              | Inline red text below the Parse textarea or under the field card |
| Whole-expr  | Field-count or DOM/DOW-rule failure  | Inline red banner above the Output area                          |
| Warning     | Migration losses, dead-end schedules | Yellow banner above the Output area; toast on mode-switch        |
| Notice      | Search window exhausted              | Subtle gray notice below the executions table                    |

Generator never errors (operates on already-validated structured data). Describer/executor handle malformed `ParsedCron` defensively (return empty string / empty array).

## Testing

Vitest is already configured (`pnpm test` / `pnpm test:watch`). New tests under `libs/cron/__tests__/`:

### `parser.test.ts` — Table-driven

Categories of cases (each ≥ 5 entries):

- **Valid Standard**: `* * * * *`, `0 9 * * 1-5`, `0,15,30,45 * * * *`, alias forms, macros
- **Valid Spring**: as above + second
- **Valid Quartz**: includes `?`, `L`, `W`, `#`, `L-N`, year ranges, `LW`
- **Field-count errors**: too few, too many, empty
- **Range errors**: out of range, reversed range
- **Mode-specific rejections**: `L` in Standard, both DOM and DOW non-`?` in Quartz, etc.
- **Macro expansion**: `@yearly`, `@reboot` (rejected), `@hourly` in each mode
- **Aliases**: `JAN-MAR`, `MON-FRI`, mixed `1-MAR`, case-insensitive `mon`

Each entry is `{ input, mode, expectedValid, expectedErrors?, expectedFields? }`.

### `generator.test.ts`

- Round-trip: every valid `parser.test.ts` input runs through `parser → generator` and produces a canonical form. The canonical form parses back to an identical `ParsedCron` (excluding `raw` and `expression`).
- Mode-switching: hand-crafted `CronFieldValue` objects produce the expected expression for each mode.

### `describer.test.ts`

- Snapshot-style: a fixture map of `(mode, expression) → expectedDescription` for English, with a stub `t` function that returns keys verbatim. Real i18n is verified by the next-intl integration; this test verifies the structural composition.

### `executor.test.ts`

- **Common patterns**: `* * * * *` produces consecutive minutes; `0 9 * * 1-5` skips weekends and non-9am hours.
- **DOM/DOW interaction**: Standard `0 0 1 * 0` fires on day 1 OR Sunday (verified counts over a year); Quartz `0 0 1 * ? *` fires only on day 1.
- **Special chars**: `0 0 L * ?` fires on the last day each month (28/30/31 verified across Feb/Apr/May); `0 0 ? * 6L *` last Friday.
- **Edge cases**: `0 0 29 2 ?` finds Feb 29 in leap years only; `0 0 ? * 6#5` skips months without a 5th Friday.
- **Search exhaustion**: `0 0 30 2 ?` returns empty with `searchExhausted: true`.
- **DST**: explicit cases for spring-forward and fall-back in a known DST zone (mock `Date` via vitest's fake timers if needed; otherwise document the `Local` behavior is platform-dependent and skip in CI).
- **Performance**: `expect(time).toBeLessThan(100)` for `nextExecutions(parsed, 5)` on each pattern.

No tests for the React page component (out of scope; existing tools follow the same convention).

## Scope Exclusions (YAGNI)

Out of scope:

- Full IANA timezone picker (Local + UTC only)
- Schedule simulation across many runs (>5 executions table)
- Visual timeline of executions
- Importing `@reboot` or other non-standard macros
- Cron-to-other-format conversion (Kubernetes CronJob YAML, AWS EventBridge syntax)
- Persistence beyond `localStorage` (no account, no cloud sync)
- Editing while Parse-tab text is invalid (state stays on last-valid)
- Rich tokenizer in Parse-tab (autocomplete, syntax highlighting on input) — color coding is render-only
- Bulk parsing of multiple expressions
