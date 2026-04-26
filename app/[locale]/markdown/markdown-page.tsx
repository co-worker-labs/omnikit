"use client";

import "../../../styles/prism-theme.css";

import { useEffect, useRef, useState, type ChangeEvent, type UIEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  Download,
  FileImage,
  Printer,
  Trash2,
  Columns2,
  Rows2,
  PanelTop,
} from "lucide-react";
import Layout from "../../../components/layout";
import { Button } from "../../../components/ui/button";
import { CopyButton } from "../../../components/ui/copy-btn";
import { showToast } from "../../../libs/toast";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import { MAX_FILE_BYTES } from "../../../libs/file/limits";
import { isBinaryFile } from "../../../libs/file/binary-sniff";
import { renderMarkdown } from "../../../libs/markdown/render";
import { downloadMd, printPdf, exportPng } from "../../../libs/markdown/export";
import { useIsMobile } from "../../../hooks/use-is-mobile";
import { EditorView } from "./components/EditorView";
import { PreviewView } from "./components/PreviewView";

type ViewMode = "tab" | "horizontal" | "vertical";
type ActiveTab = "edit" | "preview";

interface Persisted {
  viewMode: ViewMode;
}

const DEFAULT_PERSISTED: Persisted = { viewMode: "tab" };
const RENDER_DEBOUNCE_MS = 200;
const AUTO_RENDER_MAX_BYTES = 512 * 1024;

function readPersisted(): Persisted {
  if (typeof window === "undefined") return DEFAULT_PERSISTED;
  const raw = window.localStorage.getItem(STORAGE_KEYS.markdown);
  if (!raw) return DEFAULT_PERSISTED;
  try {
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const vm = parsed.viewMode;
    return {
      viewMode: vm === "horizontal" || vm === "vertical" || vm === "tab" ? vm : "tab",
    };
  } catch {
    return DEFAULT_PERSISTED;
  }
}

