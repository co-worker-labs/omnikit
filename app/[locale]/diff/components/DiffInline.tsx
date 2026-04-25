"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { DiffRowData } from "../../../../libs/diff/types";
import type { Block } from "../../../../libs/diff/fold-context";
import { VIRTUALIZATION_THRESHOLD } from "../../../../libs/diff/compute";
import { DiffRow } from "./DiffRow";
import { FoldPlaceholder } from "./FoldPlaceholder";

type InlineItem =
  | { kind: "row"; row: DiffRowData }
  | { kind: "fold"; id: number; hiddenCount: number; expanded: boolean };

function flattenBlocks(blocks: Block[], expandedSet: Set<number>): InlineItem[] {
  const out: InlineItem[] = [];
  for (const b of blocks) {
    if (b.kind === "row") {
      out.push({ kind: "row", row: b.row });
      continue;
    }
    out.push({
      kind: "fold",
      id: b.id,
      hiddenCount: b.hidden.length,
      expanded: expandedSet.has(b.id),
    });
    if (expandedSet.has(b.id)) {
      for (const r of b.hidden) out.push({ kind: "row", row: r });
    }
  }
  return out;
}

const ROW_HEIGHT = 20;

export interface DiffInlineProps {
  blocks: Block[];
  expandedSet: Set<number>;
  onToggle: (id: number) => void;
  jsonMode: boolean;
}

export function DiffInline({ blocks, expandedSet, onToggle, jsonMode }: DiffInlineProps) {
  const items = flattenBlocks(blocks, expandedSet);
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
        {items.map((it, i) =>
          it.kind === "fold" ? (
            <FoldPlaceholder
              key={`f${it.id}`}
              hiddenCount={it.hiddenCount}
              expanded={it.expanded}
              onClick={() => onToggle(it.id)}
            />
          ) : (
            <DiffRow key={i} row={it.row} jsonMode={jsonMode} side="both" />
          )
        )}
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
          return (
            <div
              key={vi.key}
              className="absolute inset-x-0"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              {it.kind === "fold" ? (
                <FoldPlaceholder
                  hiddenCount={it.hiddenCount}
                  expanded={it.expanded}
                  onClick={() => onToggle(it.id)}
                />
              ) : (
                <DiffRow row={it.row} jsonMode={jsonMode} side="both" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
