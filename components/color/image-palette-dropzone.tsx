"use client";

import { useState, useRef } from "react";
import { getPaletteSync } from "colorthief";
import { useTranslations } from "next-intl";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

interface ImagePaletteDropzoneProps {
  onPalette: (hexes: string[]) => void;
  onError: (key: "fileTooLarge" | "fileNotImage" | "imageError") => void;
  onClear?: () => void;
}

export function ImagePaletteDropzone({ onPalette, onError, onClear }: ImagePaletteDropzoneProps) {
  const t = useTranslations("color.palette");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      onError("fileNotImage");
      return;
    }
    if (file.size > MAX_BYTES) {
      onError("fileTooLarge");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setBusy(true);
    const img = new Image();
    img.onload = () => {
      try {
        const palette = getPaletteSync(img, { colorCount: 6 }) ?? [];
        onPalette(palette.map((c) => c.hex()));
      } catch {
        onError("imageError");
      } finally {
        setBusy(false);
      }
    };
    img.onerror = () => {
      onError("imageError");
      setBusy(false);
    };
    img.src = url;
  }

  function clear() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    onClear?.();
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className="border-2 border-dashed border-border-default rounded-lg p-4 text-center cursor-pointer hover:border-accent-cyan/60 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="preview"
            className="mx-auto max-h-[160px] object-contain rounded"
          />
        ) : (
          <span className="text-sm text-fg-secondary">{t("imageDrop")}</span>
        )}
        {busy && <div className="mt-2 text-xs text-fg-muted">…</div>}
      </div>
      {previewUrl && (
        <button
          type="button"
          onClick={clear}
          className="self-center text-xs text-fg-muted hover:text-danger transition-colors"
        >
          {t("clear")}
        </button>
      )}
    </div>
  );
}
