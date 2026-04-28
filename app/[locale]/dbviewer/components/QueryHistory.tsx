"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Clock, Trash2 } from "lucide-react";
import { listHistory, clearHistory, type HistoryEntry } from "../../../../libs/dbviewer/history";

interface QueryHistoryProps {
  onPick: (sql: string) => void;
}

export function QueryHistory({ onPick }: QueryHistoryProps) {
  const t = useTranslations("dbviewer");
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    const next = !open;
    if (next) setEntries(listHistory());
    setOpen(next);
  };

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleClear() {
    clearHistory();
    setEntries([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 rounded-lg border border-border-default px-2 py-1 text-xs text-fg-secondary hover:border-fg-secondary hover:text-fg-primary transition-colors"
      >
        <Clock size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-80 max-h-64 overflow-auto rounded-lg border border-border-default bg-bg-elevated shadow-xl">
          {entries.length === 0 ? (
            <p className="px-3 py-4 text-xs text-fg-muted text-center">{t("editor.noHistory")}</p>
          ) : (
            <>
              <div className="border-b border-border-default px-3 py-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-fg-muted hover:text-danger transition-colors"
                >
                  <Trash2 size={10} className="inline mr-1" />
                  {t("editor.clearHistory")}
                </button>
              </div>
              <ul>
                {entries.map((e, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(e.sql);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-mono text-fg-secondary hover:bg-bg-input transition-colors truncate"
                      title={e.sql}
                    >
                      {e.sql.length > 80 ? e.sql.slice(0, 80) + "\u2026" : e.sql}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
