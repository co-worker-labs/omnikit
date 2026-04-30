# HTTP Status Code Reference — Design Spec

## Overview

A browser-based HTTP status code reference tool for OmniKit. Displays IANA official codes plus unofficial platform extensions (Nginx, Cloudflare, IIS) in a single searchable table with category filter buttons and expandable row details.

All data is static — no API calls, no server-side processing. Follows existing reference tool patterns (ASCII Table, HTML Code).

## Scope

**Included status codes (~75-85 total):**

| Source                                                            | Codes | Example                      |
| ----------------------------------------------------------------- | ----- | ---------------------------- |
| IANA (RFC 9110, RFC 6585, RFC 4918, RFC 7538, RFC 7725, RFC 8297) | ~63   | 200, 301, 404, 500           |
| Nginx                                                             | 6     | 444, 494, 495, 496, 497, 499 |
| Cloudflare                                                        | 11    | 520-530                      |
| IIS                                                               | 2     | 440, 449                     |

**Not included:** Deprecated codes (e.g. 306 Switch Proxy), AWS-specific codes (AWS uses standard codes).

## Data Model

```typescript
// libs/httpstatus.ts

export type StatusCategory = "1xx" | "2xx" | "3xx" | "4xx" | "5xx" | "unofficial";

export interface HttpStatusCode {
  code: number;
  name: string; // e.g. "Not Found"
  description: string; // Short description
  spec?: string; // e.g. "RFC 9110"
  source?: string; // e.g. "IANA", "Nginx", "Cloudflare", "IIS"
  popular?: boolean; // Highlight commonly used codes (see explicit list below)
  details?: {
    // Should be provided for all popular codes, optional otherwise
    usage: string; // Usage scenario
    commonCauses: string; // Common causes
  };
}

/**
 * Popular codes with details (usage + commonCauses required for these):
 * 200, 201, 204, 206, 301, 302, 304, 307, 400, 401,
 * 403, 404, 405, 408, 409, 429, 500, 502, 503, 504
 *
 * Popular codes render with a small accent-cyan dot indicator next to the code badge.
 */
export function getStatusCodes(): HttpStatusCode[];
```

## Page Structure

```
Layout
└── Container (px-4 pt-3 pb-6)
    ├── Description Section (collapsible, same as ASCII)
    ├── Tip Box (cyan left border)
    └── Main Section
        ├── Search Bar (Search icon + StyledInput)
        ├── Category Filter Pills
        │   All | 1xx Informational | 2xx Success | 3xx Redirection
        │   | 4xx Client Error | 5xx Server Error | Unofficial
        ├── Status Code Table
        │   Columns: Code | Name | Description | Spec | Source
        │   └── Expandable detail rows (hover desktop / tap mobile)
        └── Count Display (X / Y status codes)
```

**Key decision:** Single table with pill filter buttons (NOT NeonTabs). This allows cross-category search — searching "not" while filtered to "4xx" shows only 4xx codes matching "not".

## UI Components

### Search Bar

Reuses ASCII pattern: `StyledInput` with left-aligned `Search` icon from lucide-react.

Search fields: code (converted to string), name, description. Case-insensitive. Applied after category filter. Searching "404" matches any row where the code, name, or description contains "404" as text.

### Category Filter Pills

```tsx
const categories = ["all", "1xx", "2xx", "3xx", "4xx", "5xx", "unofficial"];

// Active: bg-accent-cyan text-bg-base
// Inactive: bg-bg-elevated text-fg-secondary hover:bg-bg-elevated/80
// Layout: flex-wrap gap-2
```

### Table Columns

| Column      | Width  | Style                                                           |
| ----------- | ------ | --------------------------------------------------------------- |
| Code        | Narrow | `font-mono` + Badge colored by category                         |
| Name        | Medium | `text-fg-primary font-medium`                                   |
| Description | Wide   | `text-fg-secondary text-sm`                                     |
| Spec        | Narrow | `font-mono text-accent-cyan text-xs`                            |
| Source      | Narrow | Badge (IANA=default, Nginx=purple, Cloudflare=cyan, IIS=purple) |

Table structure follows ASCII pattern exactly:

- Outer: `rounded-lg border border-border-default overflow-hidden`
- Scroll: `overflow-x-auto`
- Header: `bg-bg-elevated/40`
- Rows: `border-b border-border-default transition-colors duration-150 hover:bg-bg-elevated/60`

### Code Badge Color Rules

| Category   | Badge Variant                    |
| ---------- | -------------------------------- |
| 1xx        | `default` (gray)                 |
| 2xx        | `cyan`                           |
| 3xx        | `purple`                         |
| 4xx        | `danger`                         |
| 5xx        | `danger`                         |
| Unofficial | `default` + `className="italic"` |

