import { describe, it, expect } from "vitest";
import { toCsv, toJson } from "../export";
import type { CellValue, ColumnMeta } from "../types";

const cols = (...names: string[]): ColumnMeta[] =>
  names.map((name) => ({ name, declaredType: null }));

describe("toCsv", () => {
  it("emits UTF-8 BOM, header line, CRLF line endings", () => {
    const csv = toCsv(cols("a", "b"), [
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const noBom = csv.slice(1);
    expect(noBom).toBe("a,b\r\n1,2\r\n3,4\r\n");
  });

  it("quotes fields containing commas, quotes, CR, LF", () => {
    const csv = toCsv(cols("a"), [["a,b"], ['he said "hi"'], ["line1\nline2"], ["cr\rfix"]]);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[1]).toBe('"a,b"');
    expect(lines[2]).toBe('"he said ""hi"""');
    expect(lines[3]).toBe('"line1\nline2"');
    expect(lines[4]).toBe('"cr\rfix"');
  });

  it("renders NULL as empty field", () => {
    const csv = toCsv(cols("a", "b"), [[null, "x"]]);
    expect(csv.slice(1)).toBe("a,b\r\n,x\r\n");
  });

  it("renders BLOB as 0x{hex}", () => {
    const blob = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const csv = toCsv(cols("a"), [[blob as unknown as CellValue]]);
    expect(csv.slice(1)).toBe("a\r\n0xdeadbeef\r\n");
  });

  it("renders BigInt as decimal string", () => {
    const big = 9007199254740993n;
    const csv = toCsv(cols("a"), [[big]]);
    expect(csv.slice(1)).toBe("a\r\n9007199254740993\r\n");
  });

  it("renders booleans as 0/1 (sqlite convention)", () => {
    const csv = toCsv(cols("a"), [[true], [false]]);
    expect(csv.slice(1)).toBe("a\r\n1\r\n0\r\n");
  });

  it("does not quote a JSON-shaped TEXT field unless it has a delimiter", () => {
    const csv = toCsv(cols("a"), [['{"k":1}']]);
    expect(csv.slice(1)).toBe('a\r\n"{""k"":1}"\r\n');
  });
});

describe("toJson", () => {
  it("emits an array of objects keyed by column name", () => {
    const out = toJson(cols("a", "b"), [
      [1, "x"],
      [2, "y"],
    ]);
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { a: 1, b: "x" },
      { a: 2, b: "y" },
    ]);
  });

  it("renders NULL as null", () => {
    const out = toJson(cols("a"), [[null]]);
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([{ a: null }]);
  });

  it("renders BLOB as { $blob: <base64> }", () => {
    const blob = new Uint8Array([1, 2, 3, 4, 5]);
    const out = toJson(cols("b"), [
      [blob as unknown as Parameters<typeof toJson>[1][number][number]],
    ]);
    const parsed = JSON.parse(out);
    expect(parsed[0].b).toEqual({ $blob: "AQIDBAU=" });
  });

  it("renders BigInt as decimal string", () => {
    const out = toJson(cols("n"), [[9007199254740993n]]);
    const parsed = JSON.parse(out);
    expect(parsed[0].n).toBe("9007199254740993");
  });

  it("preserves boolean values", () => {
    const out = toJson(cols("a"), [[true], [false]]);
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([{ a: true }, { a: false }]);
  });
});
