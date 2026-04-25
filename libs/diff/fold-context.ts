// Pure context-folding for the diff viewer.
// Input: full DiffRowData[] from the worker.
// Output: Block[] where unchanged runs of length >= FOLD_THRESHOLD become
// a single "fold" block surrounded by CONTEXT_LINES rows on each non-edge side.
// Folding is gated by hasChanges; identical inputs pass through unchanged.

import type { DiffRowData } from "./types";

export const CONTEXT_LINES = 3;
export const FOLD_THRESHOLD = 8;

export type Block =
  | { kind: "row"; row: DiffRowData }
  | { kind: "fold"; id: number; hidden: DiffRowData[] };

export function foldContext(rows: DiffRowData[], hasChanges: boolean): Block[] {
  if (!hasChanges) {
    return rows.map((row) => ({ kind: "row" as const, row }));
  }

  const out: Block[] = [];
  let nextFoldId = 1;
  let i = 0;

  while (i < rows.length) {
    if (rows[i].kind !== "context") {
      out.push({ kind: "row", row: rows[i] });
      i++;
      continue;
    }

    // Collect a contiguous run of context rows.
    const runStart = i;
    while (i < rows.length && rows[i].kind === "context") i++;
    const runEnd = i; // exclusive
    const runLen = runEnd - runStart;

    if (runLen < FOLD_THRESHOLD) {
      for (let k = runStart; k < runEnd; k++) {
        out.push({ kind: "row", row: rows[k] });
      }
      continue;
    }

    const isHead = runStart === 0;
    const isTail = runEnd === rows.length;
    const keepBefore = isHead ? 0 : CONTEXT_LINES;
    const keepAfter = isTail ? 0 : CONTEXT_LINES;
    const hiddenStart = runStart + keepBefore;
    const hiddenEnd = runEnd - keepAfter;

    // After trimming for visible context, the hidden middle should still be
    // worth folding — otherwise just render the whole run.
    if (hiddenEnd - hiddenStart < FOLD_THRESHOLD - keepBefore - keepAfter) {
      for (let k = runStart; k < runEnd; k++) {
        out.push({ kind: "row", row: rows[k] });
      }
      continue;
    }

    for (let k = runStart; k < hiddenStart; k++) {
      out.push({ kind: "row", row: rows[k] });
    }
    out.push({
      kind: "fold",
      id: nextFoldId++,
      hidden: rows.slice(hiddenStart, hiddenEnd),
    });
    for (let k = hiddenEnd; k < runEnd; k++) {
      out.push({ kind: "row", row: rows[k] });
    }
  }

  return out;
}
