# Regex Tester Design

## Overview

A browser-based regular expression tester that provides real-time match highlighting, capture group inspection, replacement preview, token-level pattern explanation, and a preset pattern library. Pattern parsing uses `@eslint-community/regexpp` for AST and precise error offsets; matching runs inside a Web Worker so catastrophic patterns can be aborted without freezing the page.

## Scope

### In Scope

- Real-time regex matching with match highlighting in test text
- Match result list with index, value, and capture groups (named + numbered)
- Replacement preview (`String.prototype.replaceAll`) with `$1`/`$&`/`$<name>` support
- All JavaScript regex flags (g, i, m, s, u, y, d)
- Token-level pattern explanation via regexpp AST traversal
- Detailed error messages with character-level position indicator (caret under pattern)
- Catastrophic-backtracking protection via Web Worker timeout
- Built-in preset pattern library (email, URL, IPv4, phone, etc.) with reference notes
- Cheatsheet of common metacharacters and assertions
- Copy regex as JS literal or RegExp constructor
- Auto-strip pasted delimiters (`/foo/g` → pattern `foo`, flags `g`)
- Match ↔ highlight bidirectional linking (hover + scroll into view)
- Full i18n support (en, zh-CN, zh-TW)
- SEO metadata with hreflang
- Unit tests for matching, replacement, and explanation

### Out of Scope

- Regex visualization (railroad diagrams)
- Pattern optimization suggestions
- Multi-language regex flavors (PCRE, Python, etc.)
- URL state persistence / shareable links

## Tech Approach

**AST parser**: `@eslint-community/regexpp` — maintained successor of `regexpp`, used by ESLint. ~30KB gzip; loaded normally (Next.js route-level code splitting confines it to `/regex`). Used for:

1. Pattern validation with precise error localization (character offset + human-readable message)
2. AST traversal to generate per-token explanations (e.g., `\d+` → "one or more digits")

**Matching engine**: Browser-native `new RegExp(pattern, flags)`. Branching by flags:

- `g` on → `String.prototype.matchAll(regex)`
- `g` off → single `regex.exec(input)` (matchAll throws TypeError without `g`)

Replacement uses `input.replaceAll(regex, replacement)` (g on) or `input.replace(regex, replacement)` (g off).

**Worker isolation**: Matching and replacement run inside a dedicated Web Worker (`libs/regex/match.worker.ts`). The main thread posts `{ pattern, flags, input, replacement?, mode }` and starts a 1500ms timeout. If the worker doesn't respond before the deadline, the main thread terminates and respawns it, then surfaces a `timedOut` error in the UI. This is a **safety**, not a performance, requirement — patterns like `(a+)+b` against long input would otherwise hang the tab.

**Highlighting**: Custom React component slicing text into match/non-match segments rendered with `<mark>` elements, alternating two accent colors. Same pattern as the Diff tool's word-level highlighting.

## File Structure

```
app/[locale]/regex/
├── page.tsx              # Route entry — generateMetadata, hreflang, renders <RegexPage />
└── regex-page.tsx        # Client component — all UI and state

libs/regex/
├── main.ts               # Public API barrel
├── match.ts              # executeRegex() — main-thread orchestrator + worker mgmt
├── match.worker.ts       # Worker — runs RegExp matching/replacement
├── replace.ts            # buildReplacePreview() — replacement formatting helpers
├── explain.ts            # explainPattern() — regexpp AST → token explanations
├── patterns.ts           # PATTERN_PRESETS — static data
├── flags.ts              # FLAGS — flag definitions with metadata
├── delimiters.ts         # stripDelimiters() — detect & strip /pattern/flags input
└── __tests__/
    ├── match.test.ts
    ├── replace.test.ts
    ├── explain.test.ts
    └── delimiters.test.ts

public/locales/
├── en/regex.json
├── zh-CN/regex.json
└── zh-TW/regex.json

# Modified files:
libs/tools.ts                    # Add { key: "regex", path: "/regex" }
public/locales/en/tools.json     # Add regex metadata
public/locales/zh-CN/tools.json
public/locales/zh-TW/tools.json
```

## Data Models

### Flag Definition

