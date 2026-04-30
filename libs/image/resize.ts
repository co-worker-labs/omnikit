import type { ImageDimensions, ResizeMode } from "./types";

export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  mode: ResizeMode,
  percent: number,
  targetWidth?: number,
  targetHeight?: number,
  keepAspectRatio?: boolean
): ImageDimensions {
  if (mode === "none") {
    return { width: originalWidth, height: originalHeight };
  }

  if (mode === "percent") {
    const scale = Math.max(percent, 0) / 100;
    const w = Math.max(1, Math.round(originalWidth * scale));
    const h = Math.max(1, Math.round(originalHeight * scale));
    return { width: w, height: h };
  }

  // mode === "custom"
  const hasW = targetWidth !== undefined && targetWidth > 0;
  const hasH = targetHeight !== undefined && targetHeight > 0;

  if (hasW && hasH) {
    if (keepAspectRatio) {
      const scaleW = targetWidth! / originalWidth;
      const scaleH = targetHeight! / originalHeight;
      const scale = Math.min(scaleW, scaleH);
      return {
        width: Math.max(1, Math.round(originalWidth * scale)),
        height: Math.max(1, Math.round(originalHeight * scale)),
      };
    }
    return { width: Math.max(1, targetWidth!), height: Math.max(1, targetHeight!) };
  }

  if (hasW && !hasH) {
    if (keepAspectRatio) {
      const scale = targetWidth! / originalWidth;
      return { width: targetWidth!, height: Math.max(1, Math.round(originalHeight * scale)) };
    }
    return { width: targetWidth!, height: originalHeight };
  }

  if (!hasW && hasH) {
    if (keepAspectRatio) {
      const scale = targetHeight! / originalHeight;
      return { width: Math.max(1, Math.round(originalWidth * scale)), height: targetHeight! };
    }
    return { width: originalWidth, height: targetHeight! };
  }

  // No dimensions provided — return original
  return { width: originalWidth, height: originalHeight };
}
