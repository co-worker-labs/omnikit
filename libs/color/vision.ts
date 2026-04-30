import type { CSSProperties } from "react";

export const VISION_MODES = [
  "none",
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "achromatopsia",
] as const;

export type VisionMode = (typeof VISION_MODES)[number];

export const VISION_MATRICES: Record<Exclude<VisionMode, "none">, number[]> = {
  protanopia: [0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0],
  deuteranopia: [0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0],
  tritanopia: [0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0],
  achromatopsia: [
    0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0, 0, 0, 1, 0,
  ],
};

export function visionFilterId(mode: VisionMode): string | null {
  return mode === "none" ? null : `vision-${mode}`;
}

export function visionFilterStyle(mode: VisionMode): CSSProperties {
  const id = visionFilterId(mode);
  return id ? { filter: `url(#${id})` } : {};
}
