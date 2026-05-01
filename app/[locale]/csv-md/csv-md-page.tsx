"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Columns2,
  Download,
  Eye,
  FolderOpen,
  PenLine,
  Table2,
  Upload,
  X,
  ArrowUpDown,
} from "lucide-react";
import { useTranslations } from "next-intl";

import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledTextarea } from "../../../components/ui/input";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { useDropZone } from "../../../hooks/useDropZone";
import { showToast } from "../../../libs/toast";
import { csvMdConvert, type ColumnAlignment } from "../../../libs/csv/csv-md-convert";
import { csvParse } from "../../../libs/csv/csv-parse";
import { renderMarkdown } from "../../../libs/markdown/render";

// --- Types ---

type ParseError = { message: string };

type Delimiter = "," | "\t" | ";" | "|";

const DELIMITERS: { value: Delimiter; labelKey: string }[] = [
  { value: ",", labelKey: "delimiterComma" },
  { value: "\t", labelKey: "delimiterTab" },
  { value: ";", labelKey: "delimiterSemicolon" },
  { value: "|", labelKey: "delimiterPipe" },
];

const ALIGNMENTS: { value: ColumnAlignment; labelKey: string }[] = [
  { value: "left", labelKey: "alignmentLeft" },
  { value: "center", labelKey: "alignmentCenter" },
  { value: "right", labelKey: "alignmentRight" },
  { value: "none", labelKey: "alignmentNone" },
];

// --- CsvPreview Component ---

interface CsvPreviewProps {
  csvContent: string;
  csvError: ParseError | null;
}

