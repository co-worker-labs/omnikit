// Dedicated Web Worker for diff computation on inputs >= 50KB.
// Thin shell — the algorithm lives in build-rows.ts (shared with sync path).

import { buildRows } from "./build-rows";
import type { DiffRequest, DiffResponse, DiffErrorResponse } from "./types";

self.onmessage = (ev: MessageEvent<DiffRequest>) => {
  const req = ev.data;
  try {
    const { rows, hasChanges, unifiedPatch } = buildRows(
      req.original,
      req.modified,
      req.ignoreWhitespace,
      req.ignoreCase
    );
    const res: DiffResponse = { id: req.id, ok: true, rows, unifiedPatch, hasChanges };
    (self as unknown as Worker).postMessage(res);
  } catch (e) {
    const err: DiffErrorResponse = {
      id: req.id,
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    };
    (self as unknown as Worker).postMessage(err);
  }
};
