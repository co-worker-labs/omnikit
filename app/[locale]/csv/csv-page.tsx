"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { Button } from "../../../components/ui/button";
import { StyledTextarea } from "../../../components/ui/input";
import { CopyButton } from "../../../components/ui/copy-btn";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { showToast } from "../../../libs/toast";
import { MAX_FILE_BYTES } from "../../../libs/file/limits";
import { isBinaryFile } from "../../../libs/file/binary-sniff";
import { convert, type Format } from "../../../libs/csv/convert";

const DEBOUNCE_MS = 500;

const FORMAT_OPTIONS: { key: Format; labelKey: string }[] = [
  { key: "json", labelKey: "formatJson" },
  { key: "csv", labelKey: "formatCsv" },
  { key: "markdown", labelKey: "formatMarkdown" },
];

const ACCEPT_MAP: Record<Format, string> = {
  json: ".json",
  csv: ".csv,.tsv,.txt",
  markdown: ".md,.txt",
};

const EXT_MAP: Record<Format, string> = {
  json: ".json",
  csv: ".csv",
  markdown: ".md",
};

function FormatSelector({
  selected,
  disabled,
  onChange,
  t,
}: {
  selected: Format;
  disabled?: Format;
  onChange: (f: Format) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex gap-1">
      {FORMAT_OPTIONS.map(({ key, labelKey }) => {
        const isActive = key === selected;
        const isDisabled = key === disabled;
        return (
          <Button
            key={key}
            variant={isActive ? "primary" : "outline"}
            size="sm"
            disabled={isDisabled}
            onClick={() => onChange(key)}
            className={isDisabled ? "opacity-40 cursor-not-allowed" : ""}
          >
            {t(labelKey)}
          </Button>
        );
      })}
    </div>
  );
}

function CsvPageBody() {
  const t = useTranslations("csv");
  const tc = useTranslations("common");
  const isMobile = useIsMobile();

  const [inputFormat, setInputFormat] = useState<Format>("json");
  const [outputFormat, setOutputFormat] = useState<Format>("csv");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time conversion with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!inputText.trim()) {
        setOutputText("");
        setError(null);
        return;
      }

      const result = convert(inputText, inputFormat, outputFormat);
      if (result.error) {
        setOutputText(result.error);
        setError(result.error);
      } else {
        setOutputText(result.output);
        setError(null);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [inputText, inputFormat, outputFormat]);

  // File handling
  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      showToast(t("fileTooLarge"), "danger");
      return;
    }
    if (await isBinaryFile(file)) {
      showToast(t("binaryRejected"), "danger");
      return;
    }
    const text = await file.text();
    setInputText(text);
    showToast(t("fileLoaded"), "success");
  }

  // Drag & drop handlers
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) setIsDragging(true);
    }
  }

  function onDragLeave() {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // Paste from clipboard
  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch {
      showToast(tc("copyFailed"), "danger");
    }
  }

  // Download output as file
  function handleDownload() {
    const ext = EXT_MAP[outputFormat];
    const mimeType = outputFormat === "json" ? "application/json" : "text/plain";
    const blob = new Blob([outputText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setInputText("");
    setOutputText("");
    setError(null);
  }

  return (
    <div className={isMobile ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
      {/* Input Panel */}
      <div
        className={`relative rounded-lg border p-4 transition-colors ${
          isDragging
            ? "border-accent-cyan shadow-[0_0_12px_rgba(6,214,160,0.3)]"
            : "border-border-default"
        }`}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-between mb-3">
          <FormatSelector selected={inputFormat} onChange={setInputFormat} t={t} />
          <span className="text-xs text-fg-muted">{t("input")}</span>
        </div>

        <StyledTextarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("inputPlaceholder")}
          className="min-h-[300px] font-mono text-sm"
          rows={12}
        />

        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={handleClear}>
            {t("clear")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {t("upload")}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePaste}>
            {t("paste")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_MAP[inputFormat]}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-base/80 rounded-lg border-2 border-dashed border-accent-cyan">
            <p className="text-accent-cyan font-medium">{t("dropHere")}</p>
          </div>
        )}
      </div>

      {/* Output Panel */}
      <div className="rounded-lg border border-border-default p-4">
        <div className="flex items-center justify-between mb-3">
          <FormatSelector
            selected={outputFormat}
            disabled={inputFormat}
            onChange={setOutputFormat}
            t={t}
          />
          <span className="text-xs text-fg-muted">{t("output")}</span>
        </div>

        <StyledTextarea
          value={outputText}
          readOnly
          placeholder={t("outputPlaceholder")}
          className={`min-h-[300px] font-mono text-sm ${error ? "text-danger" : ""}`}
          rows={12}
        />

        <div className="flex gap-2 mt-3">
          <CopyButton getContent={() => outputText} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!outputText || !!error}
          >
            {t("download")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Description() {
  const t = useTranslations("csv");

  return (
    <div className="mt-8 space-y-6 text-sm text-fg-secondary">
      <div>
        <h3 className="font-semibold text-fg-primary mb-2">{t("descriptions.whatIsTitle")}</h3>
        <p>{t("descriptions.whatIsP1")}</p>
        <p className="mt-2">{t("descriptions.whatIsP2")}</p>
      </div>
      <div>
        <h3 className="font-semibold text-fg-primary mb-2">{t("descriptions.howTitle")}</h3>
        <p>{t("descriptions.howP1")}</p>
        <p className="mt-2">{t("descriptions.howP2")}</p>
      </div>
      <div>
        <h3 className="font-semibold text-fg-primary mb-2">{t("descriptions.supportedTitle")}</h3>
        <p>{t("descriptions.supportedP1")}</p>
      </div>
      <div>
        <h3 className="font-semibold text-fg-primary mb-2">{t("descriptions.limitationsTitle")}</h3>
        <p>{t("descriptions.limitationsP1")}</p>
      </div>
    </div>
  );
}

export default function CsvPage() {
  const tTools = useTranslations("tools");
  const tc = useTranslations("common");
  return (
    <Layout title={tTools("csv.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <CsvPageBody />
        <Description />
      </div>
    </Layout>
  );
}
