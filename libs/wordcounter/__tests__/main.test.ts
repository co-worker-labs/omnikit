import { describe, it, expect } from "vitest";
import {
  analyzeText,
  calculateReadingTime,
  calculateSpeakingTime,
  extractKeywords,
  trackKeywords,
} from "../main";
import { ENGLISH_STOP_WORDS } from "../stop-words";

describe("analyzeText", () => {
  it("returns zeros for empty string", () => {
    const stats = analyzeText("");
    expect(stats).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      cjkCharacters: 0,
      sentences: 0,
      paragraphs: 0,
    });
  });

  it("counts words split by spaces", () => {
    expect(analyzeText("hello world").words).toBe(2);
    expect(analyzeText("one two three four").words).toBe(4);
  });

  it("counts a single word as 1", () => {
    expect(analyzeText("hello").words).toBe(1);
  });

  it("handles multiple spaces between words", () => {
    expect(analyzeText("hello   world").words).toBe(2);
  });

  it("handles leading and trailing whitespace", () => {
    expect(analyzeText("  hello world  ").words).toBe(2);
  });

  it("counts total characters including spaces", () => {
    expect(analyzeText("hello world").characters).toBe(11);
  });

  it("counts characters excluding spaces", () => {
    expect(analyzeText("hello world").charactersNoSpaces).toBe(10);
  });

  it("counts CJK ideographs", () => {
    expect(analyzeText("你好世界").cjkCharacters).toBe(4);
  });

  it("counts Hiragana and Katakana", () => {
    expect(analyzeText("こんにちは").cjkCharacters).toBe(5);
    expect(analyzeText("コンニチハ").cjkCharacters).toBe(5);
  });

  it("counts Hangul", () => {
    expect(analyzeText("안녕하세요").cjkCharacters).toBe(5);
  });

  it("counts words and CJK separately in mixed text", () => {
    const stats = analyzeText("Hello 你好 World 世界");
    expect(stats.words).toBe(2);
    expect(stats.cjkCharacters).toBe(4);
  });

  it("splits sentences on terminal punctuation", () => {
    expect(analyzeText("Hello. World! How?").sentences).toBe(3);
    expect(analyzeText("First sentence. Second sentence.").sentences).toBe(2);
  });

  it("splits sentences on CJK punctuation", () => {
    expect(analyzeText("你好。世界！怎么？").sentences).toBe(3);
  });

  it("counts empty trailing punctuation as 0 sentences", () => {
    expect(analyzeText("").sentences).toBe(0);
  });

  it("counts single sentence without trailing punctuation as 1", () => {
    expect(analyzeText("Hello world").sentences).toBe(1);
  });

  it("splits paragraphs on double newlines", () => {
    expect(analyzeText("Para 1\n\nPara 2\n\nPara 3").paragraphs).toBe(3);
  });

  it("counts single block as 1 paragraph", () => {
    expect(analyzeText("Single paragraph").paragraphs).toBe(1);
  });

  it("counts empty string as 0 paragraphs", () => {
    expect(analyzeText("").paragraphs).toBe(0);
  });

  it("handles mixed English + CJK in one paragraph", () => {
    const stats = analyzeText("This is 中文 mixed text.");
    expect(stats.words).toBe(4);
    expect(stats.cjkCharacters).toBe(2);
    expect(stats.sentences).toBe(1);
    expect(stats.paragraphs).toBe(1);
  });
});

describe("calculateReadingTime", () => {
  it("returns 0 for 0 total", () => {
    expect(calculateReadingTime(0, 0, 200)).toBe(0);
  });

  it("returns seconds for under 1 minute", () => {
    expect(calculateReadingTime(50, 0, 200)).toBe(15);
    expect(calculateReadingTime(100, 0, 200)).toBe(30);
  });

  it("returns seconds for over 1 minute", () => {
    expect(calculateReadingTime(400, 0, 200)).toBe(120);
    expect(calculateReadingTime(450, 0, 200)).toBe(135);
  });

  it("returns seconds for 60+ minutes", () => {
    expect(calculateReadingTime(12000, 0, 200)).toBe(3600);
    expect(calculateReadingTime(15000, 0, 200)).toBe(4500);
  });

  it("adds CJK chars to word count", () => {
    expect(calculateReadingTime(100, 100, 200)).toBe(60);
  });

  it("respects custom WPM", () => {
    expect(calculateReadingTime(130, 0, 130)).toBe(60);
  });
});

