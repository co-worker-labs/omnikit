const CJK_REGEX =
  /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
const CJK_ONLY_REGEX =
  /^[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+$/;
const TERMINAL_PUNCTUATION = /[.!?。！？]+/g;

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  cjkCharacters: number;
  sentences: number;
  paragraphs: number;
}

export function analyzeText(text: string): TextStats {
  if (text.length === 0) {
    return {
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      cjkCharacters: 0,
      sentences: 0,
      paragraphs: 0,
    };
  }

  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;

  const cjkMatches = text.match(CJK_REGEX);
  const cjkCharacters = cjkMatches ? cjkMatches.length : 0;

  const trimmed = text.trim();
  const words =
    trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter((t) => !CJK_ONLY_REGEX.test(t)).length;

  const sentences = (() => {
    const stripped = text.trim();
    if (stripped.length === 0) return 0;
    const replaced = stripped.replace(TERMINAL_PUNCTUATION, ".");
    const parts = replaced.split(".").filter((s) => s.trim().length > 0);
    return parts.length === 0 ? (stripped.length > 0 ? 1 : 0) : parts.length;
  })();

  const paragraphs = (() => {
    const stripped = text.trim();
    if (stripped.length === 0) return 0;
    return stripped.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  })();

  return {
    characters,
    charactersNoSpaces,
    words,
    cjkCharacters,
    sentences,
    paragraphs,
  };
}

export function calculateReadingTime(words: number, cjkChars: number, wpm: number): number {
  const total = words + cjkChars;
  if (total === 0) return 0;
  return (total / wpm) * 60;
}

export function calculateSpeakingTime(words: number, cjkChars: number, wpm: number): number {
  const total = words + cjkChars;
  if (total === 0) return 0;
  return (total / wpm) * 60;
}

export interface KeywordEntry {
  term: string;
  count: number;
  density: number;
}

export interface KeywordResult {
  words: KeywordEntry[];
  bigrams: KeywordEntry[];
}

export function extractKeywords(text: string, stopWords: Set<string>): KeywordResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { words: [], bigrams: [] };
  }

  const rawTokens = trimmed.toLowerCase().split(/\s+/);
  const tokens = rawTokens.filter((t) => t.length > 0);
  const totalWords = tokens.length;

  if (totalWords === 0) {
    return { words: [], bigrams: [] };
  }

  const contentWords = tokens.filter((t) => !stopWords.has(t));

  const wordFreq = new Map<string, number>();
  for (const w of contentWords) {
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  }

  const sortedWords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({
      term,
      count,
      density: (count / totalWords) * 100,
    }));

  const bigramFreq = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (stopWords.has(a) || stopWords.has(b)) continue;
    const bigram = `${a} ${b}`;
    bigramFreq.set(bigram, (bigramFreq.get(bigram) || 0) + 1);
  }

  const sortedBigrams = [...bigramFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({
      term,
      count,
      density: (count / totalWords) * 100,
    }));

  return { words: sortedWords, bigrams: sortedBigrams };
}

export interface TrackedKeyword {
  keyword: string;
  count: number;
  density: number;
}

export function trackKeywords(text: string, keywords: string[]): TrackedKeyword[] {
  if (keywords.length === 0) return [];

  const trimmed = text.trim();
  const words =
    trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter((t) => !CJK_ONLY_REGEX.test(t)).length;
  const cjkMatches = trimmed.match(CJK_REGEX);
  const cjkChars = cjkMatches ? cjkMatches.length : 0;
  const total = words + cjkChars;

  return keywords.map((keyword) => {
    if (trimmed.length === 0) {
      return { keyword, count: 0, density: 0 };
    }

    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    let count = 0;
    let pos = 0;
    while (true) {
      const idx = lowerText.indexOf(lowerKeyword, pos);
      if (idx === -1) break;
      count++;
      pos = idx + 1;
    }

    const density = total === 0 ? 0 : (count / total) * 100;
    return { keyword, count, density };
  });
}
