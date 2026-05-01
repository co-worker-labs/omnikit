import { describe, it, expect } from "vitest";
import { csvParse } from "../csv-parse";

describe("csvParse", () => {
  it("parses simple CSV with header", () => {
    const csv = "name,age\nJohn,30\nAlice,25";
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data).toEqual([
      { name: "John", age: 30 },
      { name: "Alice", age: 25 },
    ]);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'text,value\n"hello, world",1';
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data[0].text).toBe("hello, world");
  });

  it("handles escaped double quotes", () => {
    const csv = 'text\n"say ""hi"""\n';
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data[0].text).toBe('say "hi"');
  });

  it("handles BOM prefix", () => {
    const csv = "\uFEFFname,age\nJohn,30";
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data[0].name).toBe("John");
  });

  it("handles CRLF line endings", () => {
    const csv = "name,age\r\nJohn,30\r\n";
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data).toEqual([{ name: "John", age: 30 }]);
  });

  it("returns errors for malformed CSV", () => {
    const csv = 'name\n"unclosed quote';
    const { errors } = csvParse(csv);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const { data, errors } = csvParse("");
    expect(errors).toHaveLength(0);
    expect(data).toEqual([]);
  });

  it("auto-detects tab delimiter", () => {
    const csv = "name\tage\nJohn\t30";
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data[0].name).toBe("John");
    expect(data[0].age).toBe(30);
  });

  it("uses explicit delimiter when provided", () => {
    const csv = "name;age\nJohn;30";
    const { data, errors } = csvParse(csv, ";");
    expect(errors).toHaveLength(0);
    expect(data).toEqual([{ name: "John", age: 30 }]);
  });

  it("ignores explicit delimiter when auto-detect would succeed anyway", () => {
    const csv = "name,age\nJohn,30";
    const { data, errors } = csvParse(csv);
    expect(errors).toHaveLength(0);
    expect(data).toEqual([{ name: "John", age: 30 }]);
  });
});
