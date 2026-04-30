# Image Compressor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based image compression and format conversion tool at `/image` supporting PNG, JPG, WebP, and AVIF output with resize, quality control, and real-time preview.

**Architecture:** Main-thread Canvas encoding for PNG/JPG/WebP with on-demand AVIF WASM Worker. Browser format support detected at runtime. All state managed in a single page component following the existing `page.tsx` + `<tool>-page.tsx` pattern.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, `@jsquash/avif` (WASM), `rc-slider`, `file-selector`, `lucide-react`

**Spec:** `docs/superpowers/specs/2026-04-29-image-compressor-design.md`

---

## File Map

### New files

| File                                          | Responsibility                                      |
| --------------------------------------------- | --------------------------------------------------- |
| `libs/image/types.ts`                         | Shared type definitions                             |
| `libs/image/resize.ts`                        | Pure dimension calculation                          |
| `libs/image/format-support.ts`                | Browser canvas encoding capability detection        |
| `libs/image/encode.ts`                        | Canvas + AVIF encode dispatch                       |
| `libs/image/avif-worker.ts`                   | AVIF WASM Web Worker                                |
| `libs/image/__tests__/resize.test.ts`         | Resize calculation tests                            |
| `libs/image/__tests__/format-support.test.ts` | Format detection tests (mocked)                     |
| `app/[locale]/image/page.tsx`                 | Route entry + SEO metadata                          |
| `app/[locale]/image/image-page.tsx`           | Page component with all UI and logic                |
| `public/locales/en/image.json`                | English translations                                |
| `public/locales/zh-CN/image.json`             | Simplified Chinese translations                     |
| `public/locales/zh-TW/image.json`             | Traditional Chinese translations                    |
| `public/wasm/avif_enc.wasm`                   | AVIF encoder WASM binary (copied from node_modules) |

### Modified files

| File                              | Change                                              |
| --------------------------------- | --------------------------------------------------- |
| `libs/tools.ts`                   | Add `image` entry to `TOOLS` array                  |
| `public/locales/en/tools.json`    | Add `image` section                                 |
| `public/locales/zh-CN/tools.json` | Add `image` section with `searchTerms`              |
| `public/locales/zh-TW/tools.json` | Add `image` section with `searchTerms`              |
| `vitest.config.ts`                | Add `libs/image/**/*.test.ts` to includes           |
| `package.json`                    | Add `@jsquash/avif` dependency + postinstall script |
| `next.config.js`                  | Add WASM webpack config                             |

---

## Task 1: Types + Resize Calculation (TDD)

**Files:**

- Create: `libs/image/types.ts`
- Create: `libs/image/resize.ts`
- Create: `libs/image/__tests__/resize.test.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// libs/image/types.ts
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
```

- [ ] **Step 2: Write failing resize tests**

```typescript
// libs/image/__tests__/resize.test.ts
import { describe, it, expect } from "vitest";
import { calculateDimensions } from "../resize";

describe("calculateDimensions", () => {
  const origW = 1920;
  const origH = 1080;

  it("returns original dimensions when mode is none", () => {
    expect(calculateDimensions(origW, origH, "none", 100)).toEqual({ width: 1920, height: 1080 });
  });

  it("scales by percentage", () => {
    expect(calculateDimensions(origW, origH, "percent", 50)).toEqual({ width: 960, height: 540 });
  });

  it("scales by 200% percentage", () => {
    expect(calculateDimensions(origW, origH, "percent", 200)).toEqual({
      width: 3840,
      height: 2160,
    });
  });

  it("keeps aspect ratio when only width is provided", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, 960, undefined, true)).toEqual({
      width: 960,
      height: 540,
    });
  });

  it("keeps aspect ratio when only height is provided", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, undefined, 540, true)).toEqual({
      width: 960,
      height: 540,
    });
  });

  it("uses both dimensions when aspect ratio is unlocked", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, 800, 600, false)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("uses both dimensions when keepAspectRatio is undefined", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, 800, 600)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("clamps minimum dimension to 1px", () => {
    expect(calculateDimensions(origW, origH, "percent", 0)).toEqual({ width: 1, height: 1 });
  });

  it("rounds to integers", () => {
    // 1920 * 33 / 100 = 633.6 → 634
    const result = calculateDimensions(origW, origH, "percent", 33);
    expect(result.width).toBe(634);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(Number.isInteger(result.height)).toBe(true);
  });

  it("handles square images", () => {
    expect(calculateDimensions(1000, 1000, "percent", 50)).toEqual({ width: 500, height: 500 });
  });

  it("custom mode with only width and no aspect ratio lock uses original height", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, 960, undefined, false)).toEqual({
      width: 960,
      height: 1080,
    });
  });

  it("custom mode with only height and no aspect ratio lock uses original width", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, undefined, 540, false)).toEqual({
      width: 1920,
      height: 540,
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- libs/image/__tests__/resize.test.ts`
Expected: FAIL — module `../resize` not found

