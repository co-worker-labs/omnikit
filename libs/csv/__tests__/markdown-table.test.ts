import { describe, it, expect } from "vitest";
import { markdownTableStringify, markdownTableParse } from "../markdown-table";

describe("markdownTableStringify", () => {
  it("converts object array to aligned markdown table", () => {
    const input = [
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ];
    const result = markdownTableStringify(input);
    expect(result).toContain("| name  | age |");
    expect(result).toContain("| ----- | --- |");
    expect(result).toContain("| John  | 30  |");
    expect(result).toContain("| Alice | 25  |");
  });

  it("handles boolean and null values", () => {
    const input = [{ active: true, note: null }];
    const result = markdownTableStringify(input);
    expect(result).toContain("true");
    const lines = result.split("\n");
    const dataRow = lines[2]; // Skip header and separator
    expect(dataRow).toMatch(/\|\s*true\s*\|\s*\|/);
  });

  it("handles empty array", () => {
    expect(markdownTableStringify([])).toBe("");
  });
});

describe("markdownTableParse", () => {
  it("parses standard markdown table to object array", () => {
    const md = `| name  | age |
| ----- | --- |
| John  | 30  |
| Alice | 25  |`;
    const result = markdownTableParse(md);
    expect(result.data).toEqual([
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ]);
    expect(result.errors).toHaveLength(0);
  });

  it("auto-types numeric and boolean values", () => {
    const md = `| active | count |
| ------ | ----- |
| true   | 42    |
| false  | 0     |`;
    const result = markdownTableParse(md);
    expect(result.data[0].active).toBe(true);
    expect(result.data[0].count).toBe(42);
    expect(result.data[1].active).toBe(false);
  });

  it("returns error for input with no pipe delimiters", () => {
    const result = markdownTableParse("just plain text");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.data).toEqual([]);
  });

  it("handles tables without outer pipes", () => {
    const md = `name | age
----- | ---
John  | 30`;
    const result = markdownTableParse(md);
    expect(result.data).toEqual([{ name: "John", age: 30 }]);
  });

  it("handles empty input", () => {
    const result = markdownTableParse("");
    expect(result.data).toEqual([]);
    expect(result.errors).toHaveLength(0);
  });
});
