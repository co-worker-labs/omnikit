"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { showToast } from "../../../libs/toast";
import { fromEvent } from "file-selector";
import "rc-slider/assets/index.css";
import Slider from "rc-slider";
import { Download, Clipboard, RefreshCw, ImageIcon, ImagePlus, ArrowLeftRight } from "lucide-react";
import { StyledSelect, StyledInput, StyledCheckbox } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { encode, type AvifStatus } from "../../../libs/image/encode";
import { calculateDimensions } from "../../../libs/image/resize";
import { getSupportedEncodeFormats } from "../../../libs/image/format-support";
import { terminateAvifWorker } from "../../../libs/image/avif-worker";
import type { OutputFormat, ResizeMode } from "../../../libs/image/types";

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
];

const MAX_MEGAPIXELS = 50;

const INPUT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Conversion() {
  const t = useTranslations("image");
  const tc = useTranslations("common");

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBitmap, setSourceBitmap] = useState<ImageBitmap | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("webp");
  const [quality, setQuality] = useState(80);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("none");
  const [resizePercent, setResizePercent] = useState(100);
  const [targetWidth, setTargetWidth] = useState(0);
  const [targetHeight, setTargetHeight] = useState(0);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [avifStatus, setAvifStatus] = useState<AvifStatus | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<Set<OutputFormat> | null>(null);

  const [sliderPos, setSliderPos] = useState(50);

  const stalenessId = useRef(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const prevBlobUrlRef = useRef<string | null>(null);
  const originalUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialLoadRef = useRef(true);
  const draggingRef = useRef(false);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSupportedEncodeFormats().then(setSupportedFormats);
  }, []);

  // Manage original image URL for comparison slider
  useEffect(() => {
    if (sourceFile) {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = URL.createObjectURL(sourceFile);
    }
    return () => {
      if (originalUrlRef.current) {
        URL.revokeObjectURL(originalUrlRef.current);
        originalUrlRef.current = null;
      }
    };
  }, [sourceFile]);

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = await fromEvent(e);
      if (files && files.length > 0) {
        handleFileSelect(files[0] as File);
      }
    };

    dropZone.addEventListener("dragover", onDragOver);
    dropZone.addEventListener("drop", onDrop);
    return () => {
      dropZone.removeEventListener("dragover", onDragOver);
      dropZone.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sourceBitmap) return;

    const dims = calculateDimensions(
      sourceBitmap.width,
      sourceBitmap.height,
      resizeMode,
      resizePercent,
      targetWidth,
      targetHeight,
      keepAspectRatio
    );

    const isInitial = initialLoadRef.current;
    initialLoadRef.current = false;

    let cancelled = false;
    const timer = setTimeout(
      async () => {
        if (cancelled) return;
        const callId = ++stalenessId.current;

        setProcessing(true);
        setAvifStatus(null);

        try {
          const onStatus = outputFormat === "avif" ? setAvifStatus : undefined;
          const blob = await encode(
            sourceBitmap,
            { format: outputFormat, quality, width: dims.width, height: dims.height },
            onStatus
          );

          if (callId !== stalenessId.current) return;

          if (prevBlobUrlRef.current) {
            URL.revokeObjectURL(prevBlobUrlRef.current);
          }
          const url = URL.createObjectURL(blob);
          prevBlobUrlRef.current = url;

          setResultBlob(blob);
        } catch {
          if (callId !== stalenessId.current) return;
          showToast(t("encodingFailed"), "danger");
        } finally {
          if (callId === stalenessId.current) {
            setProcessing(false);
            setAvifStatus(null);
          }
        }
      },
      isInitial ? 0 : 300
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    outputFormat,
    quality,
    resizeMode,
    resizePercent,
    targetWidth,
    targetHeight,
    keepAspectRatio,
    sourceBitmap,
    t,
  ]);

  useEffect(() => {
    return () => {
      terminateAvifWorker();
      if (prevBlobUrlRef.current) URL.revokeObjectURL(prevBlobUrlRef.current);
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    };
  }, []);

  async function handleFileSelect(file: File) {
    if (!INPUT_MIME_TYPES.includes(file.type)) {
      showToast(t("formatNotSupported"), "danger");
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      setSourceBitmap(bitmap);
      setSourceFile(file);
      setTargetWidth(bitmap.width);
      setTargetHeight(bitmap.height);

      if (file.type === "image/gif") {
        showToast(t("firstFrameOnly"), "info", 3000);
      }

      const megapixels = bitmap.width * bitmap.height;
      if (megapixels > MAX_MEGAPIXELS * 1_000_000) {
        showToast(
          `Large image (${bitmap.width}×${bitmap.height}) — processing may be slow`,
          "info",
          4000
        );
      }
    } catch {
      showToast(t("encodingFailed"), "danger");
    }
  }

  function handleReselect() {
    if (sourceBitmap) sourceBitmap.close();
    setSourceFile(null);
    setSourceBitmap(null);
    setResultBlob(null);
    setProcessing(false);
    setAvifStatus(null);
    setOutputFormat("webp");
    setQuality(80);
    setResizeMode("none");
    setResizePercent(100);
    setTargetWidth(0);
    setTargetHeight(0);
    setKeepAspectRatio(true);
    initialLoadRef.current = true;
  }

  function handleDownload() {
    if (!resultBlob || !sourceFile) return;
    const baseName = sourceFile.name.replace(/\.[^.]+$/, "");
    const extMap: Record<string, string> = {
      png: ".png",
      jpeg: ".jpg",
      webp: ".webp",
      avif: ".avif",
    };
    const filename = baseName + (extMap[outputFormat] || ".png");
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    if (!resultBlob) return;
    try {
      // Clipboard API only supports image/png — convert if needed
      let pngBlob: Blob = resultBlob;
      if (resultBlob.type !== "image/png") {
        const bitmap = await createImageBitmap(resultBlob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
        bitmap.close();
        pngBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png")
        );
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      showToast(t("copiedToClipboard"), "success", 1500);
    } catch {
      showToast(tc("copyFailed"), "danger", 1500);
    }
  }

  const previewUrl = prevBlobUrlRef.current;
  const originalUrl = originalUrlRef.current;
  const originalSize = sourceFile?.size ?? 0;
  const compressedSize = resultBlob?.size ?? 0;
  const savedPercent =
    originalSize > 0 && compressedSize > 0
      ? Math.round((1 - compressedSize / originalSize) * 100)
      : 0;

  const dims = sourceBitmap
    ? calculateDimensions(
        sourceBitmap.width,
        sourceBitmap.height,
        resizeMode,
        resizePercent,
        targetWidth,
        targetHeight,
        keepAspectRatio
      )
    : { width: 0, height: 0 };

  function updateSliderPosition(clientX: number) {
    const container = compareContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, x)));
  }

  function onSliderMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    draggingRef.current = true;
    updateSliderPosition(e.clientX);
  }

  function onSliderTouchStart(e: React.TouchEvent) {
    draggingRef.current = true;
    updateSliderPosition(e.touches[0].clientX);
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      updateSliderPosition(e.clientX);
    }
    function onMouseUp() {
      draggingRef.current = false;
    }
    function onTouchMove(e: TouchEvent) {
      if (!draggingRef.current) return;
      updateSliderPosition(e.touches[0].clientX);
    }
    function onTouchEnd() {
      draggingRef.current = false;
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  if (!sourceBitmap) {
    return (
      <section className="mt-4">
        <div
          ref={dropZoneRef}
          className="relative text-xl rounded-lg border-2 border-dashed border-accent-cyan/30 bg-accent-cyan-dim/10 text-accent-cyan cursor-pointer"
          style={{ width: "100%", height: "14rem" }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none">
            <ImagePlus size={32} />
            <span className="font-bold text-base">{t("dropImage")}</span>
            <span className="text-sm text-accent-cyan/60">{t("supportedFormats")}</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={INPUT_MIME_TYPES.join(",")}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-4">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        {/* Controls panel */}
        <div className="flex flex-col gap-4">
          {/* Format selector */}
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">
              {t("outputFormat")}
            </label>
            <StyledSelect
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
            >
              {FORMAT_OPTIONS.map((opt) => {
                const disabled = supportedFormats ? !supportedFormats.has(opt.value) : false;
                return (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={disabled}
                    title={disabled ? t("formatUnsupported") : undefined}
                  >
                    {opt.label}
                  </option>
                );
              })}
            </StyledSelect>
          </div>

          {/* Quality slider */}
          {outputFormat !== "png" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-fg-secondary">{t("quality")}</label>
                <span className="font-mono text-sm font-bold text-accent-cyan">{quality}%</span>
              </div>
              <div className="px-1">
                <Slider
                  min={1}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(v) => setQuality(typeof v === "number" ? v : v[0])}
                  styles={{
                    rail: { backgroundColor: "var(--border-default)", height: 4 },
                    track: { backgroundColor: "var(--accent-cyan)", height: 4 },
                    handle: {
                      borderColor: "var(--accent-cyan)",
                      backgroundColor: "var(--bg-surface)",
                      height: 16,
                      width: 16,
                      marginLeft: -6,
                      marginTop: -6,
                      boxShadow: "0 0 4px var(--accent-cyan)",
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Resize section */}
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-2">
              {t("resize")}
            </label>
            <div className="flex gap-1">
              {(["none", "percent", "custom"] as ResizeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`flex-1 px-2 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    resizeMode === mode
                      ? "bg-accent-cyan text-bg-base"
                      : "border border-border-default text-fg-muted hover:text-fg-secondary hover:border-fg-muted"
                  }`}
                  onClick={() => setResizeMode(mode)}
                >
                  {mode === "none"
                    ? t("noResize")
                    : mode === "percent"
                      ? t("byPercent")
                      : t("customSize")}
                </button>
              ))}
            </div>
          </div>

          {/* Percent input */}
          {resizeMode === "percent" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-fg-secondary">{t("byPercent")}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={400}
                    value={resizePercent}
                    onChange={(e) =>
                      setResizePercent(Math.max(1, Math.min(400, Number(e.target.value))))
                    }
                    className="w-14 text-right font-mono text-sm font-bold text-accent-cyan bg-transparent border-b border-accent-cyan/40 outline-none focus:border-accent-cyan transition-colors"
                  />
                  <span className="text-sm text-fg-muted">%</span>
                </div>
              </div>
              <div className="px-1">
                <Slider
                  min={1}
                  max={400}
                  step={1}
                  value={resizePercent}
                  onChange={(v) => setResizePercent(typeof v === "number" ? v : v[0])}
                  styles={{
                    rail: { backgroundColor: "var(--border-default)", height: 4 },
                    track: { backgroundColor: "var(--accent-cyan)", height: 4 },
                    handle: {
                      borderColor: "var(--accent-cyan)",
                      backgroundColor: "var(--bg-surface)",
                      height: 16,
                      width: 16,
                      marginLeft: -6,
                      marginTop: -6,
                      boxShadow: "0 0 4px var(--accent-cyan)",
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Custom dimensions */}
          {resizeMode === "custom" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <StyledInput
                  label={t("width")}
                  type="number"
                  min={1}
                  value={targetWidth || ""}
                  onChange={(e) => setTargetWidth(Math.max(0, Number(e.target.value)))}
                />
                <StyledInput
                  label={t("height")}
                  type="number"
                  min={1}
                  value={targetHeight || ""}
                  onChange={(e) => setTargetHeight(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <StyledCheckbox
                label={t("keepAspectRatio")}
                checked={keepAspectRatio}
                onChange={(e) => setKeepAspectRatio(e.target.checked)}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-border-default">
            <Button variant="secondary" size="md" onClick={handleReselect}>
              <RefreshCw size={14} />
              {t("reselect")}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleDownload}
              disabled={!resultBlob || processing}
            >
              <Download size={14} />
              {t("download")}
            </Button>
            <Button
              variant="outline-cyan"
              size="md"
              onClick={handleCopy}
              disabled={!resultBlob || processing}
            >
              <Clipboard size={14} />
              {t("copyToClipboard")}
            </Button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex flex-col gap-3">
          <div
            ref={compareContainerRef}
            className="relative w-full rounded-lg border border-border-default bg-bg-surface overflow-hidden cursor-col-resize select-none"
            style={{
              aspectRatio: `${sourceBitmap.width} / ${sourceBitmap.height}`,
              maxHeight: "500px",
            }}
            onMouseDown={onSliderMouseDown}
            onTouchStart={onSliderTouchStart}
          >
            {/* Original image — visible on the left side */}
            {originalUrl && (
              <img
                src={originalUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                draggable={false}
              />
            )}
            {/* Compressed image — visible on the right side */}
            {previewUrl && (
              <img
                src={previewUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
                style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                draggable={false}
              />
            )}
            {!previewUrl && !processing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon size={48} className="opacity-30 text-fg-muted" />
              </div>
            )}

            {/* Divider line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent-cyan z-10 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-bg-surface border-2 border-accent-cyan flex items-center justify-center shadow-lg pointer-events-none">
                <ArrowLeftRight size={12} className="text-accent-cyan" />
              </div>
            </div>

            {/* Labels */}
            {previewUrl && (
              <>
                <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded text-xs font-semibold bg-bg-base/70 text-fg-secondary pointer-events-none">
                  {t("original")}
                </div>
                <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded text-xs font-semibold bg-bg-base/70 text-fg-secondary pointer-events-none">
                  {t("compressed")}
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded text-xs text-fg-muted bg-bg-base/50 pointer-events-none">
                  {t("dragToCompare")}
                </div>
              </>
            )}

            {/* Processing overlay */}
            {processing && (
              <div className="absolute inset-0 bg-bg-base/60 flex flex-col items-center justify-center gap-2 z-30">
                <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-fg-secondary">
                  {avifStatus === "downloading"
                    ? t("loadingEncoder")
                    : avifStatus === "encoding"
                      ? t("encodingAvif")
                      : t("processing")}
                </span>
              </div>
            )}
          </div>

          {/* Info bar */}
          {resultBlob && (
            <div className="flex items-center justify-between gap-4 text-xs text-fg-muted px-1">
              <span>
                {t("original")}: {formatFileSize(originalSize)} · {sourceBitmap!.width}×
                {sourceBitmap!.height}
              </span>
              <span>
                {t("compressed")}: {formatFileSize(compressedSize)} · {dims.width}×{dims.height}
              </span>
              <span
                className={
                  savedPercent > 0
                    ? "text-accent-cyan font-semibold"
                    : savedPercent < 0
                      ? "text-danger font-semibold"
                      : ""
                }
              >
                {t("saved", { percent: Math.abs(savedPercent) })}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Description() {
  const t = useTranslations("image");
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold mb-3">{t("descriptions.title")}</h2>
      <div className="space-y-3 text-sm text-fg-secondary leading-relaxed">
        <p>{t("descriptions.p1")}</p>
        <p>{t("descriptions.p2")}</p>
        <p>{t("descriptions.p3")}</p>
        <p>{t("descriptions.p4")}</p>
      </div>
    </section>
  );
}

export default function ImagePage() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  return (
    <Layout title={t("image.shortTitle")}>
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