```typescript
interface FlagDef {
  char: string; // "g" | "i" | "m" | "s" | "u" | "y" | "d"
  name: string; // i18n key for display name
  description: string; // i18n key for tooltip
  default: boolean; // initial state
}

const FLAGS: FlagDef[] = [
  { char: "g", name: "global", description: "flagGlobalDesc", default: true },
  { char: "i", name: "caseInsensitive", description: "flagCaseInsensitiveDesc", default: false },
  { char: "m", name: "multiline", description: "flagMultilineDesc", default: false },
  { char: "s", name: "dotAll", description: "flagDotAllDesc", default: false },
  { char: "u", name: "unicode", description: "flagUnicodeDesc", default: false },
  { char: "y", name: "sticky", description: "flagStickyDesc", default: false },
  { char: "d", name: "hasIndices", description: "flagHasIndicesDesc", default: false },
];
```

### Match Result

```typescript
interface MatchResult {
  value: string; // matched text ("" for zero-width)
  index: number; // start position
  endIndex: number; // index + value.length
  isZeroWidth: boolean; // value.length === 0
  groups: Record<string, string>; // named capture groups
  groupValues: string[]; // [fullMatch, group1, group2, ...]
}

interface MatchOutput {
  matches: MatchResult[];
  error: string | null; // human-readable error message
  errorOffset: number | null; // character offset in pattern (from regexpp)
  timedOut: boolean; // true if worker exceeded 1500ms
  pattern: string;
  flags: string;
  inputLength: number;
  matchCount: number;
  truncated: boolean; // true if matchCount > 1000 (rendered cap)
}
```

### Replace Output

```typescript
interface ReplaceOutput {
  output: string; // result of replace(All)
  replaceCount: number; // number of substitutions
  error: string | null;
  errorOffset: number | null;
  timedOut: boolean;
}
```

### Token Explanation

```typescript
interface TokenExplanation {
  text: string; // the literal token text (e.g., "\\d+", "[a-z]")
  start: number; // start offset in pattern
  end: number; // end offset in pattern
  explanationKey: string; // i18n key
  params?: Record<string, string | number>; // template params (e.g., min=3, max=5)
}

function explainPattern(
  pattern: string,
  flags: string
): TokenExplanation[] | { error: string; offset: number };
```

`explainPattern` traverses the AST and maps each node to a human-readable explanation:

| AST Node                   | Example           | Explanation Key        |
| -------------------------- | ----------------- | ---------------------- |
| `CharacterClass`           | `[a-z]`           | `explainCharClass`     |
| `Quantifier`               | `+`, `*`, `{3,5}` | `explainQuantifier`    |
| `Group` / `CapturingGroup` | `(...)`           | `explainGroup`         |
| `CharacterSet`             | `\d`, `\w`, `\s`  | `explainCharSet`       |
| `Assertion`                | `^`, `$`, `\b`    | `explainAssertion`     |
| `Alternative`              | `a\|b`            | `explainAlternative`   |
| `Character`                | `a`, `1`          | `explainLiteral`       |
| `Backreference`            | `\1`, `\k<name>`  | `explainBackreference` |

#### Granularity Rules (token grouping)

regexpp's AST is fine-grained (e.g., `\d+` = `Quantifier(element=CharacterSet)`). To produce human-friendly tokens, we collapse some nodes:

1. **Quantifier + element fuse into one token** — `\d+` becomes a single token `\d+` with explanation "one or more digits"; `[a-z]{3,5}` becomes one token "between 3 and 5 lowercase letters".
2. **Quantifier params are i18n template variables** — `{3,5}` → key `explainQuantifierRange` with `{ min: 3, max: 5 }`. Lazy quantifiers (`+?`, `*?`, `??`) emit a separate sub-key `lazySuffix`.
3. **Groups emit one outer token plus tokens for their contents** — explanation for `(\d+)` is shown as a "group" badge containing nested tokens, rendered with a thin border to convey nesting. Max nesting depth shown: 3; deeper levels collapse to "…".
4. **Adjacent literal characters fuse** — `abc` becomes one token "literal text 'abc'", not three.
5. **Alternation renders as a horizontal split** — `a|b|c` becomes one token with three branches, each explained on hover.

Errors return `{ error, offset }` instead of throwing.

### Pattern Presets

