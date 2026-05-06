"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Clipboard, ClipboardCheck, FolderOpen, Upload, X, Download } from "lucide-react";
import Layout from "../../../components/layout";
import { StyledCheckbox } from "../../../components/ui/input";
import { LineNumberedTextarea } from "../../../components/ui/line-numbered-textarea";
import { showToast } from "../../../libs/toast";
import { useDropZone } from "../../../hooks/useDropZone";
import { dedupLines, defaultOptions } from "../../../libs/deduplines/main";
import type { DedupOptions } from "../../../libs/deduplines/main";

function downloadText(content: string, filename: string) {
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

function Conversion() {
  const t = useTranslations("deduplines");
  const tc = useTranslations("common");
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<DedupOptions>(defaultOptions);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dropZone = useDropZone(async (file) => {
    const content = await file.text();
    setInput(content);
    showToast(tc("fileLoaded"), "success", 2000);
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((content) => {
      setInput(content);
      showToast(tc("fileLoaded"), "success", 2000);
    });
    e.target.value = "";
  }

  const result = dedupLines(input, options);
  const hasInput = input.length > 0;
  const hasDuplicates = result.removedCount > 0;

  return (
    <section id="conversion">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-sm font-semibold text-accent-cyan">
            {t("inputTitle")}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <FolderOpen size={12} />
              {tc("loadFile")}
            </button>
            {input && (
              <button
                type="button"
                className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer inline-flex items-center gap-1"
                onClick={() => {
                  setInput("");
                  showToast(tc("cleared"), "danger", 2000);
                }}
              >
                <X size={12} />
                {tc("clear")}
              </button>
            )}
          </div>
        </div>
        <div
          className="relative"
          onDragOver={dropZone.onDragOver}
          onDragEnter={dropZone.onDragEnter}
          onDragLeave={dropZone.onDragLeave}
          onDrop={dropZone.onDrop}
        >
          {dropZone.isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-cyan bg-accent-cyan/5 backdrop-blur-sm pointer-events-none">
              <div className="text-center">
                <Upload size={40} className="mx-auto mb-3 text-accent-cyan" />
                <p className="text-lg font-semibold text-accent-cyan">{tc("dropActive")}</p>
              </div>
            </div>
          )}
          <div className="h-[30vh]">
            <LineNumberedTextarea
              showLineNumbers
              placeholder={t("inputPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.log,.csv,.json,.html,.xml,.yaml,.yml,.text"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StyledCheckbox
          label={t("options.caseSensitive")}
          checked={options.caseSensitive}
          onChange={(e) => setOptions({ ...options, caseSensitive: e.target.checked })}
        />
        <StyledCheckbox
          label={t("options.trimLines")}
          checked={options.trimLines}
          onChange={(e) => setOptions({ ...options, trimLines: e.target.checked })}
        />
        <StyledCheckbox
          label={t("options.removeEmpty")}
          checked={options.removeEmpty}
          onChange={(e) => setOptions({ ...options, removeEmpty: e.target.checked })}
        />
      </div>

      {hasInput && (
        <>
          <div className="mt-3 flex items-center justify-between mb-1.5">
            <span className="font-mono text-sm font-semibold text-accent-cyan">
              {t("outputTitle")}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-fg-secondary text-xs hover:text-accent-cyan transition-colors cursor-pointer inline-flex items-center gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(result.output);
                  setCopied(true);
                  showToast(tc("copied"), "success", 2000);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <ClipboardCheck size={12} className="text-accent-cyan" />
                ) : (
                  <Clipboard size={12} />
                )}
                {tc("copy")}
              </button>
              <button
                type="button"
                className="text-fg-secondary text-xs hover:text-accent-cyan transition-colors cursor-pointer inline-flex items-center gap-1"
                onClick={() => downloadText(result.output, "deduplines.txt")}
              >
                <Download size={12} />
                {tc("download")}
              </button>
            </div>
          </div>
          <div className="h-[30vh]">
            <LineNumberedTextarea
              showLineNumbers
              readOnly
              placeholder={t("outputPlaceholder")}
              value={result.output}
            />
          </div>
          <div className="mt-1.5 text-center text-fg-muted text-sm font-mono">
            {hasDuplicates
              ? t("stats", {
                  original: result.originalCount,
                  result: result.resultCount,
                  removed: result.removedCount,
                })
              : t("statsNoDupes", { original: result.originalCount })}
          </div>
        </>
      )}
    </section>
  );
}

function Description() {
  const t = useTranslations("deduplines");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whatIsP1")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.howTitle")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.howP1")}</p>
          <p>{t("descriptions.howCase")}</p>
          <p>{t("descriptions.howTrim")}</p>
          <p>{t("descriptions.howEmpty")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.useCasesTitle")}
        </h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.useCasesP1")}</p>
          <p>{t("descriptions.useCasesP2")}</p>
          <p>{t("descriptions.useCasesP3")}</p>
        </div>
      </div>
    </section>
  );
}

export default function DeduplinesPage() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  return (
    <Layout title={t("deduplines.shortTitle")}>
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
