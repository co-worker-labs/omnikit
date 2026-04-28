"use client";

import { useState, useEffect, useRef, type DragEvent } from "react";
import json5 from "json5";
import JsonView from "@uiw/react-json-view";
import { IndentIncrease, Minimize2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";

import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledTextarea } from "../../../components/ui/input";
import { showToast } from "../../../libs/toast";
import { byteCraftJsonTheme } from "../../../libs/json-view-theme";

type IndentSize = 2 | 4 | 8;

type JsonError = {
  message: string;
  line?: number;
  column?: number;
};

type ParseResult = {
  value: unknown;
  usedRelaxed: boolean;
};

const INDENT_SIZES: IndentSize[] = [2, 4, 8];

function tryParse(input: string, json5Mode: boolean): ParseResult {
  if (json5Mode) {
    return { value: json5.parse(input), usedRelaxed: true };
  }
  try {
    return { value: JSON.parse(input), usedRelaxed: false };
  } catch {
    return { value: json5.parse(input), usedRelaxed: true };
  }
}

function deepSortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepSortKeys);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = deepSortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function stringify(value: unknown, sortKeys: boolean, indent: string | number): string {
  const target = sortKeys ? deepSortKeys(value) : value;
  return JSON.stringify(target, undefined, indent);
}

function extractError(e: SyntaxError): JsonError {
  // json5 attaches lineNumber/columnNumber directly on the SyntaxError object.
  // V8's JSON.parse encodes "(line L column C)" inside the message string.
  const e2 = e as SyntaxError & { lineNumber?: number; columnNumber?: number };
  if (typeof e2.lineNumber === "number") {
    return { message: e.message, line: e2.lineNumber, column: e2.columnNumber };
  }
  const lc = e.message.match(/line (\d+) column (\d+)/i);
  if (lc) {
    return { message: e.message, line: Number(lc[1]), column: Number(lc[2]) };
  }
  return { message: e.message };
}

