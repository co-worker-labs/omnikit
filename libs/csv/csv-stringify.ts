import { flatten } from "./flatten";

const BOM = "\uFEFF";
const CRLF = "\r\n";

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "boolean") return value ? '"true"' : '"false"';
  const s = String(value);
  return '"' + s.replace(/"/g, '""') + '"';
}

export function csvStringify(data: Record<string, unknown>[], delimiter: string = ","): string {
  if (data.length === 0) return "";

  const flat = data.map((obj) => flatten(obj));

  const keySet = new Set<string>();
  const keys: string[] = [];
  for (const obj of flat) {
    for (const key of Object.keys(obj)) {
      if (!keySet.has(key)) {
        keySet.add(key);
        keys.push(key);
      }
    }
  }

  const header = keys.map((k) => escapeField(k)).join(delimiter);
  const rows = flat.map((obj) => keys.map((k) => escapeField(obj[k])).join(delimiter));

  return BOM + header + CRLF + rows.map((r) => r + CRLF).join("");
}
