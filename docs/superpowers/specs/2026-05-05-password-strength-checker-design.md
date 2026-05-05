# Password Strength Checker — Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Route:** `/password` (existing, no new route)

## Summary

Add a password strength checker to the existing Password Generator page using `@zxcvbn-ts/core`. The page gets a tab toggle (Generator / Strength Checker) so users can either generate passwords or check arbitrary passwords. Both tabs share the same zxcvbn-based strength analysis. A "Check this password" button bridges the two tabs by sending a generated password to the checker.

## Architecture

### New files

- `libs/password/strength.ts` — Lazy-loaded wrapper around `@zxcvbn-ts/core`. Exports `analyzeStrength(password: string): Promise<StrengthResult>`. Dynamic-imports `@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en` on first call, caches the instance for subsequent calls.
- `libs/password/warnings-map.ts` — Static lookup mapping zxcvbn English warning/suggestion strings to translation keys. Used by both `analyzeStrength()` (to return translation keys instead of raw strings) and the UI (to resolve keys via `useTranslations()`).

### Modified files

- `app/[locale]/password/password-page.tsx` — Add tab toggle (NeonTabs), extract current generator into a tab panel, add new `Checker` component, replace local `getPasswordLevelStyle()` with async `analyzeStrength()`
- `libs/password/main.ts` — Remove `calculateEntropy()` export (no longer used)
- `public/locales/*/password.json` — New translation keys for checker UI; remove `strengthGood` key from all 10 locales
- `public/locales/*/tools.json` — Updated title/description/searchTerms

### Deleted code

- `getPasswordLevelStyle()` — local function in `password-page.tsx` (lines 54-88). Replaced by async `analyzeStrength()` + component-side rendering.
- `calculateEntropy()` — exported from `libs/password/main.ts`. Replaced by zxcvbn.
- Info card referencing "Shannon entropy" (`entropyVerified` + `entropyVerifiedDesc` keys) — replaced by zxcvbn-based info card.

### Data flow

```
PasswordPage (owns: activeTab, checkerInput, saved)
├── NeonTabs: Generator | Strength Checker
├── Generator tab
│   ├── Random/Memorable pill toggle (existing)
│   ├── Existing generator UI
│   ├── Async strength bar → analyzeStrength(printPassword(password))
│   │   ├── Loading state: empty h-2 bar, no label
│   │   └── Resolved: colored bar + dot + label + "X / 4"
│   └── "Check this password" button → sets checkerInput + switches activeTab
├── Checker tab
│   ├── Privacy notice
│   ├── Password input (show/hide toggle, clear button)
│   ├── Debounced analysis (300ms)
│   ├── Async strength bar → analyzeStrength(input)
│   ├── Crack time display
│   ├── Warning callout
│   └── Suggestions list
├── Info cards (replaced — see below)
└── Saved Passwords (below tabs, always visible)
    └── Each card: async strength bar with per-card loading state
```

### Navigation hierarchy

Two levels of toggles coexist:

1. **Top-level tabs** (NeonTabs) — Generator vs Strength Checker
2. **Generator-internal pill toggle** (existing) — Random vs Memorable

The Generator tab preserves its existing Random/Memorable toggle unchanged.

### Shared state between tabs

`PasswordPage` owns the shared state and passes it down:

- `activeTab: 'generator' | 'checker'` — which tab is shown
- `checkerInput: string` — the password to pre-fill in the Checker

When the "Check this password" button is clicked in the Generator:

1. `checkerInput` is set to `copyPassword(passwordType, password)` (the plain-text password)
2. `activeTab` is set to `'checker'`
3. The Checker receives `initialInput` prop and uses it as the starting value

### Dependencies

New npm packages:

- `@zxcvbn-ts/core`
- `@zxcvbn-ts/language-common`
- `@zxcvbn-ts/language-en`

**Limitation:** `@zxcvbn-ts/language-en` only detects English dictionary words and patterns. Chinese, Japanese, Korean, and other non-Latin common passwords will not be flagged. This is an accepted limitation — the library still provides useful entropy/pattern analysis for all passwords regardless of language.

## Strength Analysis Library

### `libs/password/strength.ts`

```typescript
interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  crackTimeSeconds: number;
  crackTimeUnit:
    | "instant"
    | "seconds"
    | "minutes"
    | "hours"
    | "days"
    | "months"
    | "years"
    | "centuries";
  crackTimeValue: number; // numeric value for the unit (e.g., 3 if "3 hours")
  warningKey: string | null; // translation key, e.g. "warningTop10"
  suggestionKeys: string[]; // translation keys, e.g. ["suggestionUseFewWords"]
}
```

Exported function: `analyzeStrength(password: string): Promise<StrengthResult>`

**Lazy loading:** Uses dynamic `import()` on first call. Module-level cache variable holds the initialized zxcvbn instance. Subsequent calls are synchronous aside from the Promise wrapper.

**Crack time formatting (component-side):** `analyzeStrength()` returns raw data (`crackTimeSeconds`, `crackTimeUnit`, `crackTimeValue`). The component formats the display string using `useTranslations("password")` and the `crackTime*` keys with numeric interpolation. This keeps `strength.ts` as a pure library function with no React dependency.

