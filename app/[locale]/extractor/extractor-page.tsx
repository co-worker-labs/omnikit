"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, FolderOpen, Upload, X } from "lucide-react";
import Layout from "../../../components/layout";
import { StyledTextarea, StyledCheckbox } from "../../../components/ui/input";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { showToast } from "../../../libs/toast";
import { useDropZone } from "../../../hooks/useDropZone";
import { extract, type ExtractorType, type ExtractionResult } from "../../../libs/extractor/main";

const TYPE_COLORS: Record<ExtractorType, string> = {
  email: "bg-[#06d6a0]/15 text-[#06d6a0] border-[#06d6a0]/30",
  url: "bg-[#8b5cf6]/15 text-[#8b5cf6] border-[#8b5cf6]/30",
  phone: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30",
};

const TYPE_ACTIVE_COLORS: Record<ExtractorType, string> = {
  email: "bg-[#06d6a0]/20 text-[#06d6a0] border-[#06d6a0] ring-1 ring-[#06d6a0]/40",
  url: "bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6] ring-1 ring-[#8b5cf6]/40",
  phone: "bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6] ring-1 ring-[#3b82f6]/40",
};

const TOGGLE_KEYS: ExtractorType[] = ["email", "url", "phone"];

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Conversion() {
  const t = useTranslations("extractor");
  const tc = useTranslations("common");
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enabledTypes, setEnabledTypes] = useState<Set<ExtractorType>>(
    new Set(["email", "url", "phone"])
  );
  const [showDuplicates, setShowDuplicates] = useState(false);

  const dropZone = useDropZone(async (file) => {
    const text = await file.text();
    setInput(text);
    showToast(tc("fileLoaded"), "success", 2000);
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      setInput(text);
      showToast(tc("fileLoaded"), "success", 2000);
    });
    e.target.value = "";
  }

  const rawResults = extract(input, [...enabledTypes]);

  const dedupMap = new Map<string, { result: ExtractionResult; count: number }>();
  for (const r of rawResults) {
    const existing = dedupMap.get(r.value);
    if (existing) {
      existing.count++;
    } else {
      dedupMap.set(r.value, { result: r, count: 1 });
    }
  }

  const displayResults = showDuplicates ? rawResults : [...dedupMap.values()].map((d) => d.result);

  const stats = {
    email: rawResults.filter((r) => r.type === "email").length,
    url: rawResults.filter((r) => r.type === "url").length,
    phone: rawResults.filter((r) => r.type === "phone").length,
    total: rawResults.length,
    unique: dedupMap.size,
  };

  const hasResults = displayResults.length > 0;
  const hasInput = input.trim().length > 0;

  function toggleType(type: ExtractorType) {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function getExportValues(): string[] {
    return displayResults.map((r) => r.value);
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(getExportValues().join("\n"));
    showToast(t("copied"), "success");
  }

  function handleExportCsv() {
    const header = '"type","value"';
    const rows = displayResults.map((r) => `"${r.type}","${r.value.replace(/"/g, '""')}"`);
    downloadFile([header, ...rows].join("\n"), "extracted.csv", "text/csv");
    showToast(t("downloaded"), "success");
  }

  function handleExportJson() {
    const data = displayResults.map((r) => ({ type: r.type, value: r.value }));
    downloadFile(JSON.stringify(data, null, 2), "extracted.json", "application/json");
    showToast(t("downloaded"), "success");
  }

  return (
    <section id="conversion">
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
              <p className="text-sm text-fg-muted mt-1">{t("dropZone")}</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-1.5">
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
        <StyledTextarea
          autoFocus
          value={input}
          placeholder={t("inputPlaceholder")}
          onChange={(e) => setInput(e.target.value)}
          className="text-sm font-mono h-[30vh]"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.log,.md,.json,.html,.xml,.yaml,.yml,.text"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {TOGGLE_KEYS.map((type) => {
          const active = enabledTypes.has(type);
          const labelKey = `toggle${type.charAt(0).toUpperCase() + type.slice(1)}` as const;
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                active
                  ? TYPE_ACTIVE_COLORS[type]
                  : "bg-bg-elevated/40 text-fg-muted border-border-default hover:border-border-subtle"
              }`}
            >
              {t(labelKey)}
              {active && <span className="text-[10px]">✓</span>}
            </button>
          );
        })}
        <div className="ml-auto">
          <StyledCheckbox
            checked={showDuplicates}
            onChange={(e) => setShowDuplicates(e.target.checked)}
            label={t("showDuplicates")}
          />
        </div>
      </div>

      {hasInput && (
        <>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="text-sm text-fg-secondary font-medium">
              {showDuplicates
                ? t("resultsCountAll", { total: stats.total })
                : t("resultsCount", { unique: stats.unique, total: stats.total })}
            </span>
            {hasResults && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Button
                  variant="outline-cyan"
                  size="sm"
                  onClick={handleCopyAll}
                  className="gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {t("copyAll")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
                  {t("exportCsv")}
                </Button>
                <Button
                  variant="outline-purple"
                  size="sm"
                  onClick={handleExportJson}
                  className="gap-1.5"
                >
                  {t("exportJson")}
                </Button>
              </div>
            )}
          </div>

          {hasResults ? (
            <div className="mt-3 rounded-lg border border-border-default overflow-hidden">
              <div className="divide-y divide-border-default">
                {displayResults.map((r, i) => {
                  const dupInfo = dedupMap.get(r.value);
                  const count = dupInfo ? dupInfo.count : 1;
                  return (
                    <div
                      key={`${r.value}-${i}`}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-accent-cyan/5 transition-colors"
                    >
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${TYPE_COLORS[r.type]}`}
                      >
                        {t(`type${r.type.charAt(0).toUpperCase() + r.type.slice(1)}` as const)}
                      </span>
                      <span className="flex-1 font-mono text-sm break-all">{r.value}</span>
                      {!showDuplicates && count > 1 && (
                        <span className="text-xs text-fg-muted font-mono">
                          {t("occurrences", { count })}
                        </span>
                      )}
                      <CopyButton
                        getContent={() => r.value}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-center py-8 text-fg-muted text-sm">{t("noResults")}</div>
          )}

          {hasResults && (
            <div className="flex flex-wrap items-center gap-4 mt-3 px-1 text-xs text-fg-muted font-mono">
              {stats.email > 0 && <span>{t("summaryEmails", { count: stats.email })}</span>}
              {stats.url > 0 && <span>{t("summaryUrls", { count: stats.url })}</span>}
              {stats.phone > 0 && <span>{t("summaryPhones", { count: stats.phone })}</span>}
              <span className="ml-auto">
                {t("summaryUnique", { count: stats.unique })} /{" "}
                {t("summaryTotal", { count: stats.total })}
              </span>
            </div>
          )}
        </>
      )}

      {!hasInput && (
        <div className="mt-4 text-center py-8 text-fg-muted text-sm">{t("emptyState")}</div>
      )}
    </section>
  );
}

