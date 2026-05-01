import Papa from "papaparse";

export interface CsvParseResult {
  data: Record<string, unknown>[];
  errors: string[];
}

/**
 * Parse a CSV string into a JSON object array using papaparse.
 * - First row = column headers (trimmed).
 * - Auto-detects delimiter (comma, tab, semicolon, pipe) unless `delimiter` is provided.
 * - Auto-converts numeric strings and booleans via dynamicTyping.
 * - Strips UTF-8 BOM if present.
 */
export function csvParse(csv: string, delimiter?: string): CsvParseResult {
  const result = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h: string) => h.trim(),
    ...(delimiter ? { delimiter } : {}),
  });

  const errors = result.errors
    .filter((e) => e.code !== "UndetectableDelimiter")
    .map((e) => `Row ${e.row ?? "?"}: ${e.message}`);

  return {
    data: result.data as Record<string, unknown>[],
    errors,
  };
}