- [ ] **Step 4: Implement resize calculation**

```typescript
// libs/image/resize.ts
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
      // Scale to fit within both constraints, maintaining aspect ratio
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- libs/image/__tests__/resize.test.ts`
Expected: PASS (all tests green)

- [ ] **Step 6: Commit**

```bash
git add libs/image/types.ts libs/image/resize.ts libs/image/__tests__/resize.test.ts
git commit -m "feat(image): add types and resize calculation with tests"
```

---

## Task 2: Format Support Detection

**Files:**

- Create: `libs/image/format-support.ts`

- [ ] **Step 1: Create format support module**

```typescript
// libs/image/format-support.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add libs/image/format-support.ts
git commit -m "feat(image): add browser format support detection"
```

---

## Task 3: AVIF Worker + Encode Dispatch

**Files:**

- Create: `libs/image/avif-worker.ts`
- Create: `libs/image/encode.ts`

- [ ] **Step 1: Create AVIF Worker**

```typescript
// libs/image/avif-worker.ts
import type { ImageDimensions } from "./types";

export interface AvifEncodeRequest {
  id: number;
  imageData: ImageData;
  width: number;
  height: number;
  quality: number;
}

export interface AvifEncodeResponse {
  id: number;
  ok: boolean;
  buffer?: ArrayBuffer;
  error?: string;
}

type Resolver = (res: AvifEncodeResponse) => void;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Resolver>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./avif-encode.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (ev: MessageEvent<AvifEncodeResponse>) => {
    const msg = ev.data;
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    entry(msg);
  };
  worker.onerror = () => {
    for (const resolve of pending.values()) {
      resolve({ id: 0, ok: false, error: "Worker error" });
    }
    pending.clear();
  };
  return worker;
}

export function encodeAvif(
  imageData: ImageData,
  options: { quality: number }
): Promise<ArrayBuffer> {
  const w = ensureWorker();
  const id = nextId++;
  const req: AvifEncodeRequest = {
    id,
    imageData,
    width: imageData.width,
    height: imageData.height,
    quality: options.quality,
  };

  return new Promise<ArrayBuffer>((resolve, reject) => {
    pending.set(id, (res) => {
      if (res.ok && res.buffer) {
        resolve(res.buffer);
      } else {
        reject(new Error(res.error || "AVIF encoding failed"));
      }
    });
    // Transfer imageData buffer to avoid copying
    w.postMessage(req, [imageData.data.buffer]);
  });
}

export function terminateAvifWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    pending.clear();
  }
}
```

- [ ] **Step 2: Create the actual Worker file**

