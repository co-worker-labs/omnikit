// libs/image/encode.ts
import type { OutputFormat } from "./types";
import { encodeAvif } from "./avif-worker";

export type AvifStatus = "downloading" | "encoding";

export async function encode(
  bitmap: ImageBitmap,
  options: {
    format: OutputFormat;
    quality: number;
    width: number;
    height: number;
  },
  onAvifStatus?: (status: AvifStatus) => void
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext("2d")!;

  // Fill white background for JPEG (no alpha channel support)
  if (options.format === "jpeg") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, options.width, options.height);
  }

  ctx.drawImage(bitmap, 0, 0, options.width, options.height);

  if (options.format === "avif") {
    // @jsquash/avif/encode only accepts ImageData, not Canvas
    const imageData = ctx.getImageData(0, 0, options.width, options.height);
    const buffer = await encodeAvif(imageData, { quality: options.quality });
    return new Blob([buffer], { type: "image/avif" });
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error("Encoding failed (format may not be supported in this browser)"));
          return;
        }
        resolve(blob);
      },
      `image/${options.format}`,
      options.format === "png" ? undefined : options.quality / 100
    );
  });
}
