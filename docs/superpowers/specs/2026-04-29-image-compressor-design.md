# Image Compressor / Format Converter — Design Spec

**Date:** 2026-04-29
**Status:** Draft (under review)
**Route:** `/image`

## Overview

A browser-based image compression and format conversion tool supporting PNG, JPG, WebP, and AVIF output. All processing runs entirely in the client — no data is sent to any server.

### Core Positioning

Compression and format conversion are equally important features. The tool serves users who want to:

- Reduce image file size by adjusting quality
- Convert between image formats (e.g., PNG → WebP/AVIF)
- Resize images (by percentage or custom dimensions)

### Constraints

- Single file processing (no batch)
- Browser-only execution
- No server-side processing or uploads

## Architecture

### Approach: Main-thread Canvas + On-demand WASM Worker

```
User drops image
  → createImageBitmap() decode (all input formats)
  → Canvas drawImage() resize (+ white fill for JPEG transparency)
  → Real-time preview: canvas.toBlob(webp/jpeg/png)
  → If output is AVIF → ctx.getImageData() → send ImageData to Worker (Transferable) → @jsquash/avif WASM encode → return Blob
```

**Why this approach:**

- 80/20 rule: most web images are <2000px, main-thread Canvas provides instant feedback
- Consistent with existing project patterns (QR Code's `canvas.toBlob`, Diff's Worker dispatch, Checksum's file handling)
- AVIF is a minority scenario; WASM loaded on-demand (~3.3MB raw / ~1.5MB gzipped; decoder not needed — only import `@jsquash/avif/encode`)
- Lowest complexity: single file handles core logic, no Worker communication layer for common cases

### Dependencies

**New:**

- `@jsquash/avif` — AVIF WASM encoder (only import `@jsquash/avif/encode` to avoid loading the decoder); loaded on-demand when user selects AVIF output. WASM size: ~3.3MB raw / ~1.5MB gzipped

**Existing (reuse):**

- `file-selector` — drag-and-drop file handling
- `rc-slider` — quality slider
- `lucide-react` — icons

**Not needed:**

- `browser-fs-access` — native `<a download>` suffices for downloads
- `OffscreenCanvas` — main-thread Canvas handles <4000px images fast enough
- `browser-image-compression` — direct Canvas API is simpler and sufficient

## File Structure

```
app/[locale]/image/
├── page.tsx              # Route entry + SEO metadata
└── image-page.tsx        # Page component with all UI and logic

libs/image/
├── encode.ts             # Encode dispatch (Canvas / WASM branching)
├── avif-worker.ts        # AVIF Web Worker
├── resize.ts             # Dimension calculation logic
├── format-support.ts     # Browser encoding capability detection
└── types.ts              # Type definitions

public/
├── wasm/
│   └── avif_enc.wasm     # AVIF encoder WASM (copied from @jsquash/avif postinstall)
└── locales/
    ├── en/image.json     # English translations
    ├── zh-CN/image.json  # Simplified Chinese
    └── zh-TW/image.json  # Traditional Chinese
```

## UI Layout

Three areas, top to bottom:

### Area 1: Upload Zone (shown when no image selected)

```
┌──────────────────────────────────────────┐
│                                          │
│           📷 Drop an image here          │
│          or click to select              │
│     Supports PNG/JPG/WebP/AVIF/GIF/BMP/SVG │
│                                          │
└──────────────────────────────────────────┘
```

- Inline drop zone following Checksum's pattern (`file-selector` + `fromEvent`)
- After selecting an image, the upload zone collapses and the editor expands

### Area 2: Editor (shown when image is loaded)

```
┌──────────────────────────────────────────────────────┐
│ Controls Panel                 │    Preview Area       │
│                                │                      │
│ Output: [PNG ▼]                │  ┌──────────────┐    │
│ Quality: ●──────── 80%         │  │              │    │
│   (hidden when PNG selected)   │  │   Slider     │    │
│                                │  │  Original →  │    │
│ Resize:                        │  │  Compressed  │    │
│   ○ None                       │  │              │    │
│   ○ By percent  [100% ▼]      │  └──────────────┘    │
│   ○ Custom size                │                      │
│     W: [____] H: [____]       │  Original: 1.2MB 1920×1080 │
│     ☑ Keep aspect ratio        │  Output: 340KB 1920×1080   │
│                                │  Saved: 72%               │
│ [🔄 Reselect]  [⬇ Download]    │                      │
└──────────────────────────────────────────────────────┘
```

**Controls:**

- **Format selector**: `StyledSelect` with options PNG / JPG / WebP / AVIF
- **Quality slider**: `rc-slider` (1-100), hidden when PNG is selected (lossless, no quality parameter)
- **Resize options**: `StyledCheckbox` to toggle none/percent/custom, `StyledInput` for width/height
- **Keep aspect ratio**: checked by default; changing width auto-calculates height and vice versa
- **Download button**: `Button variant="primary"`, triggers `<a download>` download

**Preview area:**

- Slider comparison: original on the left, processed on the right
- Draggable divider line
- Images fit container (`object-fit: contain`)
- Info bar: original size/dimensions vs output size/dimensions + savings percentage

### Area 3: Description

Standard `Description` component following all tools' pattern. Explains the tool and format differences.

## Data Flow & State

### Core State

```typescript
// Input
const [sourceFile, setSourceFile] = useState<File | null>(null);
const [sourceBitmap, setSourceBitmap] = useState<ImageBitmap | null>(null);

// Configuration
const [outputFormat, setOutputFormat] = useState<"png" | "jpeg" | "webp" | "avif">("webp");
const [quality, setQuality] = useState(80);
const [resizeMode, setResizeMode] = useState<"none" | "percent" | "custom">("none");
const [resizePercent, setResizePercent] = useState(100);
const [targetWidth, setTargetWidth] = useState(0);
const [targetHeight, setTargetHeight] = useState(0);
const [keepAspectRatio, setKeepAspectRatio] = useState(true);

// Output
const [resultBlob, setResultBlob] = useState<Blob | null>(null);
const [processing, setProcessing] = useState(false);
```

### Processing Flow

```
Image loaded (initial) or config change (format/quality/resize)
  → increment stalenessId counter (cancels any in-flight encode)
  → debounce 300ms (skip for initial load)
  → encode(sourceBitmap, { format, quality, width, height }, stalenessId)
    → format != avif → Canvas toBlob (instant, <50ms)
       NOTE: canvas.toBlob has no native abort; stale results discarded via stalenessId check
    → format == avif → ctx.getImageData() → postMessage(imageData, [imageData.data.buffer])
       → AVIF Worker (show loading spinner: "downloading WASM..." then "encoding...")
  → if (callId !== stalenessId.current) return  // discard stale result
  → setResultBlob(blob)
  → URL.createObjectURL(blob) for preview
```

### Download Behavior

- Filename derived from original file with new extension: `photo.png` → `photo.webp`, `image.jpg` → `image.avif`
- Uses `<a download={filename} href={blobUrl}>` pattern
- Extension mapping: `png` → `.png`, `jpeg` → `.jpg`, `webp` → `.webp`, `avif` → `.avif`

### Real-time Preview Strategy

- **Initial load**: encode immediately on image load (no debounce), using default settings (WebP, 80%)
- Auto re-encode on config change with 300ms debounce
- Canvas encoding (non-AVIF) is near-instant, no loading indicator needed
- AVIF encoding shows two-stage status: "Loading encoder..." (first-time WASM download ~1.5MB gzipped) → "Encoding AVIF..." (~1-3s encode time)

### Memory Management

- `sourceBitmap.close()` when reselecting a new image
- `URL.revokeObjectURL()` for result blob URL on component unmount or new result

## Technical Details

### Encode Dispatch (`libs/image/encode.ts`)

```typescript
export async function encode(
  bitmap: ImageBitmap,
  options: { format: string; quality: number; width: number; height: number },
  stalenessId: { current: number }, // Flag-based cancellation (canvas.toBlob has no AbortSignal)
  onAvifStatus?: (status: "downloading" | "encoding") => void
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
    const buffer = await encodeAvif(
      imageData,
      { quality: options.quality },
      stalenessId,
      onAvifStatus
    );
    return new Blob([buffer], { type: "image/avif" });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error("Encoding failed (format may not be supported in this browser)"));
          return;
        }
        resolve(blob);
      },
      `image/${options.format}`,
      options.quality / 100
    );
  });
}
```

### AVIF Worker (`libs/image/avif-worker.ts`)

- Singleton pattern, reuses Diff tool's `ensureWorker()` approach with ID-based request matching
- Only imports `@jsquash/avif/encode` (avoids loading the 1.1MB decoder WASM)
- WASM module loaded via `new URL(..., import.meta.url)` for Next.js bundling
- **Input**: `ImageData` (extracted from Canvas via `ctx.getImageData()` in encode.ts before posting to Worker)
- **Output**: `ArrayBuffer` (caller wraps in `new Blob([buffer], { type: "image/avif" })`)
- **Worker communication**: Transfer `imageData.data.buffer` as `Transferable` to avoid copying large pixel data (e.g. 4000×3000 = 48MB)
- Staleness-based cancellation: `stalenessId` counter incremented on new encode request; stale results are discarded
- WASM initialization states: `"downloading"` (~1.5MB gzipped first load) → `"encoding"` (~1-3s)
- On WASM load failure: reject with error, caller shows Toast fallback suggestion

### Resize Calculation (`libs/image/resize.ts`)

```typescript
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  mode: "none" | "percent" | "custom",
  percent: number,
  targetWidth?: number,
  targetHeight?: number,
  keepAspectRatio?: boolean
): { width: number; height: number };
```

- Percentage mode: `width = original * percent / 100`
- Custom mode: auto-calculate the other dimension when aspect ratio lock is on
- Output dimensions rounded to integers; ensure even pixel counts where encoders require it

## Browser Format Compatibility

### Native Canvas.toBlob Encoding Support

| Format | Chrome | Firefox | Safari | Edge |
| ------ | ------ | ------- | ------ | ---- |
| PNG    | ✅     | ✅      | ✅     | ✅   |
| JPEG   | ✅     | ✅      | ✅     | ✅   |
| WebP   | ✅ 32+ | ✅ 96+  | ❌     | ✅   |
| AVIF   | ❌     | ❌      | ❌     | ❌   |

**Key constraints:**

- **Safari** does not support `canvas.toBlob('image/webp')`. WebP option is disabled on Safari with a tooltip: "WebP encoding not supported in this browser".
- **No browser** supports `canvas.toBlob('image/avif')`. AVIF always uses the WASM Worker path.
- **PNG** is lossless; quality slider is hidden when PNG is selected.

### Runtime Detection (`libs/image/format-support.ts`)

```typescript
// Detect canvas.toBlob support for a given MIME type
export async function isCanvasEncodingSupported(mime: string): Promise<boolean> {
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    c.toBlob((blob) => resolve(blob !== null && blob.type === mime), mime, 0.5);
  });
}

// Cache results on first call
let supportedFormats: Set<string> | null = null;

export async function getSupportedEncodeFormats(): Promise<Set<string>> {
  if (supportedFormats) return supportedFormats;
  const results = await Promise.all([
    isCanvasEncodingSupported("image/png").then((ok) => [ok, "image/png"]),
    isCanvasEncodingSupported("image/jpeg").then((ok) => [ok, "image/jpeg"]),
    isCanvasEncodingSupported("image/webp").then((ok) => [ok, "image/webp"]),
  ]);
  supportedFormats = new Set(results.filter(([ok]) => ok).map(([, mime]) => mime as string));
  // AVIF always available via WASM; add unconditionally
  supportedFormats.add("image/avif");
  return supportedFormats;
}
```

### UI Behavior

- Format selector options are filtered by `getSupportedEncodeFormats()`
- Unsupported formats show as disabled with a tooltip explaining browser limitation
- AVIF is always available (WASM fallback) regardless of browser

## Next.js WASM + Worker Bundling

### Challenge

Next.js (both Turbopack and Webpack) has known issues with WASM files inside Web Workers. The `@jsquash/avif` WASM module must be loadable from within a Worker thread.

### Solution: Static WASM in `public/` + `locateFile` Override

Place the WASM files in `public/wasm/` and configure `@jsquash/avif/encode` to load from that path via the `init()` function's `locateFile` option. This completely bypasses bundler WASM processing.

```
public/
  wasm/
    avif_enc.wasm      # From @jsquash/avif package (node_modules/@jsquash/avif/avif_enc.wasm)
```

```typescript
// libs/image/avif-worker.ts
import encode, { init } from "@jsquash/avif/encode";

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  await init({
    locateFile: (file: string) => `/wasm/${file}`,
  });
  initialized = true;
}
```

### Copy WASM to Public (postinstall script)

Add to `package.json`:

```json
{
  "scripts": {
    "postinstall": "cp node_modules/@jsquash/avif/avif_enc.wasm public/wasm/avif_enc.wasm"
  }
}
```

### Required `next.config.js` (Webpack production build)

```javascript
// next.config.js — only needed for Webpack (production build)
module.exports = {
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    return config;
  },
};
```

### Turbopack Compatibility

Turbopack (dev mode) Worker `import.meta.url` was fixed in Next.js 15.x ([next.js#88602](https://github.com/vercel/next.js/pull/88602)). Requires Next.js ≥ 15.x latest. The `public/` + `locateFile` approach avoids this issue entirely since WASM paths are absolute.

## Tool Registration

### `libs/tools.ts`

```typescript
import { ImageDown } from "lucide-react";

{ key: "image", path: "/image", icon: ImageDown }
```

### `public/locales/en/tools.json` addition

```json
{
  "image": {
    "title": "Image Compressor & Format Converter - PNG, JPG, WebP, AVIF",
    "shortTitle": "Image Compressor",
    "description": "Compress, resize, and convert images between PNG, JPG, WebP, and AVIF formats. All processing runs locally in your browser."
  }
}
```

### `public/locales/zh-CN/tools.json` addition

```json
{
  "image": {
    "title": "图片压缩 / 格式转换 - PNG, JPG, WebP, AVIF",
    "shortTitle": "图片压缩",
    "description": "在线压缩、调整大小、转换图片格式，支持 PNG、JPG、WebP、AVIF。所有处理在浏览器本地完成，不上传数据。",
    "searchTerms": "tupianyasuo tpyas yasuo webp avif"
  }
}
```

### `public/locales/zh-TW/tools.json` addition

```json
{
  "image": {
    "title": "圖片壓縮 / 格式轉換 - PNG, JPG, WebP, AVIF",
    "shortTitle": "圖片壓縮",
    "description": "線上壓縮、調整大小、轉換圖片格式，支援 PNG、JPG、WebP、AVIF。所有處理在瀏覽器本機完成，不上傳資料。",
    "searchTerms": "tupianyasuo tpyas yasuo webp avif"
  }
}
```

**searchTerms reasoning**: `yasuo` (压缩) is unique to this tool; `webp` and `avif` are format names users search for directly. Avoids generic terms like `zhuanhuan` (转换) which matches Color, Storage Unit, Text Case, etc.

### `public/locales/en/image.json`

```json
{
  "dropImage": "Drop an image here or click to select",
  "supportedFormats": "Supports PNG, JPG, WebP, AVIF, GIF, BMP, SVG",
  "outputFormat": "Output Format",
  "formatUnsupported": "Not supported in this browser",
  "quality": "Quality",
  "resize": "Resize",
  "noResize": "Original size",
  "byPercent": "By percentage",
  "customSize": "Custom size",
  "width": "Width",
  "height": "Height",
  "keepAspectRatio": "Keep aspect ratio",
  "download": "Download",
  "copyToClipboard": "Copy to clipboard",
  "copiedToClipboard": "Copied to clipboard",
  "reselect": "Reselect",
  "original": "Original",
  "compressed": "Compressed",
  "saved": "Saved {percent}%",
  "loadingEncoder": "Loading AVIF encoder...",
  "encodingAvif": "Encoding AVIF...",
  "encodingFailed": "Encoding failed for this format",
  "firstFrameOnly": "Animated image — only the first frame is used",
  "dragToCompare": "Drag to compare",
  "descriptions": {
    "title": "About Image Compressor",
    "p1": "Compress, resize, and convert images right in your browser. No data is uploaded — all processing happens locally.",
    "p2": "Supports PNG, JPG, WebP, and AVIF output formats. AVIF offers the best compression ratio for web images.",
    "p3": "Use the quality slider to balance file size and image quality. Lower quality means smaller files."
  }
}
```

Corresponding `zh-CN` and `zh-TW` translations provided with identical key structure.

## Error Handling & Edge Cases

| Scenario                            | Handling                                                                |
| ----------------------------------- | ----------------------------------------------------------------------- |
| Unsupported file format             | Toast: "Unsupported format"                                             |
| Very large image (>50MP)            | Toast warning + continue processing (Canvas has no hard limit)          |
| AVIF WASM load failure              | Toast: "AVIF encoding unavailable" + fallback to WebP suggestion        |
| User changes config during encoding | Staleness counter incremented; stale results silently discarded         |
| Rapid quality slider movement       | 300ms debounce prevents unnecessary re-encodes                          |
| SVG input                           | `createImageBitmap` rasterizes SVG uniformly                            |
| Animated GIF / animated WebP        | `createImageBitmap` captures first frame only; Toast notifies user      |
| Zero-dimension resize               | Clamp minimum dimension to 1px                                          |
| PNG → JPEG with transparency        | White background fill applied before encoding                           |
| Browser unsupported output format   | Format option disabled in selector with tooltip explaining why          |
| canvas.toBlob returns null          | Reject with descriptive error; Toast: "Encoding failed for this format" |

## Implementation Notes

### AVIF Quality Semantics

The `@jsquash/avif` quality parameter (0-100) does **not** map linearly to file size the same way as JPEG/WebP. At the same numeric quality, AVIF produces significantly smaller files. The slider's 1-100 range is passed directly to both Canvas toBlob and AVIF WASM, but users should expect AVIF to look better at lower numbers. Default `speed: 6` (encode speed) provides a good balance of encoding time vs. compression ratio.

### Copy to Clipboard

Alongside the Download button, provide a "Copy to clipboard" button using the same `ClipboardItem` pattern as QR Code:

```typescript
async function copyToClipboard(blob: Blob) {
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}
```

This uses the existing `navigator.clipboard.write` pattern established in the QR Code tool.

### Canvas Color Profile Note

Canvas API strips ICC color profiles — all output images are in sRGB. This is noted in the Description section for user awareness, but no color profile management is implemented (out of scope).

## Out of Scope

These features are explicitly NOT included in this design:

- Batch processing (single file only)
- Image editing (crop, rotate, filters)
- EXIF metadata preservation or stripping
- Color profile management
- Progressive/interlaced output options
- Drag-and-drop reordering
- Image comparison history
