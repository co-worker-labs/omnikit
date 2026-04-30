"use client";

import { useState, useEffect, useRef, type DragEvent } from "react";
import { stringify, parseAllDocuments } from "yaml";
import json5 from "json5";
import { Columns2, ArrowUpDown, Download, FolderOpen, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";

import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledTextarea, StyledCheckbox } from "../../../components/ui/input";
import { showToast } from "../../../libs/toast";
import { useIsMobile } from "../../../hooks/use-is-mobile";

// --- Types ---

type IndentSize = 2 | 4 | 8;

type ParseError = {
  message: string;
  line?: number;
  column?: number;
};

const INDENT_SIZES: IndentSize[] = [2, 4, 8];

// --- Core Logic ---

// Try strict JSON first, fallback to JSON5 (matches JSON tool pattern)
function tryParseJson(input: string, json5Mode: boolean): unknown {
  if (json5Mode) return json5.parse(input);
  try {
    return JSON.parse(input);
  } catch {
    return json5.parse(input);
  }
}

// Deep sort object keys recursively (same as JSON tool)
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

// Extract error info — works for both JSON and YAML parse errors
// linePos is optional on YAMLError — only populated when prettyErrors=true (default)
function extractError(e: unknown): ParseError {
  if (e && typeof e === "object" && "message" in e) {
    const err = e as { message: string; linePos?: [{ line: number; col: number }] };
    if (err.linePos?.[0]) {
      return { message: err.message, line: err.linePos[0].line, column: err.linePos[0].col };
    }
    return { message: err.message };
  }
  return { message: String(e) };
}

// --- Drop Zone Hook ---

