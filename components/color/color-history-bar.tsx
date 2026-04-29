"use client";

import { useTranslations } from "next-intl";

interface ColorHistoryBarProps {
  history: string[];
  onSelect: (hex: string) => void;
  onClear: () => void;
}

export function ColorHistoryBar({ history, onSelect, onClear }: ColorHistoryBarProps) {
  const t = useTranslations("color.history");
  if (history.length === 0) return null;
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 flex items-center gap-3 border-t border-border-default bg-bg-surface/95 backdrop-blur px-4 py-2 pb-[env(safe-area-inset-bottom)]">
      <span className="font-mono text-xs text-fg-muted uppercase tracking-wider shrink-0">
        {t("recent")}
      </span>
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {history.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => onSelect(hex)}
            className="h-6 w-6 rounded border border-border-default shrink-0 hover:scale-110 transition-transform"
            style={{ backgroundColor: hex }}
            title={hex}
            aria-label={hex}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-fg-muted hover:text-danger transition-colors shrink-0"
      >
        {t("clear")}
      </button>
    </div>
  );
}
