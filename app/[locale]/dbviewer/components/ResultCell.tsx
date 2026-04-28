"use client";

import { useTranslations } from "next-intl";
import type { CellValue } from "../../../../libs/dbviewer/types";
import { LONG_TEXT_CHARS } from "../../../../libs/dbviewer/constants";

const DATE_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

function looksLikeJson(s: string): boolean {
  const c = s.charCodeAt(0);
  return c === 0x5b || c === 0x7b;
}

export interface ResultCellProps {
  value: CellValue;
  onExpandLong?: (text: string) => void;
}

function tryCollapseJson(s: string): string | null {
  if (!looksLikeJson(s)) return null;
  try {
    const parsed = JSON.parse(s);
    if (typeof parsed === "object" && parsed !== null) {
      return JSON.stringify(parsed, null, 0);
    }
  } catch {}
  return null;
}

export function ResultCell({ value, onExpandLong }: ResultCellProps) {
  const t = useTranslations("dbviewer");

  if (value === null) {
    return <span className="italic text-fg-muted text-xs">NULL</span>;
  }

  if (typeof value === "boolean") {
    return <span className="font-mono text-right">{value ? 1 : 0}</span>;
  }

  if (typeof value === "bigint") {
    return (
      <span className="font-mono text-right text-fg-primary" title={value.toString(10)}>
        {value.toString(10)}
      </span>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono text-right text-fg-primary">{value}</span>;
  }

  if (value instanceof Uint8Array) {
    return (
      <button
        type="button"
        onClick={() => {
          const blob = new Blob([new Uint8Array(value)]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "blob.bin";
          a.click();
          URL.revokeObjectURL(url);
        }}
        className="inline-flex items-center rounded-md bg-accent-cyan/10 px-2 py-0.5 text-xs font-mono text-accent-cyan hover:bg-accent-cyan/20 transition-colors cursor-pointer"
      >
        {t("cell.blob", { bytes: value.byteLength })}
      </button>
    );
  }

  if (value === "") {
    return <span className="italic text-fg-muted text-xs">{t("cell.empty")}</span>;
  }

  if (value.length > LONG_TEXT_CHARS) {
    const truncated = value.slice(0, LONG_TEXT_CHARS) + "\u2026";
    return (
      <button
        type="button"
        onClick={() => onExpandLong?.(value)}
        className="text-left text-fg-primary hover:text-accent-cyan transition-colors cursor-pointer"
        title={t("cell.expandLong")}
      >
        <span className="font-mono text-xs break-all">{truncated}</span>
      </button>
    );
  }

  if (DATE_RE.test(value)) {
    const local = new Date(value);
    const tooltip = isNaN(local.getTime()) ? undefined : local.toLocaleString();
    return (
      <span className="font-mono text-xs text-fg-primary" title={tooltip}>
        {value}
      </span>
    );
  }

  const collapsed = tryCollapseJson(value);
  if (collapsed !== null) {
    return (
      <span
        className="font-mono text-xs text-accent-purple max-w-[200px] truncate inline-block"
        title={collapsed}
      >
        {collapsed}
      </span>
    );
  }

  return <span className="font-mono text-xs text-fg-primary break-all">{value}</span>;
}

export function inferColumnType(value: CellValue): string {
  if (value === null) return "NULL?";
  if (typeof value === "bigint") return "INT";
  if (typeof value === "number") return Number.isInteger(value) ? "INT" : "REAL";
  if (typeof value === "boolean") return "INT";
  if (value instanceof Uint8Array) return "BLOB";
  if (typeof value === "string") {
    if (tryCollapseJson(value) !== null) return "JSON";
    return "TEXT";
  }
  return "TEXT";
}