### Source Badge Color Rules

| Source     | Badge Variant    |
| ---------- | ---------------- |
| IANA       | `default` (gray) |
| Nginx      | `purple`         |
| Cloudflare | `cyan`           |
| IIS        | `purple`         |

### Popular Code Indicator

Popular codes show a small cyan dot (`●`) next to the code badge, styled `text-accent-cyan text-[8px]`.

### Expandable Detail Rows

**Trigger:**

- Desktop: `onMouseEnter` expand, `onMouseLeave` collapse (or switch to another row)
- Mobile: `onClick` toggle expand/collapse
- Keyboard: `onFocus` expand (Tab into a row to expand its detail)
- Use `useIsMobile()` hook from `hooks/` to distinguish desktop/mobile

**Content:**

```
┌─────────────────────────────────────────────┐
│ USAGE                                        │
│ The server cannot find the requested URL...  │
│                                              │
│ COMMON CAUSES                                │
│ • Typo in URL path                           │
│ • Resource was deleted or moved              │
│ • Missing route configuration                │
└─────────────────────────────────────────────┘
```

Rendered as a `<tr>` below the status code row with `colSpan={5}`, styled `bg-bg-elevated/30`.

### Empty State

When `filtered.length === 0`: single row with `colSpan={5}`, text "No results found".

### Count Display

```
{filtered.length} / {total.length} status codes
```

Right-aligned, `text-xs text-fg-muted`.

## File Structure

### New Files

```
app/[locale]/httpstatus/
├── page.tsx                    # Route entry (same pattern as ASCII)
└── httpstatus-page.tsx         # Page component ("use client")

libs/
└── httpstatus.ts               # Status code data + interfaces

public/locales/
├── en/httpstatus.json
├── zh-CN/httpstatus.json
└── zh-TW/httpstatus.json
```

### Modified Files

```
libs/tools.ts                   # Add { key: "httpstatus", path: "/httpstatus" }
public/locales/en/tools.json    # Add httpstatus section
public/locales/zh-CN/tools.json # Add httpstatus section
public/locales/zh-TW/tools.json # Add httpstatus section
```

## i18n Structure

```json
{
  "description": {
    "text": "Complete HTTP status code reference covering all IANA official codes from RFC 9110 and related specifications — including WebDAV (RFC 4918), additional HTTP status codes (RFC 6585), 308 Permanent Redirect (RFC 7538), 451 Unavailable For Legal Reasons (RFC 7725), and Early Hints (RFC 8297). Also includes unofficial platform extensions from Nginx, Cloudflare, and IIS. Each code shows its description, RFC reference, and commonly used codes include usage scenarios and common causes for quick troubleshooting."
  },
  "tip": "Hover over any row on desktop or tap on mobile to see usage details and common causes.",
  "searchPlaceholder": "Search by code, name, or description...",
  "categories": {
    "all": "All",
    "1xx": "1xx Informational",
    "2xx": "2xx Success",
    "3xx": "3xx Redirection",
    "4xx": "4xx Client Error",
    "5xx": "5xx Server Error",
    "unofficial": "Unofficial"
  },
  "tableHeaders": {
    "code": "Code",
    "name": "Name",
    "description": "Description",
    "spec": "Spec",
    "source": "Source"
  },
  "detailLabels": {
    "usage": "Usage",
    "commonCauses": "Common Causes"
  }
}
```

Translation files needed for: `en`, `zh-CN`, `zh-TW`.

`tools.json` addition:

```json
{
  "httpstatus": {
    "title": "HTTP Status Code Reference - Complete Guide",
    "shortTitle": "HTTP Status",
    "description": "Complete HTTP status code reference with descriptions, RFC references, and usage guides. Covers IANA official and unofficial codes."
  }
}
```

## Implementation Constraints

1. **React Compiler**: No manual `useMemo`, `useCallback`, or `React.memo`. Let the compiler auto-memoize.
2. **Filter + Search interaction**: Apply category filter first, then search filter on the result.
3. **No external dependencies**: All data is static in `libs/httpstatus.ts`.
4. **Responsive**: Table scrolls horizontally on small screens (`overflow-x-auto`).
5. **Accessibility**: Proper `<table>` semantics with `role="grid"` pattern. Each data row is focusable via keyboard (Tab), and focusing a row expands its detail panel (`onFocus`). Detail panel uses `aria-expanded` attribute. Rows use `role="row"` with `tabIndex={0}`. Expandable detail rows are announced to screen readers with `aria-live="polite"`.
6. **SEO**: Route entry uses `generatePageMeta` for metadata with hreflang support.

## Out of Scope

- HTTP request/response headers reference
- HTTP methods reference
- Status code testing/simulation
- Export to CSV/JSON
- Dark mode specific changes (uses CSS variables, works automatically)
