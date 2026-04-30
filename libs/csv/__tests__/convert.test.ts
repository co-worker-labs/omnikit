import { describe, it, expect } from "vitest";
import { convert } from "../convert";

describe("convert", () => {
  it("converts JSON → CSV", () => {
    const json = JSON.stringify([
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ]);
    const result = convert(json, "json", "csv");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain('"name","age"');
    expect(result.output).toContain('"John"');
  });

  it("converts JSON → Markdown", () => {
    const json = JSON.stringify([{ name: "John", age: 30 }]);
    const result = convert(json, "json", "markdown");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain("| name");
    expect(result.output).toContain("| John");
  });

  it("converts CSV → JSON", () => {
    const csv = "name,age\nJohn,30";
    const result = convert(csv, "csv", "json");
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.output);
    expect(parsed[0].name).toBe("John");
    expect(parsed[0].age).toBe(30);
  });

  it("converts CSV → Markdown", () => {
    const csv = "name,age\nJohn,30";
    const result = convert(csv, "csv", "markdown");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain("| name");
    expect(result.output).toContain("| John");
  });

  it("converts Markdown → JSON", () => {
    const md = "| name | age |\n| --- | --- |\n| John | 30 |";
    const result = convert(md, "markdown", "json");
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.output);
    expect(parsed[0].name).toBe("John");
  });

  it("converts Markdown → CSV", () => {
    const md = "| name | age |\n| --- | --- |\n| John | 30 |";
    const result = convert(md, "markdown", "csv");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain("name");
    expect(result.output).toContain("John");
  });

  it("returns error for invalid JSON", () => {
    const result = convert("not valid json{{{", "json", "csv");
    expect(result.error).toBeTruthy();
  });

  it("returns error for invalid Markdown table", () => {
    const result = convert("no pipes here", "markdown", "json");
    expect(result.error).toBeTruthy();
  });

  it("returns error for malformed CSV", () => {
    const result = convert('name\n"unclosed', "csv", "json");
    expect(result.error).toBeTruthy();
  });

  it("handles empty input", () => {
    const result = convert("", "json", "csv");
    expect(result.output).toBe("");
    expect(result.error).toBeUndefined();
  });

  it("auto-wraps single JSON object into array", () => {
    const json = JSON.stringify({ name: "John", age: 30 });
    const result = convert(json, "json", "csv");
    expect(result.error).toBeUndefined();
    expect(result.output).toContain("John");
  });
});