```typescript
interface PatternPreset {
  name: string; // i18n key
  pattern: string; // regex pattern (no delimiters)
  flags: string; // default flags
  description: string; // i18n key
  category: string; // i18n key (general | network | phone | code | security | datetime)
  note?: string; // i18n key for caveat (e.g., "html5SpecEmail")
}
```

Presets include: email (HTML5 spec, not strict RFC 5322), URL, IPv4, IPv6, China mobile phone, ISO 8601 date, HTML tag, hex color, strong password, semver, UUID. Each preset whose pattern is a known approximation carries a `note` so the UI can render an info icon with the caveat.

## Core Functions

### executeRegex (libs/regex/match.ts)

1. Trim & detect delimiters (`stripDelimiters` — see below)
2. Parse pattern with `@eslint-community/regexpp` to validate syntax
3. If parse fails, return `{ error, errorOffset }` immediately (no worker call)
4. Post `{ pattern, flags, input }` to the worker; start a 1500ms `setTimeout`
5. Worker: branch on flags
   - `g` flag → `Array.from(input.matchAll(regex)).slice(0, 1000)`
   - no `g` → `regex.exec(input)` (single result or none)
6. Worker maps each `RegExpMatchArray` to `MatchResult`, sets `isZeroWidth`
7. If timeout fires before result, terminate worker, respawn lazily, return `{ timedOut: true, error: "patternMaybeRedos", … }`
8. Cap rendered matches at 1000; expose `truncated` and `matchCount` so UI can show "showing 1000 of N"

### executeReplace (libs/regex/match.ts)

Same orchestration as `executeRegex`. The worker calls `input.replace(regex, fn)` where `fn` increments a counter and returns the formatted substitution (manually expanding `$1`/`$&`/`$<name>` from match args). One pass yields both `output` and `replaceCount`. Returns `ReplaceOutput`.

### stripDelimiters (libs/regex/delimiters.ts)

If user input matches `^/(.+)/([gimsuyd]*)$`, return `{ pattern: $1, flags: $2, stripped: true }`; otherwise `{ pattern: input, flags: currentFlags, stripped: false }`. Triggered on paste and on first non-empty input. UI shows a one-time toast "delimiters detected and stripped".

### explainPattern (libs/regex/explain.ts)

1. Parse pattern with `parseRegExpLiteral()` (wrap input as `/pattern/flags` for the parser)
2. Traverse AST with a custom visitor applying the **Granularity Rules** above
3. Emit a flat (or shallow-nested for groups) array of `TokenExplanation`
4. Errors return `{ error, offset }` instead of throwing

## Page Component Architecture

```
regex-page.tsx
└── RegexPage (default export)
    ├── Privacy banner (shared)
    └── Conversion()
        ├── PatternInput
        │   ├── / delimiter decorations
        │   ├── <input> for pattern (monospace), red border on error
        │   ├── ErrorCaret (positions a "^" beneath errorOffset)
        │   └── FlagCheckboxes (7 flags)
        ├── PatternPresets (Dropdown grouped by category, info icon for `note`)
        ├── ErrorDisplay (red card, message + offset)
        ├── PatternExplanation (token badges, nested for groups)
        ├── ModeTabs ("Match" | "Replace")
        ├── TestTextInput (<StyledTextarea>)
        ├── [Match mode]
        │   ├── MatchHighlightView (read-only, <mark> segments, ▎ for zero-width)
        │   └── MatchList → MatchItem[] (value/index/groups, hover-linked)
        ├── [Replace mode]
        │   ├── ReplacementInput (<input>, supports $1 $& $<name>)
        │   └── ReplacePreview (read-only output)
        └── QuickActions
            ├── Copy as JS literal: /pattern/flags
            └── Copy as constructor: new RegExp("pattern", "flags")
    └── Description()
        ├── What is Regex?
        ├── Common use cases
        ├── Cheatsheet (metacharacters, character classes, anchors, groups, lookarounds)
        └── Flag reference
```

### State

```typescript
const [pattern, setPattern] = useState("");
const [flags, setFlags] = useState<string>("g");
const [inputText, setInputText] = useState("");
const [mode, setMode] = useState<"match" | "replace">("match");
const [replacement, setReplacement] = useState("");
const [hoveredMatchIndex, setHoveredMatchIndex] = useState<number | null>(null);
```