function Description() {
  const t = useTranslations("extractor");
  return (
    <section id="reference" className="mt-6">
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-border-default" />
        <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
          {t("descriptions.formatsTitle")}
        </span>
        <div className="flex-1 h-px bg-border-default" />
      </div>
      <div className="rounded-lg border border-border-default overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-bg-elevated/40">
              <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                {t("descriptions.formatsTitle")}
              </th>
              <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                {t("descriptions.formatsTableHeader")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(["email", "url", "phone"] as const).map((type) => {
              const labelKey = `formats${type.charAt(0).toUpperCase() + type.slice(1)}` as const;
              const descKey = `formats${type.charAt(0).toUpperCase() + type.slice(1)}Desc` as const;
              return (
                <tr
                  key={type}
                  className="border-b border-border-default last:border-b-0 odd:bg-bg-elevated/40 hover:bg-accent-cyan/10"
                >
                  <th
                    scope="row"
                    className="py-2.5 px-4 text-fg-secondary text-xs font-mono font-medium text-left whitespace-nowrap"
                  >
                    {t(`descriptions.${labelKey}`)}
                  </th>
                  <td className="py-2.5 px-4 text-sm text-fg-secondary">
                    {t(`descriptions.${descKey}`)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <h3 className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
          {t("descriptions.tipsTitle")}
        </h3>
        <ul className="space-y-1 text-sm text-fg-secondary">
          <li>• {t("descriptions.tip1")}</li>
          <li>• {t("descriptions.tip2")}</li>
          <li>• {t("descriptions.tip3")}</li>
          <li>• {t("descriptions.tip4")}</li>
        </ul>
      </div>
    </section>
  );
}

export default function ExtractorPage() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  return (
    <Layout title={t("extractor.shortTitle")}>
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
