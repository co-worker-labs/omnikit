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

## Keyword Analysis

### Auto-Extracted Keywords

- Extract top 10 single words + top 10 bigrams (2-word phrases)
- Filter stop words (English + CJK function words)
- Show each keyword with count and density percentage (`count / (words + cjkCharacters) * 100`)
- Stop word lists curated in-file per language, no external dependencies

### Manual Keyword Tracking

- User inputs specific keywords to track
- Live count + density percentage for each tracked keyword
- Case-insensitive matching
- Add/remove keywords via UI

## UI Layout

Three zones, top to bottom:

### 1. Quick Stats Grid (always visible)

4 cards in a row: **Words** | **Characters** | **Reading Time** | **Speaking Time**.

- Each card: small label above, number in accent-cyan (`text-accent-cyan`)
- Updates live as user types

### 2. Textarea

Full-width `StyledTextarea`. Below the textarea: a subtle row of secondary metrics:
`Characters (no spaces): X · Sentences: X · Paragraphs: X · CJK Characters: X`

### 3. Tabbed Detail Section (`NeonTabs`)

Three tabs:

- **Overview** — WPM settings: two labeled number inputs side by side ("Reading speed: [200] WPM", "Speaking speed: [130] WPM"). Changing these recalculates reading/speaking times in the stats grid.

- **Keywords** — Auto-extracted keywords. Two sub-sections: "Top Words" (single) and "Top Phrases (2-word)". Each entry rendered as a styled tag with count. Max 10 per sub-section.

- **Custom Track** — `Input` + "Add" button to add keywords. Each tracked keyword shows as a row with live count + density. "X" button to remove.

## Architecture

### New Files

| File                                            | Purpose                                                     |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `app/[locale]/wordcounter/page.tsx`             | Route entry, SEO metadata                                   |
| `app/[locale]/wordcounter/wordcounter-page.tsx` | Client page component                                       |
| `libs/wordcounter/main.ts`                      | Pure functions: analyzeText, extractKeywords, trackKeywords |
| `libs/wordcounter/stop-words.ts`                | Stop word lists (English + CJK)                             |
| `public/locales/{locale}/wordcounter.json`      | Tool-specific i18n (10 locales)                             |

### Modified Files

| File                          | Change                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `libs/tools.ts`               | Add `{ key: "wordcounter", path: "/wordcounter", icon: Hash }` to `TOOLS`; add `"wordcounter"` to `"text"` category in `TOOL_CATEGORIES` |
| `public/locales/*/tools.json` | Add `wordcounter` entry with title, shortTitle, description, searchTerms (per locale rules)                                              |

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
  density: number; // percentage, e.g. 2.45
}

interface KeywordResult {
  words: KeywordEntry[]; // top 10
  bigrams: KeywordEntry[]; // top 10
}

interface TrackedKeyword {
  keyword: string;
  count: number;
  density: number;
}

function analyzeText(text: string): TextStats;
function extractKeywords(text: string, stopWords: string[]): KeywordResult;
function trackKeywords(text: string, keywords: string[]): TrackedKeyword[];
function calculateReadingTime(words: number, cjkChars: number, wpm: number): string;
function calculateSpeakingTime(words: number, cjkChars: number, wpm: number): string;
```

### Stop Words (`libs/wordcounter/stop-words.ts`)

- `ENGLISH_STOP_WORDS`: common English function words (the, a, an, is, are, was, etc.)
- `CJK_STOP_WORDS`: common Chinese/Japanese/Korean function words (的, 了, 是, 在, は, が, の, 은, 는, etc.)
- Exported as arrays of strings for easy consumption

## SEO

- Title: "Word Counter - Character Count, Reading Time, Keyword Density"
- Description: "Free online word counter. Count words, characters, sentences, paragraphs. Estimate reading and speaking time. Analyze keyword frequency and density for SEO. 100% client-side."
- Uses standard `generatePageMeta()` pattern
- `searchTerms` for CJK/Cyrillic locales per project conventions

### searchTerms by Locale

| Locale | searchTerms                                        |
| ------ | -------------------------------------------------- |
| en     | _(omitted — Latin script)_                         |
| zh-CN  | `zishutongji zstj guanjianci yuedushijian mimaodu` |
| zh-TW  | `zishutongji zstj guanjianci yuedushijian mimaodu` |
| ja     | `mojisukai joukyuujikan kagiwaado`                 |
| ko     | `geulsuja geulsuja dokseo sigan`                   |
| ru     | `schetchik slov vremya chteniya`                   |

## Testing (`libs/wordcounter/__tests__/main.test.ts`)

Vitest tests covering:

- **Word count:** empty string → 0, single word → 1, multiple spaces, leading/trailing whitespace
- **CJK:** pure CJK text, mixed English+CJK, CJK punctuation
- **Sentences/paragraphs:** various punctuation marks, multiple newlines, trailing punctuation
- **Reading/speaking time:** calculation accuracy, WPM adjustment, CJK contribution
- **Keyword extraction:** stop word filtering, bigram generation, density calculation, top-N limiting
- **Custom tracking:** case-insensitive matching, multiple occurrences, empty input

## Edge Cases

- Empty textarea → all stats show 0, no errors
- Very large text → pure string operations, no performance concerns
- Mixed scripts (English + Chinese in same paragraph) → both word and CJK counts populated
- CJK punctuation (。！？) recognized for sentence splitting
- Numbers and special characters handled correctly (not counted as words unless space-separated)
