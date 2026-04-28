"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, ChevronUp, PanelLeftClose } from "lucide-react";
import type { SchemaItem, SchemaItemKind } from "../../../../libs/dbviewer/types";
import { SchemaInspector } from "./SchemaInspector";

interface Props {
  items: SchemaItem[];
  onRunSelect: (sql: string) => void;
  width: number;
  onToggle?: () => void;
  collapsed?: boolean;
}

const SECTIONS: Array<{ kind: SchemaItemKind; key: "tables" | "views" | "indexes" | "triggers" }> =
  [
    { kind: "table", key: "tables" },
    { kind: "view", key: "views" },
    { kind: "index", key: "indexes" },
    { kind: "trigger", key: "triggers" },
  ];

export function TableSidebar({ items, onRunSelect, width, onToggle, collapsed }: Props) {
  const t = useTranslations("dbviewer");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    table: true,
    view: true,
    index: false,
    trigger: false,
  });
  const [openItem, setOpenItem] = useState<string | null>(null);

  const tableCount = items.filter((i) => i.kind === "table").length;

  if (collapsed) {
    return (
      <nav
        aria-label="Schema sidebar"
        className="shrink-0 rounded-lg border border-border-default bg-bg-elevated px-2 py-1 max-md:!w-full md:hidden"
      >
        <div className="flex items-center">
          <span className="flex items-center gap-1 px-1 py-1 text-xs font-semibold text-fg-muted">
            {t("sidebar.tables")}
            <span className="text-fg-muted">({tableCount})</span>
          </span>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="ml-auto p-1 rounded text-fg-muted hover:text-fg-primary hover:bg-bg-input transition-colors"
              title={t("sidebar.expand")}
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Schema sidebar"
      style={{ width }}
      className="shrink-0 rounded-lg border border-border-default bg-bg-elevated p-2 overflow-auto max-md:!w-full"
    >
      <div>
        {SECTIONS.map(({ kind, key }) => {
          const sub = items.filter((i) => i.kind === kind);
          const open = openSections[kind];
          return (
            <div key={kind} className="mt-1">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setOpenSections((s) => ({ ...s, [kind]: !s[kind] }))}
                  className={`flex items-center gap-1 px-1 py-1 text-xs font-semibold text-fg-muted hover:text-fg-secondary ${kind === "table" && onToggle ? "flex-1" : "w-full"}`}
                  aria-expanded={open}
                >
                  {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span>{t(`sidebar.${key}`)}</span>
                  <span className="ml-1 text-fg-muted">({sub.length})</span>
                </button>
                {kind === "table" && onToggle && (
                  <button
                    type="button"
                    onClick={onToggle}
                    className="p-1 mr-1 rounded text-fg-muted hover:text-fg-primary hover:bg-bg-input transition-colors"
                    title={t("sidebar.collapse")}
                  >
                    <ChevronUp size={14} className="md:hidden" />
                    <PanelLeftClose size={14} className="hidden md:block" />
                  </button>
                )}
              </div>
              {open && (
                <ul role="tree" className="ml-3 mt-1 space-y-0.5">
                  {sub.map((it) => {
                    const id = `${it.kind}:${it.name}`;
                    const expanded = openItem === id;
                    return (
                      <li
                        key={id}
                        role="treeitem"
                        aria-selected={expanded}
                        aria-expanded={expanded}
                      >
                        <button
                          type="button"
                          onDoubleClick={() => {
                            if (it.kind === "table" || it.kind === "view") {
                              onRunSelect(
                                `SELECT * FROM "${it.name.replace(/"/g, '""')}" LIMIT 100;`
                              );
                            }
                          }}
                          onClick={() => setOpenItem(expanded ? null : id)}
                          className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm font-mono ${expanded ? "bg-accent-cyan-dim text-fg-primary" : "text-fg-secondary hover:bg-bg-input"}`}
                        >
                          {expanded ? (
                            <ChevronDown size={12} className="shrink-0" />
                          ) : (
                            <ChevronRight size={12} className="shrink-0" />
                          )}
                          <span className="truncate">{it.name}</span>
                        </button>
                        {expanded && <SchemaInspector item={it} onRunSelect={onRunSelect} />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
