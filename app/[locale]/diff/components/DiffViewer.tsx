"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { DiffRowData } from "../../../../libs/diff/types";
import { foldContext, type Block } from "../../../../libs/diff/fold-context";
import { DiffSideBySide } from "./DiffSideBySide";
import { DiffInline } from "./DiffInline";
import { Button } from "../../../../components/ui/button";

export type ViewMode = "side" | "inline";
export type ViewerState =
  | { kind: "idle" }
  | { kind: "computing" }
  | { kind: "manualHint"; onCompare: () => void }
  | { kind: "equal" }
  | { kind: "result"; rows: DiffRowData[] };

export interface DiffViewerProps {
  state: ViewerState;
  viewMode: ViewMode;
  jsonMode: boolean;
}

export function DiffViewer({ state, viewMode, jsonMode }: DiffViewerProps) {
  const t = useTranslations("diff");
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());

  const rowsKey = state.kind === "result" ? state.rows : null;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedSet(new Set());
  }, [rowsKey]);

  if (state.kind === "idle") {
    return null;
  }

  if (state.kind === "computing") {
    return (
      <div className="flex items-center justify-center h-40 text-fg-muted">{t("computing")}</div>
    );
  }

  if (state.kind === "manualHint") {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <span className="text-fg-muted text-sm">{t("manualHint")}</span>
        <Button onClick={state.onCompare}>{t("compare")}</Button>
      </div>
    );
  }

  if (state.kind === "equal") {
    return (
      <div className="flex items-center justify-center h-40 text-fg-muted">{t("noChanges")}</div>
    );
  }

  const blocks: Block[] = foldContext(state.rows, true);

  function onToggle(id: number) {
    const next = new Set(expandedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSet(next);
  }

  return viewMode === "side" ? (
    <DiffSideBySide
      blocks={blocks}
      expandedSet={expandedSet}
      onToggle={onToggle}
      jsonMode={jsonMode}
    />
  ) : (
    <DiffInline blocks={blocks} expandedSet={expandedSet} onToggle={onToggle} jsonMode={jsonMode} />
  );
}
