# Word Counter + Reading Time Estimator — Design Spec

**Date:** 2026-05-05
**Route:** `/wordcounter`
**Category:** `text`

## Overview

A browser-based word counter and text analysis tool. All computation runs client-side. Primary use cases: content creation, SEO keyword analysis, reading/speaking time estimation.

## Metrics

| Metric                 | Description                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Words                  | Space-separated word count (English-style)                                                                                                        |
| CJK Characters         | Count of CJK ideographs (U+4E00–U+9FFF, U+3400–U+4DBF, U+F900–U+FAFF), Hiragana (U+3040–U+309F), Katakana (U+30A0–U+30FF), Hangul (U+AC00–U+D7AF) |
| Characters             | Total characters including spaces                                                                                                                 |
| Characters (no spaces) | Characters excluding whitespace                                                                                                                   |
| Sentences              | Split on terminal punctuation (`.!?。！？`)                                                                                                       |
| Paragraphs             | Split on double newlines                                                                                                                          |
| Reading Time           | Based on (words + CJK chars) / reading WPM                                                                                                        |
| Speaking Time          | Based on (words + CJK chars) / speaking WPM                                                                                                       |

For reading/speaking time, CJK characters count as 1 word equivalent each (standard approach). The UI shows "Words" and "CJK Characters" as separate metrics.

### Reading/Speaking Time Display Format

- `>= 60 min`: `"Xh Xm"` (e.g., `"1h 23m"`)
- `>= 1 min`: `"X min X sec"` (e.g., `"3 min 45 sec"`)
- `< 1 min`: `"X sec"` (e.g., `"30 sec"`)
- `0`: `"< 1 sec"`

## Keyword Analysis

### Scope

Keyword extraction (auto-extracted + bigrams) applies only to **space-delimited text** (English, European languages, etc.). CJK text has no word boundaries, so keyword extraction is not applicable to pure CJK content.

For mixed text (English + CJK), only the space-delimited words participate in keyword extraction. CJK characters are excluded from the keyword extraction pipeline.

### Auto-Extracted Keywords

- Extract top 10 single words + top 10 bigrams (2-word phrases) from space-delimited words only
- Filter stop words (English function words)
- Show each keyword with count and density percentage (`count / words * 100`)
- Density denominator is `words` (not `words + cjkCharacters`) since keywords come from space-delimited text only
- If `words === 0`, density shows `0`
- Debounced: keywords update 300ms after the last keystroke. Stats (word count, character count, etc.) update immediately.
- Stop word list curated in-file, no external dependencies

### Manual Keyword Tracking

- User inputs specific keywords to track
- Live count + density percentage for each tracked keyword
- Case-insensitive matching for Latin script; exact matching for CJK
- Density: `count / (words + cjkCharacters) * 100`; returns `0` if total is `0`
- Add/remove keywords via UI
- Also debounced at 300ms

## UI Layout

Three zones, top to bottom, wrapped in `<Layout>` with the standard privacy notice banner (`tc("alert.notTransferred")`).

### 1. Quick Stats Grid (always visible)

4 cards in a row using `Card` component: **Words** | **Characters** | **Reading Time** | **Speaking Time**.

- Each card: small label above, number in accent-cyan (`text-accent-cyan`)
- Updates live as user types

### 2. Textarea

Full-width `StyledTextarea`. Below the textarea: a subtle row of secondary metrics:
`Characters (no spaces): X · Sentences: X · Paragraphs: X · CJK Characters: X`

### 3. Tabbed Detail Section (`NeonTabs`)

Three tabs:

- **Overview** — WPM settings: two labeled number inputs side by side ("Reading speed: [200] WPM", "Speaking speed: [130] WPM"). Changing these recalculates reading/speaking times in the stats grid.

- **Keywords** — Auto-extracted keywords. Two sub-sections: "Top Words" (single) and "Top Phrases (2-word)". Each entry rendered as a styled tag with count. Max 10 per sub-section. Shows a hint when no space-delimited words are found (e.g., pure CJK text).

- **Custom Track** — `Input` + "Add" button to add keywords. Each tracked keyword shows as a row with live count + density. "X" button to remove.

## Architecture

### New Files

| File                                            | Purpose                                                     |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `app/[locale]/wordcounter/page.tsx`             | Route entry, SEO metadata                                   |
| `app/[locale]/wordcounter/wordcounter-page.tsx` | Client page component                                       |
| `libs/wordcounter/main.ts`                      | Pure functions: analyzeText, extractKeywords, trackKeywords |
| `libs/wordcounter/stop-words.ts`                | Stop word list (English)                                    |
| `public/locales/{locale}/wordcounter.json`      | Tool-specific i18n (10 locales)                             |

### Modified Files

| File                          | Change                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `libs/tools.ts`               | Add `{ key: "wordcounter", path: "/wordcounter", icon: AlignLeft }` to `TOOLS`; add `"wordcounter"` to `"text"` category in `TOOL_CATEGORIES` |
| `public/locales/*/tools.json` | Add `wordcounter` entry with title, shortTitle, description, searchTerms (per locale rules)                                                   |
| `vitest.config.ts`            | Add `"libs/wordcounter/**/*.test.ts"` to `include` array                                                                                      |

### Business Logic API (`libs/wordcounter/main.ts`)

