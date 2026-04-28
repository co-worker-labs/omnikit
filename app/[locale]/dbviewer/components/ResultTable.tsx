"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import type {
  CellValue,
  ColumnMeta,
  RowsPayload,
  ExecResult,
} from "../../../../libs/dbviewer/types";
import { PAGE_SIZE, LOAD_ALL_CEILING } from "../../../../libs/dbviewer/constants";
import { ResultCell, inferColumnType } from "./ResultCell";
import { ResultTabs, tabsFromResult } from "./ResultTabs";
import { ExportButtons } from "./ExportButtons";

type SortDir = "asc" | "desc" | null;

interface SortState {
  colIndex: number;
  dir: SortDir;
}

function typeAwareComparator(a: CellValue, b: CellValue): number {
  if (a === null && b !== null) return 1;
  if (a !== null && b === null) return -1;
  if (a === null && b === null) return 0;

  if (typeof a === "bigint" && typeof b === "bigint") return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") {
    return new Intl.Collator(undefined, { sensitivity: "base" }).compare(a, b);
  }

  const sa = a instanceof Uint8Array ? `[BLOB ${a.byteLength}]` : String(a);
  const sb = b instanceof Uint8Array ? `[BLOB ${b.byteLength}]` : String(b);
  return sa.localeCompare(sb);
}

function sortRows(rows: CellValue[][], sort: SortState | null): CellValue[][] {
  if (!sort || sort.dir === null) return rows;
  const { colIndex, dir } = sort;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const cmp = typeAwareComparator(a[colIndex], b[colIndex]);
    return dir === "desc" ? -cmp : cmp;
  });
  return sorted;
}

function findTabResult(execResult: ExecResult, tabIndex: number) {
  return execResult.results.find((r) => r.statementIndex === tabIndex);
}

interface ResultTableProps {
  execResult: ExecResult;
  onLoadMore: (cursorId: string) => Promise<RowsPayload>;
  onExpandLong: (text: string) => void;
}

