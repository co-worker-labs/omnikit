"use client";

import { useTranslations } from "next-intl";
import { ArrowLeftRight, Copy, X, Columns2, ArrowUpDown } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { showToast } from "../../../../libs/toast";
import type { ViewMode } from "./DiffViewer";

export type LayoutMode = "horizontal" | "vertical";

export interface DiffOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
}

export interface DiffToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (v: LayoutMode) => void;
  options: DiffOptions;
  onOptionsChange: (next: DiffOptions) => void;
  onSwap: () => void;
  onClearAll: () => void;
  onCopyDiff: () => void;
  hideViewToggle: boolean;
  hideLayoutToggle: boolean;
  canSwap: boolean;
  canCopyDiff: boolean;
  canClearAll: boolean;
}

export function DiffToolbar({
  viewMode,
  onViewModeChange,
  layoutMode,
  onLayoutModeChange,
  options,
  onOptionsChange,
  onSwap,
  onClearAll,
  onCopyDiff,
  hideViewToggle,
  hideLayoutToggle,
  canSwap,
  canCopyDiff,
  canClearAll,
}: DiffToolbarProps) {
  const t = useTranslations("diff");
  const tc = useTranslations("common");

  const optionItems = [
    { key: "ignoreWhitespace", label: t("options.ignoreWhitespace") },
    { key: "ignoreCase", label: t("options.ignoreCase") },
  ] as const;

  return (
    <div className="flex flex-col gap-2 my-3">
      {/* Row 1: toggles (left) + algorithm options (right); centered on mobile */}
      <div className="flex items-center gap-3 justify-center">
        <div className="hidden md:flex md:flex-1 items-center gap-3">
          {!hideLayoutToggle && (
            <div
              role="radiogroup"
              aria-label={t("layout.label")}
              className="inline-flex rounded-full border border-border-default overflow-hidden"
            >
              {(["horizontal", "vertical"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={layoutMode === v}
                  onClick={() => onLayoutModeChange(v)}
                  className={
                    "px-3 py-1 text-sm font-medium transition-colors cursor-pointer " +
                    (layoutMode === v
                      ? "bg-accent-purple text-bg-base"
                      : "bg-transparent text-fg-secondary hover:bg-bg-elevated")
                  }
                >
                  {v === "horizontal" ? (
                    <span className="flex items-center gap-1">
                      <Columns2 size={14} />
                      {t("layout.horizontal")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <ArrowUpDown size={14} />
                      {t("layout.vertical")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {!hideViewToggle && (
            <div
              role="radiogroup"
              aria-label={t("view.label")}
              className="inline-flex rounded-full border border-border-default overflow-hidden"
            >
              {(["side", "inline"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={viewMode === v}
                  onClick={() => onViewModeChange(v)}
                  className={
                    "px-3 py-1 text-sm font-medium transition-colors cursor-pointer " +
                    (viewMode === v
                      ? "bg-accent-cyan text-bg-base"
                      : "bg-transparent text-fg-secondary hover:bg-bg-elevated")
                  }
                >
                  {v === "side" ? t("view.sideBySide") : t("view.inline")}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 items-center gap-2 max-md:flex-1"
          role="group"
          aria-label={t("options.label")}
        >
          {optionItems.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="checkbox"
              aria-checked={options[key]}
              onClick={() => onOptionsChange({ ...options, [key]: !options[key] })}
              className={
                "px-3 py-1 text-sm font-medium rounded-full border transition-colors cursor-pointer max-md:flex-1 " +
                (options[key]
                  ? "bg-accent-cyan border-accent-cyan text-bg-base"
                  : "border-border-default text-fg-secondary hover:bg-bg-elevated")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: action buttons; centered on mobile */}
      <div className="flex items-center gap-3 justify-center md:justify-start">
        <Button
          variant="outline"
          size="sm"
          disabled={!canSwap}
          onClick={onSwap}
          className="rounded-full max-md:flex-1 !gap-1"
        >
          <ArrowLeftRight size={14} />
          {t("swap")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={!canCopyDiff}
          onClick={() => {
            onCopyDiff();
            showToast(tc("copied"), "success", 2000);
          }}
          className="rounded-full max-md:flex-1 !gap-1"
        >
          <Copy size={14} />
          {t("copyDiff")}
        </Button>

        <Button
          variant="danger"
          size="sm"
          disabled={!canClearAll}
          onClick={onClearAll}
          className="rounded-full max-md:flex-1 !gap-1"
        >
          <X size={14} />
          {tc("clearAll")}
        </Button>
      </div>
    </div>
  );
}