```ts
interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  cjkCharacters: number;
  sentences: number;
  paragraphs: number;
}

interface KeywordEntry {
  term: string;
  count: number;
  density: number; // percentage, e.g. 2.45; 0 if total words === 0
}

interface KeywordResult {
  words: KeywordEntry[]; // top 10
  bigrams: KeywordEntry[]; // top 10
}

interface TrackedKeyword {
  keyword: string;
  count: number;
  density: number; // percentage; 0 if total === 0
}

function analyzeText(text: string): TextStats;
function extractKeywords(text: string, stopWords: string[]): KeywordResult;
function trackKeywords(text: string, keywords: string[]): TrackedKeyword[];
function calculateReadingTime(words: number, cjkChars: number, wpm: number): string;
function calculateSpeakingTime(words: number, cjkChars: number, wpm: number): string;
```

### Stop Words (`libs/wordcounter/stop-words.ts`)

- `ENGLISH_STOP_WORDS`: ~120 common English function words (the, a, an, is, are, was, were, be, been, being, have, has, had, do, does, did, will, would, shall, should, may, might, must, can, could, of, in, to, for, with, on, at, from, by, about, as, into, through, during, before, after, above, below, between, under, over, and, but, or, nor, not, so, yet, both, either, neither, each, every, all, any, few, more, most, other, some, such, no, only, own, same, than, too, very, just, because, if, when, where, how, what, which, who, whom, this, that, these, those, I, you, he, she, it, we, they, me, him, her, us, them, my, your, his, its, our, their, etc.)
- Exported as a `Set<string>` for O(1) lookup
- No CJK stop words needed — keyword extraction is space-delimited only

### Tool-Specific i18n Keys (`public/locales/{locale}/wordcounter.json`)

```json
{
  "tabOverview": "Overview",
  "tabKeywords": "Keywords",
  "tabCustomTrack": "Custom Track",
  "words": "Words",
  "characters": "Characters",
  "charactersNoSpaces": "Characters (no spaces)",
  "sentences": "Sentences",
  "paragraphs": "Paragraphs",
  "cjkCharacters": "CJK Characters",
  "readingTime": "Reading Time",
  "speakingTime": "Speaking Time",
  "readingSpeed": "Reading speed",
  "speakingSpeed": "Speaking speed",
  "wpm": "WPM",
  "topWords": "Top Words",
  "topPhrases": "Top Phrases (2-word)",
  "addKeyword": "Add keyword",
  "add": "Add",
  "keyword": "Keyword",
  "count": "Count",
  "density": "Density",
  "noKeywords": "No space-delimited words found for keyword analysis.",
  "noTrackedKeywords": "Add keywords above to start tracking."
}
```

## SEO

- Title: "Word Counter - Character Count, Reading Time, Keyword Density"
- Description: "Free online word counter. Count words, characters, sentences, paragraphs. Estimate reading and speaking time. Analyze keyword frequency and density for SEO. 100% client-side."
- Uses standard `generatePageMeta()` pattern
- `searchTerms` for CJK/Cyrillic locales per project conventions

### searchTerms by Locale

| Locale | searchTerms                                             |
| ------ | ------------------------------------------------------- |
| en     | _(omitted — Latin script)_                              |
| zh-CN  | `zishutongji zstj guanjianci yuedushijian guanjianmidu` |
| zh-TW  | `zishutongji zstj guanjianci yuedushijian guanjianmidu` |
| ja     | `mojisukazyou dokushojikan kiwaado`                     |
| ko     | `geulsujatonggye gstj teukseongeo dokseo sigan`         |
| ru     | `schetchikslov sch slov vremya chteniya plotnost`       |

**Notes:**

- `zh-TW` searchTerms to be re-derived from the actual zh-TW shortTitle at implementation time.
- `ja`: `mojisukazyou` (文字数+), `dokushojikan` (読書時間), `kiwaado` (キーワード)
- `ko`: `geulsujatonggye` (글자수통계), `gstj` (initials), `teukseongeo` (특수어), `dokseo sigan` (독서 시간)
- `ru`: `schetchikslov` (счётчик слов full), `sch` (initials), `slov` (words), `vremya chteniya` (время чтения), `plotnost` (плотность — density, keyword-specific)

## Testing (`libs/wordcounter/__tests__/main.test.ts`)

Vitest tests covering:

- **Word count:** empty string → 0, single word → 1, multiple spaces, leading/trailing whitespace
- **CJK:** pure CJK text, mixed English+CJK, CJK punctuation
- **Sentences/paragraphs:** various punctuation marks, multiple newlines, trailing punctuation
- **Reading/speaking time:** calculation accuracy, WPM adjustment, CJK contribution, display format (seconds, minutes, hours thresholds)
- **Keyword extraction:** stop word filtering, bigram generation, density calculation, top-N limiting, empty text → empty result, division by zero guard
- **Custom tracking:** case-insensitive matching for Latin, exact matching for CJK, multiple occurrences, empty input, division by zero guard

## Edge Cases

- Empty textarea → all stats show 0, no errors, no division by zero
- Very large text → keyword extraction debounced at 300ms; stats update immediately
- Mixed scripts (English + Chinese in same paragraph) → both word and CJK counts populated; keywords extracted from space-delimited portion only
- CJK punctuation (。！？) recognized for sentence splitting
- Numbers and special characters handled correctly (not counted as words unless space-separated)
- Pure CJK text → keyword extraction returns empty results with a hint message