function CsvPreview({ csvContent, csvError }: CsvPreviewProps) {
  const t = useTranslations("csv-md");
  const [isExpanded, setIsExpanded] = useState(false);
  const prevEmptyRef = useRef(true);

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

// --- Helper: file download ---

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

// --- Conversion Component ---

function Conversion() {
  const t = useTranslations("csv-md");
  const tc = useTranslations("common");

  const [csvContent, setCsvContent] = useState("");
  const [mdContent, setMdContent] = useState("");
  const [csvError, setCsvError] = useState<ParseError | null>(null);
  const [mdError, setMdError] = useState<ParseError | null>(null);
  const [delimiter, setDelimiter] = useState<Delimiter>(",");
  const [alignment, setAlignment] = useState<ColumnAlignment>("none");
  const [mdPreviewMode, setMdPreviewMode] = useState<"edit" | "preview">("edit");
  const [layoutDirection, setLayoutDirection] = useState<"horizontal" | "vertical">("horizontal");

  const csvFileRef = useRef<HTMLInputElement>(null);
  const mdFileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const effectiveLayout = isMobile ? "vertical" : layoutDirection;

  // Derived state
  const isDisabledCsvToMd = !csvContent.trim();
  const isDisabledMdToCsv = !mdContent.trim();
  const isDisabledClear = !csvContent.trim() && !mdContent.trim();

  // --- Drop Zones ---

  const csvDrop = useDropZone(async (file) => {
    const text = await file.text();
    setCsvContent(text);
    setCsvError(null);
  });

  const mdDrop = useDropZone(async (file) => {
    const text = await file.text();
    setMdContent(text);
    setMdError(null);
  });

  // --- Validation: 500ms debounce ---

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!csvContent.trim()) {
        setCsvError(null);
        return;
      }
      const result = csvMdConvert(csvContent, "csv", "markdown", { delimiter });
      if (result.error) {
        setCsvError({ message: result.error });
      } else {
        setCsvError(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [csvContent, delimiter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mdContent.trim()) {
        setMdError(null);
        return;
      }
      const result = csvMdConvert(mdContent, "markdown", "csv");
      if (result.error) {
        setMdError({ message: result.error });
      } else {
        setMdError(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [mdContent]);

  // --- Conversion Functions ---

  function doCsvToMd() {
    const input = csvContent.trim();
    if (!input) return;
    const result = csvMdConvert(input, "csv", "markdown", { delimiter, alignment });
    if (result.error) {
      setCsvError({ message: result.error });
      return;
    }
    setMdContent(result.output);
    setMdError(null);
  }

  function doMdToCsv() {
    const input = mdContent.trim();
    if (!input) return;
    const result = csvMdConvert(input, "markdown", "csv", { delimiter });
    if (result.error) {
      setMdError({ message: result.error });
      return;
    }
    setCsvContent(result.output);
    setCsvError(null);
  }

  function doClearAll() {
    setCsvContent("");
    setMdContent("");
    setCsvError(null);
    setMdError(null);
  }

  // --- File Load ---

  async function handleCsvFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvContent(text);
    setCsvError(null);
    e.target.value = "";
  }

  async function handleMdFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMdContent(text);
    setMdError(null);
    e.target.value = "";
  }

  // --- Markdown Preview ---

  const mdHtml = mdContent.trim() ? renderMarkdown(mdContent) : "";

  // --- Input Areas ---

  const csvInputArea = (
    <div
      className="relative"
      onDragOver={csvDrop.onDragOver}
      onDragEnter={csvDrop.onDragEnter}
      onDragLeave={csvDrop.onDragLeave}
      onDrop={csvDrop.onDrop}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
          <span className="font-mono text-sm font-semibold text-accent-cyan">CSV</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => csvFileRef.current?.click()}
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors inline-flex items-center gap-1"
          >
            <FolderOpen size={12} /> {t("loadFile")}
          </button>
          {csvContent.trim() && (
            <>
              <button
                type="button"
                onClick={() => downloadFile(csvContent, "data.csv")}
                className="text-fg-secondary text-xs hover:text-fg-primary transition-colors inline-flex items-center gap-1"
              >
                <Download size={12} /> {t("download")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCsvContent("");
                  setCsvError(null);
                  showToast(tc("cleared"), "danger", 2000);
                }}
                className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
              >
                {tc("clear")}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="relative">
        <StyledTextarea
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder={t("csvPlaceholder")}
          className="font-mono text-sm"
          rows={isMobile ? 10 : undefined}
          style={!isMobile ? { height: "50vh" } : undefined}
        />
        <div className="absolute end-2 top-2">
          <CopyButton getContent={() => csvContent} />
        </div>
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
      {csvDrop.isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-cyan bg-accent-cyan/5 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Upload size={40} className="mx-auto mb-3 text-accent-cyan" />
            <p className="text-lg font-semibold text-accent-cyan">{tc("dropActive")}</p>
            <p className="text-sm text-fg-muted mt-1">{t("dropZoneCsv")}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Markdown edit/preview toggle
  const mdToggleIcon = (
    <button
      type="button"
      onClick={() => setMdPreviewMode(mdPreviewMode === "edit" ? "preview" : "edit")}
      className="text-fg-muted hover:text-accent-cyan transition-colors duration-200 cursor-pointer"
      title={mdPreviewMode === "edit" ? t("previewMode") : t("edit")}
    >
      {mdPreviewMode === "edit" ? <Eye size={16} /> : <PenLine size={16} />}
    </button>
  );

  const mdInputArea = (
    <div
      className="relative"
      onDragOver={mdDrop.onDragOver}
      onDragEnter={mdDrop.onDragEnter}
      onDragLeave={mdDrop.onDragLeave}
      onDrop={mdDrop.onDrop}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-purple/60" />
          <span className="font-mono text-sm font-semibold text-accent-purple">Markdown</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => mdFileRef.current?.click()}
            className="text-fg-secondary text-xs hover:text-fg-primary transition-colors inline-flex items-center gap-1"
          >
            <FolderOpen size={12} /> {t("loadFile")}
          </button>
          {mdContent.trim() && (
            <>
              <button
                type="button"
                onClick={() => downloadFile(mdContent, "table.md")}
                className="text-fg-secondary text-xs hover:text-fg-primary transition-colors inline-flex items-center gap-1"
              >
                <Download size={12} /> {t("download")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMdContent("");
                  setMdError(null);
                  showToast(tc("cleared"), "danger", 2000);
                }}
                className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
              >
                {tc("clear")}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="relative">
        {mdPreviewMode === "edit" ? (
          <div className="relative">
            <StyledTextarea
              value={mdContent}
              onChange={(e) => setMdContent(e.target.value)}
              placeholder={t("mdPlaceholder")}
              className="font-mono text-sm"
              rows={isMobile ? 10 : undefined}
              style={!isMobile ? { height: "50vh" } : undefined}
            />
            <div className="absolute end-2 top-2 flex items-center gap-1">
              {mdToggleIcon}
              <CopyButton getContent={() => mdContent} />
            </div>
          </div>
        ) : (
          <div
            className="prose-md min-h-[50vh] bg-bg-input border border-border-default rounded-lg p-4 overflow-auto"
            style={!isMobile ? { height: "50vh" } : undefined}
          >
            {mdHtml ? (
              <div dangerouslySetInnerHTML={{ __html: mdHtml }} />
            ) : (
              <p className="text-fg-muted text-center mt-20">{t("emptyPreview")}</p>
            )}
          </div>
        )}
        <div className="absolute end-2 top-2">{mdPreviewMode === "preview" && mdToggleIcon}</div>
      </div>
      <input
        ref={mdFileRef}
        type="file"
        accept=".md,.txt"
        className="hidden"
        onChange={handleMdFileLoad}
      />
      {mdError && (
        <div role="alert" aria-live="polite" className="text-danger text-sm mt-2">
          ⚠ {mdError.message}
        </div>
      )}
      {mdDrop.isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-purple bg-accent-purple/5 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Upload size={40} className="mx-auto mb-3 text-accent-purple" />
            <p className="text-lg font-semibold text-accent-purple">{tc("dropActive")}</p>
            <p className="text-sm text-fg-muted mt-1">{t("dropZoneMd")}</p>
          </div>
        </div>
      )}
    </div>
  );

  // --- Action Buttons ---

  const actionButtons = (
    <div className="flex flex-col gap-3 items-center justify-center">
      <Button
        variant="primary"
        disabled={isDisabledCsvToMd}
        onClick={doCsvToMd}
        className="rounded-full font-bold w-full"
      >
        {t("csvToMd")}
      </Button>
      <Button
        variant="secondary"
        disabled={isDisabledMdToCsv}
        onClick={doMdToCsv}
        className="rounded-full font-bold w-full"
      >
        {t("mdToCsv")}
      </Button>
      <Button
        variant="danger"
        disabled={isDisabledClear}
        onClick={doClearAll}
        className="rounded-full font-bold w-full"
      >
        {tc("clearAll")} <X size={16} className="ms-1" />
      </Button>
    </div>
  );

  const actionButtonsRow = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
      <Button
        variant="primary"
        disabled={isDisabledCsvToMd}
        onClick={doCsvToMd}
        className="rounded-full font-bold"
      >
        {t("csvToMd")}
      </Button>
      <Button
        variant="secondary"
        disabled={isDisabledMdToCsv}
        onClick={doMdToCsv}
        className="rounded-full font-bold"
      >
        {t("mdToCsv")}
      </Button>
      <Button
        variant="danger"
        disabled={isDisabledClear}
        onClick={doClearAll}
        className="rounded-full font-bold"
      >
        {tc("clearAll")} <X size={16} className="ms-1" />
      </Button>
    </div>
  );

  return (
    <>
      {/* Dual Panel */}
      {effectiveLayout === "vertical" ? (
        <div className="flex flex-col gap-4">
          {csvInputArea}
          {actionButtonsRow}
          {mdInputArea}
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
          <div className="min-w-0">{csvInputArea}</div>
          <div className="flex items-center">{actionButtons}</div>
          <div className="min-w-0">{mdInputArea}</div>
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
                    layoutDirection === v
                      ? "bg-accent-purple text-bg-base shadow-glow"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                  onClick={() => setLayoutDirection(v)}
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
          {/* Delimiter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-fg-secondary">
              {t("delimiter")}
            </span>
            <div
              role="radiogroup"
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

          {/* Alignment */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-fg-secondary">
              {t("alignment")}
            </span>
            <div
              role="radiogroup"
              className="inline-flex rounded-full border border-border-default p-0.5 text-xs font-mono font-semibold"
            >
              {ALIGNMENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  role="radio"
                  aria-checked={alignment === a.value}
                  onClick={() => setAlignment(a.value)}
                  className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                    alignment === a.value
                      ? "bg-accent-cyan text-bg-base shadow-glow"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                >
                  {t(a.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CsvPreview */}
      <CsvPreview csvContent={csvContent} csvError={csvError} />
    </>
  );
}

// --- Description Component ---

function Description() {
  const t = useTranslations("csv-md");

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

// --- Main Page Component ---

export default function CsvMdPage() {
  const t = useTranslations("tools");

  return (
    <Layout title={t("csv-md.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <Conversion />
        <Description />
      </div>
    </Layout>
  );
}
