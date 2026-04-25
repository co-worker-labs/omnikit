"use client";

import { useTranslations } from "next-intl";

export interface FoldPlaceholderProps {
  hiddenCount: number;
  expanded: boolean;
  onClick: () => void;
}

export function FoldPlaceholder({ hiddenCount, expanded, onClick }: FoldPlaceholderProps) {
  const t = useTranslations("diff");
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={
        expanded
          ? t("fold.ariaCollapse", { count: hiddenCount })
          : t("fold.ariaExpand", { count: hiddenCount })
      }
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex items-center justify-center gap-3 w-full h-5 leading-5 text-xs font-mono bg-bg-elevated border-y border-border-default text-fg-muted hover:bg-bg-surface cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-accent-cyan"
    >
      <span>{t("fold.hiddenLines", { count: hiddenCount })}</span>
      <span className="px-2 rounded border border-border-default text-[10px] uppercase tracking-wider">
        {expanded ? t("fold.collapse") : t("fold.expand")}
      </span>
    </div>
  );
}
