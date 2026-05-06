import { describe, it, expect } from "vitest";
import { dedupLines, defaultOptions } from "../main";

describe("dedupLines", () => {
  it("returns empty output for empty input", () => {
    const result = dedupLines("", defaultOptions);
    expect(result.output).toBe("");
    expect(result.originalCount).toBe(1);
    expect(result.resultCount).toBe(0);
    expect(result.removedCount).toBe(1);
  });

  it("returns identical output when no duplicates exist", () => {
    const input = "apple\nbanana\ncherry";
    const result = dedupLines(input, defaultOptions);
    expect(result.output).toBe("apple\nbanana\ncherry");
    expect(result.originalCount).toBe(3);
    expect(result.resultCount).toBe(3);
    expect(result.removedCount).toBe(0);
  });

  it("removes exact duplicates keeping first occurrence", () => {
    const input = "apple\nbanana\napple\ncherry\nbanana";
    const result = dedupLines(input, defaultOptions);
    expect(result.output).toBe("apple\nbanana\ncherry");
    expect(result.originalCount).toBe(5);
    expect(result.resultCount).toBe(3);
    expect(result.removedCount).toBe(2);
  });

  it("is case insensitive when caseSensitive=false", () => {
    const input = "Hello\nhello\nHELLO";
    const result = dedupLines(input, { ...defaultOptions, caseSensitive: false });
    expect(result.output).toBe("Hello");
    expect(result.resultCount).toBe(1);
    expect(result.removedCount).toBe(2);
  });

  it("is case sensitive when caseSensitive=true", () => {
    const input = "Hello\nhello\nHELLO";
    const result = dedupLines(input, { ...defaultOptions, caseSensitive: true });
    expect(result.output).toBe("Hello\nhello\nHELLO");
    expect(result.resultCount).toBe(3);
  });

  it("trims whitespace for comparison when trimLines=true", () => {
    const input = "hello\n  hello  \nhello";
    const result = dedupLines(input, { ...defaultOptions, trimLines: true });
    expect(result.output).toBe("hello");
    expect(result.resultCount).toBe(1);
  });

  it("does not trim for comparison when trimLines=false", () => {
    const input = "hello\n  hello  ";
    const result = dedupLines(input, { ...defaultOptions, trimLines: false });
    expect(result.output).toBe("hello\n  hello  ");
    expect(result.resultCount).toBe(2);
  });

  it("trims output when trimLines=true", () => {
    const input = "  hello  \nhello";
    const result = dedupLines(input, { ...defaultOptions, trimLines: true });
    expect(result.output).toBe("hello");
  });

  it("removes empty lines when removeEmpty=true", () => {
    const input = "apple\n\nbanana\n  \ncherry";
    const result = dedupLines(input, { ...defaultOptions, removeEmpty: true });
    expect(result.output).toBe("apple\nbanana\ncherry");
    expect(result.originalCount).toBe(5);
    expect(result.resultCount).toBe(3);
  });

  it("keeps empty lines when removeEmpty=false", () => {
    const input = "apple\n\nbanana";
    const result = dedupLines(input, { ...defaultOptions, removeEmpty: false });
    expect(result.output).toBe("apple\n\nbanana");
    expect(result.resultCount).toBe(3);
  });

  it("normalizes \\r\\n line endings", () => {
    const input = "apple\r\nbanana\r\napple";
    const result = dedupLines(input, defaultOptions);
    expect(result.output).toBe("apple\nbanana");
  });

  it("normalizes \\r line endings", () => {
    const input = "apple\rbanana\rapple";
    const result = dedupLines(input, defaultOptions);
    expect(result.output).toBe("apple\nbanana");
  });

  it("handles mixed line endings", () => {
    const input = "a\r\nb\rc\na";
    const result = dedupLines(input, defaultOptions);
    expect(result.output).toBe("a\nb\nc");
  });

  it("preserves first-occurrence order", () => {
    const input = "cherry\napple\nbanana\napple\ncherry";
    const result = dedupLines(input, defaultOptions);
    expect(result.output).toBe("cherry\napple\nbanana");
  });

  it("handles trailing newline with removeEmpty=true", () => {
    const input = "apple\nbanana\n";
    const result = dedupLines(input, { ...defaultOptions, removeEmpty: true });
    expect(result.output).toBe("apple\nbanana");
    expect(result.originalCount).toBe(3);
    expect(result.resultCount).toBe(2);
  });

  it("handles trailing newline with removeEmpty=false", () => {
    const input = "apple\nbanana\n";
    const result = dedupLines(input, { ...defaultOptions, removeEmpty: false, trimLines: false });
    expect(result.output).toBe("apple\nbanana\n");
    expect(result.resultCount).toBe(3);
  });

  it("keeps all empty lines when removeEmpty=false even with multiple consecutive empty lines", () => {
    const input = "apple\n\n\nbanana";
    const result = dedupLines(input, { ...defaultOptions, removeEmpty: false, trimLines: false });
    expect(result.output).toBe("apple\n\n\nbanana");
    expect(result.resultCount).toBe(4);
    expect(result.removedCount).toBe(0);
  });

  it("deduplicates non-empty lines but preserves all empty lines when removeEmpty=false", () => {
    const input = "apple\n\napple\nbanana\n\nbanana";
    const result = dedupLines(input, { ...defaultOptions, removeEmpty: false, trimLines: false });
    expect(result.output).toBe("apple\n\nbanana\n");
    expect(result.resultCount).toBe(4);
    expect(result.removedCount).toBe(2);
  });
});
