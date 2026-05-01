import { csvParse } from "./csv-parse";
import { csvStringify } from "./csv-stringify";
import { markdownTableParse, markdownTableStringify, type ColumnAlignment } from "./markdown-table";

export type { ColumnAlignment };

export type CsvMdFormat = "csv" | "markdown";

export interface CsvMdConvertOptions {
  delimiter?: string;
  alignment?: ColumnAlignment;
}

export interface CsvMdConvertResult {
  output: string;
  error?: string;
}

export function csvMdConvert(
  input: string,
  from: CsvMdFormat,
  to: CsvMdFormat,
  options?: CsvMdConvertOptions
): CsvMdConvertResult {
  if (!input.trim()) return { output: "" };

  const delimiter = options?.delimiter;
  const alignment = options?.alignment;

  if (from === "csv" && to === "markdown") {
    const parsed = csvParse(input, delimiter);
    if (parsed.errors.length > 0) {
      return { output: "", error: parsed.errors.join("; ") };
    }
    if (parsed.data.length === 0) {
      return { output: "" };
    }
    const colCount = Object.keys(parsed.data[0]).length;
    const alignArray = alignment
      ? (Array(colCount).fill(alignment) as ColumnAlignment[])
      : undefined;
    const output = markdownTableStringify(
      parsed.data,
      alignArray ? { alignment: alignArray } : undefined
    );
    return { output };
  }

  if (from === "markdown" && to === "csv") {
    const parsed = markdownTableParse(input);
    if (parsed.errors.length > 0) {
      return { output: "", error: parsed.errors.join("; ") };
    }
    if (parsed.data.length === 0) {
      return { output: "" };
    }
    const output = csvStringify(parsed.data, delimiter);
    return { output };
  }

  return { output: "", error: "Unsupported conversion direction" };
}