**Warning/suggestion translation:** `analyzeStrength()` looks up each zxcvbn English string in `warnings-map.ts` and returns the translation key (e.g., `"warningTop10"`). The component resolves keys via `t(result.warningKey)` with fallback to the original English string if the key is missing in the current locale.

### `libs/password/warnings-map.ts`

Static `Map<string, string>` mapping zxcvbn English output strings to translation keys:

```typescript
export const warningMap: Record<string, string> = {
  "This is a very common password": "warningTop10",
  // ... enumerated from @zxcvbn-ts/language-en source
};

export const suggestionMap: Record<string, string> = {
  "Add another word or two. Uncommon words are better.": "suggestionUseFewWords",
  // ...
};
```

Exact keys will be enumerated from `@zxcvbn-ts/language-en` source during implementation. The map is a simple object lookup — no runtime overhead.

### Score → visual mapping

Replaces the current 6-level entropy system. Aligns with zxcvbn's standard 0-4 scale:

| Score | Label key          | Color  | Bar Width |
| ----- | ------------------ | ------ | --------- |
| 0     | strengthVeryWeak   | red    | 20%       |
| 1     | strengthWeak       | red    | 40%       |
| 2     | strengthFair       | orange | 60%       |
| 3     | strengthStrong     | cyan   | 80%       |
| 4     | strengthVeryStrong | cyan   | 100%      |

**Visual behavior change:** The current entropy-based system shows a 0% width bar for "Weak" and "Very Weak". The new system shows a visible bar (20% / 40%) for these levels, giving users clearer visual feedback even for weak passwords. This is an intentional improvement.

The existing translation keys are reused: `strengthVeryWeak` (0), `strengthWeak` (1), `strengthFair` (2), `strengthStrong` (3), `strengthVeryStrong` (4). The `strengthGood` key is removed from all 10 locale files — it has no mapping in the new 5-level system.

## UI Design

### Tab system

- Two tabs at the top of the page content area, inside `<Layout>`
- Uses `NeonTabs` from `components/ui/tabs.tsx` (same pattern as QR Code, Regex, JWT, Hashing, ASCII, Cron pages)
- Labels: translated `tabGenerator` / `tabChecker`
- State: `activeTab: 'generator' | 'checker'`, default `'generator'`
- `NeonTabs` uses `unmount={false}` by default, keeping both panels mounted

### Generator tab

Identical to current generator with these changes:

- Strength bar under password display uses async `analyzeStrength()` instead of synchronous `getPasswordLevelStyle()`
- **Loading state:** When password changes, the strength bar shows an empty `h-2` track with no label while the async analysis resolves. Once resolved, it renders the colored bar + dot + label.
- **Display change:** The "X bits" text is replaced by score display "X / 4" (matching the checker tab).
- New **"Check this password"** button appears in the action buttons row (next to Generate, Copy, Bookmark)
  - Style: `outline-purple`, same size as existing buttons
  - Icon: `ShieldCheck` from Lucide
  - On click: sets `checkerInput` to the plain-text password and switches `activeTab` to `'checker'`

### Checker tab — `Checker` component

Props: `{ initialInput: string }` — receives the pre-filled password from "Check this password" button.

Layout from top to bottom:

1. **Privacy notice** — Same cyan callout style as generator's `localGenerated` card
2. **Password input** — Large `StyledInput` with:
   - Show/hide toggle (`Eye`/`EyeOff` icon button)
   - Clear button when non-empty
3. **Strength bar** — Same `h-2` progress bar style as generator
   - Colored bar + colored dot + label text
   - Score displayed as "X / 4"
   - Loading state: empty bar track while analyzing
4. **Crack time display** — Prominent text below bar:
   - Format: "**{time}** to crack" (translated)
   - Large font for the time value, e.g., "**centuries**"
5. **Warning** — If zxcvbn returns a warning:
   - Orange/red callout card with warning icon
   - Translated warning text (via `t(result.warningKey)`, fallback to English)
6. **Suggestions** — If zxcvbn returns suggestions:
   - Bullet list of translated suggestion strings
   - Muted text color

**Debounce:** Analysis triggers 300ms after last keystroke. Pattern follows existing codebase convention (see `diff-page.tsx`): `useRef` for the timeout, `useEffect` with cleanup. React Compiler auto-memoizes — no manual `useCallback`/`useMemo`. Empty input = no analysis shown.

### Saved Passwords

- Stays below both tabs, always visible
- Each saved card's strength bar upgrades to zxcvbn score
- **Async handling:** Each saved card calls `analyzeStrength()` on mount via `useEffect`. While loading, the strength bar area shows an empty `h-2` track (no loading spinner — the bar is small enough that an empty track is unobtrusive). Once resolved, the bar renders with the zxcvbn score color and label.
- Cards render simultaneously (all call `analyzeStrength()` in parallel on mount), not sequentially.

### Info cards (replaced)

The current two info cards below the generator are replaced:

- **Remove:** "Entropy Verified" card (`entropyVerified` + `entropyVerifiedDesc`) — references Shannon entropy which no longer applies
- **Keep:** "Security Tip" card (`securityTip`) — general advice, still valid
- **Keep:** `localGenerated` card — privacy notice, still valid

## i18n

### New keys in `password.json`

All 10 locales (en, zh-CN, zh-TW, ja, ko, es, pt-BR, fr, de, ru):

```
tabGenerator              — "Password Generator"
tabChecker                — "Strength Checker"
checkThisPassword         — "Check this password"
enterPassword             — "Enter a password to check"
crackTimeLabel            — "to crack"
crackTimeInstant          — "Instant"
crackTimeSeconds          — "{n} seconds"
crackTimeMinutes          — "{n} minutes"
crackTimeHours            — "{n} hours"
crackTimeDays             — "{n} days"
crackTimeMonths           — "{n} months"
crackTimeYears            — "{n} years"
crackTimeCenturies        — "Centuries"
strengthInfoDesc          — "Password strength is analyzed by zxcvbn, an open-source library..."
```

### Keys to remove from all 10 locales

- `strengthGood` — no longer used in 5-level zxcvbn scale
- `entropyVerified` — card removed
- `entropyVerifiedDesc` — card removed

### zxcvbn warnings/suggestions

The `@zxcvbn-ts/language-en` package produces a fixed set of warning and suggestion strings. Each is mapped to a translation key via `libs/password/warnings-map.ts`:

```
warningTop10              — "This is a very common password"
warningTop100             — "This is a very common password"
warningCommon             — "This is similar to a commonly used password"
warningSimilar            — "..."
warningWordByItself       — "..."
warningNamesByThemselves  — "..."
warningDates              — "..."
warningRecentYears        — "..."
warningAssociatedYears    — "..."
warningPatterns           — "..."

suggestionUseFewWords     — "Add another word or two. Uncommon words are better."
suggestionNoNeedSymbols   — "..."
suggestionCapitalization  — "..."
suggestionAllUpper        — "..."
suggestionReversed        — "..."
```

(Exact keys will be enumerated from `@zxcvbn-ts/language-en` source during implementation.)

### SEO updates

**`tools.json` title/description** (English):

```json
{
  "password": {
    "title": "Secure Password Generator & Strength Checker",
    "shortTitle": "Password Generator",
    "description": "Generate cryptographically secure passwords and check password strength instantly. Free online tool with customizable options and real-time analysis."
  }
}
```

**`tools.json` searchTerms** (CJK locales — romanization derived from each locale's own `shortTitle`):

| Locale | shortTitle      | searchTerms                                            |
| ------ | --------------- | ------------------------------------------------------ |
| zh-CN  | 密码生成器      | `mimashengchengqi mmscq mimaqiangdu mimajiance anquan` |
| zh-TW  | 密碼產生器      | `mimachanshengqi mcscq mimaqiangdu mimajiance anquan`  |
| ja     | パスワード生成  | `pasuwaadoseisei pws tsuyosa kensa anzen`              |
| ko     | 비밀번호 생성기 | `bimilbeonhosaengseonggi bbhs gangdo jeomgeom anjeon`  |

Latin-script locales (en, es, pt-BR, fr, de, ru): no `searchTerms` needed (shortTitle is already in searchable script).

## Implementation Notes

### `calculateEntropy()` removal

`calculateEntropy()` is exported from `libs/password/main.ts` and used only by the local `getPasswordLevelStyle()` in `password-page.tsx`. Both are removed. No other code depends on `calculateEntropy()`.

The entropy info callout ("Each password's strength is calculated through Shannon entropy") is replaced by the `strengthInfoDesc` key referencing zxcvbn.

### Async strength — component pattern

Since `analyzeStrength()` is async (lazy-loaded on first call), components that display strength need to handle the Promise. Pattern:

1. Component renders password / receives password
2. `useEffect(() => { analyzeStrength(pwd).then(setResult) }, [pwd])`
3. While `result` is `null` (loading): render empty bar track
4. Once `result` resolves: render colored bar + label

This applies to: Generator strength bar, Checker strength bar, each Saved Password card.

### Debounce implementation

Follows existing codebase pattern from `diff-page.tsx`:

```typescript
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (!input) {
    setResult(null);
    return;
  }
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    analyzeStrength(input).then(setResult);
  }, 300);
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, [input]);
```

No `useCallback` or `useMemo` — React Compiler handles memoization automatically.

### Bundle size

`@zxcvbn-ts/core` + language packs ≈ 300-400KB total. Lazy loading ensures this is only fetched when a user triggers strength analysis (switches to Checker tab or generates a password). The initial page load is unaffected.

### Testing

Add `libs/password/__tests__/strength.test.ts`:

- Test `analyzeStrength()` with known passwords
- Verify score mapping for common passwords ("password" → 0), medium passwords ("correcthorsebatterystaple" → 4), etc.
- Verify warning/suggestion key mapping (not English strings)
- Verify `crackTimeUnit` and `crackTimeValue` fields
- Verify lazy loading (first call initializes, second call uses cache)

Add to `vitest.config.ts` include array:

```
"libs/password/**/*.test.ts",
```
