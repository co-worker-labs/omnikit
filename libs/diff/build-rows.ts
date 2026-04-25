// Shared diff algorithm: used by both the synchronous path (< 50KB inputs)
// and the Web Worker. Contains the pure logic with zero Web Worker dependencies.

import { diffLines, diffWordsWithSpace, createPatch, type Change } from "diff";
import type { DiffRowData, WordSeg } from "./types";

function splitLines(block: string): string[] {
  if (block.length === 0) return [];
  const withoutTrailing = block.endsWith("\n") ? block.slice(0, -1) : block;
  return withoutTrailing.split("\n");
}

function wordSegmentsForPair(
  oldLine: string,
  newLine: string,
  ignoreCase: boolean
): { delSegs: WordSeg[]; addSegs: WordSeg[] } {
  const parts = diffWordsWithSpace(oldLine, newLine, { ignoreCase });
  const delSegs: WordSeg[] = [];
  const addSegs: WordSeg[] = [];
  for (const p of parts) {
    if (p.added) {
      addSegs.push({ text: p.value, changed: true });
    } else if (p.removed) {
      delSegs.push({ text: p.value, changed: true });
    } else {
      delSegs.push({ text: p.value, changed: false });
      addSegs.push({ text: p.value, changed: false });
    }
  }
  return { delSegs, addSegs };
}

export function buildRows(
  original: string,
  modified: string,
  ignoreWhitespace: boolean,
  ignoreCase: boolean
): { rows: DiffRowData[]; hasChanges: boolean; unifiedPatch: string } {
  const changes = diffLines(original, modified, { ignoreWhitespace, ignoreCase });

  const rows: DiffRowData[] = [];
  let oldNo = 1;
  let newNo = 1;
  let hasChanges = false;

  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const lines = splitLines(c.value);

    if (!c.added && !c.removed) {
      for (const line of lines) {
        rows.push({ kind: "context", oldNo, newNo, text: line });
        oldNo++;
        newNo++;
      }
      continue;
    }

    if (c.removed) {
      hasChanges = true;
      const next = changes[i + 1];
      if (next && next.added) {
        const delLines = lines;
        const addLines = splitLines(next.value);
        const paired = Math.min(delLines.length, addLines.length);

        for (let k = 0; k < paired; k++) {
          const { delSegs, addSegs } = wordSegmentsForPair(delLines[k], addLines[k], ignoreCase);
          rows.push({ kind: "del", oldNo, segments: delSegs });
          oldNo++;
          rows.push({ kind: "add", newNo, segments: addSegs });
          newNo++;
        }
        for (let k = paired; k < delLines.length; k++) {
          rows.push({ kind: "del", oldNo, segments: [{ text: delLines[k], changed: true }] });
          oldNo++;
        }
        for (let k = paired; k < addLines.length; k++) {
          rows.push({ kind: "add", newNo, segments: [{ text: addLines[k], changed: true }] });
          newNo++;
        }
        i++;
      } else {
        for (const line of lines) {
          rows.push({ kind: "del", oldNo, segments: [{ text: line, changed: true }] });
          oldNo++;
        }
      }
    } else if (c.added) {
      hasChanges = true;
      for (const line of lines) {
        rows.push({ kind: "add", newNo, segments: [{ text: line, changed: true }] });
        newNo++;
      }
    }
  }

  const unifiedPatch = hasChanges
    ? createPatch("diff", original, modified, "original", "modified")
    : "";

  return { rows, hasChanges, unifiedPatch };
}