```typescript
// libs/image/avif-encode.worker.ts
import type { AvifEncodeRequest, AvifEncodeResponse } from "./avif-worker";

// This file runs inside a Web Worker.
// @jsquash/avif/encode will be loaded on first call.

let encodeModule: typeof import("@jsquash/avif/encode") | null = null;
let initPromise: Promise<void> | null = null;

async function ensureModule() {
  if (encodeModule) return;
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
    const mod = await import("@jsquash/avif/encode");
    await mod.init({
      locateFile: (file: string) => `/wasm/${file}`,
    });
    encodeModule = mod;
  })();
  await initPromise;
}

self.addEventListener("message", async (ev: MessageEvent<AvifEncodeRequest>) => {
  const req = ev.data;
  try {
    await ensureModule();
    const buffer = await encodeModule!.encode(req.imageData, {
      quality: req.quality,
    });
    const res: AvifEncodeResponse = { id: req.id, ok: true, buffer };
    self.postMessage(res, [buffer]);
  } catch (err) {
    const res: AvifEncodeResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : "AVIF encoding failed",
    };
    self.postMessage(res);
  }
});
```

- [ ] **Step 3: Create encode dispatch**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add libs/image/encode.ts libs/image/avif-worker.ts libs/image/avif-encode.worker.ts
git commit -m "feat(image): add encode dispatch and AVIF worker"
```

---

## Task 4: Project Infrastructure

**Files:**

- Modify: `package.json`
- Modify: `next.config.js` (or `next.config.ts`/`next.config.mjs`)
- Create: `public/wasm/.gitkeep`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Install @jsquash/avif**

Run: `npm install @jsquash/avif`

- [ ] **Step 2: Add postinstall script to copy WASM**

Add to `package.json` scripts section:

```
"postinstall": "node -e \"const fs=require('fs');const p='public/wasm';if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true});const src='node_modules/@jsquash/avif/avif_enc.wasm';if(fs.existsSync(src))fs.copyFileSync(src,p+'/avif_enc.wasm')\""
```

- [ ] **Step 3: Run postinstall**

Run: `npm run postinstall`
Verify: `ls public/wasm/avif_enc.wasm` exists

- [ ] **Step 4: Update vitest config**

Add `"libs/image/**/*.test.ts"` to the `include` array in `vitest.config.ts`.

- [ ] **Step 5: Add WASM webpack config to next.config**

Find the existing next.config file and add webpack configuration for `.wasm` files as `asset/resource`:

```javascript
webpack: (config) => {
  config.experiments = { ...config.experiments, asyncWebAssembly: true };
  config.module.rules.push({
    test: /\.wasm$/,
    type: "asset/resource",
  });
  return config;
},
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json public/wasm/ vitest.config.ts next.config.*
git commit -m "chore(image): add @jsquash/avif dependency, WASM setup, vitest config"
```

---

## Task 5: Tool Registration + Translations

**Files:**

- Modify: `libs/tools.ts`
- Modify: `public/locales/en/tools.json`
- Modify: `public/locales/zh-CN/tools.json`
- Modify: `public/locales/zh-TW/tools.json`
- Create: `public/locales/en/image.json`
- Create: `public/locales/zh-CN/image.json`
- Create: `public/locales/zh-TW/image.json`

- [ ] **Step 1: Add image to TOOLS array**

In `libs/tools.ts`:

1. Import `ImageDown` from `lucide-react`
2. Add `{ key: "image", path: "/image", icon: ImageDown }` at the end of the `TOOLS` array (before `] as const`)

- [ ] **Step 2: Add English tools.json entry**

Add to `public/locales/en/tools.json`:

```json
"image": {
  "title": "Image Compressor & Format Converter - PNG, JPG, WebP, AVIF",
  "shortTitle": "Image Compressor",
  "description": "Compress, resize, and convert images between PNG, JPG, WebP, and AVIF formats. All processing runs locally in your browser."
}
```

- [ ] **Step 3: Add zh-CN tools.json entry**

Add to `public/locales/zh-CN/tools.json`:

```json
"image": {
  "title": "图片压缩 / 格式转换 - PNG, JPG, WebP, AVIF",
  "shortTitle": "图片压缩",
  "description": "在线压缩、调整大小、转换图片格式，支持 PNG、JPG、WebP、AVIF。所有处理在浏览器本地完成，不上传数据。",
  "searchTerms": "tupianyasuo tpyas yasuo webp avif"
}
```

- [ ] **Step 4: Add zh-TW tools.json entry**

Add to `public/locales/zh-TW/tools.json`:

```json
"image": {
  "title": "圖片壓縮 / 格式轉換 - PNG, JPG, WebP, AVIF",
  "shortTitle": "圖片壓縮",
  "description": "線上壓縮、調整大小、轉換圖片格式，支援 PNG、JPG、WebP、AVIF。所有處理在瀏覽器本機完成，不上傳資料。",
  "searchTerms": "tupianyasuo tpyas yasuo webp avif"
}
```

- [ ] **Step 5: Create English image.json**

Create `public/locales/en/image.json` with the full translation object from the spec (all keys: dropImage, supportedFormats, outputFormat, formatUnsupported, quality, resize, noResize, byPercent, customSize, width, height, keepAspectRatio, download, copyToClipboard, copiedToClipboard, reselect, original, compressed, saved, loadingEncoder, encodingAvif, encodingFailed, firstFrameOnly, dragToCompare, descriptions.title, descriptions.p1-p3).

- [ ] **Step 6: Create zh-CN image.json**

Create `public/locales/zh-CN/image.json` with identical key structure, Chinese Simplified translations.

- [ ] **Step 7: Create zh-TW image.json**

Create `public/locales/zh-TW/image.json` with identical key structure, Chinese Traditional translations.

- [ ] **Step 8: Commit**

```bash
git add libs/tools.ts public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json public/locales/en/image.json public/locales/zh-CN/image.json public/locales/zh-TW/image.json
git commit -m "feat(image): register tool and add i18n translations"
```

---

## Task 6: Page Route

**Files:**

- Create: `app/[locale]/image/page.tsx`

- [ ] **Step 1: Create route entry**

```typescript
// app/[locale]/image/page.tsx
import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import ImagePage from "./image-page";

