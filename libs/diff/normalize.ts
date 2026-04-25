// Always-on normalization applied before any diff computation.
// Guarantees CRLF/LF mismatches and trailing whitespace never appear as changes.

export function normalize(input: string): string {
  // CRLF → LF. Apply first so trailing-whitespace trim sees LF-only text.
  const lfOnly = input.replace(/\r\n/g, "\n");
  // Trim trailing space/tab on each line. /m makes $ match end-of-line, not end-of-string.
  return lfOnly.replace(/[ \t]+$/gm, "");
}
