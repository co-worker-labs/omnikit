import { describe, it, expect } from "vitest";
import { csvStringify } from "../csv-stringify";

describe("csvStringify", () => {
  it("converts simple object array to CSV with BOM and CRLF", () => {
    const input = [
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ];
    const result = csvStringify(input);
    expect(result).toContain("\uFEFF");
    expect(result).toContain("\r\n");
    expect(result).toBe('\uFEFF"name","age"\r\n"John","30"\r\n"Alice","25"\r\n');
  });

  it("escapes fields containing commas", () => {
    const input = [{ text: "hello, world" }];
    const result = csvStringify(input);
    expect(result).toContain('"hello, world"');
  });

  it("escapes fields containing double quotes", () => {
    const input = [{ text: 'say "hi"' }];
    const result = csvStringify(input);
    expect(result).toContain('"say ""hi"""');
  });

  it("escapes fields containing newlines", () => {
    const input = [{ text: "line1\nline2" }];
    const result = csvStringify(input);
    expect(result).toContain('"line1\nline2"');
  });

  it("handles null and undefined as empty string", () => {
    const input = [{ a: null, b: undefined }] as Record<string, unknown>[];
    const result = csvStringify(input);
    expect(result).toContain('"a","b"\r\n"",""');
  });

  it("converts booleans to true/false strings", () => {
    const input = [{ active: true, deleted: false }];
    const result = csvStringify(input);
    expect(result).toContain('"active","deleted"\r\n"true","false"');
  });

  it("handles inconsistent keys across objects (union of all keys)", () => {
    const input = [
      { a: 1, b: 2 },
      { a: 3, c: 4 },
    ];
    const result = csvStringify(input);
    expect(result).toContain('"a","b","c"');
    expect(result).toContain('"1","2",""');
    expect(result).toContain('"3","","4"');
  });

  it("handles empty array", () => {
    const result = csvStringify([]);
    expect(result).toBe("");
  });

  it("uses tab delimiter when specified", () => {
    const input = [
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ];
    const result = csvStringify(input, "\t");
    expect(result).toContain('"name"\t"age"');
    expect(result).toContain('"John"\t"30"');
  });

  it("uses semicolon delimiter when specified", () => {
    const input = [{ a: 1, b: 2 }];
    const result = csvStringify(input, ";");
    expect(result).toContain('"a";"b"');
    expect(result).toContain('"1";"2"');
  });

  it("uses pipe delimiter when specified", () => {
    const input = [{ x: "hello", y: "world" }];
    const result = csvStringify(input, "|");
    expect(result).toContain('"x"|"y"');
    expect(result).toContain('"hello"|"world"');
  });

  it("defaults to comma delimiter", () => {
    const input = [{ a: 1, b: 2 }];
    const result = csvStringify(input);
    expect(result).toContain('"a","b"');
    expect(result).toContain('"1","2"');
  });
});