function Conversion() {
  const t = useTranslations("json");
  const tc = useTranslations("common");

  const [rawContent, setRawContent] = useState("");
  const [outputContent, setOutputContent] = useState("");
  const [outputValue, setOutputValue] = useState<unknown>(undefined);
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [useTab, setUseTab] = useState(false);
  const [sortKeys, setSortKeys] = useState(false);
  const [json5Mode, setJson5Mode] = useState(false);
  const [error, setError] = useState<JsonError | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [outputMode, setOutputMode] = useState<"none" | "formatted" | "compressed">("none");

  const dragCounterRef = useRef(0);

  // Deferred validation — 500ms debounce with cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!rawContent.trim()) {
        setError(null);
        return;
      }
      try {
        if (json5Mode) {
          json5.parse(rawContent);
        } else {
          JSON.parse(rawContent);
        }
        setError(null);
      } catch (e) {
        if (e instanceof SyntaxError) {
          setError(extractError(e));
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [rawContent, json5Mode]);

  useEffect(() => {
    if (outputMode === "formatted") {
      doFormat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indentSize, useTab, sortKeys]);

  function doFormat() {
    const input = rawContent.trim();
    if (!input) return;
    try {
      const { value, usedRelaxed } = tryParse(input, json5Mode);
      const indent = useTab ? "\t" : indentSize;
      const out = stringify(value, sortKeys, indent);
      setOutputContent(out);
      setOutputValue(sortKeys ? deepSortKeys(value) : value);
      setOutputMode("formatted");
      if (usedRelaxed && !json5Mode) {
        showToast(t("relaxedParse"), "info", 3000);
      } else {
        showToast(t("formatted"), "success", 2000);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError(extractError(e));
        showToast(t("invalid"), "danger", 3000);
      }
    }
  }

  function doCompress() {
    const input = rawContent.trim();
    if (!input) return;
    try {
      const { value, usedRelaxed } = tryParse(input, json5Mode);
      const target = sortKeys ? deepSortKeys(value) : value;
      const out = JSON.stringify(target);
      setOutputContent(out);
      setOutputValue(target);
      setOutputMode("compressed");
      if (usedRelaxed && !json5Mode) {
        showToast(t("relaxedParse"), "info", 3000);
      } else {
        showToast(t("compressed"), "success", 2000);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError(extractError(e));
        showToast(t("invalid"), "danger", 3000);
      }
    }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setRawContent(text);
    setError(null);
    showToast(tc("fileLoaded"), "success", 2000);
  }

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.dataTransfer.dropEffect = "copy";
  }

  function onDragEnter(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    dragCounterRef.current++;
    if (ev.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  async function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = ev.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function doClearAll() {
    setRawContent("");
    setOutputContent("");
    setOutputValue(undefined);
    setOutputMode("none");
    setError(null);
    showToast(tc("allCleared"), "danger", 2000);
  }

  function doBackfill() {
    setRawContent(outputContent);
    showToast(t("filled"), "success", 2000);
  }

  function handleJson5Toggle(checked: boolean) {
    setJson5Mode(checked);
    setOutputContent("");
    setOutputValue(undefined);
    setOutputMode("none");
  }

  const isDisabledAction = !rawContent.trim();
  const isDisabledClear = !rawContent.trim() && !outputContent.trim();
  const isOutputEmpty = !outputContent.trim();

  return (
    <section id="conversion">
      {/* Input Area */}
      <div
        className="relative"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-cyan bg-accent-cyan/5 backdrop-blur-sm pointer-events-none">
            <div className="text-center">
              <Upload size={40} className="mx-auto mb-3 text-accent-cyan" />
              <p className="text-lg font-semibold text-accent-cyan">{tc("dropActive")}</p>
              <p className="text-sm text-fg-muted mt-1">{t("dropZone")}</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
            <span className="font-mono text-sm font-semibold text-accent-cyan">{t("input")}</span>
            <span className="w-px h-4 bg-border-default mx-0.5" />
            <button
              type="button"
              role="switch"
              aria-checked={json5Mode}
              aria-label={t("json5")}
              onClick={() => handleJson5Toggle(!json5Mode)}
              className={
                "rounded-full px-2 py-0.5 text-xs font-semibold transition-colors cursor-pointer border " +
                (json5Mode
                  ? "bg-accent-purple text-bg-base border-accent-purple"
                  : "bg-transparent text-fg-muted border-border-default hover:text-fg-secondary hover:bg-bg-elevated")
              }
            >
              {t("json5")}
            </button>
          </div>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setRawContent("");
              setError(null);
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
        <div className="relative mt-1">
          <StyledTextarea
            id="rawContentTextarea"
            placeholder={t("inputPlaceholder")}
            rows={13}
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => rawContent} className="absolute end-2 top-2" />
        </div>
      </div>

      {/* Options Row */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {/* Indent + Tab pill group */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-fg-muted">{t("indent")}</span>
          <div
            role="radiogroup"
            aria-label={t("indent")}
            className="inline-flex rounded-full border border-border-default overflow-hidden"
          >
            {INDENT_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={!useTab && indentSize === n}
                onClick={() => {
                  setIndentSize(n);
                  setUseTab(false);
                }}
                className={
                  "px-3 py-1 text-sm font-semibold transition-colors cursor-pointer " +
                  (!useTab && indentSize === n
                    ? "bg-accent-cyan text-bg-base"
                    : "bg-transparent text-fg-secondary hover:bg-bg-elevated")
                }
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={useTab}
              onClick={() => setUseTab(true)}
              className={
                "px-3 py-1 text-sm font-semibold transition-colors cursor-pointer " +
                (useTab
                  ? "bg-accent-cyan text-bg-base"
                  : "bg-transparent text-fg-secondary hover:bg-bg-elevated")
              }
            >
              TAB
            </button>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={sortKeys}
          aria-label={t("sortKeys")}
          onClick={() => setSortKeys(!sortKeys)}
          className={
            "rounded-full px-3 py-1 text-sm font-semibold transition-colors cursor-pointer border " +
            (sortKeys
              ? "bg-accent-cyan text-bg-base border-accent-cyan"
              : "bg-transparent text-fg-secondary border-border-default hover:bg-bg-elevated")
          }
        >
          {t("sortKeys")}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 grid grid-cols-3 gap-3 items-center">
        <Button
          variant="primary"
          size="md"
          disabled={isDisabledAction}
          onClick={doFormat}
          className="rounded-full font-bold"
        >
          {t("format")}
          <IndentIncrease size={16} className="ms-1" />
        </Button>
        <Button
          variant="secondary"
          size="md"
          disabled={isDisabledAction}
          onClick={doCompress}
          className="rounded-full font-bold"
        >
          {t("compress")}
          <Minimize2 size={16} className="ms-1" />
        </Button>
        <Button
          variant="danger"
          size="md"
          disabled={isDisabledClear}
          onClick={doClearAll}
          className="rounded-full font-bold"
        >
          {tc("clearAll")}
          <X size={16} className="ms-1" />
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
          ⚠ {error.message}
          {error.line != null &&
            ` (line ${error.line}${error.column != null ? `, col ${error.column}` : ""})`}
        </div>
      )}

      {/* Output Area */}
      <div className="mt-4">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-purple/60" />
            <span className="font-mono text-sm font-semibold text-accent-purple">
              {t("output")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!isOutputEmpty && (
              <button
                type="button"
                className="text-accent-cyan text-xs hover:text-accent-cyan/80 transition-colors cursor-pointer"
                onClick={doBackfill}
              >
                {t("backfill")}
              </button>
            )}
            <button
              type="button"
              className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
              onClick={() => {
                setOutputContent("");
                setOutputValue(undefined);
                setOutputMode("none");
                showToast(tc("cleared"), "danger", 2000);
              }}
            >
              {tc("clear")}
            </button>
          </div>
        </div>
        <div className="relative mt-1">
          {outputMode === "compressed" ? (
            <StyledTextarea
              id="outputContentTextarea"
              placeholder=""
              rows={13}
              value={outputContent}
              readOnly
              className="font-mono text-sm"
            />
          ) : (
            <div className="rounded-xl border border-border-default bg-bg-input px-3 py-2 font-mono text-sm max-h-[60vh] overflow-auto min-h-[30vh]">
              <JsonView
                value={outputValue || ({} as object)}
                style={byteCraftJsonTheme}
                displayDataTypes={false}
                displayObjectSize={true}
                collapsed={false}
                enableClipboard={false}
                shortenTextAfterLength={0}
                indentWidth={(useTab ? 4 : indentSize) * 4}
              />
            </div>
          )}
          <CopyButton getContent={() => outputContent} className="absolute end-2 top-2" />
        </div>
      </div>
    </section>
  );
}

function Description() {
  const t = useTranslations("json");

  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whatIsP1")}</p>
          <p>{t("descriptions.whatIsP2")}</p>
          <p>{t("descriptions.whatIsP3")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.json5Title")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.json5P1")}</p>
          <p>{t("descriptions.json5P2")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">
          {t("descriptions.useCasesTitle")}
        </h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.useCasesP1")}</p>
          <p>{t("descriptions.useCasesP2")}</p>
          <p>{t("descriptions.useCasesP3")}</p>
          <p>{t("descriptions.useCasesP4")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">
          {t("descriptions.limitationsTitle")}
        </h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.limitationsP1")}</p>
          <p>{t("descriptions.limitationsP2")}</p>
          <p>{t("descriptions.limitationsP3")}</p>
        </div>
      </div>
    </section>
  );
}

export default function JsonPage() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  const title = t("json.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <Conversion />
        <Description />
      </div>
    </Layout>
  );
}
