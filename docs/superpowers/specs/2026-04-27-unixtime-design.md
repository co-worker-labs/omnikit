# Unix Timestamp Converter — Design Spec

## Overview

Add a Unix timestamp ⇔ datetime conversion tool to ByteCraft at route `/unixtime`. Supports second and millisecond timestamps, displays results in both local timezone and UTC, and includes a live clock showing the current Unix timestamp.

## Requirements

| Requirement       | Detail                                                                       |
| ----------------- | ---------------------------------------------------------------------------- |
| Timestamp formats | Seconds and milliseconds, auto-detected with manual override                 |
| Timezone display  | Local timezone (with IANA name + UTC offset) and UTC, side-by-side           |
| Live clock        | Real-time current Unix timestamp, updated every second, pausable             |
| Bi-directional    | Timestamp → datetime AND datetime → timestamp                                |
| Quick presets     | `Now`, `Today 00:00 (local)`, `Today 00:00 (UTC)` for date-to-timestamp side |
| Route             | `/unixtime`                                                                  |
| i18n              | English, Simplified Chinese, Traditional Chinese                             |

## Supported Range

- **Years**: 1970-01-01 to 9999-12-31 (positive timestamps only)
- **Seconds**: 0 to 253402300799 (12 digits max)
- **Milliseconds**: 0 to 253402300799999 (15 digits max, within `Number.MAX_SAFE_INTEGER` 9.007e15)
- Negative timestamps (pre-1970) explicitly rejected with inline error to keep semantics simple
- Microsecond / nanosecond timestamps not supported

## UI Layout

### Section 1: LiveClock (top, full-width)

```
┌──────────────────────────────────────────────────┐
│  ⏱ Current Unix Timestamp        [⏸ Pause]      │
│                                                  │
│        1714521600                         [Copy] │
│                                                  │
│  Local (Asia/Shanghai, UTC+08:00)                │
│         2024-05-01 00:00:00               [Copy] │
│  UTC    2024-04-30 16:00:00               [Copy] │
└──────────────────────────────────────────────────┘
```

- Large mono font for the timestamp number
- `setInterval(fn, 1000)` updates every second; cleanup on unmount
- **Pause button**: stops the interval; resume restarts it. Helpful for copying a precise moment.
- `aria-live="off"` on the ticking number to avoid screen-reader spam every second
- **Three CopyButtons** (timestamp / local / UTC) — all rows symmetric
- Local timezone label uses `Intl.DateTimeFormat().resolvedOptions().timeZone` for the IANA name and `getTimezoneOffset()` formatted as `UTC±HH:MM`

### Section 2: TimestampToDate (left column on desktop)

