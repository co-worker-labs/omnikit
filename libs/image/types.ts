export type OutputFormat = "png" | "jpeg" | "webp" | "avif";

export type ResizeMode = "none" | "percent" | "custom";

export interface EncodeOptions {
  format: OutputFormat;
  quality: number;
  width: number;
  height: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}