`matchOutput`, `replaceOutput`, and `explanations` are derived from the state above (computed via async effect for worker results, sync for explanations). React Compiler auto-memoizes.

### Match ↔ Highlight Linking

- Hovering a `MatchItem` sets `hoveredMatchIndex`; the corresponding `<mark>` gets a stronger ring (`ring-2 ring-accent-cyan`).
- Clicking a `MatchItem` calls `scrollIntoView({ block: "center" })` on the highlighted span.
- Hovering a `<mark>` reverse-sets `hoveredMatchIndex` so the `MatchItem` row also lights up.

### Highlight Rendering

Text is split into segments at match boundaries:

```
Input:  "Hello world 123 foo456"
Regex:  \d+
Output: "Hello world "[mark.0]"123"[/mark]" foo"[mark.1]"456"[/mark]
```

- Matches rendered as `<mark>` elements, alternating `bg-accent-cyan/20` and `bg-accent-purple/20`
- Zero-width matches render as a thin vertical caret `▎` (1px wide span with the same accent color, no text content) so users see _where_ the match occurred
- Max 1000 matches rendered; remainder counted in the "showing X of Y" footer

### Error Display

- Red card with `border-l-2 border-danger`, message from regexpp
- Pattern input border turns red
- A `^` caret rendered beneath the pattern input, absolutely positioned at `errorOffset * chWidth` (using `font-mono` ensures fixed character width)
- No match results shown while error exists
- Worker timeout shows a distinct yellow card: "Pattern took too long — possible catastrophic backtracking"

### Pattern Explanation Panel

Below the pattern input, render token explanations as inline badges. Groups render as outlined containers wrapping their child tokens. Quantifier params come from `params` and feed `t(explanationKey, params)`.

```
\d+        [a-z]+       @
↑          ↑            ↑
"one or    "one or      "literal @"
 more       more
 digits"    lowercase
            letters"
```

### Pattern Presets

- Dropdown grouped by category (General, Network, Phone, Code, Security, DateTime)
- Clicking a preset fills pattern + flags, preserves `inputText` and `replacement`
- Each preset row shows the i18n name, a short description, and an info icon when `note` is present (tooltip shows the caveat translation)
- Uses project's existing `Dropdown` component

### Cheatsheet

Static reference table at the bottom of the page (within `Description`), grouped into sections:

| Section           | Tokens                                   |
| ----------------- | ---------------------------------------- |
| Character classes | `\d \w \s \D \W \S [...] [^...]`         |
| Anchors           | `^ $ \b \B`                              |
| Quantifiers       | `* + ? {n} {n,} {n,m}` and lazy variants |
| Groups            | `(...) (?:...) (?<name>...)`             |
| Lookaround        | `(?=...) (?!...) (?<=...) (?<!...)`      |
| Escapes           | `\n \t \\ \. \/`                         |

Each row: token | meaning | example. All translatable.

## Tool Icon

`lucide-react` exports a `Regex` icon — use it in the tool registry (`libs/tools.ts` consumers) to match the visual language of `textcase`/`uuid`/etc.

## Styling

Follows existing OmniKit conventions:

| Element                  | Classes                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Pattern input            | `font-mono text-sm` with `/` delimiters; `border-danger` on error                             |
| Error caret              | `font-mono text-danger absolute` positioned via inline style                                  |
| Match highlights         | `<mark>` with `bg-accent-cyan/20` or `bg-accent-purple/20` alternating                        |
| Hovered match highlight  | additional `ring-2 ring-accent-cyan rounded-sm`                                               |
| Zero-width caret         | `inline-block w-px bg-accent-cyan h-[1.2em] align-middle`                                     |
| Error card               | `border-l-2 border-danger bg-danger/10 rounded-r-lg p-3`                                      |
| Timeout card             | `border-l-2 border-warning bg-warning/10 rounded-r-lg p-3`                                    |
| Match list items         | `bg-bg-surface rounded-lg p-3` with hover                                                     |
| Token explanation badges | `bg-bg-elevated rounded px-2 py-0.5 text-xs`; nested groups get `border border-border-subtle` |
| Mode tabs                | Existing `Tabs` component                                                                     |
| Preset dropdown          | Existing `Dropdown` component                                                                 |
| Section labels           | `font-mono text-sm font-semibold text-accent-cyan` (input) / `text-accent-purple` (output)    |

