# Password Strength Checker — Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Route:** `/password` (existing, no new route)

## Summary

Add a password strength checker to the existing Password Generator page using `@zxcvbn-ts/core`. The page gets a tab toggle (Generator / Strength Checker) so users can either generate passwords or check arbitrary passwords. Both tabs share the same zxcvbn-based strength analysis. A "Check this password" button bridges the two tabs by sending a generated password to the checker.

## Architecture

### New files

- `libs/password/strength.ts` — Lazy-loaded wrapper around `@zxcvbn-ts/core`. Exports `analyzeStrength(password: string): Promise<StrengthResult>`. Dynamic-imports `@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en` on first call, caches the instance for subsequent calls.

### Modified files

- `app/[locale]/password/password-page.tsx` — Add tab toggle, extract current generator into a tab panel, add new `Checker` component
- `libs/password/main.ts` — Replace `getPasswordLevelStyle()` (entropy-only) with zxcvbn-based scoring
- `public/locales/*/password.json` — New translation keys for checker UI
- `public/locales/*/tools.json` — Updated title/description/searchTerms

### Data flow

```
PasswordPage
├── Tab toggle: Generator | Strength Checker
├── Generator tab
│   ├── Existing generator UI
│   ├── Strength bar → analyzeStrength(password)
│   └── "Check this password" button → sets checker input + switches tab
├── Checker tab
│   ├── Password input (show/hide toggle)
│   ├── Strength bar → analyzeStrength(password)
│   ├── Crack time display
│   ├── Warning callout
│   └── Suggestions list
└── Saved Passwords (below tabs, always visible)
    └── Strength bars → analyzeStrength(password)
```

### Dependencies

New npm packages:

- `@zxcvbn-ts/core`
- `@zxcvbn-ts/language-common`
- `@zxcvbn-ts/language-en`

## Strength Analysis Library

### `libs/password/strength.ts`

```typescript
interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  crackTimeDisplay: string;
  crackTimeSeconds: number;
  warning: string | null;
  suggestions: string[];
}
```

Exported function: `analyzeStrength(password: string): Promise<StrengthResult>`

**Lazy loading:** Uses dynamic `import()` on first call. Module-level cache variable holds the initialized zxcvbn instance. Subsequent calls are synchronous aside from the Promise wrapper.

**Crack time:** Uses zxcvbn-ts built-in time estimation. Formatted through i18n keys (`crackTimeSeconds`, `crackTimeHours`, etc.) with numeric interpolation via next-intl.

**Warning/suggestion translation:** zxcvbn-ts returns English strings from `@zxcvbn-ts/language-en`. We map each unique string to a translation key. Missing locale keys fall back to English.

### Score → visual mapping

Replaces the current 6-level entropy system. Aligns with zxcvbn's standard 0-4 scale:

| Score | Label key          | Color  | Bar Width |
| ----- | ------------------ | ------ | --------- |
| 0     | strengthVeryWeak   | red    | 20%       |
| 1     | strengthWeak       | red    | 40%       |
| 2     | strengthFair       | orange | 60%       |
| 3     | strengthStrong     | cyan   | 80%       |
| 4     | strengthVeryStrong | cyan   | 100%      |

The existing translation keys are reused where applicable: `strengthVeryWeak` (0), `strengthWeak` (1), `strengthFair` (2), `strengthStrong` (3), `strengthVeryStrong` (4). The `strengthGood` key becomes unused and can remain in locale files without harm.

## UI Design

### Tab system

- Two tabs at the top of the page content area, inside `<Layout>`
- Uses existing tab component pattern (NeonTabs or similar)
- Labels: translated `tabGenerator` / `tabChecker`
- State: `activeTab: 'generator' | 'checker'`, default `'generator'`

### Generator tab

Identical to current generator with these changes:

- Strength bar under password display uses `analyzeStrength()` instead of `getPasswordLevelStyle()`
- New **"Check this password"** button appears in the action buttons row (next to Generate, Copy, Bookmark)
  - Style: `outline-cyan` or `outline-purple`, same size as existing buttons
  - Icon: `ShieldCheck` from Lucide
  - On click: sets checker input to current password, switches `activeTab` to `'checker'`, triggers analysis

### Checker tab — `Checker` component

Layout from top to bottom:

1. **Privacy notice** — Same cyan callout as generator: "All analysis happens in your browser..."
2. **Password input** — Large `StyledInput` (or `StyledTextarea` single-line) with:
   - Show/hide toggle (`Eye`/`EyeOff` icon button)
   - Clear button when non-empty
3. **Strength bar** — Same `h-2` progress bar style as generator
   - Colored bar + colored dot + label text
   - Score displayed as "X / 4"
4. **Crack time display** — Prominent text below bar:
   - Format: "**{time}** to crack" (translated)
   - Large font for the time value, e.g., "**centuries**"
5. **Warning** — If zxcvbn returns a warning:
   - Orange/red callout card with warning icon
   - Translated warning text
6. **Suggestions** — If zxcvbn returns suggestions:
   - Bullet list of translated suggestion strings
   - Muted text color

**Debounce:** Analysis triggers 300ms after last keystroke. Empty input = no analysis shown.

### Saved Passwords

- Stays below both tabs, always visible
- Each saved card's strength bar upgrades to zxcvbn score
- Saved passwords are analyzed lazily (on render, not all at once)

## i18n

### New keys in `password.json`

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
checkerPrivacyNotice      — "All password analysis happens entirely in your browser..."
```

### zxcvbn warnings/suggestions

The `@zxcvbn-ts/language-en` package produces a fixed set of warning and suggestion strings. Each is mapped to a translation key:

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
warningPatters            — "..."

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

**`tools.json` searchTerms** (CJK locales):

| Locale | searchTerms                                            |
| ------ | ------------------------------------------------------ |
| zh-CN  | `mimashengchengqi mmscq mimaqiangdu mimajiance anquan` |
| zh-TW  | `mimashengchengqi mmscq mimaqiangdu mimajiance anquan` |
| ja     | `pasuwaadoseihei pws qiangdu kensa anzen`              |
| ko     | `bimilbeonhosaengseonggi bbhs qiangdu jeomgeom anjeon` |

Latin-script locales: no `searchTerms` needed (shortTitle is already searchable).

## Implementation Notes

### `calculateEntropy()` removal

The existing `calculateEntropy()` in `libs/password/main.ts` and `getPasswordLevelStyle()` in `password-page.tsx` are replaced by `analyzeStrength()`. The entropy info callout ("Each password's strength is calculated through Shannon entropy") should be updated or removed since strength is now zxcvbn-based.

### Bundle size

`@zxcvbn-ts/core` + language packs ≈ 300-400KB total. Lazy loading ensures this is only fetched when a user triggers strength analysis (switches to Checker tab or generates a password). The initial page load is unaffected.

### Testing

Add `__tests__/strength.test.ts` in `libs/password/`:

- Test `analyzeStrength()` with known passwords
- Verify score mapping for common passwords ("password" → 0), medium passwords ("correcthorsebatterystaple" → 4), etc.
- Verify warning/suggestion presence
- Verify crack time formatting

Add to vitest config scope: `password`.
