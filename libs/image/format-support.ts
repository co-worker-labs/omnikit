import type { OutputFormat } from "./types";

const MIME_MAP: Record<OutputFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};

function isCanvasEncodingSupported(mime: string): Promise<boolean> {
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    c.toBlob((blob) => resolve(blob !== null && blob.type === mime), mime, 0.5);
  });
}

let cachedFormats: Set<OutputFormat> | null = null;

export async function getSupportedEncodeFormats(): Promise<Set<OutputFormat>> {
  if (cachedFormats) return cachedFormats;

  const canvasFormats = await Promise.all(
    (["png", "jpeg", "webp"] as OutputFormat[]).map(async (fmt) => {
      const ok = await isCanvasEncodingSupported(MIME_MAP[fmt]);
      return [ok, fmt] as const;
    })
  );

  cachedFormats = new Set(canvasFormats.filter(([ok]) => ok).map(([, fmt]) => fmt));

  // AVIF always available via WASM
  cachedFormats.add("avif");

  return cachedFormats;
}

export function isFormatSupported(formats: Set<OutputFormat>, format: OutputFormat): boolean {
  return formats.has(format);
}
