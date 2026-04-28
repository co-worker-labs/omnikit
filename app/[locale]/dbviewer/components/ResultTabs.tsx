"use client";

import { useTranslations } from "next-intl";
import { Badge } from "../../../../components/ui/badge";
import type { ExecResult } from "../../../../libs/dbviewer/types";

export interface TabData {
  index: number;
  sql: string;
  kind: "ok" | "error" | "rejected";
  message?: string;
}

export function tabsFromResult(result: ExecResult): TabData[] {
  return result.results.map((r) => ({
    index: r.statementIndex,
    sql: r.sql,
    kind: r.kind,
    message: r.kind === "error" ? r.message : r.kind === "rejected" ? r.reason : undefined,
  }));
}

interface ResultTabsProps {
  result: ExecResult;
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ResultTabs({ result, activeIndex, onSelect }: ResultTabsProps) {
  const t = useTranslations("dbviewer");
  const tabs = tabsFromResult(result);

  if (tabs.length <= 1) return null;

  return (
    <div
      role="tablist"
      className="flex gap-1 overflow-x-auto border-b border-border-default px-2 scrollbar-none"
    >
      {tabs.map((tab) => {
        const isActive = tab.index === activeIndex;
        const isBad = tab.kind === "error" || tab.kind === "rejected";
        return (
          <button
            key={tab.index}
            role="tab"
            aria-selected={isActive}
            aria-controls={`result-panel-${tab.index}`}
            onClick={() => onSelect(tab.index)}
            className={`flex items-center gap-1 whitespace-nowrap border-b-2 -mb-px px-3 py-2 text-xs font-medium transition-colors ${
              isActive
                ? isBad
                  ? "border-danger text-danger"
                  : "border-accent-cyan text-accent-cyan"
                : "border-transparent text-fg-muted hover:text-fg-secondary"
            }`}
          >
            <span>{t("result.tabName", { n: tab.index + 1 })}</span>
            {isBad && (
              <Badge className="!bg-danger/10 !text-danger !text-[10px] !px-1 !py-0">!</Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
