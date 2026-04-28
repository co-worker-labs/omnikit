"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { showToast } from "../../../libs/toast";
import { useDatabase } from "../../../libs/dbviewer/engine";
import type { ExecResult, RowsPayload } from "../../../libs/dbviewer/types";
import { PAGE_SIZE } from "../../../libs/dbviewer/constants";
import { FileUpload } from "./components/FileUpload";
import { DatabaseInfoBar } from "./components/DatabaseInfoBar";
import { TableSidebar } from "./components/TableSidebar";
import { SqlEditor } from "./components/SqlEditor";
import { ResultTable } from "./components/ResultTable";
import { StatusOverlay } from "./components/StatusOverlay";
import { LongTextModal } from "./components/LongTextModal";

const DEFAULT_SIDEBAR_WIDTH = 256;
const COLLAPSE_THRESHOLD = 80;

export default function DbViewerPage() {
  const tTools = useTranslations("tools");
  const tc = useTranslations("common");
  const t = useTranslations("dbviewer");
  const db = useDatabase();

  const [execResult, setExecResult] = useState<ExecResult | null>(null);
  const [longText, setLongText] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const prevWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sidebarCollapsed = sidebarWidth < COLLAPSE_THRESHOLD;

  const isOpen = db.status === "open";
  const isRunning = db.status === "running";
  const isInitializing = db.status === "initializing";
  const hasError = db.status === "error";

  const toggleSidebar = useCallback(() => {
    if (sidebarCollapsed) {
      setSidebarWidth(prevWidthRef.current);
    } else {
      prevWidthRef.current = sidebarWidth;
      setSidebarWidth(0);
    }
  }, [sidebarCollapsed, sidebarWidth]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const container = containerRef.current;

      function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientX - startX;
        let next = startWidth + delta;
        const maxW = container ? container.offsetWidth / 2 : 600;
        if (next < 0) next = 0;
        if (next > maxW) next = maxW;
        setSidebarWidth(next);
      }
      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [sidebarWidth]
  );

  async function handleFile(buffer: ArrayBuffer, name: string) {
    try {
      await db.open(buffer, name);
      setExecResult(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : tc("error.generic"), "danger", 4000);
    }
  }

  async function handleRun(sql: string) {
    try {
      const result = await db.exec(sql, PAGE_SIZE);
      setExecResult(result);
    } catch (e) {
      showToast(e instanceof Error ? e.message : tc("error.generic"), "danger", 4000);
    }
  }

  async function handleLoadMore(cursorId: string): Promise<RowsPayload> {
    return db.fetchMore(cursorId, PAGE_SIZE);
  }

  async function handleAbort() {
    await db.abort();
    setExecResult(null);
    showToast(t("result.aborted"), "info", 2000);
  }

  async function handleClose() {
    await db.close();
    setExecResult(null);
  }

  function handleRunSelect(sql: string) {
    void handleRun(sql);
  }

  const title = tTools("dbviewer.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        {!isOpen && !isInitializing && !hasError && !isRunning && (
          <FileUpload onFile={handleFile} disabled={isInitializing} />
        )}

        {isInitializing && <StatusOverlay variant="initializing" />}

        {hasError && db.lastError && <StatusOverlay variant="error" errorMessage={db.lastError} />}

        {(isOpen || isRunning) && db.dbInfo && (
          <>
            <DatabaseInfoBar info={db.dbInfo} onClose={() => void handleClose()} />

            <div ref={containerRef} className="mt-4 flex flex-col md:flex-row gap-4 md:gap-0">
              <TableSidebar
                items={db.schema}
                onRunSelect={handleRunSelect}
                width={sidebarWidth}
                onToggle={toggleSidebar}
                collapsed={sidebarCollapsed}
              />
              {!sidebarCollapsed && (
                <div
                  onMouseDown={handleResizeStart}
                  className="hidden md:flex w-2 shrink-0 cursor-col-resize items-center justify-center hover:bg-accent-cyan/20 transition-colors rounded-sm"
                >
                  <div className="h-8 w-0.5 rounded-full bg-border-default" />
                </div>
              )}

              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <SqlEditor
                  schema={db.schema}
                  isRunning={isRunning}
                  onRun={(sql) => void handleRun(sql)}
                  onAbort={() => void handleAbort()}
                  sidebarCollapsed={sidebarCollapsed}
                  onToggleSidebar={toggleSidebar}
                />

                {isRunning && (
                  <StatusOverlay variant="running" onAbort={() => void handleAbort()} />
                )}

                {execResult && !isRunning && (
                  <ResultTable
                    execResult={execResult}
                    onLoadMore={handleLoadMore}
                    onExpandLong={setLongText}
                  />
                )}
              </div>
            </div>
          </>
        )}

        <LongTextModal
          text={longText ?? ""}
          open={longText !== null}
          onClose={() => setLongText(null)}
        />
      </div>
    </Layout>
  );
}