function useDropZone(onFile: (file: File) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const counterRef = useRef(0);

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.dataTransfer.dropEffect = "copy";
  }

  function onDragEnter(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    counterRef.current++;
    if (ev.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    counterRef.current--;
    if (counterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    counterRef.current = 0;
    setIsDragging(false);
    const file = ev.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return { isDragging, onDragOver, onDragEnter, onDragLeave, onDrop };
}

// --- Conversion Component ---

function Conversion() {
  const t = useTranslations("yaml");
  const tc = useTranslations("common");

  const [jsonContent, setJsonContent] = useState("");
  const [yamlContent, setYamlContent] = useState("");
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [json5Mode, setJson5Mode] = useState(false);
  const [jsonError, setJsonError] = useState<ParseError | null>(null);
  const [yamlError, setYamlError] = useState<ParseError | null>(null);
  const [layoutMode, setLayoutMode] = useState<"horizontal" | "vertical">("horizontal");

  const jsonFileRef = useRef<HTMLInputElement>(null);
  const yamlFileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const effectiveLayout = isMobile ? "vertical" : layoutMode;

  // Derived state
  const isDisabledJsonToYaml = !jsonContent.trim();
  const isDisabledYamlToJson = !yamlContent.trim();
  const isDisabledClear = !jsonContent.trim() && !yamlContent.trim();

  // --- Drop Zones ---

  const jsonDrop = useDropZone(async (file) => {
    const text = await file.text();
    setJsonContent(text);
    setJsonError(null);
    showToast(tc("fileLoaded"), "success", 2000);
  });

  const yamlDrop = useDropZone(async (file) => {
    const text = await file.text();
    setYamlContent(text);
    setYamlError(null);
    showToast(tc("fileLoaded"), "success", 2000);
  });

  // --- Validation: 500ms debounce, separate for each side ---

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!jsonContent.trim()) {
        setJsonError(null);
        return;
      }
      try {
        tryParseJson(jsonContent, json5Mode);
        setJsonError(null);
      } catch (e) {
        setJsonError(extractError(e));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [jsonContent, json5Mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!yamlContent.trim()) {
        setYamlError(null);
        return;
      }
      try {
        const docs = parseAllDocuments(yamlContent);
        for (const doc of docs) {
          if (doc.errors.length > 0) throw doc.errors[0];
        }
        setYamlError(null);
      } catch (e) {
        setYamlError(extractError(e));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [yamlContent]);

  // --- Conversion Functions ---

  function doJsonToYaml() {
    const input = jsonContent.trim();
    if (!input) return;
    try {
      const parsed = tryParseJson(input, json5Mode);
      const target = sortKeys ? deepSortKeys(parsed) : parsed;
      const out = stringify(target, { indentSeq: true, lineWidth: 120, indent: indentSize });
      setYamlContent(out);
      setYamlError(null);
      showToast(t("convertedToYaml"), "success", 2000);
    } catch (e) {
      if (e instanceof SyntaxError || (e && typeof e === "object" && "message" in e)) {
        setJsonError(extractError(e));
        showToast(t("invalidInput"), "danger", 3000);
      }
    }
  }

  function doYamlToJson() {
    const input = yamlContent.trim();
    if (!input) return;
    try {
      const docs = parseAllDocuments(input);
      let results = docs.map((d) => d.toJSON());
      if (sortKeys) results = deepSortKeys(results) as typeof results;
      const data = results.length === 1 ? results[0] : results;
      const out = JSON.stringify(data, null, indentSize);
      setJsonContent(out);
      setJsonError(null);
      showToast(t("convertedToJson"), "success", 2000);
    } catch (e) {
      if (e && typeof e === "object" && "message" in e) {
        setYamlError(extractError(e));
        showToast(t("invalidInput"), "danger", 3000);
      }
    }
  }

  // --- Handlers ---

  function doClearAll() {
    setJsonContent("");
    setYamlContent("");
    setJsonError(null);
    setYamlError(null);
    showToast(tc("allCleared"), "danger", 2000);
  }

  async function handleJsonFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setJsonContent(text);
    setJsonError(null);
    showToast(tc("fileLoaded"), "success", 2000);
    e.target.value = "";
  }

  async function handleYamlFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setYamlContent(text);
    setYamlError(null);
    showToast(tc("fileLoaded"), "success", 2000);
    e.target.value = "";
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Render ---

  const jsonInputArea = (
    <div
      className="relative"
      onDragOver={jsonDrop.onDragOver}
      onDragEnter={jsonDrop.onDragEnter}
      onDragLeave={jsonDrop.onDragLeave}
      onDrop={jsonDrop.onDrop}
    >
      {jsonDrop.isDragging && (
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
          <span className="font-mono text-sm font-semibold text-accent-cyan">JSON</span>
          <span className="w-px h-4 bg-border-default mx-0.5" />
          <button
            type="button"
            role="switch"
            aria-checked={json5Mode}
            aria-label={t("json5")}
            onClick={() => setJson5Mode(!json5Mode)}
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1"
            onClick={() => jsonFileRef.current?.click()}
          >
            <FolderOpen size={12} />
            {t("loadFile")}
          </button>
          <button
            type="button"
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!jsonContent.trim()}
            onClick={() => downloadFile(jsonContent, "data.json")}
          >
            <Download size={12} />
            {t("download")}
          </button>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setJsonContent("");
              setJsonError(null);
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
      </div>
      <div className="relative mt-1">
        <StyledTextarea
          id="jsonContentTextarea"
          placeholder={t("jsonPlaceholder")}
          rows={effectiveLayout === "horizontal" ? 1 : 13}
          value={jsonContent}
          onChange={(e) => setJsonContent(e.target.value)}
          className={`font-mono text-sm ${effectiveLayout === "horizontal" ? "h-[50vh]" : ""}`}
        />
        <CopyButton getContent={() => jsonContent} className="absolute end-2 top-2" />
      </div>
      <input
        ref={jsonFileRef}
        type="file"
        accept=".json,.json5,.txt"
        className="hidden"
        onChange={handleJsonFileLoad}
      />
      {jsonError && (
        <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
          ⚠ {jsonError.message}
          {jsonError.line != null &&
            ` (line ${jsonError.line}${jsonError.column != null ? `, col ${jsonError.column}` : ""})`}
        </div>
      )}
    </div>
  );

  const actionButtons = (
    <div className="flex flex-col gap-3 items-center justify-center">
      <Button
        variant="primary"
        size="md"
        disabled={isDisabledJsonToYaml}
        onClick={doJsonToYaml}
        className="rounded-full font-bold w-full"
      >
        {t("jsonToYaml")}
      </Button>
      <Button
        variant="secondary"
        size="md"
        disabled={isDisabledYamlToJson}
        onClick={doYamlToJson}
        className="rounded-full font-bold w-full"
      >
        {t("yamlToJson")}
      </Button>
      <Button
        variant="danger"
        size="md"
        disabled={isDisabledClear}
        onClick={doClearAll}
        className="rounded-full font-bold w-full"
      >
        {tc("clearAll")}
        <X size={16} className="ms-1" />
      </Button>
    </div>
  );

  const actionButtonsRow = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
      <Button
        variant="primary"
        size="md"
        disabled={isDisabledJsonToYaml}
        onClick={doJsonToYaml}
        className="rounded-full font-bold"
      >
        {t("jsonToYaml")}
      </Button>
      <Button
        variant="secondary"
        size="md"
        disabled={isDisabledYamlToJson}
        onClick={doYamlToJson}
        className="rounded-full font-bold"
      >
        {t("yamlToJson")}
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
  );

  const yamlInputArea = (
    <div
      className="relative"
      onDragOver={yamlDrop.onDragOver}
      onDragEnter={yamlDrop.onDragEnter}
      onDragLeave={yamlDrop.onDragLeave}
      onDrop={yamlDrop.onDrop}
    >
      {yamlDrop.isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-purple bg-accent-purple/5 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Upload size={40} className="mx-auto mb-3 text-accent-purple" />
            <p className="text-lg font-semibold text-accent-purple">{tc("dropActive")}</p>
            <p className="text-sm text-fg-muted mt-1">{t("dropZone")}</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-purple/60" />
          <span className="font-mono text-sm font-semibold text-accent-purple">YAML</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1"
            onClick={() => yamlFileRef.current?.click()}
          >
            <FolderOpen size={12} />
            {t("loadFile")}
          </button>
          <button
            type="button"
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!yamlContent.trim()}
            onClick={() => downloadFile(yamlContent, "data.yaml")}
          >
            <Download size={12} />
            {t("download")}
          </button>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setYamlContent("");
              setYamlError(null);
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
      </div>
      <div className="relative mt-1">
        <StyledTextarea
          id="yamlContentTextarea"
          placeholder={t("yamlPlaceholder")}
          rows={effectiveLayout === "horizontal" ? 1 : 13}
          value={yamlContent}
          onChange={(e) => setYamlContent(e.target.value)}
          className={`font-mono text-sm ${effectiveLayout === "horizontal" ? "h-[50vh]" : ""}`}
        />
        <CopyButton getContent={() => yamlContent} className="absolute end-2 top-2" />
      </div>
      <input
        ref={yamlFileRef}
        type="file"
        accept=".yaml,.yml,.txt"
        className="hidden"
        onChange={handleYamlFileLoad}
      />
      {yamlError && (
        <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
          ⚠ {yamlError.message}
          {yamlError.line != null &&
            ` (line ${yamlError.line}${yamlError.column != null ? `, col ${yamlError.column}` : ""})`}
        </div>
      )}
    </div>
  );

  return (
    <section id="conversion">
      {effectiveLayout === "horizontal" ? (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
          {jsonInputArea}
          <div className="flex items-center">{actionButtons}</div>
          {yamlInputArea}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {jsonInputArea}
          {actionButtonsRow}
          {yamlInputArea}
        </div>
      )}

      {/* Advanced Settings */}
      <div className="mt-6 px-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-accent-purple" />
            <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {t("advancedSettings")}
            </span>
          </div>
          {!isMobile && (
            <div className="flex items-center rounded-full border border-border-default p-0.5 text-xs font-mono font-semibold">
              {(["horizontal", "vertical"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                    layoutMode === v
                      ? "bg-accent-purple text-bg-base shadow-glow"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                  onClick={() => setLayoutMode(v)}
                >
                  <span className="flex items-center gap-1.5">
                    {v === "horizontal" ? <Columns2 size={14} /> : <ArrowUpDown size={14} />}
                    {t(v === "horizontal" ? "layoutHorizontal" : "layoutVertical")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-full h-px bg-border-default" />
        <div className="flex flex-wrap items-center gap-6 px-3 mt-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-fg-secondary">{t("indent")}</span>
            <div
              role="radiogroup"
              aria-label={t("indent")}
              className="inline-flex rounded-full border border-border-default p-0.5 text-xs font-mono font-semibold"
            >
              {INDENT_SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={indentSize === n}
                  onClick={() => setIndentSize(n)}
                  className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                    indentSize === n
                      ? "bg-accent-cyan text-bg-base shadow-glow"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <StyledCheckbox
            label={t("sortKeys")}
            checked={sortKeys}
            onChange={() => setSortKeys(!sortKeys)}
            className="py-2"
          />
        </div>
      </div>
    </section>
  );
}

// --- Description Component ---

function Description() {
  const t = useTranslations("yaml");

  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whatIsP1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.yamlVsJsonTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.yamlVsJsonP1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.yaml12Title")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.yaml12P1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.useCasesTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.useCasesP1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.limitationsTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.limitationsP1")}</p>
        </div>
      </div>
    </section>
  );
}

// --- Page Export ---

export default function YamlPage() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  const title = t("yaml.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        {/* Privacy alert banner */}
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
