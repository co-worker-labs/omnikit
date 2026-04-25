"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { DiffRowData } from "../../../../libs/diff/types";
import type { Block } from "../../../../libs/diff/fold-context";
import { VIRTUALIZATION_THRESHOLD } from "../../../../libs/diff/compute";
import { DiffRow, EmptyRow } from "./DiffRow";
import { FoldPlaceholder } from "./FoldPlaceholder";

type WorkItem =
  | { kind: "row"; row: DiffRowData }
  | { kind: "fold"; id: number; hidden: DiffRowData[] };

type RenderItem =
  | { kind: "pair"; left: DiffRowData | null; right: DiffRowData | null }
  | { kind: "fold"; id: number; hiddenCount: number; expanded: boolean };

function pairBlocks(blocks: Block[], expandedSet: Set<number>): RenderItem[] {
  const work: WorkItem[] = [];
  for (const b of blocks) {
    if (b.kind === "row") {
      work.push({ kind: "row", row: b.row });
    } else {
      work.push({ kind: "fold", id: b.id, hidden: b.hidden });
      if (expandedSet.has(b.id)) {
        for (const r of b.hidden) work.push({ kind: "row", row: r });
      }
    }
  }

  const out: RenderItem[] = [];
  let i = 0;
  while (i < work.length) {
    const item = work[i];
    if (item.kind === "fold") {
      out.push({
        kind: "fold",
        id: item.id,
        hiddenCount: item.hidden.length,
        expanded: expandedSet.has(item.id),
      });
      i++;
      continue;
    }
    const r = item.row;
    if (r.kind === "context") {
      out.push({ kind: "pair", left: r, right: r });
      i++;
      continue;
    }
    if (r.kind === "del") {
      const delStart = i;
      while (
        i < work.length &&
        work[i].kind === "row" &&
        (work[i] as { kind: "row"; row: DiffRowData }).row.kind === "del"
      ) {
        i++;
      }
      const delEnd = i;
      const addStart = i;
      while (
        i < work.length &&
        work[i].kind === "row" &&
        (work[i] as { kind: "row"; row: DiffRowData }).row.kind === "add"
      ) {
        i++;
      }
      const addEnd = i;
      const delCount = delEnd - delStart;
      const addCount = addEnd - addStart;
      const paired = Math.min(delCount, addCount);
      for (let k = 0; k < paired; k++) {
        out.push({
          kind: "pair",
          left: (work[delStart + k] as { kind: "row"; row: DiffRowData }).row,
          right: (work[addStart + k] as { kind: "row"; row: DiffRowData }).row,
        });
      }
      for (let k = paired; k < delCount; k++) {
        out.push({
          kind: "pair",
          left: (work[delStart + k] as { kind: "row"; row: DiffRowData }).row,
          right: null,
        });
      }
      for (let k = paired; k < addCount; k++) {
        out.push({
          kind: "pair",
          left: null,
          right: (work[addStart + k] as { kind: "row"; row: DiffRowData }).row,
        });
      }
      continue;
    }
    out.push({ kind: "pair", left: null, right: r });
    i++;
  }
  return out;
}

const ROW_HEIGHT = 20;

export interface DiffSideBySideProps {
  blocks: Block[];
  expandedSet: Set<number>;
  onToggle: (id: number) => void;
  jsonMode: boolean;
}

export function DiffSideBySide({ blocks, expandedSet, onToggle, jsonMode }: DiffSideBySideProps) {
  const items = pairBlocks(blocks, expandedSet);
  const virtualize = items.length > VIRTUALIZATION_THRESHOLD;

  const parentRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: virtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  if (!virtualize) {
    return (
      <div className="overflow-x-auto border border-border-default rounded-lg bg-bg-elevated">
        {items.map((it, i) => {
          if (it.kind === "fold") {
            return (
              <FoldPlaceholder
                key={`f${it.id}`}
                hiddenCount={it.hiddenCount}
                expanded={it.expanded}
                onClick={() => onToggle(it.id)}
              />
            );
          }
          return (
            <div key={i} className="grid grid-cols-2 divide-x divide-border-default">
              {it.left ? (
                <DiffRow row={it.left} jsonMode={jsonMode} side="left" />
              ) : (
                <EmptyRow side="left" />
              )}
              {it.right ? (
                <DiffRow row={it.right} jsonMode={jsonMode} side="right" />
              ) : (
                <EmptyRow side="right" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  return (
    <div
      ref={parentRef}
      className="border border-border-default rounded-lg bg-bg-elevated h-[600px] overflow-auto"
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px` }} className="relative">
        {virtualItems.map((vi) => {
          const it = items[vi.index];
          if (it.kind === "fold") {
            return (
              <div
                key={vi.key}
                className="absolute inset-x-0"
                style={{ transform: `translateY(${vi.start}px)` }}
              >
                <FoldPlaceholder
                  hiddenCount={it.hiddenCount}
                  expanded={it.expanded}
                  onClick={() => onToggle(it.id)}
                />
              </div>
            );
          }
          return (
            <div
              key={vi.key}
              className="absolute inset-x-0 grid grid-cols-2 divide-x divide-border-default"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              {it.left ? (
                <DiffRow row={it.left} jsonMode={jsonMode} side="left" />
              ) : (
                <EmptyRow side="left" />
              )}
              {it.right ? (
                <DiffRow row={it.right} jsonMode={jsonMode} side="right" />
              ) : (
                <EmptyRow side="right" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
