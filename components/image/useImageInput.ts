"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "../../libs/toast";
import { fromEvent } from "file-selector";
import { INPUT_MIME_TYPES } from "../../libs/image/types";

const MAX_MEGAPIXELS = 50;

interface UseImageInputOptions {
  t: (key: string, params?: Record<string, string | number>) => string;
}

export interface UseImageInputReturn {
  sourceFile: File | null;
  sourceBitmap: ImageBitmap | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleReselect: () => void;
  dropZoneRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function useImageInput({ t }: UseImageInputOptions): UseImageInputReturn {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBitmap, setSourceBitmap] = useState<ImageBitmap | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Internal: process a selected file
  async function processFile(file: File) {
    if (!INPUT_MIME_TYPES.includes(file.type)) {
      showToast(t("formatNotSupported"), "danger");
      return;
    }

    try {
      // createImageBitmap does not support SVG blobs — rasterize via <img> first
      const bitmap =
        file.type === "image/svg+xml" ? await rasterizeSVG(file) : await createImageBitmap(file);
      setSourceBitmap(bitmap);
      setSourceFile(file);

      // Animated image toast (GIF + animated WebP)
      if (file.type === "image/gif") {
        showToast(t("firstFrameOnly"), "info", 3000);
      } else if (file.type === "image/webp" && (await isAnimatedWebP(file))) {
        showToast(t("firstFrameOnly"), "info", 3000);
      }

      // Large image warning (>50 megapixels)
      const megapixels = bitmap.width * bitmap.height;
      if (megapixels > MAX_MEGAPIXELS * 1_000_000) {
        showToast(t("largeImage", { w: bitmap.width, h: bitmap.height }), "info", 4000);
      }
    } catch {
      showToast(t("encodingFailed"), "danger");
    }
  }

  // Input change handler
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  // Reset file and bitmap state (tool-specific reset is handled by the caller)
  function handleReselect() {
    if (sourceBitmap) sourceBitmap.close();
    setSourceFile(null);
    setSourceBitmap(null);
  }

  // Set up drag-and-drop on dropZoneRef using file-selector
  useEffect(() => {
    const dz = dropZoneRef.current;
    if (!dz) return;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = await fromEvent(e);
      if (files && files.length > 0) {
        processFile(files[0] as File);
      }
    };

    dz.addEventListener("dragover", onDragOver);
    dz.addEventListener("drop", onDrop);
    return () => {
      dz.removeEventListener("dragover", onDragOver);
      dz.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close bitmap on unmount
  useEffect(() => {
    return () => {
      if (sourceBitmap) {
        sourceBitmap.close();
      }
    };
  }, [sourceBitmap]);

  return {
    sourceFile,
    sourceBitmap,
    handleFileSelect,
    handleReselect,
    dropZoneRef: dropZoneRef as React.RefObject<HTMLDivElement>,
    fileInputRef: fileInputRef as React.RefObject<HTMLInputElement>,
  };
}

const SVG_RASTER_TARGET = 2048;

async function rasterizeSVG(file: File): Promise<ImageBitmap> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG"));
      img.src = url;
    });

    const nw = img.naturalWidth || 300;
    const nh = img.naturalHeight || 150;
    const longest = Math.max(nw, nh);
    const scale = longest < SVG_RASTER_TARGET ? SVG_RASTER_TARGET / longest : 1;
    const w = Math.round(nw * scale);
    const h = Math.round(nh * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Heuristic: check for ANIM chunk in WebP file header. */
async function isAnimatedWebP(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 1024).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder().decode(bytes);
    return text.includes("ANIM");
  } catch {
    return false;
  }
}