```
┌─ Timestamp → DateTime ──────────────────────────┐
│                                                  │
│  Unit:  ( ) Auto  (•) Seconds  ( ) Milliseconds  │
│                                                  │
│  Input: [ 1714521600          ]  [Paste] [Clear] │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Local       2024-05-01 00:00:00  [Copy]  │    │
│  │ UTC         2024-04-30 16:00:00  [Copy]  │    │
│  │ ISO 8601    2024-04-30T16:00:00.000Z [C] │    │
│  │ SQL         2024-04-30 16:00:00  [Copy]  │    │
│  │ RFC 2822    Tue, 30 Apr 2024 16:00:00 GMT[C]│ │
│  │ Day / Week  Wednesday, Week 18   [Copy]  │    │
│  │ Relative    1 year ago           [Copy]  │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

#### Input control

- `<input type="text" inputMode="numeric" pattern="[0-9]*">` — **NOT** `type="number"` (avoids spinners, scientific notation, leading-zero stripping, and silent character drop)
- mono font, paste-friendly
- **Paste button**: calls `navigator.clipboard.readText()`. On failure (insecure context, permission denied) catches and shows toast: "Paste unavailable — use Ctrl+V / ⌘V instead"

#### Unit detection

A radio group `[ Auto | Seconds | Milliseconds ]` defaults to `Auto`. Manual override always wins.

**Auto rule** (length-based):

| Digit count | Interpretation                                                 |
| ----------- | -------------------------------------------------------------- |
| 1–11        | Seconds                                                        |
| 12–13       | Milliseconds                                                   |
| 14–15       | Milliseconds (still in safe range, accepted)                   |
| 16+         | Reject — likely microseconds/nanoseconds, ask user to truncate |

#### Output formats

Seven rows, each with a `CopyButton`:

| Row      | Source                                                                             |
| -------- | ---------------------------------------------------------------------------------- |
| Local    | `date.toLocaleString(locale, { hour12: false })`                                   |
| UTC      | `date.toISOString().replace('T',' ').slice(0,19)`                                  |
| ISO 8601 | `date.toISOString()` (always includes ms, ends in `Z`)                             |
| SQL      | Same as UTC row but documented as SQL `DATETIME` literal                           |
| RFC 2822 | `date.toUTCString()`                                                               |
| Day/Week | Weekday name (`Intl.DateTimeFormat`, locale-aware) + ISO week number               |
| Relative | Helper: pick best unit (sec/min/hour/day/month/year) via `Intl.RelativeTimeFormat` |

ISO week number computed inline (no library): copy a 5-line helper.

### Section 3: DateToTimestamp (right column on desktop)

```
┌─ DateTime → Timestamp ──────────────────────────┐
│                                                  │
│  Quick: [Now] [Today 00:00 Local] [Today 00:00 UTC] │
│                                                  │
│  Date: [2024-05-01]  Time: [00:00:00]            │
│  Milliseconds (optional): [000]                  │
│  Timezone: (•) Local  ( ) UTC                    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Seconds       1714521600     [Copy]      │    │
│  │ Milliseconds  1714521600000  [Copy]      │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

- `<input type="date">` and `<input type="time" step="1">` (seconds precision)
- **Optional ms field** (`<input type="text" inputMode="numeric">`, range 0–999) covers the precision gap left by `<input type="time">` which only supports seconds via `step="1"`
- **Timezone radio**: interpret the inputs as either Local or UTC
- **Initial value**: current date/time captured **once at mount** via `new Date()`. Never re-synced from LiveClock — user edits must not be overwritten.
- **Quick presets** populate the date/time/ms fields:
  - `Now` → current local datetime
  - `Today 00:00 Local` → today's date at midnight local
  - `Today 00:00 UTC` → today's date at midnight UTC
- Output: seconds + milliseconds timestamps using `Math.trunc(date.getTime() / 1000)` (trunc, not floor — handles edge cases consistently even though spec rejects negatives)

### Responsive behavior

- Breakpoint: Tailwind `md` (≥768px)
- ≥768px: TimestampToDate and DateToTimestamp side-by-side via `grid grid-cols-1 md:grid-cols-2 gap-4`
- <768px: stacked vertically

## Component Architecture

```
unixtime-page.tsx
├── LiveClock          — real-time timestamp display with pause toggle
├── TimestampToDate    — timestamp input → datetime outputs
├── DateToTimestamp    — datetime inputs → timestamp outputs
└── Description        — explanation: Unix epoch, Y2K38, seconds vs ms
```

All in a single file (`unixtime-page.tsx`), following the existing pattern (e.g., `storageunit-page.tsx`).

## File Changes