describe("calculateSpeakingTime", () => {
  it("returns 0 for 0 total", () => {
    expect(calculateSpeakingTime(0, 0, 130)).toBe(0);
  });

  it("uses speaking WPM default of 130", () => {
    expect(calculateSpeakingTime(130, 0, 130)).toBe(60);
  });
});

describe("extractKeywords", () => {
  it("returns empty arrays for empty text", () => {
    const result = extractKeywords("", ENGLISH_STOP_WORDS);
    expect(result.words).toEqual([]);
    expect(result.bigrams).toEqual([]);
  });

  it("filters stop words", () => {
    const result = extractKeywords("the quick brown fox", ENGLISH_STOP_WORDS);
    const terms = result.words.map((w) => w.term);
    expect(terms).not.toContain("the");
    expect(terms).toContain("quick");
  });

  it("limits to top 10 words", () => {
    const words = Array.from({ length: 15 }, (_, i) => `word${i}`);
    const repeated = words
      .map((w, i) =>
        Array(i + 1)
          .fill(w)
          .join(" ")
      )
      .join(" ");
    const result = extractKeywords(repeated, new Set());
    expect(result.words.length).toBeLessThanOrEqual(10);
  });

  it("limits to top 10 bigrams", () => {
    const bigrams = Array.from({ length: 15 }, (_, i) => `alpha${i} beta${i}`);
    const text = bigrams.join(" ");
    const result = extractKeywords(text, new Set());
    expect(result.bigrams.length).toBeLessThanOrEqual(10);
  });

  it("calculates density as percentage of total words", () => {
    const result = extractKeywords("apple apple orange", ENGLISH_STOP_WORDS);
    const apple = result.words.find((w) => w.term === "apple");
    expect(apple).toBeDefined();
    expect(apple!.count).toBe(2);
    expect(apple!.density).toBeCloseTo(66.67, 1);
  });

  it("returns 0 density when no words", () => {
    const result = extractKeywords("", ENGLISH_STOP_WORDS);
    expect(result.words).toEqual([]);
  });

  it("generates bigrams from consecutive words", () => {
    const result = extractKeywords("quick brown fox jumps", ENGLISH_STOP_WORDS);
    const bigramTerms = result.bigrams.map((b) => b.term);
    expect(bigramTerms).toContain("quick brown");
    expect(bigramTerms).toContain("brown fox");
    expect(bigramTerms).toContain("fox jumps");
  });

  it("filters bigrams containing stop words", () => {
    const result = extractKeywords("the quick brown fox", ENGLISH_STOP_WORDS);
    const bigramTerms = result.bigrams.map((b) => b.term);
    expect(bigramTerms).not.toContain("the quick");
  });

  it("sorts words by count descending", () => {
    const result = extractKeywords("orange apple apple orange orange", ENGLISH_STOP_WORDS);
    expect(result.words[0].term).toBe("orange");
    expect(result.words[0].count).toBe(3);
  });
});

describe("trackKeywords", () => {
  it("returns empty array for no keywords", () => {
    expect(trackKeywords("some text", [])).toEqual([]);
  });

  it("counts keyword occurrences", () => {
    const results = trackKeywords("apple orange apple", ["apple"]);
    expect(results[0].count).toBe(2);
  });

  it("matches case-insensitively for Latin script", () => {
    const results = trackKeywords("Apple APPLE apple", ["apple"]);
    expect(results[0].count).toBe(3);
  });

  it("matches CJK exactly (case does not apply)", () => {
    const results = trackKeywords("你好世界你好", ["你好"]);
    expect(results[0].count).toBe(2);
  });

  it("calculates density correctly", () => {
    const results = trackKeywords("apple orange apple", ["apple"]);
    expect(results[0].density).toBeCloseTo(66.67, 1);
  });

  it("returns 0 density for empty text", () => {
    const results = trackKeywords("", ["apple"]);
    expect(results[0].count).toBe(0);
    expect(results[0].density).toBe(0);
  });

  it("tracks multiple keywords independently", () => {
    const results = trackKeywords("apple orange banana", ["apple", "orange", "grape"]);
    expect(results).toHaveLength(3);
    expect(results.find((r) => r.keyword === "apple")!.count).toBe(1);
    expect(results.find((r) => r.keyword === "grape")!.count).toBe(0);
  });
});
