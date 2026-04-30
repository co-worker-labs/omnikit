import { csvStringify } from "./csv-stringify";
import { csvParse } from "./csv-parse";
import { markdownTableStringify, markdownTableParse } from "./markdown-table";

export type Format = "json" | "csv" | "markdown";

export interface ConvertResult {
  output: string;
  error?: string;
}

function parseJsonInput(input: string): { data: Record<string, unknown>[]; error?: string } {
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return { data: parsed };
    }
    return { data: [parsed] };
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : "Invalid JSON";
    return { data: [], error: msg };
  }
}

export function convert(input: string, from: Format, to: Format): ConvertResult {
  if (!input.trim()) return { output: "" };

  let intermediate: Record<string, unknown>[];

  switch (from) {
    case "json": {
      const result = parseJsonInput(input);
      if (result.error) return { output: "", error: result.error };
      intermediate = result.data;
      break;
    }
    case "csv": {
      const result = csvParse(input);
      if (result.errors.length > 0) {
        return { output: "", error: result.errors.join("; ") };
      }
      intermediate = result.data;
      break;
    }
    case "markdown": {
      const result = markdownTableParse(input);
      if (result.errors.length > 0) {
        return { output: "", error: result.errors.join("; ") };
      }
      intermediate = result.data;
      break;
    }
  }

  switch (to) {
    case "json":
      return { output: JSON.stringify(intermediate, null, 2) };
    case "csv":
      return { output: csvStringify(intermediate) };
    case "markdown":
      return { output: markdownTableStringify(intermediate) };
  }
}