| File                                      | Action | Description                                                   |
| ----------------------------------------- | ------ | ------------------------------------------------------------- |
| `app/[locale]/unixtime/page.tsx`          | Create | Route entry with `generateMetadata`                           |
| `app/[locale]/unixtime/unixtime-page.tsx` | Create | Page component with all UI and logic                          |
| `libs/tools.ts`                           | Edit   | Add `{ key: "unixtime", path: "/unixtime" }` to `TOOLS` array |
| `i18n/request.ts`                         | Edit   | Add `"unixtime"` to namespaces array                          |
| `public/locales/en/unixtime.json`         | Create | English translations                                          |
| `public/locales/zh-CN/unixtime.json`      | Create | Simplified Chinese translations                               |
| `public/locales/zh-TW/unixtime.json`      | Create | Traditional Chinese translations                              |
| `public/locales/en/tools.json`            | Edit   | Add unixtime metadata (title/shortTitle/description)          |
| `public/locales/zh-CN/tools.json`         | Edit   | Add unixtime metadata                                         |
| `public/locales/zh-TW/tools.json`         | Edit   | Add unixtime metadata                                         |
| `app/[locale]/home-page.tsx`              | Edit   | Add `Clock` icon mapping for `/unixtime`                      |

## Business Logic

No external dependencies. All logic uses native JS `Date` + `Intl`:

| Operation              | Approach                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Timestamp → Date       | `new Date(sec * 1000)` or `new Date(ms)`                                                  |
| Date → Timestamp (sec) | `Math.trunc(date.getTime() / 1000)`                                                       |
| Date → Timestamp (ms)  | `date.getTime()`                                                                          |
| Local format           | `date.toLocaleString(undefined, { hour12: false })`                                       |
| UTC format             | derived from `toISOString()`                                                              |
| ISO 8601               | `date.toISOString()`                                                                      |
| RFC 2822               | `date.toUTCString()`                                                                      |
| Local timezone label   | `Intl.DateTimeFormat().resolvedOptions().timeZone` + offset                               |
| Relative time          | inline helper: pick largest unit where `abs(diff) ≥ unit`, then `Intl.RelativeTimeFormat` |
| ISO week number        | inline helper (Thursday-of-week / Jan 4 algorithm)                                        |
| Weekday                | `Intl.DateTimeFormat(locale, { weekday: 'long' })`                                        |

No utility file — logic is small and tool-specific. Inline per "simplicity first" principle.

## Error Handling

Inline error message under the input(s). Empty input shows placeholder, not error.

| Scenario                                   | Behavior                                                             |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Empty input                                | Placeholder state, no outputs, no error                              |
| Non-numeric character (typed)              | Blocked by `pattern` / filtered in `onChange`                        |
| Negative number                            | Inline error: "Negative timestamps not supported"                    |
| 16+ digits                                 | Inline error: "Too long — looks like microseconds. Truncate to 13."  |
| Manual unit = Seconds, value > 12 digits   | Inline error: "Value too large for seconds. Switch to Milliseconds?" |
| Value > `Number.MAX_SAFE_INTEGER`          | Inline error: "Value out of safe range"                              |
| Date input out of `1970-01-01..9999-12-31` | Browser-native validation via `min`/`max` attrs                      |
| `navigator.clipboard.readText()` fails     | Toast: "Paste unavailable — use Ctrl+V / ⌘V"                         |

## Description Section Content

A short collapsible/static block at the bottom covering:

- **What is a Unix timestamp**: seconds elapsed since `1970-01-01T00:00:00Z`
- **Seconds vs Milliseconds**: when each is used (Unix tools / log files vs JS / Java APIs)
- **Y2K38**: 32-bit signed second timestamps overflow on 2038-01-19; modern systems use 64-bit
- **Timezones**: a timestamp is timezone-agnostic; the human-readable form depends on display timezone

i18n keys for all copy.

## Accessibility

- All inputs have `aria-label` from translations
- LiveClock ticking value is `aria-live="off"` (avoid every-second announcements)
- Pause button has `aria-pressed` reflecting state
- Radio groups use semantic `<fieldset>` + `<legend>`

## Out of Scope

- Microsecond/nanosecond timestamps (rejected with hint)
- Negative timestamps / pre-1970 dates
- Manual timezone selector beyond Local/UTC (no IANA picker)
- Code snippets in specific languages (e.g., `DateTime.Now`, `time.time()`)
- Batch conversion of multiple timestamps
- URL parameter pre-fill
- Keyboard shortcuts (Cmd+K etc.)