const PATH = "/image";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("image.title"),
    description: t("image.description"),
  });
}

export default function ImageRoute() {
  return <ImagePage />;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/image/page.tsx
git commit -m "feat(image): add route entry with SEO metadata"
```

---

## Task 7: Page Component — Upload Zone + State

**Files:**

- Create: `app/[locale]/image/image-page.tsx`

This is the largest task. The page component contains all UI and logic. It follows the same pattern as `base64-page.tsx`: `"use client"`, `Layout` wrapper, inner `Conversion` + `Description` functions, default export.

- [ ] **Step 1: Create page component skeleton with upload zone**

Create `app/[locale]/image/image-page.tsx` with:

1. All imports (React, next-intl, Layout, file-selector, rc-slider, lucide-react icons, component primitives from `../../../components/ui/`, encode/resize/format-support/toast)
2. `ImagePage` default export following the standard pattern (Layout + alert banner + Conversion + Description)
3. `Conversion` function component with:
   - All state from spec (sourceFile, sourceBitmap, outputFormat, quality, resizeMode, resizePercent, targetWidth, targetHeight, keepAspectRatio, resultBlob, processing, avifStatus)
   - `supportedFormats` state (loaded via `getSupportedEncodeFormats()`)
   - `stalenessId` ref for cancellation
   - `dropZoneRef` for drag-drop
   - `prevBlobUrlRef` for memory management
   - File drop handler using `fromEvent` from `file-selector` (following Checksum pattern)
   - File input change handler
   - `handleFileSelect` function: validate file type (image/\*), create `createImageBitmap`, set state
   - Upload zone JSX (drop area with icon + text, or click-to-select via hidden `<input type="file" accept="image/*">`)
4. `Description` function with Accordion component explaining the tool

The upload zone should be shown when `sourceBitmap === null`, following Checksum's drop zone pattern with `border-2 border-dashed border-accent-cyan/30`.

- [ ] **Step 2: Verify dev server renders the upload zone**

Run: `npm run dev`
Navigate to `http://localhost:3000/image`
Expected: Upload zone visible with drop area, Description section below

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/image/image-page.tsx
git commit -m "feat(image): add page component with upload zone"
```

---

## Task 8: Page Component — Controls + Processing Flow

**Files:**

- Modify: `app/[locale]/image/image-page.tsx`

- [ ] **Step 1: Add encode processing logic**

Add to the `Conversion` component:

1. `useEffect` for processing: triggered by `[outputFormat, quality, resizeMode, resizePercent, targetWidth, targetHeight, keepAspectRatio, sourceBitmap]`
2. Calculate target dimensions via `calculateDimensions()`
3. Debounce with 300ms (use `setTimeout` + cleanup, like Diff tool pattern)
4. Skip debounce on initial load (use a ref flag)
5. Call `encode()` with staleness check
6. Revoke previous blob URL on new result
7. Handle errors with `showToast()`
8. Set `processing` / `avifStatus` state for UI feedback
9. `useEffect` cleanup: terminate AVIF worker on unmount

- [ ] **Step 2: Add controls panel JSX**

Render controls panel (left side of editor layout):

1. Format selector: `StyledSelect` with PNG/JPG/WebP/AVIF options. Disable unsupported formats based on `supportedFormats`. Add `title` tooltip with `t("formatUnsupported")` for disabled options.
2. Quality slider: `rc-slider` (min=1, max=100, step=1), hidden when format is PNG. Import `rc-slider/assets/index.css`. Use same style as QR Code: `railStyle`, `trackStyle`, `handleStyle` with CSS variables.
3. Resize radio group: three `StyledCheckbox` options (none/percent/custom)
4. Percent input: shown when resize mode is "percent", `StyledInput` type number
5. Custom dimensions: shown when resize mode is "custom", two `StyledInput` for width/height
6. Keep aspect ratio: `StyledCheckbox`, shown when resize mode is "custom"
7. Action buttons: Reselect (`Button variant="secondary"`) + Download (`Button variant="primary"`)

- [ ] **Step 3: Add download handler**

Download handler:

1. Derive filename from `sourceFile.name` — replace extension with output format extension
2. Create blob URL from `resultBlob`
3. Create hidden `<a>` element with `download` attribute, trigger click
4. Revoke blob URL after click

- [ ] **Step 4: Add copy-to-clipboard handler**

Copy handler:

1. Use `navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])` pattern from QR Code
2. Show success toast on completion
3. Show error toast on failure

- [ ] **Step 5: Verify controls work in dev**

Run: `npm run dev`
Upload an image → verify format selector, quality slider, resize options work
Verify: changing format/quality triggers re-encode, output blob updates

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/image/image-page.tsx
git commit -m "feat(image): add controls panel and processing flow"
```

