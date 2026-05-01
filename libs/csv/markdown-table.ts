import { flatten } from "./flatten";

export interface MarkdownParseResult {
  data: Record<string, unknown>[];
  errors: string[];
  alignments?: ColumnAlignment[];
}

export type ColumnAlignment = "left" | "center" | "right" | "none";

export interface MarkdownStringifyOptions {
  alignment?: ColumnAlignment[];
}

const SEPARATOR_RE = /^\s*\|?\s*[-:]+[-|\s:]*\s*\|?\s*$/;

/**
 * Auto-type a cell value: numeric strings → number, "true"/"false" → boolean.
 */
function autoType(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== "") return num;
  return trimmed;
}

function parseLine(line: string): string[] {
  let cells = line.split("|").map((c) => c.trim());
  if (cells.length > 0 && cells[0] === "") cells = cells.slice(1);
  if (cells.length > 0 && cells[cells.length - 1] === "") cells = cells.slice(0, -1);
  return cells;
}

function detectAlignment(cell: string): ColumnAlignment {
  const trimmed = cell.trim();
  const hasLeftColon = trimmed.startsWith(":");
  const hasRightColon = trimmed.endsWith(":");
  if (hasLeftColon && hasRightColon) return "center";
  if (hasRightColon) return "right";
  if (hasLeftColon) return "left";
  return "none";
}

/**
 * Parse a Markdown Table string into a JSON object array.
 */
export function markdownTableParse(input: string): MarkdownParseResult {
  if (!input.trim()) return { data: [], errors: [] };

  const lines = input.split("\n");
  const tableLines = lines.filter((l) => l.includes("|"));

  if (tableLines.length === 0) {
    return { data: [], errors: ["Cannot detect Markdown table format"] };
  }

  let headerLine: string | null = null;
  const dataLines: string[] = [];
  let headerFound = false;
  let separatorLine: string | null = null;

  for (const line of tableLines) {
    if (!headerFound) {
      if (SEPARATOR_RE.test(line)) continue;
      headerLine = line;
      headerFound = true;
    } else if (!separatorLine) {
      if (!SEPARATOR_RE.test(line)) {
        continue;
      }
      separatorLine = line;
    } else {
      if (SEPARATOR_RE.test(line)) continue;
      dataLines.push(line);
    }
  }

  if (!headerLine) {
    return { data: [], errors: ["Cannot detect Markdown table format"] };
  }

  const headers = parseLine(headerLine);
  const data: Record<string, unknown>[] = [];

  for (const dl of dataLines) {
    const cells = parseLine(dl);
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = autoType(cells[i] ?? "");
    }
    data.push(obj);
  }

  let alignments: ColumnAlignment[] | undefined;
  if (separatorLine) {
    const sepCells = parseLine(separatorLine);
    alignments = sepCells.map((cell) => detectAlignment(cell));
  }

  return { data, errors: [], alignments };
}

/**
 * Convert a JSON object array to a Markdown Table string.
 * Columns are aligned with padding to the widest value.
 */
export function markdownTableStringify(
  data: Record<string, unknown>[],
  options?: MarkdownStringifyOptions
): string {
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

  const toStr = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v);
  };

  const headerRow = keys;
  const rows = flat.map((obj) => keys.map((k) => toStr(obj[k])));

  const widths = keys.map((key, i) => {
    const headerLen = key.length;
    const maxDataLen = Math.max(...rows.map((r) => r[i].length), 0);
    return Math.max(headerLen, maxDataLen);
  });

  const pad = (value: string, width: number): string => value.padEnd(width, " ");

  function separatorCell(width: number, align?: ColumnAlignment): string {
    const dashes = "-".repeat(Math.max(width, 3));
    switch (align) {
      case "left":
        return ":" + dashes.slice(1);
      case "center":
        return ":" + "-".repeat(Math.max(width - 2, 3)) + ":";
      case "right":
        return "-".repeat(Math.max(width - 1, 3)) + ":";
      case "none":
      default:
        return dashes;
    }
  }

  const lines: string[] = [];

  lines.push("| " + headerRow.map((h, i) => pad(h, widths[i])).join(" | ") + " |");
  const alignments = options?.alignment;
  lines.push("| " + widths.map((w, i) => separatorCell(w, alignments?.[i])).join(" | ") + " |");
  for (const row of rows) {
    lines.push("| " + row.map((cell, i) => pad(cell, widths[i])).join(" | ") + " |");
  }

  return lines.join("\n");
}
