import { csvStringify } from "./csv-stringify";
import { csvParse } from "./csv-parse";
import { unflatten } from "./unflatten";

export type Format = "json" | "csv";

export interface ConvertResult {
  output: string;
  error?: string;
}

export interface ConvertOptions {
  indent?: number;
  delimiter?: string;
  unflatten?: boolean;
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

export function convert(
  input: string,
  from: Format,
  to: Format,
  options?: ConvertOptions
): ConvertResult {
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
  }

  const indent = options?.indent ?? 2;

  switch (to) {
    case "json": {
      const data = options?.unflatten ? intermediate.map((item) => unflatten(item)) : intermediate;
      return { output: JSON.stringify(data, null, indent) };
    }
    case "csv":
      return { output: csvStringify(intermediate, options?.delimiter) };
  }
}
