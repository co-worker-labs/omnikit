"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SchemaItem, TableSchema } from "../../../../libs/dbviewer/types";
import { getEngine } from "../../../../libs/dbviewer/engine";

interface Props {
  item: SchemaItem;
  onRunSelect?: (sql: string) => void;
}

export function SchemaInspector({ item, onRunSelect }: Props) {
  const t = useTranslations("dbviewer");
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [rowCount, setRowCount] = useState<string | null>(null);

  useEffect(() => {
    if (item.kind !== "table" && item.kind !== "view") return;
    let cancelled = false;
    void (async () => {
      const eng = getEngine();
      const s = await eng.tableSchema(item.name);
      if (!cancelled) setSchema(s);
      const c = await eng.rowCount(item.name);
      if (!cancelled) setRowCount(typeof c === "bigint" ? c.toString() : String(c));
    })();
    return () => {
      cancelled = true;
    };
  }, [item.kind, item.name]);

  if (item.kind === "trigger" || item.kind === "index") {
    return (
      <div className="mt-2 rounded-md border border-border-default bg-bg-input p-3 text-xs">
        <pre className="whitespace-pre-wrap break-words text-fg-secondary">
          {item.sql ?? "\u2014"}
        </pre>
      </div>
    );
  }

  if (!schema) {
    return <div className="mt-2 text-xs text-fg-muted px-2">{t("schema.rowCountLoading")}</div>;
  }

  return (
    <div className="mt-2 rounded-md border border-border-default bg-bg-input/40">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-xs text-fg-muted">
          {rowCount === null
            ? t("schema.rowCountLoading")
            : t("schema.rowCount", { count: rowCount })}
        </span>
        {onRunSelect && (
          <button
            type="button"
            onClick={() =>
              onRunSelect(`SELECT * FROM "${item.name.replace(/"/g, '""')}" LIMIT 100;`)
            }
            className="text-xs text-accent-cyan hover:underline"
          >
            SELECT *
          </button>
        )}
      </div>

      <div className="px-3 pb-3 pt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-fg-muted">
              <th className="text-left font-normal">{t("schema.name")}</th>
              <th className="text-left font-normal">{t("schema.type")}</th>
              <th className="text-left font-normal">{t("schema.nullable")}</th>
              <th className="text-left font-normal">{t("schema.default")}</th>
              <th className="text-left font-normal">{t("schema.pk")}</th>
            </tr>
          </thead>
          <tbody>
            {schema.columns.map((c) => (
              <tr key={c.name} className="text-fg-secondary">
                <td className="pr-3 py-0.5 font-mono text-fg-primary">{c.name}</td>
                <td className="pr-3 py-0.5">{c.type || "\u2014"}</td>
                <td className="pr-3 py-0.5">{c.notnull ? "NO" : "YES"}</td>
                <td className="pr-3 py-0.5 truncate max-w-[8rem]">{c.dflt_value ?? "\u2014"}</td>
                <td className="pr-3 py-0.5">{c.pk > 0 ? "\u2713" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {schema.foreignKeys.length > 0 && (
          <div className="mt-3">
            <p className="text-fg-muted text-xs mb-1">{t("schema.foreignKeys")}</p>
            <ul className="text-xs text-fg-secondary space-y-0.5">
              {schema.foreignKeys.map((fk) => (
                <li key={`${fk.id}-${fk.seq}`} className="font-mono">
                  {fk.from} &rarr; {fk.to_table}.{fk.to_column}
                  {fk.on_delete && fk.on_delete !== "NO ACTION" ? ` (DEL ${fk.on_delete})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {schema.indexes.length > 0 && (
          <div className="mt-3">
            <p className="text-fg-muted text-xs mb-1">{t("schema.indexes")}</p>
            <ul className="text-xs text-fg-secondary space-y-0.5">
              {schema.indexes.map((i) => (
                <li key={i.name} className="font-mono">
                  {i.unique ? "U " : "  "}
                  {i.name} ({i.columns.join(", ")})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
