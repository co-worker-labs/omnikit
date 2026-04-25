"use client";

import type { DiffRowData, WordSeg } from "../../../../libs/diff/types";
import { tokenizeJsonLine, type JsonTokenKind } from "../../../../libs/diff/json-tokenizer";

const lineBgByKind = {
  context: "",
  del: "bg-diff-del-line",
  add: "bg-diff-add-line",
} as const;

const wordBgByKind = {
  del: "bg-diff-del-word",
  add: "bg-diff-add-word",
} as const;

const jsonTokenClass: Record<JsonTokenKind, string> = {
  string: "text-accent-cyan",
  key: "text-accent-purple",
  number: "text-danger",
  keyword: "text-accent-purple",
  punct: "text-fg-muted",
  plain: "",
};

function renderSegments(segs: WordSeg[], kind: "del" | "add", jsonMode: boolean) {
  return segs.map((seg, idx) => {
    const emphasis = seg.changed ? wordBgByKind[kind] : "";
    if (!jsonMode) {
      return (
        <span key={idx} className={emphasis}>
          {seg.text}
        </span>
      );
    }
    const tokens = tokenizeJsonLine(seg.text);
    return (
      <span key={idx} className={emphasis}>
        {tokens.map((t, j) => (
          <span key={j} className={jsonTokenClass[t.kind]}>
            {t.text}
          </span>
        ))}
      </span>
    );
  });
}

function renderContext(text: string, jsonMode: boolean) {
  if (!jsonMode) return <span>{text}</span>;
  const tokens = tokenizeJsonLine(text);
  return (
    <>
      {tokens.map((t, j) => (
        <span key={j} className={jsonTokenClass[t.kind]}>
          {t.text}
        </span>
      ))}
    </>
  );
}

function prefixFor(kind: DiffRowData["kind"]) {
  if (kind === "add") return "+";
  if (kind === "del") return "-";
  return " ";
}

function ariaLabelFor(kind: DiffRowData["kind"]) {
  if (kind === "add") return "Added line";
  if (kind === "del") return "Removed line";
  return "Unchanged line";
}

export interface DiffRowProps {
  row: DiffRowData;
  jsonMode: boolean;
  side: "left" | "right" | "both";
}

export function DiffRow({ row, jsonMode, side }: DiffRowProps) {
  const bg = lineBgByKind[row.kind];
  const aria = ariaLabelFor(row.kind);

  const leftNo = row.kind === "context" ? row.oldNo : row.kind === "del" ? row.oldNo : null;
  const rightNo = row.kind === "context" ? row.newNo : row.kind === "add" ? row.newNo : null;

  return (
    <div role="row" aria-label={aria} className={`flex w-full font-mono text-xs leading-5 ${bg}`}>
      {(side === "left" || side === "both") && (
        <span className="w-10 flex-shrink-0 select-none pr-2 text-end text-fg-muted">
          {leftNo ?? ""}
        </span>
      )}
      {side === "both" && (
        <span className="w-10 flex-shrink-0 select-none pr-2 text-end text-fg-muted">
          {rightNo ?? ""}
        </span>
      )}
      {side === "right" && (
        <span className="w-10 flex-shrink-0 select-none pr-2 text-end text-fg-muted">
          {rightNo ?? ""}
        </span>
      )}
      <span className="w-4 flex-shrink-0 select-none text-fg-muted">{prefixFor(row.kind)}</span>
      <span className="whitespace-pre-wrap break-all">
        {row.kind === "context"
          ? renderContext(row.text, jsonMode)
          : renderSegments(row.segments, row.kind, jsonMode)}
      </span>
    </div>
  );
}

export function EmptyRow({ side }: { side: "left" | "right" | "both" }) {
  return (
    <div className="flex w-full font-mono text-xs leading-5" role="row" aria-hidden="true">
      {(side === "left" || side === "both") && <span className="w-10 flex-shrink-0" />}
      {side === "both" && <span className="w-10 flex-shrink-0" />}
      {side === "right" && <span className="w-10 flex-shrink-0" />}
      <span className="w-4 flex-shrink-0" />
      <span>&nbsp;</span>
    </div>
  );
}