export function ResultTable({ execResult, onLoadMore, onExpandLong }: ResultTableProps) {
  const t = useTranslations("dbviewer");
  const tabs = tabsFromResult(execResult);
  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].index : 0);

  const [tabRows, setTabRows] = useState<Record<number, CellValue[][]>>(() => {
    const m: Record<number, CellValue[][]> = {};
    for (const r of execResult.results) {
      if (r.kind === "ok") m[r.statementIndex] = r.payload.rows;
    }
    return m;
  });
  const [tabDone, setTabDone] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    for (const r of execResult.results) {
      if (r.kind === "ok") m[r.statementIndex] = r.payload.done;
    }
    return m;
  });
  const [tabCursor, setTabCursor] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {};
    for (const r of execResult.results) {
      if (r.kind === "ok") m[r.statementIndex] = r.payload.cursorId;
    }
    return m;
  });
  const [tabColumns, setTabColumns] = useState<Record<number, ColumnMeta[]>>(() => {
    const m: Record<number, ColumnMeta[]> = {};
    for (const r of execResult.results) {
      if (r.kind === "ok") m[r.statementIndex] = r.payload.columns;
    }
    return m;
  });
  const [tabElapsed, setTabElapsed] = useState<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const r of execResult.results) {
      if (r.kind === "ok") m[r.statementIndex] = r.payload.elapsedMs;
    }
    return m;
  });
  const [ceilingHit, setCeilingHit] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [sort, setSort] = useState<SortState | null>(null);

  const currentResult = findTabResult(execResult, activeTab);
  const columns = tabColumns[activeTab] ?? [];
  const rawRows = tabRows[activeTab] ?? [];
  const rows = sortRows(rawRows, sort);
  const done = tabDone[activeTab] ?? true;
  const cursorId = tabCursor[activeTab];
  const elapsed = tabElapsed[activeTab] ?? 0;

  function cycleSort(colIndex: number) {
    setSort((prev) => {
      if (!prev || prev.colIndex !== colIndex) return { colIndex, dir: "asc" };
      if (prev.dir === "asc") return { colIndex, dir: "desc" };
      return null;
    });
  }

  async function handleLoadMore() {
    if (!cursorId || loadingMore) return;
    setLoadingMore(true);
    try {
      const payload = await onLoadMore(cursorId);
      setTabRows((prev) => {
        const existing = prev[activeTab] ?? [];
        return { ...prev, [activeTab]: existing.concat(payload.rows) };
      });
      setTabDone((prev) => ({ ...prev, [activeTab]: payload.done }));
      setTabElapsed((prev) => ({ ...prev, [activeTab]: payload.elapsedMs }));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleLoadAll() {
    if (!cursorId || loadingMore) return;
    setLoadingMore(true);
    try {
      const allRows: CellValue[][] = [];
      let curId = cursorId;
      let totalLoaded = tabRows[activeTab]?.length ?? 0;
      let isDone = false;
      while (!isDone && totalLoaded < LOAD_ALL_CEILING) {
        const payload = await onLoadMore(curId);
        allRows.push(...payload.rows);
        totalLoaded += payload.rows.length;
        isDone = payload.done;
        curId = payload.cursorId;
        if (totalLoaded >= LOAD_ALL_CEILING) {
          setCeilingHit(true);
          break;
        }
      }
      setTabRows((prev) => {
        const existing = prev[activeTab] ?? [];
        return { ...prev, [activeTab]: existing.concat(allRows) };
      });
      setTabDone((prev) => ({ ...prev, [activeTab]: isDone }));
      setTabElapsed((prev) => ({ ...prev, [activeTab]: 0 }));
    } finally {
      setLoadingMore(false);
    }
  }

  if (currentResult && currentResult.kind !== "ok") {
    const msg = currentResult.kind === "error" ? currentResult.message : currentResult.reason;
    return (
      <div>
        <ResultTabs result={execResult} activeIndex={activeTab} onSelect={setActiveTab} />
        <div className="p-4 text-center">
          <p className="text-sm text-danger">{msg}</p>
          <pre className="mt-2 text-xs text-fg-muted font-mono whitespace-pre-wrap break-all max-w-lg mx-auto">
            {currentResult.sql}
          </pre>
        </div>
      </div>
    );
  }

  if (rows.length === 0 && done) {
    return (
      <div>
        {tabs.length > 1 && (
          <ResultTabs result={execResult} activeIndex={activeTab} onSelect={setActiveTab} />
        )}
        <p className="py-8 text-center text-fg-muted text-sm">{t("result.empty")}</p>
      </div>
    );
  }

  const colTypes = columns.map((_, ci) => {
    for (const row of rawRows) {
      if (row[ci] !== null) return inferColumnType(row[ci]);
    }
    return "NULL?";
  });

  return (
    <div>
      {tabs.length > 1 && (
        <ResultTabs result={execResult} activeIndex={activeTab} onSelect={setActiveTab} />
      )}

      <div
        role="grid"
        className="overflow-auto max-h-[60vh] border border-border-default rounded-lg"
      >
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-bg-elevated z-10 border-b border-border-default">
            <tr>
              {columns.map((col, ci) => (
                <th
                  key={col.name}
                  role="columnheader"
                  aria-sort={
                    sort?.colIndex === ci
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  onClick={() => cycleSort(ci)}
                  className={`px-3 py-2 text-left font-medium text-fg-secondary whitespace-nowrap cursor-pointer select-none hover:bg-bg-input transition-colors ${ci === 0 ? "sticky left-0 bg-bg-elevated z-20" : ""}`}
                >
                  <span className="flex items-center gap-1">
                    <span className="text-fg-primary">{col.name}</span>
                    <span className="text-fg-muted font-normal text-[10px]">{colTypes[ci]}</span>
                    {sort?.colIndex === ci &&
                      (sort.dir === "asc" ? (
                        <ArrowUp size={10} className="text-accent-cyan" />
                      ) : (
                        <ArrowDown size={10} className="text-accent-cyan" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                role="row"
                className="border-b border-border-default/50 hover:bg-bg-input/50 transition-colors"
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    role="gridcell"
                    className={`px-3 py-1.5 max-w-[300px] ${ci === 0 ? "sticky left-0 bg-bg-surface z-10" : ""}`}
                  >
                    <ResultCell value={cell} onExpandLong={onExpandLong} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-fg-secondary">
        <span>
          {t("result.rowsRange", {
            from: 1,
            to: rows.length,
          })}
        </span>
        <span>{t("result.elapsed", { ms: elapsed })}</span>

        {!done && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
            >
              {t("result.loadMore")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleLoadAll()}
              disabled={loadingMore}
            >
              {t("result.loadAll")}
            </Button>
          </>
        )}

        {ceilingHit && <span className="text-amber-500 text-xs">{t("result.loadCeilingHit")}</span>}

        <div className="ml-auto">
          <ExportButtons
            columns={columns}
            rows={rows}
            done={done}
            onLoadAll={() => void handleLoadAll()}
          />
        </div>
      </div>
    </div>
  );
}
