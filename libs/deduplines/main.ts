export interface DedupOptions {
  caseSensitive: boolean;
  trimLines: boolean;
  removeEmpty: boolean;
}

export const defaultOptions: DedupOptions = {
  caseSensitive: true,
  trimLines: true,
  removeEmpty: true,
};

export interface DedupResult {
  output: string;
  originalCount: number;
  resultCount: number;
  removedCount: number;
}

export function dedupLines(input: string, options: DedupOptions): DedupResult {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const allLines = normalized.split("\n");
  const originalCount = allLines.length;

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const line of allLines) {
    const isEmpty = line.trim() === "";
    if (isEmpty) {
      deduped.push(line);
      continue;
    }
    let key = line;
    if (options.trimLines) {
      key = key.trim();
    }
    if (!options.caseSensitive) {
      key = key.toLowerCase();
    }
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(options.trimLines ? line.trim() : line);
    }
  }

  const result = options.removeEmpty ? deduped.filter((line) => line.trim() !== "") : deduped;

  const resultCount = result.length;
  return {
    output: result.join("\n"),
    originalCount,
    resultCount,
    removedCount: originalCount - resultCount,
  };
}
