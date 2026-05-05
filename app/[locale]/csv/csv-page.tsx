"use client";

import { useEffect, useRef, useState } from "react";
import {
  Columns2,
  ArrowUpDown,
  ChevronDown,
  Download,
  FolderOpen,
  Table2,
  Upload,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledTextarea, StyledCheckbox } from "../../../components/ui/input";
import { showToast } from "../../../libs/toast";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { useDropZone } from "../../../hooks/useDropZone";
import { convert } from "../../../libs/csv/convert";
import { csvParse } from "../../../libs/csv/csv-parse";

// --- Types ---

type ParseError = {
  message: string;
};

type IndentSize = 2 | 4 | 8;
type Delimiter = "," | "\t" | ";" | "|";

const INDENT_SIZES: IndentSize[] = [2, 4, 8];
const DELIMITERS: { value: Delimiter; labelKey: string }[] = [
  { value: ",", labelKey: "delimiterComma" },
  { value: "\t", labelKey: "delimiterTab" },
  { value: ";", labelKey: "delimiterSemicolon" },
  { value: "|", labelKey: "delimiterPipe" },
];

// --- CSV Preview Component ---

interface CsvPreviewProps {
  csvContent: string;
  csvError: ParseError | null;
}

function CsvPreview({ csvContent, csvError }: CsvPreviewProps) {
  const t = useTranslations("csv");
  const [isExpanded, setIsExpanded] = useState(false);
  const prevEmptyRef = useRef(true);

  // Auto-expand when content transitions from empty to non-empty
  useEffect(() => {
    const isEmpty = !csvContent.trim() || !!csvError;
    if (prevEmptyRef.current && !isEmpty) {
      setIsExpanded(true);
    }
    prevEmptyRef.current = isEmpty;
  }, [csvContent, csvError]);

  if (!csvContent.trim() || csvError) return null;

  const result = csvParse(csvContent);
  if (result.errors.length > 0 || result.data.length === 0) return null;

  const headers = Object.keys(result.data[0]);
  if (headers.length === 0) return null;

  const totalRows = result.data.length;
  const MAX_ROWS = 100;
  const displayData = result.data.slice(0, MAX_ROWS);
  const isTruncated = totalRows > MAX_ROWS;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left py-2 cursor-pointer group"
      >
        <Table2 size={14} className="text-fg-secondary" />
        <span className="text-sm font-semibold text-fg-secondary group-hover:text-fg-primary transition-colors">
          {t("preview")}
        </span>
        <span className="text-xs text-fg-muted font-mono">
          ({totalRows.toLocaleString()} {t("rows", { count: totalRows })})
        </span>
        <ChevronDown
          size={14}
          className={`text-fg-muted ml-auto transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`transition-all duration-200 ${isExpanded ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
      >
        <div className="overflow-auto max-h-[50vh] rounded-lg border border-border-default">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-elevated sticky top-0 z-10">
                {headers.map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2 text-left font-semibold text-fg-secondary border-b border-border-default whitespace-nowrap text-xs uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-border-default hover:bg-bg-input/50 transition-colors ${i % 2 === 1 ? "bg-bg-input/30" : ""}`}
                >
                  {headers.map((header) => (
                    <td
                      key={header}
                      className="px-3 py-2 font-mono text-sm max-w-[300px] truncate"
                      title={row[header] == null ? "" : String(row[header])}
                    >
                      {row[header] == null ? "" : String(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-fg-muted text-xs py-2 px-1">
          {isTruncated
            ? t("showingRows", { shown: MAX_ROWS, total: totalRows })
            : `${totalRows.toLocaleString()} ${t("rows", { count: totalRows })}`}
        </div>
      </div>
    </div>
  );
}

// --- Conversion Component ---

function Conversion() {
  const t = useTranslations("csv");
  const tc = useTranslations("common");

  const [jsonContent, setJsonContent] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [jsonError, setJsonError] = useState<ParseError | null>(null);
  const [csvError, setCsvError] = useState<ParseError | null>(null);
  const [layoutMode, setLayoutMode] = useState<"horizontal" | "vertical">("horizontal");
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [delimiter, setDelimiter] = useState<Delimiter>(",");
  const [nestedJson, setNestedJson] = useState(false);

  const jsonFileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const effectiveLayout = isMobile ? "vertical" : layoutMode;

  // Derived state
  const isDisabledJsonToCsv = !jsonContent.trim();
  const isDisabledCsvToJson = !csvContent.trim();
  const isDisabledClear = !jsonContent.trim() && !csvContent.trim();

  // --- Drop Zones ---

  const jsonDrop = useDropZone(async (file) => {
    const text = await file.text();
    setJsonContent(text);
    setJsonError(null);
    showToast(tc("fileLoaded"), "success", 2000);
  });

  const csvDrop = useDropZone(async (file) => {
    const text = await file.text();
    setCsvContent(text);
    setCsvError(null);
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
        JSON.parse(jsonContent);
        setJsonError(null);
      } catch (e) {
        const msg = e instanceof SyntaxError ? e.message : "Invalid JSON";
        setJsonError({ message: msg });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [jsonContent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!csvContent.trim()) {
        setCsvError(null);
        return;
      }
      const result = convert(csvContent, "csv", "json");
      if (result.error) {
        setCsvError({ message: result.error });
      } else {
        setCsvError(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [csvContent]);

  // --- Conversion Functions ---

  function doJsonToCsv() {
    const input = jsonContent.trim();
    if (!input) return;
    const result = convert(input, "json", "csv", { delimiter });
    if (result.error) {
      setJsonError({ message: result.error });
      showToast(t("invalidInput"), "danger", 3000);
      return;
    }
    setCsvContent(result.output);
    setCsvError(null);
    showToast(t("convertedToCsv"), "success", 2000);
  }

  function doCsvToJson() {
    const input = csvContent.trim();
    if (!input) return;
    const result = convert(input, "csv", "json", { indent: indentSize, unflatten: nestedJson });
    if (result.error) {
      setCsvError({ message: result.error });
      showToast(t("invalidInput"), "danger", 3000);
      return;
    }
    setJsonContent(result.output);
    setJsonError(null);
    showToast(t("convertedToJson"), "success", 2000);
  }

  // --- Handlers ---

  function doClearAll() {
    setJsonContent("");
    setCsvContent("");
    setJsonError(null);
    setCsvError(null);
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

  async function handleCsvFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvContent(text);
    setCsvError(null);
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
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1"
            onClick={() => jsonFileRef.current?.click()}
          >
            <FolderOpen size={12} />
            {tc("loadFile")}
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
        accept=".json,.txt"
        className="hidden"
        onChange={handleJsonFileLoad}
      />
      {jsonError && (
        <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
          ⚠ {jsonError.message}
        </div>
      )}
    </div>
  );

  const actionButtons = (
    <div className="flex flex-col gap-3 items-center justify-center">
      <Button
        variant="primary"
        size="md"
        disabled={isDisabledJsonToCsv}
        onClick={doJsonToCsv}
        className="rounded-full font-bold w-full"
      >
        {t("jsonToCsv")}
      </Button>
      <Button
        variant="secondary"
        size="md"
        disabled={isDisabledCsvToJson}
        onClick={doCsvToJson}
        className="rounded-full font-bold w-full"
      >
        {t("csvToJson")}
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
        disabled={isDisabledJsonToCsv}
        onClick={doJsonToCsv}
        className="rounded-full font-bold"
      >
        {t("jsonToCsv")}
      </Button>
      <Button
        variant="secondary"
        size="md"
        disabled={isDisabledCsvToJson}
        onClick={doCsvToJson}
        className="rounded-full font-bold"
      >
        {t("csvToJson")}
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

  const csvInputArea = (
    <div
      className="relative"
      onDragOver={csvDrop.onDragOver}
      onDragEnter={csvDrop.onDragEnter}
      onDragLeave={csvDrop.onDragLeave}
      onDrop={csvDrop.onDrop}
    >
      {csvDrop.isDragging && (
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
          <span className="font-mono text-sm font-semibold text-accent-purple">CSV</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1"
            onClick={() => csvFileRef.current?.click()}
          >
            <FolderOpen size={12} />
            {tc("loadFile")}
          </button>
          <button
            type="button"
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!csvContent.trim()}
            onClick={() => downloadFile(csvContent, "data.csv")}
          >
            <Download size={12} />
            {t("download")}
          </button>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setCsvContent("");
              setCsvError(null);
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
      </div>
      <div className="relative mt-1">
        <StyledTextarea
          id="csvContentTextarea"
          placeholder={t("csvPlaceholder")}
          rows={effectiveLayout === "horizontal" ? 1 : 13}
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          className={`font-mono text-sm ${effectiveLayout === "horizontal" ? "h-[50vh]" : ""}`}
        />
        <CopyButton getContent={() => csvContent} className="absolute end-2 top-2" />
      </div>
      <input
        ref={csvFileRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={handleCsvFileLoad}
      />
      {csvError && (
        <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
          ⚠ {csvError.message}
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
          {csvInputArea}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {jsonInputArea}
          {actionButtonsRow}
          {csvInputArea}
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
          {/* Indent size */}
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

          {/* Delimiter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-fg-secondary">
              {t("delimiter")}
            </span>
            <div
              role="radiogroup"
              aria-label={t("delimiter")}
              className="inline-flex rounded-full border border-border-default p-0.5 text-xs font-mono font-semibold"
            >
              {DELIMITERS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={delimiter === d.value}
                  onClick={() => setDelimiter(d.value)}
                  className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                    delimiter === d.value
                      ? "bg-accent-cyan text-bg-base shadow-glow"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                >
                  {t(d.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Nested JSON */}
          <StyledCheckbox
            label={t("nestedJson")}
            checked={nestedJson}
            onChange={() => setNestedJson(!nestedJson)}
            className="py-2"
          />
        </div>
      </div>

      {/* CSV table preview */}
      <CsvPreview csvContent={csvContent} csvError={csvError} />
    </section>
  );
}

function Description() {
  const t = useTranslations("csv");

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
          {t("descriptions.csvVsJsonTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.csvVsJsonP1")}</p>
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

export default function CsvPage() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  const title = t("csv.shortTitle");

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
