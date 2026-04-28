"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Play, Square, FileText, Minimize2, Trash2, PanelLeftOpen } from "lucide-react";
import {
  EditorView,
  lineNumbers,
  keymap,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { sql, SQLite } from "@codemirror/lang-sql";
import { autocompletion, closeBrackets, completionKeymap } from "@codemirror/autocomplete";
import { Button } from "../../../../components/ui/button";
import { useTheme } from "../../../../libs/theme";
import { lightTheme, darkTheme } from "../../../../libs/dbviewer/codemirror-theme";
import { formatSql, compressSql } from "../../../../libs/dbviewer/format";
import {
  buildSchemaIndex,
  makeCompletionSource,
  type SchemaIndex,
} from "../../../../libs/dbviewer/autocomplete";
import type { SchemaItem, TableSchema } from "../../../../libs/dbviewer/types";
import { getEngine } from "../../../../libs/dbviewer/engine";
import { QueryHistory } from "./QueryHistory";

interface Props {
  schema: SchemaItem[];
  isRunning: boolean;
  onRun: (sql: string) => void;
  onAbort: () => void;
  initialSql?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function SqlEditor({
  schema,
  isRunning,
  onRun,
  onAbort,
  initialSql,
  sidebarCollapsed,
  onToggleSidebar,
}: Props) {
  const t = useTranslations("dbviewer");
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [themeCompartment] = useState(() => new Compartment());
  const [completionCompartment] = useState(() => new Compartment());
  const indexRef = useRef<SchemaIndex | null>(null);
  // Keep latest callback values in refs so the keymap closure never goes stale
  const isRunningRef = useRef(isRunning);
  const onRunRef = useRef(onRun);
  const onAbortRef = useRef(onAbort);

  useEffect(() => {
    isRunningRef.current = isRunning;
    onRunRef.current = onRun;
    onAbortRef.current = onAbort;
  });

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const themeExt = theme === "dark" ? darkTheme : lightTheme;
    const completion = autocompletion({
      override: [makeCompletionSource(() => indexRef.current)],
    });
    const state = EditorState.create({
      doc: initialSql ?? "",
      extensions: [
        lineNumbers(),
        history(),
        highlightActiveLine(),
        drawSelection(),
        closeBrackets(),
        sql({ dialect: SQLite, upperCaseKeywords: true }),
        themeCompartment.of(themeExt),
        completionCompartment.of(completion),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
          {
            key: "Mod-Enter",
            run: (v) => {
              const sel = v.state.selection.main;
              const text =
                sel.from !== sel.to
                  ? v.state.sliceDoc(sel.from, sel.to).trim()
                  : v.state.doc.toString().trim();
              if (text) onRunRef.current(text);
              return true;
            },
          },
          {
            key: "Escape",
            run: () => {
              if (!isRunningRef.current) return false;
              onAbortRef.current();
              return true;
            },
          },
        ]),
      ],
    });
    viewRef.current = new EditorView({ state, parent: hostRef.current });
    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.dispatch({
      effects: themeCompartment.reconfigure(theme === "dark" ? darkTheme : lightTheme),
    });
  }, [theme, themeCompartment]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const perTable: Record<string, TableSchema> = {};
      for (const it of schema) {
        if (it.kind === "table" || it.kind === "view") {
          try {
            perTable[it.name] = await getEngine().tableSchema(it.name);
          } catch {}
        }
      }
      if (cancelled) return;
      indexRef.current = buildSchemaIndex(schema, perTable);
    })();
    return () => {
      cancelled = true;
    };
  }, [schema]);

  function getValue(): string {
    return viewRef.current?.state.doc.toString() ?? "";
  }
  function setValue(text: string) {
    const v = viewRef.current;
    if (!v) return;
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
  }

  function getSelectionOrAll(): string {
    const v = viewRef.current;
    if (!v) return "";
    const sel = v.state.selection.main;
    if (sel.from !== sel.to) return v.state.sliceDoc(sel.from, sel.to).trim();
    return v.state.doc.toString().trim();
  }

  function onClickRun() {
    const text = getSelectionOrAll();
    if (text) onRun(text);
  }
  function onClickFormat() {
    const text = getValue();
    if (!text.trim()) return;
    setValue(formatSql(text));
  }
  function onClickCompress() {
    const text = getValue();
    if (!text.trim()) return;
    setValue(compressSql(text));
  }
  function onClickClear() {
    setValue("");
  }
  function onPickHistory(sql: string) {
    const v = viewRef.current;
    if (!v) return;
    const prev = v.state.doc.toString();
    const separator = prev && !prev.endsWith("\n") ? "\n" : "";
    v.dispatch({
      changes: { from: v.state.doc.length, insert: separator + sql },
    });
  }

  return (
    <div className="flex flex-col rounded-lg border border-border-default bg-bg-elevated">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-default p-2">
        {sidebarCollapsed && onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden md:block p-1 rounded text-fg-muted hover:text-fg-primary hover:bg-bg-input transition-colors"
            title={t("sidebar.expand")}
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        <Button onClick={onClickRun} size="sm" disabled={isRunning}>
          <Play size={14} />
          {t("editor.run")}
        </Button>
        <Button onClick={onAbort} size="sm" variant="danger" disabled={!isRunning}>
          <Square size={14} />
          {t("editor.stop")}
        </Button>
        <Button onClick={onClickFormat} size="sm" variant="outline">
          <FileText size={14} />
          {t("editor.format")}
        </Button>
        <Button onClick={onClickCompress} size="sm" variant="outline">
          <Minimize2 size={14} />
          {t("editor.compress")}
        </Button>
        <Button onClick={onClickClear} size="sm" variant="outline">
          <Trash2 size={14} />
          {t("editor.clear")}
        </Button>
        <div className="ml-auto">
          <QueryHistory onPick={onPickHistory} />
        </div>
      </div>
      <div ref={hostRef} className="min-h-[30vh] max-h-[40vh]" />
    </div>
  );
}