---

## Task 9: Page Component — Preview Area

**Files:**

- Modify: `app/[locale]/image/image-page.tsx`

- [ ] **Step 1: Add comparison slider component**

Add a comparison slider inside the preview area:

1. Container div with `relative` positioning
2. Two overlapping `<img>` elements: original (left clip) and compressed (right clip)
3. Vertical divider line, absolutely positioned
4. Mouse/touch drag handler on the divider
5. Use `clip-path: inset(...)` or `width` + `overflow: hidden` to split the view
6. Both images use `object-fit: contain` to fit the container
7. Show "Original" / "Compressed" labels at top of each half
8. Show `t("dragToCompare")` hint text

- [ ] **Step 2: Add info bar below preview**

Info bar showing:

1. Original: `{formatBytes(sourceFile.size)} {sourceBitmap.width}×{sourceBitmap.height}`
2. Output: `{formatBytes(resultBlob.size)} {dimensions}`
3. Saved: `{savedPercent}%` with green color when positive, red when output is larger

Use `formatBytes()` from `../../../utils/storage` (already used by Checksum tool).

- [ ] **Step 3: Add loading overlay for AVIF**

When `processing && outputFormat === "avif"`:

1. Show overlay div with spinner (same animation as Checksum: `border-2 border-accent-cyan border-t-transparent rounded-full animate-spin`)
2. Show `avifStatus` text: `t("loadingEncoder")` or `t("encodingAvif")`

