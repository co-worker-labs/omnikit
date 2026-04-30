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

  it("converts CSV → JSON", () => {
    const csv = "name,age\nJohn,30";
    const result = convert(csv, "csv", "json");
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.output);
    expect(parsed[0].name).toBe("John");
    expect(parsed[0].age).toBe(30);
  });

  it("returns error for invalid JSON", () => {
    const result = convert("not valid json{{{", "json", "csv");
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

  it("uses custom indent for JSON output", () => {
    const csv = "name,age\nJohn,30";
    const result = convert(csv, "csv", "json", { indent: 4 });
    expect(result.error).toBeUndefined();
    expect(result.output).toContain('    "name"');
  });

  it("uses indent 8 for JSON output", () => {
    const csv = "name,age\nJohn,30";
    const result = convert(csv, "csv", "json", { indent: 8 });
    expect(result.error).toBeUndefined();
    expect(result.output).toContain('        "name"');
  });

  it("passes custom delimiter for CSV output", () => {
    const json = JSON.stringify([{ a: 1, b: 2 }]);
    const result = convert(json, "json", "csv", { delimiter: "\t" });
    expect(result.error).toBeUndefined();
    expect(result.output).toContain('"a"\t"b"');
  });

  it("unflattens dot-notation keys when option is enabled", () => {
    const csv = "user.name,user.age\nJohn,30";
    const result = convert(csv, "csv", "json", { unflatten: true });
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.output);
    expect(parsed[0]).toEqual({ user: { name: "John", age: 30 } });
  });

  it("does not unflatten by default", () => {
    const csv = "user.name,user.age\nJohn,30";
    const result = convert(csv, "csv", "json");
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(result.output);
    expect(parsed[0]).toEqual({ "user.name": "John", "user.age": 30 });
  });
});
