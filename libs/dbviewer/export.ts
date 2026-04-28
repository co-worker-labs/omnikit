import type { CellValue, ColumnMeta } from "./types";

const BOM = "\uFEFF";
const CRLF = "\r\n";

function csvField(v: CellValue): string {
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "bigint") return v.toString(10);
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (v instanceof Uint8Array) {
    let hex = "";
    for (let i = 0; i < v.length; i++) hex += v[i].toString(16).padStart(2, "0");
    return "0x" + hex;
  }
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCsv(columns: ColumnMeta[], rows: CellValue[][]): string {
  const head = columns.map((c) => csvField(c.name)).join(",");
  const body = rows.map((row) => row.map(csvField).join(",")).join(CRLF);
  return BOM + head + CRLF + (body.length ? body + CRLF : "");
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return typeof btoa === "function" ? btoa(bin) : Buffer.from(bytes).toString("base64");
}

function jsonReplacerCell(v: CellValue): unknown {
  if (v === null) return null;
  if (typeof v === "bigint") return v.toString(10);
  if (v instanceof Uint8Array) return { $blob: bytesToBase64(v) };
  if (typeof v === "number" && !Number.isFinite(v)) return null;
  return v;
}

export function toJson(columns: ColumnMeta[], rows: CellValue[][]): string {
  const out = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c, i) => {
      obj[c.name] = jsonReplacerCell(row[i] ?? null);
    });
    return obj;
  });
  return JSON.stringify(out, null, 2);
}