function MarkdownPageBody() {
  const t = useTranslations("markdown");
  const tc = useTranslations("common");

  const [markdown, setMarkdown] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_PERSISTED.viewMode);
  const [activeTab, setActiveTab] = useState<ActiveTab>("edit");
  const [renderedHtml, setRenderedHtml] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pendingLargeRender, setPendingLargeRender] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const scrollLockRef = useRef(false);

  const isMobile = useIsMobile();
  const effectiveViewMode: ViewMode = isMobile ? "tab" : viewMode;

  const tooLargeForAuto = markdown.length > AUTO_RENDER_MAX_BYTES;
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const charCount = markdown.length;
  const readMin = Math.max(1, Math.ceil(wordCount / 200));

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const persisted = readPersisted();
    setViewMode(persisted.viewMode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEYS.markdown, JSON.stringify({ viewMode }));
  }, [viewMode, hydrated]);

  useEffect(() => {
    if (!markdown) {
      setRenderedHtml("");
      setPendingLargeRender(false);
      return;
    }
    if (tooLargeForAuto) {
      setPendingLargeRender(true);
      return;
    }
    setPendingLargeRender(false);
    const id = setTimeout(() => {
      setRenderedHtml(renderMarkdown(markdown));
    }, RENDER_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [markdown, tooLargeForAuto]);

  function manualRender() {
    setRenderedHtml(renderMarkdown(markdown));
    setPendingLargeRender(false);
  }

  // ---- File ops ----

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      showToast(t("tooLarge"), "danger", 3000);
      return;
    }
    const binary = await isBinaryFile(file);
    if (binary) {
      showToast(t("binaryRejected"), "danger", 3000);
      return;
    }
    const text = await file.text();
    setMarkdown(text);
    showToast(t("fileLoaded"), "success", 2000);
  }

  function onPickFile(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (file) void handleFile(file);
  }

  function onDownload() {
    if (!markdown) {
      showToast(t("nothingToExport"), "danger", 2000);
      return;
    }
    downloadMd(markdown);
  }

  async function onExportPng() {
    if (!renderedHtml || !previewRef.current) {
      showToast(t("nothingToExport"), "danger", 2000);
      return;
    }
    try {
      await exportPng(previewRef.current);
      showToast(t("pngFontNotice"), "success", 3500);
    } catch {
      showToast(t("exportFailed"), "danger", 3000);
    }
  }

  function onClearAll() {
    setMarkdown("");
    setRenderedHtml("");
    showToast(tc("allCleared"), "danger", 2000);
  }

  // ---- Scroll sync (Split modes only) ----

  function syncScroll(src: HTMLElement, dst: HTMLElement) {
    if (scrollLockRef.current) return;
    scrollLockRef.current = true;
    const denom = src.scrollHeight - src.clientHeight;
    const ratio = denom > 0 ? src.scrollTop / denom : 0;
    dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight);
    requestAnimationFrame(() => {
      scrollLockRef.current = false;
    });
  }

  function onEditorScroll(ev: UIEvent<HTMLTextAreaElement>) {
    if (effectiveViewMode === "tab") return;
    if (!previewRef.current) return;
    syncScroll(ev.currentTarget, previewRef.current);
  }

  function onPreviewScroll(ev: UIEvent<HTMLDivElement>) {
    if (effectiveViewMode === "tab") return;
    if (!editorRef.current) return;
    syncScroll(ev.currentTarget, editorRef.current);
  }

  // ---- Layout ----

  const editorEl = (
    <EditorView
      value={markdown}
      onChange={setMarkdown}
      placeholder={t("placeholder")}
      scrollRef={editorRef}
      onScroll={onEditorScroll}
    />
  );

  const previewEl = (
    <PreviewView
      ref={previewRef}
      html={renderedHtml}
      emptyMessage={pendingLargeRender ? t("renderTooLarge") : t("emptyPreview")}
      onScroll={onPreviewScroll}
    />
  );

  let contentArea;
  if (effectiveViewMode === "tab") {
    contentArea = (
      <div className="h-[55vh]">
        {activeTab === "edit" ? (
          <div data-no-print className="h-full">
            {editorEl}
          </div>
        ) : (
          previewEl
        )}
      </div>
    );
  } else if (effectiveViewMode === "horizontal") {
    contentArea = (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[55vh]">
        <div data-no-print className="h-full min-h-0">
          {editorEl}
        </div>
        <div className="h-full min-h-0">{previewEl}</div>
      </div>
    );
  } else {
    contentArea = (
      <div className="flex flex-col gap-4">
        <div data-no-print className="h-[28vh]">
          {editorEl}
        </div>
        <div className="h-[28vh]">{previewEl}</div>
      </div>
    );
  }

  // ---- Render ----

  return (
    <>
      <div
        data-no-print
        className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4"
      >
        <span className="text-sm text-fg-secondary leading-relaxed">
          {tc("alert.notTransferred")}
        </span>
      </div>

      <div data-no-print className="flex flex-wrap items-center gap-2 my-3">
        {/* Tab switcher */}
        {effectiveViewMode === "tab" && (
          <div className="inline-flex border border-border-default rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`px-3 py-1.5 text-sm transition-colors ${activeTab === "edit" ? "bg-accent-cyan text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
            >
              {t("edit")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 text-sm transition-colors ${activeTab === "preview" ? "bg-accent-cyan text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
            >
              {t("preview")}
            </button>
          </div>
        )}

        {/* View mode (desktop only) */}
        {!isMobile && (
          <div className="inline-flex border border-border-default rounded-lg overflow-hidden">
            <button
              type="button"
              title={t("viewMode.tab")}
              onClick={() => setViewMode("tab")}
              className={`px-2 py-1.5 transition-colors ${viewMode === "tab" ? "bg-accent-purple-dim text-accent-purple" : "text-fg-muted hover:bg-bg-elevated"}`}
            >
              <PanelTop size={16} />
            </button>
            <button
              type="button"
              title={t("viewMode.horizontal")}
              onClick={() => setViewMode("horizontal")}
              className={`px-2 py-1.5 transition-colors ${viewMode === "horizontal" ? "bg-accent-purple-dim text-accent-purple" : "text-fg-muted hover:bg-bg-elevated"}`}
            >
              <Columns2 size={16} />
            </button>
            <button
              type="button"
              title={t("viewMode.vertical")}
              onClick={() => setViewMode("vertical")}
              className={`px-2 py-1.5 transition-colors ${viewMode === "vertical" ? "bg-accent-purple-dim text-accent-purple" : "text-fg-muted hover:bg-bg-elevated"}`}
            >
              <Rows2 size={16} />
            </button>
          </div>
        )}

        {/* Actions */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          className="hidden"
          onChange={onPickFile}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} />
          {t("loadFile")}
        </Button>
        <Button variant="outline" size="sm" onClick={onDownload} disabled={!markdown}>
          <Download size={14} />
          {t("downloadFile")}
        </Button>
        <CopyButton getContent={() => renderedHtml} />
        <Button variant="outline" size="sm" onClick={printPdf} disabled={!renderedHtml}>
          <Printer size={14} />
          {t("exportPdf")}
        </Button>
        <Button variant="outline" size="sm" onClick={onExportPng} disabled={!renderedHtml}>
          <FileImage size={14} />
          {t("exportPng")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onClearAll}
          disabled={!markdown}
          className="ml-auto"
        >
          <Trash2 size={14} />
          {tc("clearAll")}
        </Button>
      </div>

      {pendingLargeRender && (
        <div
          data-no-print
          className="flex items-center justify-between gap-3 my-2 px-3 py-2 border border-accent-purple/50 rounded-lg bg-accent-purple-dim/20 text-sm text-fg-secondary"
        >
          <span>{t("renderTooLarge")}</span>
          <Button variant="primary" size="sm" onClick={manualRender}>
            {t("renderNow")}
          </Button>
        </div>
      )}

      {contentArea}

      <div
        data-no-print
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted font-mono"
      >
        <span>{t("wordsCount", { count: wordCount })}</span>
        <span>·</span>
        <span>{t("charsCount", { count: charCount })}</span>
        <span>·</span>
        <span>{t("readTime", { min: readMin })}</span>
      </div>
    </>
  );
}

function Description() {
  const t = useTranslations("markdown");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whatIsP1")}</p>
        </div>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.howTitle")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.howP1")}</p>
        </div>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.gfmTitle")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.gfmP1")}</p>
        </div>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">
          {t("descriptions.privacyTitle")}
        </h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.privacyP1")}</p>
        </div>
      </div>
    </section>
  );
}

export default function MarkdownPage() {
  const tTools = useTranslations("tools");
  const title = tTools("markdown.shortTitle");
  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <MarkdownPageBody />
        <Description />
      </div>
    </Layout>
  );
}
