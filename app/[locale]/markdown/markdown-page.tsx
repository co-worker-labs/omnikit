"use client";

import "../../../styles/prism-theme.css";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type UIEvent } from "react";
import { useTranslations } from "next-intl";
import { Upload, Download, FileDown, FileImage, Printer, Trash2, Columns2 } from "lucide-react";
import Layout from "../../../components/layout";
import { Button } from "../../../components/ui/button";
import { Dropdown } from "../../../components/ui/dropdown";
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

type EditorMode = "edit" | "preview" | "split";

interface Persisted {
  editorMode: EditorMode;
}

const DEFAULT_PERSISTED: Persisted = { editorMode: "preview" };
const RENDER_DEBOUNCE_MS = 200;
const AUTO_RENDER_MAX_BYTES = 512 * 1024;

function readPersisted(): Persisted {
  if (typeof window === "undefined") return DEFAULT_PERSISTED;
  const raw = window.localStorage.getItem(STORAGE_KEYS.markdown);
  if (!raw) return DEFAULT_PERSISTED;
  try {
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const em = parsed.editorMode;
    return {
      editorMode: em === "edit" || em === "preview" || em === "split" ? em : "preview",
    };
  } catch {
    return DEFAULT_PERSISTED;
  }
}

function MarkdownPageBody() {
  const t = useTranslations("markdown");
  const tc = useTranslations("common");

  const [markdown, setMarkdown] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>(DEFAULT_PERSISTED.editorMode);
  const [renderedHtml, setRenderedHtml] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pendingLargeRender, setPendingLargeRender] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragCounterRef = useRef(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const scrollLockRef = useRef(false);

  const isMobile = useIsMobile();

  const tooLargeForAuto = markdown.length > AUTO_RENDER_MAX_BYTES;
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const charCount = markdown.length;
  const readMin = wordCount ? Math.max(1, Math.ceil(wordCount / 200)) : 0;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const persisted = readPersisted();
    setEditorMode(isMobile && persisted.editorMode === "split" ? "preview" : persisted.editorMode);
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEYS.markdown, JSON.stringify({ editorMode }));
  }, [editorMode, hydrated]);

  useEffect(() => {
    if (isMobile && editorMode === "split") {
      setEditorMode("preview");
    }
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

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
      showToast(tc("tooLarge"), "danger", 3000);
      return;
    }
    const binary = await isBinaryFile(file);
    if (binary) {
      showToast(tc("binaryRejected"), "danger", 3000);
      return;
    }
    const text = await file.text();
    setMarkdown(text);
    showToast(tc("fileLoaded"), "success", 2000);
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
    showToast(tc("cleared"), "danger", 2000);
  }

  // ---- Drag and drop ----

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
    if (editorMode !== "split") return;
    if (!previewRef.current) return;
    syncScroll(ev.currentTarget, previewRef.current);
  }

  function onPreviewScroll(ev: UIEvent<HTMLDivElement>) {
    if (editorMode !== "split") return;
    if (!editorRef.current) return;
    syncScroll(ev.currentTarget, editorRef.current);
  }

  // ---- Layout ----

  const modeToolbarEl = (
    <div className="inline-flex border border-border-default rounded-lg overflow-hidden bg-bg-surface/90 shadow-sm">
      <button
        type="button"
        onClick={() => setEditorMode("edit")}
        className={`px-2 py-1 text-xs transition-colors ${editorMode === "edit" ? "bg-accent-cyan text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
      >
        {t("edit")}
      </button>
      <button
        type="button"
        onClick={() => setEditorMode("preview")}
        className={`px-2 py-1 text-xs transition-colors ${editorMode === "preview" ? "bg-accent-cyan text-bg-base" : "text-fg-secondary hover:bg-bg-elevated"}`}
      >
        {t("preview")}
      </button>
      <button
        type="button"
        onClick={() => setEditorMode("split")}
        disabled={isMobile}
        title={isMobile ? undefined : t("split")}
        className={`px-2 py-1 text-xs transition-colors ${editorMode === "split" ? "bg-accent-purple-dim text-accent-purple" : "text-fg-secondary hover:bg-bg-elevated"} ${isMobile ? "opacity-30 cursor-not-allowed" : ""}`}
      >
        <Columns2 size={12} className="inline-block mr-0.5" />
        {t("split")}
      </button>
    </div>
  );

  const editorEl = (
    <div className="relative">
      <EditorView
        value={markdown}
        onChange={setMarkdown}
        placeholder={t("placeholder")}
        scrollRef={editorRef}
        onScroll={onEditorScroll}
      />
      <div className="absolute top-3 right-3 z-10">{modeToolbarEl}</div>
    </div>
  );

  const previewEl = (
    <div className="relative">
      <PreviewView
        ref={previewRef}
        html={renderedHtml}
        emptyMessage={pendingLargeRender ? t("renderTooLarge") : t("emptyPreview")}
        onScroll={onPreviewScroll}
      />
      <div className="absolute top-3 right-3 z-10">{modeToolbarEl}</div>
    </div>
  );

  let contentArea;
  if (editorMode === "edit") {
    contentArea = (
      <div data-no-print className="min-h-[50vh]">
        {editorEl}
      </div>
    );
  } else if (editorMode === "preview") {
    contentArea = <div className="min-h-[50vh]">{previewEl}</div>;
  } else {
    contentArea = (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div data-no-print className="min-h-[50vh] min-w-0">
          {editorEl}
        </div>
        <div className="min-h-[50vh] min-w-0">{previewEl}</div>
      </div>
    );
  }

  // ---- Render ----

  return (
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
      <div
        data-no-print
        className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4"
      >
        <span className="text-sm text-fg-secondary leading-relaxed">
          {tc("alert.notTransferred")}
        </span>
      </div>

      <div data-no-print className="flex flex-wrap items-center gap-2 my-3">
        {/* Actions */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          className="hidden"
          onChange={onPickFile}
        />
        <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} />
          {t("loadFile")}
        </Button>
        <Button variant="secondary" size="sm" onClick={onDownload} disabled={!markdown}>
          <Download size={14} />
          {t("downloadFile")}
        </Button>
        <CopyButton getContent={() => renderedHtml} alwaysShow label={tc("copy")} />
        {!markdown ? (
          <Button variant="primary" size="sm" disabled>
            <FileDown size={14} />
            {t("exportLabel")}
          </Button>
        ) : (
          <Dropdown
            trigger={
              <Button variant="primary" size="sm">
                <FileDown size={14} />
                {t("exportLabel")}
              </Button>
            }
            items={[
              {
                label: (
                  <>
                    <Printer size={14} className="inline mr-2" />
                    {t("exportPdf")}
                  </>
                ),
                onClick: printPdf,
                disabled: !renderedHtml,
              },
              {
                label: (
                  <>
                    <FileImage size={14} className="inline mr-2" />
                    {t("exportPng")}
                  </>
                ),
                onClick: onExportPng,
                disabled: !renderedHtml,
              },
            ]}
          />
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={onClearAll}
          disabled={!markdown}
          className="ml-auto"
        >
          <Trash2 size={14} />
          {tc("clear")}
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
    </div>
  );
}

function Description() {
  const t = useTranslations("markdown");
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
        </div>
      </div>
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.gfmTitle")}</h2>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.gfmP1")}</p>
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