- [ ] **Step 4: Verify preview in dev**

Upload an image → verify slider comparison works, info bar shows correct sizes, drag works

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/image/image-page.tsx
git commit -m "feat(image): add preview comparison slider and info bar"
```

---

## Task 10: Edge Cases + Memory Management

**Files:**

- Modify: `app/[locale]/image/image-page.tsx`

- [ ] **Step 1: Add edge case handling**

1. Animated image detection: when `sourceFile.type` is `image/gif` or `image/webp` with animation, show toast `t("firstFrameOnly")`
2. Large image warning: if `sourceBitmap.width * sourceBitmap.height > 50_000_000`, show toast warning but continue
3. Unsupported format: if file type is not `image/*`, show toast and reject
4. Canvas toBlob failure: catch error from `encode()`, show toast `t("encodingFailed")`

- [ ] **Step 2: Add memory management**

1. `sourceBitmap.close()` when reselecting a new image or on unmount
2. `URL.revokeObjectURL(prevBlobUrl)` when result changes
3. `terminateAvifWorker()` on component unmount

- [ ] **Step 3: Verify edge cases**

1. Drop a `.txt` file → expect "Unsupported format" toast
2. Drop an animated GIF → expect "first frame only" toast
3. Drop a PNG → convert to JPG → verify no transparent areas (white background)
4. Switch to AVIF → expect loading indicator

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/image/image-page.tsx
git commit -m "feat(image): add edge case handling and memory management"
```

---

## Task 11: Final Integration + Build Verification

**Files:**

- None new (verification only)

- [ ] **Step 1: Run all existing tests**

Run: `npm run test`
Expected: All existing tests pass (image tests included)

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run linter**

Run: `npx eslint app/\\[locale\\]/image/ libs/image/`
Expected: No lint errors

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: Build succeeds. The image route is included in the output.

- [ ] **Step 5: Manual smoke test**

Start dev server: `npm run dev`

1. Navigate to `/image` → upload zone visible
2. Drop a PNG image → editor loads, preview shows
3. Change format to WebP → output updates
4. Adjust quality slider → output updates with debounce
5. Resize by 50% → dimensions change in preview
6. Click Download → file downloads with correct name and extension
7. Click Copy to clipboard → verify paste works
8. Click Reselect → upload zone returns
9. Test AVIF → shows loading, then preview
10. Check `/zh-CN/image` and `/zh-TW/image` → translations load correctly
11. Check ToolsDrawer → "Image Compressor" / "图片压缩" is searchable

- [ ] **Step 6: Commit any fixes**

If any issues found during smoke test, fix and commit:

```bash
git add -A
git commit -m "fix(image): address integration issues"
```

---

## Spec Coverage Checklist

| Spec Section                                            | Task    |
| ------------------------------------------------------- | ------- |
| Types (`types.ts`)                                      | Task 1  |
| Resize calculation (`resize.ts`)                        | Task 1  |
| Format support detection (`format-support.ts`)          | Task 2  |
| AVIF Worker (`avif-worker.ts`, `avif-encode.worker.ts`) | Task 3  |
| Encode dispatch (`encode.ts`)                           | Task 3  |
| Dependencies + WASM setup                               | Task 4  |
| Tool registration (`tools.ts`)                          | Task 5  |
| Translations (3 locales)                                | Task 5  |
| Page route (`page.tsx`)                                 | Task 6  |
| Upload zone + state                                     | Task 7  |
| Controls + processing flow                              | Task 8  |
| Preview comparison slider                               | Task 9  |
| Info bar                                                | Task 9  |
| Edge cases + memory                                     | Task 10 |
| Build + smoke test                                      | Task 11 |