## i18n

### Namespaces

- `regex` — tool-specific strings (input labels, errors, descriptions, cheatsheet)
- `common` — shared strings (clear, copy, etc.)
- `tools` — tool metadata (title, shortTitle, description)

### Translation Keys (regex namespace)

Sections required in all three locale files:

- input/output labels (pattern, replacement, test text, match list, etc.)
- flag names + descriptions (7 flags × 2 keys)
- error messages (parse errors, timeout, runtime errors)
- token explanations (`explainCharSet`, `explainQuantifier`, `explainQuantifierRange`, `explainGroup`, `explainAssertion`, `explainAlternative`, `explainLiteral`, `explainBackreference`, `explainCharClass`, plus `lazySuffix`)
- preset names + descriptions + category names + per-preset `note` keys (e.g., `html5SpecEmail`)
- cheatsheet section headings + per-row meaning text
- description section headings and paragraphs

Three locale files: `en/regex.json`, `zh-CN/regex.json`, `zh-TW/regex.json` — all sections fully translated, no fallback gaps.

## Dependencies

### New

- `@eslint-community/regexpp` (~30KB gzip) — maintained ECMAScript regex AST parser, successor of `regexpp`. Used for AST parsing, validation, and character-level error localization.

### Existing (no changes)

- `lucide-react` — icons (`Regex` icon for tool entry)
- `@headlessui/react` — Dropdown for preset selector
- `next-intl` — translations
- All existing `components/ui/*` components (`Tabs`, `Dropdown`, `StyledInput`, `StyledTextarea`, `CopyButton`, etc.)

## Error Handling

| Case                       | Behavior                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| regexpp parse error        | Red card + red input border + `^` caret at `errorOffset`. No match/replace results.            |
| Runtime `RegExp` error     | `try/catch` around `new RegExp()` in worker; surface as parse error with offset null.          |
| Worker timeout (>1500ms)   | Terminate worker, respawn lazily, show yellow card "patternMaybeRedos".                        |
| Empty pattern              | Placeholder state ("Enter a regex pattern"). No error, no match list, explanation panel empty. |
| Empty input text           | Placeholder in highlight area ("Paste or type text to test"). No error.                        |
| No matches                 | "No matches found" message in match list.                                                      |
| Pasted with delimiters     | Auto-strip via `stripDelimiters`; show one-time toast.                                         |
| Replace before match valid | Replace tab disabled while pattern is invalid.                                                 |
| Replace without `g` flag   | Allowed; only the first match is replaced. Footer shows "replaced 1 of N (no `g` flag)".       |

## Performance Considerations

- regexpp parse + native `matchAll` finishes in <1ms for typical inputs; no debounce on input.
- Worker prevents UI freeze on catastrophic patterns; 1500ms timeout chosen as the upper bound a user is willing to wait before getting feedback (regex101 uses ~2s).
- Cap rendered matches at 1000; surface `truncated` so UI shows "showing 1000 of N".
- Token explanation recomputed only when `pattern`/`flags` change (not when `inputText` changes) — derived state, React Compiler auto-memoizes.
- React Compiler handles all memoization — no manual `useMemo`/`useCallback`/`React.memo`.
- Worker is reused across calls; only respawned after a timeout.

## Testing

Vitest unit tests in `libs/regex/__tests__/`:

- **`match.test.ts`** — basic literal match, character classes, named/numbered groups, alternation, zero-width matches (`\b`, `(?=)`), `g` on/off branching, empty pattern, empty input, truncation at 1000.
- **`replace.test.ts`** — `$1`/`$&`/`$<name>` substitution, `g` on/off branching, replacement count, no-match preserves input.
- **`explain.test.ts`** — one snapshot per AST node type; granularity rule cases (quantifier fusion, literal fusion, group nesting, lazy quantifier suffix, alternation branches).
- **`delimiters.test.ts`** — strip variants (`/foo/`, `/foo/g`, `/a\/b/`, no-match cases).

Worker timeout path is exercised via mock (we don't rely on triggering real catastrophic backtracking in CI).
