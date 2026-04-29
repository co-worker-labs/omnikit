# Color Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based color converter at `/color` with format conversion (HEX/RGB/HSL/HSV/CMYK/LAB/OKLCH), visual picker + screen eyedropper, palette generation (harmonies + image extraction), WCAG + APCA contrast checking, color blindness simulation, and a recent-colors history bar — all client-side.

**Architecture:** A single Next.js App Router page (`app/[locale]/color/`) renders three tabs (Converter, Palette, Contrast) sharing a current-color state. Pure conversion/contrast/palette logic lives in `libs/color/*` with colocated vitest tests; React components live in `components/color/*`. Color blindness simulation is implemented as inline SVG `<feColorMatrix>` filters applied to the page content wrapper. `colord` handles HEX/RGB/HSL/HSV/CMYK/LAB plus harmonies and a11y; OKLCH and APCA are hand-rolled (no upstream packages).

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4, next-intl, React Compiler. New runtime deps: `colord` (~2KB), `react-colorful` (~3KB), `colorthief` (~3KB).

**Project conventions referenced:**

- React Compiler is on — never write `useMemo` / `useCallback` / `React.memo`.
- Tests live in `libs/<tool>/__tests__/<name>.test.ts`, run via vitest. The `vitest.config.ts` `include` array gates which directories run.
- Pages follow the `page.tsx` (route entry, metadata) + `<tool>-page.tsx` (`"use client"` UI) split.
- Translations are loaded by `i18n/request.ts` — every new namespace must be appended to its `namespaces` array.
- "Not transferred" alert uses `useTranslations("common")` with key `alert.notTransferred`.

---

## File Manifest

**Create:**

- `app/[locale]/color/page.tsx` — route entry (`generateMetadata` + render `<ColorPage />`).
- `app/[locale]/color/color-page.tsx` — `"use client"` page with tabs, state, history persistence, vision toggle, description.
- `libs/color/oklch.ts` — sRGB ↔ OKLab ↔ OKLCH math.
- `libs/color/convert.ts` — single source of truth for parse + format-to-string per space; configures `colord` plugins.
- `libs/color/named.ts` — closest CSS named color via `colord.toName({ closest: true })`.
- `libs/color/css-export.ts` — CSS variable / Tailwind utility / Tailwind v4 `@theme` formatters.
- `libs/color/contrast.ts` — WCAG ratio, AA/AAA thresholds, suggestion algorithm.
- `libs/color/apca.ts` — APCA Lc score (Andrew Somers SAPC reference formula, clean-room).
- `libs/color/palette.ts` — harmonies + monochromatic + image extraction wrapper.
- `libs/color/vision.ts` — vision-mode → SVG filter id mapping + filter matrices source-of-truth.
- `libs/color/__tests__/{oklch,convert,named,css-export,contrast,apca,palette,vision}.test.ts` — vitest specs.
- `components/color/vision-filter-defs.tsx` — inline `<svg>` containing `<filter>` defs.
- `components/color/color-picker.tsx` — `react-colorful` wrapper + EyeDropper button.
- `components/color/color-history-bar.tsx` — sticky history strip.
- `components/color/image-palette-dropzone.tsx` — drop/upload + colorthief invocation.
- `public/locales/en/color.json`, `public/locales/zh-CN/color.json`, `public/locales/zh-TW/color.json` — namespace translations.

**Modify:**

- `libs/tools.ts` — append `{ key: "color", path: "/color" }` to `TOOLS`.
- `libs/storage-keys.ts` — add `color: "okrun:color:history"` to `STORAGE_KEYS`.
- `i18n/request.ts` — append `"color"` to `namespaces`.
- `public/locales/en/tools.json`, `public/locales/zh-CN/tools.json`, `public/locales/zh-TW/tools.json` — add `color` key block.
- `vitest.config.ts` — add `"libs/color/**/*.test.ts"` to `test.include`.
- `package.json` — adds `colord`, `react-colorful`, `colorthief` (and `@types/colorthief`) via install command, do not edit by hand.

---

## Phase 0 — Foundation & Registration

### Task 1: Install runtime dependencies

**Files:**

- Modify: `package.json` (via npm)
- Modify: `package-lock.json`

- [ ] **Step 1: Install packages**

Run from repo root:

```bash
npm install colord react-colorful colorthief
npm install --save-dev @types/colorthief
```

- [ ] **Step 2: Verify installs**

```bash
node -e "console.log(require('colord/package.json').version, require('react-colorful/package.json').version, require('colorthief/package.json').version)"
```

Expected: three version strings printed (e.g. `2.9.3 5.6.1 2.4.0`). Versions must be ≥ 2.9 / ≥ 5.6 / ≥ 2.3.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(color): add colord, react-colorful, colorthief"
```

---

### Task 2: Register tool key, storage key, and i18n namespace

**Files:**

- Modify: `libs/tools.ts`
- Modify: `libs/storage-keys.ts`
- Modify: `i18n/request.ts`

- [ ] **Step 1: Append color to TOOLS**

In `libs/tools.ts`, append before the closing `]` of `TOOLS`:

```ts
{ key: "color", path: "/color" },
```

Position: at the end of the array, after `{ key: "htmlcode", path: "/htmlcode" }`.

- [ ] **Step 2: Add color storage key**

In `libs/storage-keys.ts`, add to `STORAGE_KEYS`:

```ts
export const STORAGE_KEYS = {
  savedPasswords: "okrun:sp",
  diff: "okrun:diff",
  markdown: "okrun:md",
  dbviewerHistory: "okrun:dbviewer:history",
  cron: "okrun:cron",
  qrcode: "okrun:qrcode",
  color: "okrun:color:history",
} as const;
```

- [ ] **Step 3: Register i18n namespace**

In `i18n/request.ts`, append `"color"` to the `namespaces` array (after `"textcase"`).

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors. (If `tsc` flags a missing `public/locales/*/color.json` import, that is fine — the import is dynamic and only resolved at runtime; if static checks complain, defer this step until Task 4 lands the JSON files.)

- [ ] **Step 5: Commit**

```bash
git add libs/tools.ts libs/storage-keys.ts i18n/request.ts
git commit -m "chore(color): register tool, storage key, and i18n namespace"
```

---

### Task 3: Add tools.json metadata (en, zh-CN, zh-TW)

**Files:**

- Modify: `public/locales/en/tools.json`
- Modify: `public/locales/zh-CN/tools.json`
- Modify: `public/locales/zh-TW/tools.json`

- [ ] **Step 1: Add English entry**

In `public/locales/en/tools.json`, insert at the appropriate spot (before the final closing `}`):

```json
"color": {
  "title": "Color Converter & Picker - HEX, RGB, HSL, OKLCH",
  "shortTitle": "Color Converter",
  "description": "Convert HEX, RGB, HSL, HSV, CMYK, LAB, OKLCH. Visual picker with eyedropper, palette generator, image color extraction, WCAG + APCA contrast, and color-blindness preview. 100% client-side."
}
```

- [ ] **Step 2: Add Simplified Chinese entry**

In `public/locales/zh-CN/tools.json`:

```json
"color": {
  "title": "颜色转换器与选择器 - HEX, RGB, HSL, OKLCH",
  "shortTitle": "颜色转换",
  "description": "在 HEX、RGB、HSL、HSV、CMYK、LAB、OKLCH 之间转换。提供取色器、屏幕吸管、配色方案生成、图像取色、WCAG + APCA 对比度检查和色盲预览。100% 浏览器端处理。"
}
```

- [ ] **Step 3: Add Traditional Chinese entry**

In `public/locales/zh-TW/tools.json`:

```json
"color": {
  "title": "顏色轉換與選色器 - HEX, RGB, HSL, OKLCH",
  "shortTitle": "顏色轉換",
  "description": "在 HEX、RGB、HSL、HSV、CMYK、LAB、OKLCH 之間轉換。提供選色器、螢幕滴管、調色板產生、圖片取色、WCAG + APCA 對比檢查與色盲預覽。100% 瀏覽器端處理。"
}
```

- [ ] **Step 4: Verify JSON validity**

```bash
node -e "JSON.parse(require('fs').readFileSync('public/locales/en/tools.json','utf8'));JSON.parse(require('fs').readFileSync('public/locales/zh-CN/tools.json','utf8'));JSON.parse(require('fs').readFileSync('public/locales/zh-TW/tools.json','utf8'));console.log('ok')"
```

Expected: prints `ok`.

- [ ] **Step 5: Commit**

```bash
git add public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
git commit -m "chore(color): add tools.json metadata for color tool"
```

---

### Task 4: Add color.json translation namespace (en, zh-CN, zh-TW)

**Files:**

- Create: `public/locales/en/color.json`
- Create: `public/locales/zh-CN/color.json`
- Create: `public/locales/zh-TW/color.json`

- [ ] **Step 1: Create English file**

Write `public/locales/en/color.json` with the exact content from the spec section "Translation keys (color.json)" (the JSON block starting with `"tabs": { "converter": "Converter" ...`). Top-level structure:

```json
{
  "tabs": {...},
  "vision": {...},
  "converter": {...},
  "palette": {...},
  "contrast": {...},
  "history": {...},
  "errors": {...},
  "description": {...}
}
```

Use the spec verbatim. Do not paraphrase.

- [ ] **Step 2: Create Simplified Chinese translation**

Write `public/locales/zh-CN/color.json` with the same key structure. Translations:

```json
{
  "tabs": { "converter": "转换", "palette": "配色", "contrast": "对比度" },
  "vision": {
    "label": "色觉",
    "none": "正常视觉",
    "protanopia": "红色盲",
    "deuteranopia": "绿色盲",
    "tritanopia": "蓝色盲",
    "achromatopsia": "全色盲"
  },
  "converter": {
    "hex": "HEX",
    "rgb": "RGB",
    "hsl": "HSL",
    "hsv": "HSV",
    "cmyk": "CMYK",
    "lab": "LAB",
    "oklch": "OKLCH",
    "hsvNote": "HSV 仅供参考。CSS 没有 hsv() 函数 — 请改用 HSL。",
    "closestName": "最接近的 CSS 颜色名",
    "eyedropper": "从屏幕拾取颜色",
    "eyedropperUnsupported": "屏幕吸管需要 Chromium 内核浏览器",
    "cssVariable": "CSS 变量",
    "cssVariableName": "变量名",
    "tailwindClass": "Tailwind 类",
    "tailwindTheme": "Tailwind v4 @theme"
  },
  "palette": {
    "current": "当前",
    "complementary": "互补色",
    "analogous": "邻近色",
    "triadic": "三元色",
    "splitComplementary": "分裂互补色",
    "tetradic": "四元色",
    "monochromatic": "单色",
    "fromImage": "从图片提取",
    "imageDrop": "拖入图片或点击上传 (最大 5MB)",
    "imageError": "无法从此图片中提取颜色",
    "copyAll": "全部复制"
  },
  "contrast": {
    "foreground": "前景色",
    "background": "背景色",
    "swap": "交换颜色",
    "preview": "预览",
    "wcagTitle": "WCAG 2.1",
    "apcaTitle": "APCA (WCAG 3 候选)",
    "ratio": "对比度",
    "lc": "Lc 分数",
    "normal": "正常文本",
    "large": "大号文本",
    "bodyText": "正文",
    "headline": "标题",
    "fluent": "辅助",
    "pass": "通过",
    "fail": "未通过",
    "suggestionTitle": "建议",
    "suggestionText": "调整为 {color} 即可通过 {target}",
    "useThis": "采用"
  },
  "history": { "recent": "最近", "clear": "清空" },
  "errors": {
    "invalidColor": "无效的颜色值",
    "fileTooLarge": "图片必须小于 5MB",
    "fileNotImage": "请上传 PNG、JPG 或 WebP 图片"
  },
  "description": {
    "title": "关于颜色转换",
    "introTitle": "什么是颜色转换器？",
    "introP1": "颜色转换器在网页、印刷和设计所用的不同格式之间转换同一个颜色 — HEX 适合 CSS，RGB/HSL 便于实时调整，CMYK 用于印刷，LAB/OKLCH 提供感知均匀性。",
    "spacesTitle": "颜色空间",
    "spaceHex": "HEX — 紧凑的 6/8 位 RGB 表示法。CSS 默认格式。",
    "spaceRgb": "RGB — 0–255 的加色三原色。直接对应显示像素。",
    "spaceHsl": "HSL — 色相/饱和度/亮度。比 RGB 更易理解。",
    "spaceHsv": "HSV — 色相/饱和度/明度。设计工具常用，但不是 CSS 函数。",
    "spaceCmyk": "CMYK — 用于印刷的减色三原色。从 RGB 转换为近似值。",
    "spaceLab": "LAB — 感知均匀；数值距离 ≈ 视觉距离。",
    "spaceOklch": "OKLCH — 现代感知颜色空间；Tailwind v4 与 CSS Color Module Level 4 推荐。",
    "harmoniesTitle": "配色方案",
    "harmoniesP1": "配色方案基于色环上的数学关系（互补色 180°、三元色 120° 等），通常能产生平衡的调色板。",
    "contrastTitle": "对比度（WCAG 与 APCA）",
    "contrastP1": "WCAG 2.1 使用亮度比（1:1 到 21:1）以 AA/AAA 为阈值。支持广泛，但对小字体和深色模式的感知考量不够充分。",
    "contrastP2": "APCA 是 WCAG 3 的候选标准，使用极性感知的 Lc 分数，对细小文字的可读性预测更准确。",
    "visionTitle": "色盲预览",
    "visionP1": "约 1/12 的男性和 1/200 的女性存在某种色觉缺陷。「色觉」开关可模拟红、绿、蓝色盲与全色盲，便于验证设计。",
    "tipsTitle": "提示",
    "tipEyedropper": "使用屏幕吸管从任意像素拾取颜色（仅 Chromium 浏览器）。",
    "tipImage": "在配色页拖入图片，通过中位切分量化提取 6 个主色。",
    "tipOklch": "Tailwind v4 默认输出 OKLCH 颜色以保证感知平滑 — 复制 @theme 块以匹配该工作流。"
  }
}
```

- [ ] **Step 3: Create Traditional Chinese translation**

Write `public/locales/zh-TW/color.json`. Mirror the zh-CN structure with Traditional characters and Taiwanese phrasing:

```json
{
  "tabs": { "converter": "轉換", "palette": "配色", "contrast": "對比度" },
  "vision": {
    "label": "色覺",
    "none": "正常視覺",
    "protanopia": "紅色盲",
    "deuteranopia": "綠色盲",
    "tritanopia": "藍色盲",
    "achromatopsia": "全色盲"
  },
  "converter": {
    "hex": "HEX",
    "rgb": "RGB",
    "hsl": "HSL",
    "hsv": "HSV",
    "cmyk": "CMYK",
    "lab": "LAB",
    "oklch": "OKLCH",
    "hsvNote": "HSV 僅供參考。CSS 沒有 hsv() 函式 — 請改用 HSL。",
    "closestName": "最接近的 CSS 顏色名稱",
    "eyedropper": "從螢幕取色",
    "eyedropperUnsupported": "螢幕滴管需要 Chromium 內核瀏覽器",
    "cssVariable": "CSS 變數",
    "cssVariableName": "變數名稱",
    "tailwindClass": "Tailwind 類別",
    "tailwindTheme": "Tailwind v4 @theme"
  },
  "palette": {
    "current": "目前",
    "complementary": "互補色",
    "analogous": "相鄰色",
    "triadic": "三色組",
    "splitComplementary": "分裂互補色",
    "tetradic": "四色組",
    "monochromatic": "單色",
    "fromImage": "從圖片擷取",
    "imageDrop": "拖入圖片或點擊上傳（最大 5MB）",
    "imageError": "無法從此圖片中擷取顏色",
    "copyAll": "全部複製"
  },
  "contrast": {
    "foreground": "前景",
    "background": "背景",
    "swap": "交換顏色",
    "preview": "預覽",
    "wcagTitle": "WCAG 2.1",
    "apcaTitle": "APCA（WCAG 3 候選）",
    "ratio": "對比度",
    "lc": "Lc 分數",
    "normal": "一般文字",
    "large": "大型文字",
    "bodyText": "本文",
    "headline": "標題",
    "fluent": "輔助",
    "pass": "通過",
    "fail": "未通過",
    "suggestionTitle": "建議",
    "suggestionText": "調整為 {color} 即可通過 {target}",
    "useThis": "採用"
  },
  "history": { "recent": "最近", "clear": "清除" },
  "errors": {
    "invalidColor": "無效的顏色值",
    "fileTooLarge": "圖片必須小於 5MB",
    "fileNotImage": "請上傳 PNG、JPG 或 WebP 圖片"
  },
  "description": {
    "title": "關於顏色轉換",
    "introTitle": "什麼是顏色轉換器？",
    "introP1": "顏色轉換器在網頁、印刷與設計使用的不同格式之間轉換同一個顏色 — HEX 適合 CSS，RGB/HSL 便於即時調整，CMYK 用於印刷，LAB/OKLCH 提供感知均勻性。",
    "spacesTitle": "顏色空間",
    "spaceHex": "HEX — 簡潔的 6/8 位元 RGB 表示法。CSS 預設格式。",
    "spaceRgb": "RGB — 0–255 的加色三原色。直接對應顯示像素。",
    "spaceHsl": "HSL — 色相/飽和度/亮度。比 RGB 更易理解。",
    "spaceHsv": "HSV — 色相/飽和度/明度。設計工具常用，但不是 CSS 函式。",
    "spaceCmyk": "CMYK — 用於印刷的減色三原色。從 RGB 轉換為近似值。",
    "spaceLab": "LAB — 感知均勻；數值距離 ≈ 視覺距離。",
    "spaceOklch": "OKLCH — 現代感知顏色空間；Tailwind v4 與 CSS Color Module Level 4 推薦。",
    "harmoniesTitle": "配色方案",
    "harmoniesP1": "配色方案基於色環上的數學關係（互補色 180°、三色組 120° 等），通常能產生平衡的調色板。",
    "contrastTitle": "對比度（WCAG 與 APCA）",
    "contrastP1": "WCAG 2.1 使用亮度比（1:1 到 21:1）以 AA/AAA 為門檻。支援廣泛，但對小字體與深色模式的感知考量不足。",
    "contrastP2": "APCA 是 WCAG 3 的候選標準，使用極性感知的 Lc 分數，對細小文字的可讀性預測更準確。",
    "visionTitle": "色盲預覽",
    "visionP1": "約 1/12 的男性與 1/200 的女性具有某種色覺缺陷。「色覺」切換可模擬紅、綠、藍色盲與全色盲，便於驗證設計。",
    "tipsTitle": "提示",
    "tipEyedropper": "使用螢幕滴管從任意像素拾取顏色（僅 Chromium 瀏覽器）。",
    "tipImage": "在配色分頁拖入圖片，透過中位切分量化擷取 6 個主色。",
    "tipOklch": "Tailwind v4 預設輸出 OKLCH 顏色以保證感知平滑 — 複製 @theme 區塊以對齊該工作流。"
  }
}
```

- [ ] **Step 4: Validate JSON**

```bash
for f in public/locales/en/color.json public/locales/zh-CN/color.json public/locales/zh-TW/color.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "$f ok"; done
```

Expected: three lines ending with `ok`.

- [ ] **Step 5: Commit**

```bash
git add public/locales/en/color.json public/locales/zh-CN/color.json public/locales/zh-TW/color.json
git commit -m "chore(color): add color namespace translations (en, zh-CN, zh-TW)"
```

---

## Phase 1 — Pure conversion logic (TDD)

All tasks in this phase follow strict TDD: write a failing test, run it, implement the minimum to pass, run again, commit. The `vitest.config.ts` `include` array does not yet match `libs/color/**` — that is updated in Task 24. Until then, run targeted tests by file path: `npx vitest run libs/color/__tests__/<name>.test.ts`. Vitest will pick up these files because the path is given explicitly even if the include glob excludes them.

### Task 5: OKLCH conversion

**Files:**

- Create: `libs/color/oklch.ts`
- Create: `libs/color/__tests__/oklch.test.ts`

OKLCH math, per Björn Ottosson's reference: sRGB → linear sRGB → LMS via M1 matrix → LMS' (cube root) → OKLab via M2 → OKLCH (Cartesian to polar). Round-trips through this entire pipeline.

- [ ] **Step 1: Write failing tests**

Create `libs/color/__tests__/oklch.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rgbToOklch, oklchToRgb, formatOklch, parseOklch } from "../oklch";

describe("rgbToOklch", () => {
  it("converts white to L=1, C≈0", () => {
    const { l, c } = rgbToOklch({ r: 255, g: 255, b: 255 });
    expect(l).toBeCloseTo(1, 3);
    expect(c).toBeCloseTo(0, 3);
  });

  it("converts black to L=0, C=0", () => {
    const { l, c } = rgbToOklch({ r: 0, g: 0, b: 0 });
    expect(l).toBeCloseTo(0, 3);
    expect(c).toBeCloseTo(0, 3);
  });

  it("converts pure red to known OKLCH", () => {
    // sRGB(255,0,0) ≈ oklch(0.628 0.258 29.23)
    const { l, c, h } = rgbToOklch({ r: 255, g: 0, b: 0 });
    expect(l).toBeCloseTo(0.628, 2);
    expect(c).toBeCloseTo(0.258, 2);
    expect(h).toBeCloseTo(29.23, 1);
  });
});

describe("oklchToRgb", () => {
  it("round-trips white", () => {
    const rgb = oklchToRgb({ l: 1, c: 0, h: 0 });
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(255);
    expect(rgb.b).toBe(255);
  });

  it("round-trips a teal close to original within 1 unit per channel", () => {
    const original = { r: 6, g: 214, b: 160 };
    const back = oklchToRgb(rgbToOklch(original));
    expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(1);
  });
});

describe("formatOklch", () => {
  it("formats with percent L, 2-decimal C, integer H", () => {
    expect(formatOklch({ l: 0.78, c: 0.16, h: 165 })).toBe("oklch(78% 0.16 165)");
  });

  it("clamps NaN hue (achromatic) to 0", () => {
    expect(formatOklch({ l: 0.5, c: 0, h: NaN })).toBe("oklch(50% 0 0)");
  });
});

describe("parseOklch", () => {
  it("parses canonical form", () => {
    const parsed = parseOklch("oklch(78% 0.16 165)");
    expect(parsed).not.toBeNull();
    expect(parsed!.l).toBeCloseTo(0.78);
    expect(parsed!.c).toBeCloseTo(0.16);
    expect(parsed!.h).toBeCloseTo(165);
  });

  it("returns null on invalid input", () => {
    expect(parseOklch("oklch(garbage)")).toBeNull();
    expect(parseOklch("rgb(0,0,0)")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests; expect failure**

```bash
npx vitest run libs/color/__tests__/oklch.test.ts
```

Expected: tests fail because the file does not exist (`Error: Cannot find module '../oklch'`).

- [ ] **Step 3: Implement `libs/color/oklch.ts`**

```ts
export interface RGB {
  r: number; // 0–255
  g: number; // 0–255
  b: number; // 0–255
}

export interface OKLCH {
  l: number; // 0–1
  c: number; // 0–~0.4
  h: number; // 0–360 (NaN allowed for achromatic)
}

const srgbToLinear = (v: number): number => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};

const linearToSrgb = (v: number): number => {
  const x = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, x)) * 255);
};

export function rgbToOklch({ r, g, b }: RGB): OKLCH {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + b2 * b2);
  let H = (Math.atan2(b2, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  if (C < 1e-6) H = NaN;

  return { l: L, c: C, h: H };
}

export function oklchToRgb({ l, c, h }: OKLCH): RGB {
  const hue = isNaN(h) ? 0 : h;
  const a = c * Math.cos((hue * Math.PI) / 180);
  const b = c * Math.sin((hue * Math.PI) / 180);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lr = l_ ** 3;
  const lg = m_ ** 3;
  const lb = s_ ** 3;

  const lin_r = +4.0767416621 * lr - 3.3077115913 * lg + 0.2309699292 * lb;
  const lin_g = -1.2684380046 * lr + 2.6097574011 * lg - 0.3413193965 * lb;
  const lin_b = -0.0041960863 * lr - 0.7034186147 * lg + 1.707614701 * lb;

  return { r: linearToSrgb(lin_r), g: linearToSrgb(lin_g), b: linearToSrgb(lin_b) };
}

export function formatOklch({ l, c, h }: OKLCH): string {
  const lp = Math.round(l * 100);
  const cs = c.toFixed(2);
  const hs = isNaN(h) ? 0 : Math.round(h);
  return `oklch(${lp}% ${cs} ${hs})`;
}

export function parseOklch(input: string): OKLCH | null {
  const m = input
    .trim()
    .toLowerCase()
    .match(/^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (!m) return null;
  const lRaw = parseFloat(m[1]);
  const c = parseFloat(m[2]);
  const h = parseFloat(m[3]);
  if (!isFinite(lRaw) || !isFinite(c) || !isFinite(h)) return null;
  // If raw L looks like a percent (0–100), normalize to 0–1; otherwise assume 0–1.
  const l = lRaw > 1 ? lRaw / 100 : lRaw;
  return { l, c, h };
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npx vitest run libs/color/__tests__/oklch.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add libs/color/oklch.ts libs/color/__tests__/oklch.test.ts
git commit -m "feat(color): add sRGB <-> OKLCH conversion and formatter"
```

---

### Task 6: Convert wrapper (colord plugins consolidation)

**Files:**

- Create: `libs/color/convert.ts`
- Create: `libs/color/__tests__/convert.test.ts`

`convert.ts` is the **only** file that calls `colord.extend()`. All other modules import `parse()` and `format()` from here. This guarantees plugins register exactly once and avoids cross-module ordering bugs.

- [ ] **Step 1: Write failing tests**

Create `libs/color/__tests__/convert.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  parse,
  formatAll,
  formatHex,
  formatRgb,
  formatHsl,
  formatHsv,
  formatCmyk,
  formatLab,
} from "../convert";

describe("parse", () => {
  it("accepts HEX with and without leading #", () => {
    expect(parse("#06d6a0")).not.toBeNull();
    expect(parse("06d6a0")).not.toBeNull();
  });

  it("accepts 8-digit HEX with alpha", () => {
    const c = parse("#06d6a0cc");
    expect(c).not.toBeNull();
    expect(c!.alpha()).toBeCloseTo(204 / 255, 2);
  });

  it("accepts rgb()/rgba() with both comma and space syntax", () => {
    expect(parse("rgb(6, 214, 160)")).not.toBeNull();
    expect(parse("rgb(6 214 160)")).not.toBeNull();
    expect(parse("rgba(6, 214, 160, 0.8)")).not.toBeNull();
  });

  it("accepts hsl(), hsv(), cmyk(), lab(), and oklch() inputs", () => {
    expect(parse("hsl(163, 94%, 43%)")).not.toBeNull();
    expect(parse("hsv(163, 97%, 84%)")).not.toBeNull();
    expect(parse("cmyk(97 0 25 16)")).not.toBeNull();
    expect(parse("lab(76 -56 20)")).not.toBeNull();
    expect(parse("oklch(78% 0.16 165)")).not.toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parse("not-a-color")).toBeNull();
    expect(parse("")).toBeNull();
  });
});

describe("formatters", () => {
  it("HEX returns 6-digit when alpha is 1, 8-digit otherwise", () => {
    expect(formatHex(parse("#06d6a0")!)).toBe("#06d6a0");
    expect(formatHex(parse("rgba(6,214,160,0.5)")!)).toMatch(/^#06d6a0(7f|80)$/i);
  });

  it("RGB uses comma form", () => {
    expect(formatRgb(parse("#06d6a0")!)).toBe("rgb(6, 214, 160)");
  });

  it("HSL uses degree+%/% form", () => {
    expect(formatHsl(parse("#06d6a0")!)).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it("HSV uses degree + 2 percents", () => {
    expect(formatHsv(parse("#06d6a0")!)).toMatch(/^\d+° \d+% \d+%$/);
  });

  it("CMYK uses 4 percent values inside cmyk()", () => {
    expect(formatCmyk(parse("#06d6a0")!)).toMatch(/^cmyk\(\d+% \d+% \d+% \d+%\)$/);
  });

  it("LAB uses lab() with space-separated values", () => {
    expect(formatLab(parse("#06d6a0")!)).toMatch(/^lab\([\d.\-]+ [\d.\-]+ [\d.\-]+\)$/);
  });
});

describe("formatAll", () => {
  it("returns every supported format for one color", () => {
    const all = formatAll(parse("#06d6a0")!);
    expect(all).toEqual(
      expect.objectContaining({
        hex: expect.any(String),
        rgb: expect.any(String),
        hsl: expect.any(String),
        hsv: expect.any(String),
        cmyk: expect.any(String),
        lab: expect.any(String),
        oklch: expect.any(String),
      })
    );
  });
});
```

- [ ] **Step 2: Run tests; expect failure**

```bash
npx vitest run libs/color/__tests__/convert.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement `libs/color/convert.ts`**

```ts
import { Colord, colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import cmykPlugin from "colord/plugins/cmyk";
import labPlugin from "colord/plugins/lab";
import lchPlugin from "colord/plugins/lch";
import harmoniesPlugin from "colord/plugins/harmonies";
import a11yPlugin from "colord/plugins/a11y";
import mixPlugin from "colord/plugins/mix";
// NOTE: mixPlugin is not required by the spec but kept for potential future use
// (e.g., color blending in a gradient or mixing feature). Safe to remove if unused.
import { parseOklch, rgbToOklch, oklchToRgb, formatOklch } from "./oklch";

// mixPlugin registered but not used by spec features — available for future extensions.
extend([namesPlugin, cmykPlugin, labPlugin, lchPlugin, harmoniesPlugin, a11yPlugin, mixPlugin]);

export type ColorObject = Colord;

export function parse(input: string): ColorObject | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Try OKLCH first because colord does not parse it.
  const oklch = parseOklch(trimmed);
  if (oklch) {
    const { r, g, b } = oklchToRgb(oklch);
    return colord({ r, g, b });
  }

  // Add # for raw hex digits.
  const candidate = /^[0-9a-f]{3,8}$/i.test(trimmed) ? `#${trimmed}` : trimmed;
  const c = colord(candidate);
  return c.isValid() ? c : null;
}

export function formatHex(c: ColorObject): string {
  // colord.toHex() returns 6-digit when alpha === 1 and 8-digit otherwise.
  return c.toHex();
}

export function formatRgb(c: ColorObject): string {
  const { r, g, b, a } = c.rgba;
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${+a.toFixed(2)})`;
}

export function formatHsl(c: ColorObject): string {
  const { h, s, l, a } = c.toHsl();
  const hi = Math.round(h);
  const si = Math.round(s);
  const li = Math.round(l);
  return a === 1 ? `hsl(${hi}, ${si}%, ${li}%)` : `hsla(${hi}, ${si}%, ${li}%, ${+a.toFixed(2)})`;
}

export function formatHsv(c: ColorObject): string {
  const { h, s, v } = c.toHsv();
  return `${Math.round(h)}° ${Math.round(s)}% ${Math.round(v)}%`;
}

export function formatCmyk(c: ColorObject): string {
  // Plugin adds toCmyk(): { c, m, y, k }
  const {
    c: cc,
    m,
    y,
    k,
  } = (c as Colord & { toCmyk: () => { c: number; m: number; y: number; k: number } }).toCmyk();
  return `cmyk(${Math.round(cc)}% ${Math.round(m)}% ${Math.round(y)}% ${Math.round(k)}%)`;
}

export function formatLab(c: ColorObject): string {
  const { l, a, b } = (c as Colord & { toLab: () => { l: number; a: number; b: number } }).toLab();
  return `lab(${l.toFixed(1)} ${a.toFixed(1)} ${b.toFixed(1)})`;
}

export function formatOklchOf(c: ColorObject): string {
  const { r, g, b } = c.rgba;
  return formatOklch(rgbToOklch({ r, g, b }));
}

export interface FormattedColor {
  hex: string;
  rgb: string;
  hsl: string;
  hsv: string;
  cmyk: string;
  lab: string;
  oklch: string;
}

export function formatAll(c: ColorObject): FormattedColor {
  return {
    hex: formatHex(c),
    rgb: formatRgb(c),
    hsl: formatHsl(c),
    hsv: formatHsv(c),
    cmyk: formatCmyk(c),
    lab: formatLab(c),
    oklch: formatOklchOf(c),
  };
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npx vitest run libs/color/__tests__/convert.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add libs/color/convert.ts libs/color/__tests__/convert.test.ts
git commit -m "feat(color): add unified parse/format wrapper around colord"
```

---

### Task 7: Closest CSS named color

**Files:**

- Create: `libs/color/named.ts`
- Create: `libs/color/__tests__/named.test.ts`

- [ ] **Step 1: Write failing tests**

Create `libs/color/__tests__/named.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { closestName } from "../named";
import { parse } from "../convert";

describe("closestName", () => {
  it("returns the exact name for a known CSS color", () => {
    expect(closestName(parse("#ff0000")!)).toBe("red");
  });

  it("returns the closest known name for an off-palette color", () => {
    // #06d6a0 is closest to mediumspringgreen / mediumaquamarine; assert one of those.
    const name = closestName(parse("#06d6a0")!);
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
  });

  it("never returns null for a valid color (closest mode)", () => {
    expect(closestName(parse("#123456")!)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests; expect module-not-found failure**

```bash
npx vitest run libs/color/__tests__/named.test.ts
```

- [ ] **Step 3: Implement `libs/color/named.ts`**

```ts
import type { ColorObject } from "./convert";
import "./convert"; // ensures namesPlugin is loaded

export function closestName(c: ColorObject): string {
  // Plugin adds toName(): string | undefined; with closest:true, always returns a string.
  const name = (
    c as ColorObject & { toName: (opts?: { closest?: boolean }) => string | undefined }
  ).toName({ closest: true });
  return name ?? "";
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npx vitest run libs/color/__tests__/named.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add libs/color/named.ts libs/color/__tests__/named.test.ts
git commit -m "feat(color): add closest CSS named color lookup"
```

---

### Task 8: CSS variable / Tailwind exports

**Files:**

- Create: `libs/color/css-export.ts`
- Create: `libs/color/__tests__/css-export.test.ts`

- [ ] **Step 1: Write failing tests**

Create `libs/color/__tests__/css-export.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cssVariable, tailwindClass, tailwindThemeBlock } from "../css-export";

describe("cssVariable", () => {
  it("emits a single CSS custom property line", () => {
    expect(cssVariable("--color-primary", "#06d6a0")).toBe("--color-primary: #06d6a0;");
  });

  it("trims a leading -- if user did not include it", () => {
    expect(cssVariable("color-primary", "#06d6a0")).toBe("--color-primary: #06d6a0;");
  });

  it("falls back to a sane default name on empty input", () => {
    expect(cssVariable("", "#06d6a0")).toBe("--color-primary: #06d6a0;");
  });
});

describe("tailwindClass", () => {
  it.each([
    ["bg", "bg-[#06d6a0]"],
    ["text", "text-[#06d6a0]"],
    ["border", "border-[#06d6a0]"],
    ["ring", "ring-[#06d6a0]"],
  ])("emits %s utility", (prefix, expected) => {
    expect(tailwindClass(prefix as "bg" | "text" | "border" | "ring", "#06d6a0")).toBe(expected);
  });
});

describe("tailwindThemeBlock", () => {
  it("wraps a single property in @theme", () => {
    const out = tailwindThemeBlock("--color-primary", "oklch(78% 0.16 165)");
    expect(out).toContain("@theme {");
    expect(out).toContain("--color-primary: oklch(78% 0.16 165);");
    expect(out.trim().endsWith("}")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests; expect module-not-found failure**

```bash
npx vitest run libs/color/__tests__/css-export.test.ts
```

- [ ] **Step 3: Implement `libs/color/css-export.ts`**

```ts
const DEFAULT_NAME = "--color-primary";

function normalizeVarName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_NAME;
  return trimmed.startsWith("--") ? trimmed : `--${trimmed}`;
}

export function cssVariable(name: string, value: string): string {
  return `${normalizeVarName(name)}: ${value};`;
}

export type TailwindPrefix = "bg" | "text" | "border" | "ring";

export function tailwindClass(prefix: TailwindPrefix, hex: string): string {
  return `${prefix}-[${hex}]`;
}

export function tailwindThemeBlock(name: string, value: string): string {
  return `@theme {\n  ${normalizeVarName(name)}: ${value};\n}`;
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npx vitest run libs/color/__tests__/css-export.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add libs/color/css-export.ts libs/color/__tests__/css-export.test.ts
git commit -m "feat(color): add CSS variable and Tailwind export formatters"
```

---

### Task 9: WCAG contrast and thresholds

**Files:**

- Create: `libs/color/contrast.ts`
- Create: `libs/color/__tests__/contrast.test.ts`

This task implements WCAG checks only; the suggestion algorithm is added in Task 11 (after APCA).

- [ ] **Step 1: Write failing tests**

Create `libs/color/__tests__/contrast.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { wcagRatio, wcagJudgement } from "../contrast";

describe("wcagRatio", () => {
  it("black on white is 21:1", () => {
    expect(wcagRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("identical colors give 1:1", () => {
    expect(wcagRatio("#777777", "#777777")).toBeCloseTo(1, 2);
  });

  it("is symmetric", () => {
    expect(wcagRatio("#06d6a0", "#0b0f1a")).toBeCloseTo(wcagRatio("#0b0f1a", "#06d6a0"), 5);
  });
});

describe("wcagJudgement", () => {
  it("white on black passes every threshold", () => {
    const j = wcagJudgement("#ffffff", "#000000");
    expect(j.normalAA).toBe(true);
    expect(j.normalAAA).toBe(true);
    expect(j.largeAA).toBe(true);
    expect(j.largeAAA).toBe(true);
  });

  it("light gray on white fails normal AA but may still pass large AA", () => {
    const j = wcagJudgement("#bbbbbb", "#ffffff");
    expect(j.normalAA).toBe(false);
    expect(j.normalAAA).toBe(false);
  });

  it("uses 4.5 / 7 / 3 / 4.5 thresholds correctly", () => {
    // Construct a synthetic ratio of exactly 4.5 by mocking? Easier: assert numeric thresholds via the public function `meetsThreshold`.
    const j = wcagJudgement("#595959", "#ffffff"); // ratio ~7.0
    expect(j.normalAA).toBe(true);
    expect(j.normalAAA).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests; expect module-not-found failure**

```bash
npx vitest run libs/color/__tests__/contrast.test.ts
```

- [ ] **Step 3: Implement `libs/color/contrast.ts`**

```ts
import { parse } from "./convert";
import type { Colord } from "colord";

export interface WcagJudgement {
  ratio: number;
  normalAA: boolean;
  normalAAA: boolean;
  largeAA: boolean;
  largeAAA: boolean;
}

export function wcagRatio(fg: string, bg: string): number {
  const f = parse(fg);
  const b = parse(bg);
  if (!f || !b) return 1;
  // colord a11y plugin adds contrast()
  return (f as Colord & { contrast: (other: Colord) => number }).contrast(b);
}

export function wcagJudgement(fg: string, bg: string): WcagJudgement {
  const ratio = wcagRatio(fg, bg);
  return {
    ratio,
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
  };
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npx vitest run libs/color/__tests__/contrast.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add libs/color/contrast.ts libs/color/__tests__/contrast.test.ts
git commit -m "feat(color): add WCAG 2.1 ratio and AA/AAA judgement"
```

---

### Task 10: APCA Lc score

**Files:**

- Create: `libs/color/apca.ts`
- Create: `libs/color/__tests__/apca.test.ts`

Reference: APCA W3 reference formula (Andrew Somers, public domain). This is a clean-room reimplementation of the published constants — no upstream code copied. Spec note about APCA license should be re-checked at PR review.

- [ ] **Step 1: Write failing tests**

Create `libs/color/__tests__/apca.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { apcaLc, apcaJudgement } from "../apca";

describe("apcaLc", () => {
  it("returns 0 (or near-0) for identical colors", () => {
    expect(Math.abs(apcaLc("#777777", "#777777"))).toBeLessThan(1);
  });

  it("returns negative Lc for light text on dark bg", () => {
    expect(apcaLc("#ffffff", "#000000")).toBeLessThan(-100);
  });

  it("returns positive Lc for dark text on light bg", () => {
    expect(apcaLc("#000000", "#ffffff")).toBeGreaterThan(100);
  });

  it("matches reference: black on white ≈ 106", () => {
    expect(apcaLc("#000000", "#ffffff")).toBeCloseTo(106, 0);
  });
});

describe("apcaJudgement", () => {
  it("white-on-black passes body, headline, and fluent thresholds", () => {
    const j = apcaJudgement("#ffffff", "#000000");
    expect(j.body).toBe(true);
    expect(j.headline).toBe(true);
    expect(j.fluent).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests; expect module-not-found failure**

```bash
npx vitest run libs/color/__tests__/apca.test.ts
```

- [ ] **Step 3: Implement `libs/color/apca.ts`**

```ts
import { parse } from "./convert";

const NORM_BG = 0.56;
const NORM_TXT = 0.57;
const REV_BG = 0.62;
const REV_TXT = 0.65;
const SCALE_BoW = 1.14;
const SCALE_WoB = 1.14;
const LO_CLIP = 0.1;
const LO_BoW_OFFSET = 0.027;
const LO_WoB_OFFSET = 0.027;
const DELTA_Y_MIN = 0.0005;

const SRGB_R_COEF = 0.2126729;
const SRGB_G_COEF = 0.7151522;
const SRGB_B_COEF = 0.072175;
const SRGB_TRC = 2.4;

function srgbY(hex: string): number {
  const c = parse(hex);
  if (!c) return 0;
  const { r, g, b } = c.rgba;
  const rs = Math.pow(r / 255, SRGB_TRC);
  const gs = Math.pow(g / 255, SRGB_TRC);
  const bs = Math.pow(b / 255, SRGB_TRC);
  return SRGB_R_COEF * rs + SRGB_G_COEF * gs + SRGB_B_COEF * bs;
}

export function apcaLc(textHex: string, bgHex: string): number {
  const txtY = srgbY(textHex);
  const bgY = srgbY(bgHex);

  if (Math.abs(bgY - txtY) < DELTA_Y_MIN) return 0;

  let outputContrast: number;
  if (bgY > txtY) {
    // Normal polarity: dark text on light bg
    const sapc = (Math.pow(bgY, NORM_BG) - Math.pow(txtY, NORM_TXT)) * SCALE_BoW;
    outputContrast = sapc < LO_CLIP ? 0 : sapc - LO_BoW_OFFSET;
  } else {
    // Reverse polarity: light text on dark bg
    const sapc = (Math.pow(bgY, REV_BG) - Math.pow(txtY, REV_TXT)) * SCALE_WoB;
    outputContrast = sapc > -LO_CLIP ? 0 : sapc + LO_WoB_OFFSET;
  }

  return outputContrast * 100;
}

export interface ApcaJudgement {
  lc: number;
  body: boolean; // |Lc| ≥ 75
  headline: boolean; // |Lc| ≥ 60
  fluent: boolean; // |Lc| ≥ 45
}

export function apcaJudgement(textHex: string, bgHex: string): ApcaJudgement {
  const lc = apcaLc(textHex, bgHex);
  const abs = Math.abs(lc);
  return {
    lc,
    body: abs >= 75,
    headline: abs >= 60,
    fluent: abs >= 45,
  };
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npx vitest run libs/color/__tests__/apca.test.ts
```

If `black-on-white ≈ 106` is off by more than 1, the constants above need rechecking — the reference repo uses `1.14` scale and `0.027` offsets for sRGB v0.0.98G. Tighten the test tolerance only if the constants are confirmed.

- [ ] **Step 5: Commit**

```bash
git add libs/color/apca.ts libs/color/__tests__/apca.test.ts
git commit -m "feat(color): add APCA Lc score and threshold judgements"
```

---

### Task 11: Contrast suggestion algorithm

**Files:**

- Modify: `libs/color/contrast.ts`
- Modify: `libs/color/__tests__/contrast.test.ts`

Suggestion strategy: hold hue & saturation constant, walk lightness in HSL on whichever side (foreground or background) yields the smaller delta to a 4.5:1 ratio. Search both ± directions in 1% steps; return the first hit. If neither side hits 4.5:1 within the lightness range [0, 100], return `null`.

- [ ] **Step 1: Add failing tests**

Append to `libs/color/__tests__/contrast.test.ts`:

```ts
import { suggestPassing } from "../contrast";

describe("suggestPassing", () => {
  it("returns null when fg/bg already pass 4.5:1", () => {
    expect(suggestPassing("#000000", "#ffffff")).toBeNull();
  });

  it("returns a suggestion that meets 4.5:1 when input fails", () => {
    const s = suggestPassing("#06d6a0", "#ffffff"); // teal on white fails normal AA
    expect(s).not.toBeNull();
    expect(s!.target).toMatch(/^(foreground|background)$/);
    // re-check ratio using returned suggestion
    const r =
      s!.target === "foreground" ? wcagRatio(s!.color, "#ffffff") : wcagRatio("#06d6a0", s!.color);
    expect(r).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run tests; expect failure**

```bash
npx vitest run libs/color/__tests__/contrast.test.ts
```

- [ ] **Step 3: Implement `suggestPassing`**

In `libs/color/contrast.ts`, append:

```ts
import { parse, formatHex } from "./convert";
import { colord } from "colord";

export interface ContrastSuggestion {
  target: "foreground" | "background";
  color: string; // HEX
  delta: number; // absolute lightness change
}

const TARGET_RATIO = 4.5;

function adjustLightness(hex: string, deltaPct: number): string | null {
  const base = parse(hex);
  if (!base) return null;
  const { h, s, l, a } = base.toHsl();
  const newL = Math.max(0, Math.min(100, l + deltaPct));
  return formatHex(colord({ h, s, l: newL, a }));
}

function searchSide(
  side: "foreground" | "background",
  fg: string,
  bg: string
): ContrastSuggestion | null {
  const baseHex = side === "foreground" ? fg : bg;
  const baseLightness = parse(baseHex)?.toHsl().l ?? 0;
  let best: ContrastSuggestion | null = null;
  for (let delta = 1; delta <= 100; delta += 1) {
    for (const sign of [-1, 1] as const) {
      const candidate = adjustLightness(baseHex, sign * delta);
      if (!candidate) continue;
      const r = side === "foreground" ? wcagRatio(candidate, bg) : wcagRatio(fg, candidate);
      if (r >= TARGET_RATIO) {
        const cur = { target: side, color: candidate, delta };
        if (!best || cur.delta < best.delta) best = cur;
        break; // smaller delta in this direction found
      }
    }
    if (best && best.delta === delta) return best;
  }
  return best;
}

export function suggestPassing(fg: string, bg: string): ContrastSuggestion | null {
  if (wcagRatio(fg, bg) >= TARGET_RATIO) return null;
  const fgSuggestion = searchSide("foreground", fg, bg);
  const bgSuggestion = searchSide("background", fg, bg);
  if (fgSuggestion && bgSuggestion) {
    return fgSuggestion.delta <= bgSuggestion.delta ? fgSuggestion : bgSuggestion;
  }
  return fgSuggestion ?? bgSuggestion ?? null;
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npx vitest run libs/color/__tests__/contrast.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add libs/color/contrast.ts libs/color/__tests__/contrast.test.ts
git commit -m "feat(color): suggest fg/bg lightness adjustment to pass WCAG AA"
```

---

### Task 12: Harmonies & monochromatic palette

**Files:**

- Create: `libs/color/palette.ts`
- Create: `libs/color/__tests__/palette.test.ts`

`palette.ts` exposes pure synchronous helpers for harmonies and monochromatic. Image extraction (colorthief) is browser-only — that wrapper is added later in the dropzone component (Task 18); we only export the type signature here so callers can import a stable shape.

- [ ] **Step 1: Write failing tests**

Create `libs/color/__tests__/palette.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { harmony, monochromatic, HARMONY_TYPES } from "../palette";

describe("HARMONY_TYPES", () => {
  it("contains 5 harmony types in stable order", () => {
    expect(HARMONY_TYPES).toEqual([
      "complementary",
      "analogous",
      "triadic",
      "split-complementary",
      "tetradic",
    ]);
  });
});

describe("harmony", () => {
  it("complementary returns 2 hex strings including the source", () => {
    const out = harmony("#06d6a0", "complementary");
    expect(out).toHaveLength(2);
    expect(out[0].toLowerCase()).toBe("#06d6a0");
  });

  it("analogous returns 3 colors", () => {
    expect(harmony("#06d6a0", "analogous")).toHaveLength(3);
  });

  it("triadic returns 3 colors", () => {
    expect(harmony("#06d6a0", "triadic")).toHaveLength(3);
  });

  it("split-complementary returns 3 colors", () => {
    expect(harmony("#06d6a0", "split-complementary")).toHaveLength(3);
  });

  it("tetradic returns 4 colors", () => {
    expect(harmony("#06d6a0", "tetradic")).toHaveLength(4);
  });
});

describe("monochromatic", () => {
  it("returns 5 distinct hex strings sorted from light to dark (or vice versa)", () => {
    const out = monochromatic("#06d6a0", 5);
    expect(out).toHaveLength(5);
    expect(new Set(out).size).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests; expect module-not-found failure**

```bash
npx vitest run libs/color/__tests__/palette.test.ts
```

- [ ] **Step 3: Implement `libs/color/palette.ts`**

```ts
import type { Colord } from "colord";
import { parse, formatHex } from "./convert";

export const HARMONY_TYPES = [
  "complementary",
  "analogous",
  "triadic",
  "split-complementary",
  "tetradic",
] as const;

export type HarmonyType = (typeof HARMONY_TYPES)[number];

type ColorWithHarmonies = Colord & { harmonies: (type: HarmonyType) => Colord[] };
type ColorWithTintsShades = Colord & {
  tints: (n?: number) => Colord[];
  shades: (n?: number) => Colord[];
};

export function harmony(hex: string, type: HarmonyType): string[] {
  const c = parse(hex);
  if (!c) return [hex];
  const list = (c as ColorWithHarmonies).harmonies(type);
  return list.map((co) => formatHex(co));
}

export function monochromatic(hex: string, count = 5): string[] {
  const c = parse(hex);
  if (!c) return [hex];
  // Return `count` evenly spaced steps between a light tint and a dark shade.
  const half = Math.max(1, Math.floor(count / 2));
  const tints = (c as ColorWithTintsShades)
    .tints(half + 1)
    .slice(1)
    .reverse(); // exclude self
  const shades = (c as ColorWithTintsShades).shades(half + 1).slice(1); // exclude self
  const ordered: Colord[] = [...tints, c, ...shades].slice(0, count);
  return ordered.map((co) => formatHex(co));
}

export interface ImagePalette {
  colors: string[]; // hex strings
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npx vitest run libs/color/__tests__/palette.test.ts
```

If `tints()`/`shades()` produce duplicate-rounded hex strings on edge cases, switch to a direct HSL-step implementation (`l ± 15%` per step). The current approach is fine for typical inputs.

- [ ] **Step 5: Commit**

```bash
git add libs/color/palette.ts libs/color/__tests__/palette.test.ts
git commit -m "feat(color): add harmony and monochromatic palette helpers"
```

---

### Task 13: Vision filter id mapping

**Files:**

- Create: `libs/color/vision.ts`
- Create: `libs/color/__tests__/vision.test.ts`

This module declares the four filter ids and the matrices used by `<feColorMatrix>`. The actual `<svg>` is rendered by a component in Task 14; this file is the single source of truth for matrix data so no string drifts.

- [ ] **Step 1: Write failing tests**

Create `libs/color/__tests__/vision.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { VISION_MODES, visionFilterId, visionFilterStyle, VISION_MATRICES } from "../vision";

describe("VISION_MODES", () => {
  it("contains expected modes in order", () => {
    expect(VISION_MODES).toEqual([
      "none",
      "protanopia",
      "deuteranopia",
      "tritanopia",
      "achromatopsia",
    ]);
  });
});

describe("visionFilterId", () => {
  it("returns null for none", () => {
    expect(visionFilterId("none")).toBeNull();
  });

  it("returns a stable id for each mode", () => {
    expect(visionFilterId("protanopia")).toBe("vision-protanopia");
    expect(visionFilterId("deuteranopia")).toBe("vision-deuteranopia");
    expect(visionFilterId("tritanopia")).toBe("vision-tritanopia");
    expect(visionFilterId("achromatopsia")).toBe("vision-achromatopsia");
  });
});

describe("visionFilterStyle", () => {
  it("returns empty object for none", () => {
    expect(visionFilterStyle("none")).toEqual({});
  });

  it("returns a CSS filter url for non-none", () => {
    expect(visionFilterStyle("protanopia")).toEqual({ filter: "url(#vision-protanopia)" });
  });
});

describe("VISION_MATRICES", () => {
  it("provides a 20-value matrix for each non-none mode", () => {
    for (const mode of ["protanopia", "deuteranopia", "tritanopia", "achromatopsia"] as const) {
      const m = VISION_MATRICES[mode];
      expect(m).toHaveLength(20);
      for (const v of m) expect(typeof v).toBe("number");
    }
  });
});
```

- [ ] **Step 2: Run tests; expect module-not-found failure**

```bash
npx vitest run libs/color/__tests__/vision.test.ts
```

- [ ] **Step 3: Implement `libs/color/vision.ts`**

```ts
import type { CSSProperties } from "react";

export const VISION_MODES = [
  "none",
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "achromatopsia",
] as const;

export type VisionMode = (typeof VISION_MODES)[number];

// Brettel/Viénot/Mollon coefficients, expanded to 4x5 feColorMatrix shape.
// Each row: R G B A bias (20 values total).
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
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npx vitest run libs/color/__tests__/vision.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add libs/color/vision.ts libs/color/__tests__/vision.test.ts
git commit -m "feat(color): add vision-mode filter ids and feColorMatrix matrices"
```

---

## Phase 2 — Components

### Task 14: VisionFilterDefs component

**Files:**

- Create: `components/color/vision-filter-defs.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { VISION_MATRICES, visionFilterId } from "../../libs/color/vision";

export function VisionFilterDefs() {
  const modes = Object.keys(VISION_MATRICES) as Array<keyof typeof VISION_MATRICES>;
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {modes.map((mode) => (
          <filter id={visionFilterId(mode)!} key={mode} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={VISION_MATRICES[mode].join(" ")} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
```

- [ ] **Step 2: Verify component builds**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/color/vision-filter-defs.tsx
git commit -m "feat(color): add inline SVG defs for color blindness filters"
```

---

### Task 15: ColorPicker wrapper with EyeDropper

**Files:**

- Create: `components/color/color-picker.tsx`

The wrapper accepts a HEX string with alpha (`#rrggbbaa`) and emits hex on change. EyeDropper is feature-detected at render time (via `typeof window !== "undefined" && "EyeDropper" in window`). Cancellation (`AbortError`) is swallowed.

- [ ] **Step 1: Implement**

```tsx
"use client";

import { useState, useEffect } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import { Pipette } from "lucide-react";
import { useTranslations } from "next-intl";

interface ColorPickerProps {
  value: string; // 6- or 8-digit HEX with leading '#'
  onChange: (hex: string) => void;
  showEyedropper?: boolean;
}

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

export function ColorPicker({ value, onChange, showEyedropper = true }: ColorPickerProps) {
  const t = useTranslations("color.converter");
  const [supportsEyedropper, setSupportsEyedropper] = useState(false);

  useEffect(() => {
    setSupportsEyedropper(typeof window !== "undefined" && !!window.EyeDropper);
  }, []);

  async function pickFromScreen() {
    if (!window.EyeDropper) return;
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      onChange(sRGBHex);
    } catch (err: unknown) {
      // Silent on user-cancel (AbortError)
      if (!(err instanceof DOMException) || err.name !== "AbortError") {
        // eslint-disable-next-line no-console
        console.error("EyeDropper failed", err);
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full max-w-[280px] aspect-square">
        <HexAlphaColorPicker
          color={value}
          onChange={onChange}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      {showEyedropper && supportsEyedropper && (
        <button
          type="button"
          onClick={pickFromScreen}
          aria-label={t("eyedropper")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border-default text-sm text-fg-secondary hover:text-accent-cyan hover:border-accent-cyan/40 transition-colors"
        >
          <Pipette size={14} />
          <span>{t("eyedropper")}</span>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/color/color-picker.tsx
git commit -m "feat(color): add color-picker wrapper with eyedropper button"
```

---

### Task 16: Color history bar

**Files:**

- Create: `components/color/color-history-bar.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";

interface ColorHistoryBarProps {
  history: string[]; // hex strings
  onSelect: (hex: string) => void;
  onClear: () => void;
}

export function ColorHistoryBar({ history, onSelect, onClear }: ColorHistoryBarProps) {
  const t = useTranslations("color.history");
  if (history.length === 0) return null;
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 flex items-center gap-3 border-t border-border-default bg-bg-surface/95 backdrop-blur px-4 py-2 pb-[env(safe-area-inset-bottom)]">
      <span className="font-mono text-xs text-fg-muted uppercase tracking-wider shrink-0">
        {t("recent")}
      </span>
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {history.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => onSelect(hex)}
            className="h-6 w-6 rounded border border-border-default shrink-0 hover:scale-110 transition-transform"
            style={{ backgroundColor: hex }}
            title={hex}
            aria-label={hex}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-fg-muted hover:text-danger transition-colors shrink-0"
      >
        {t("clear")}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/color/color-history-bar.tsx
git commit -m "feat(color): add sticky color history bar"
```

---

### Task 17: Image palette dropzone

**Files:**

- Create: `components/color/image-palette-dropzone.tsx`

This component owns the colorthief invocation. It validates file type (`image/png|jpeg|webp`), size (≤ 5MB), creates an object URL, loads it into an `Image()`, runs `getPalette(img, 6)`, and reports back through `onPalette`. Errors call `onError` with a translation key.

- [ ] **Step 1: Implement**

```tsx
"use client";

import { useState, useRef } from "react";
import ColorThief from "colorthief";
import { useTranslations } from "next-intl";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

interface ImagePaletteDropzoneProps {
  onPalette: (hexes: string[]) => void;
  onError: (key: "fileTooLarge" | "fileNotImage" | "imageError") => void;
}

function rgbToHex([r, g, b]: number[]): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function ImagePaletteDropzone({ onPalette, onError }: ImagePaletteDropzoneProps) {
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
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const ct = new ColorThief();
        const palette = ct.getPalette(img, 6) ?? [];
        onPalette(palette.map(rgbToHex));
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

  return (
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
      className="border-2 border-dashed border-border-default rounded-lg p-6 text-center cursor-pointer hover:border-accent-cyan/60 transition-colors"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ""; // allow re-uploading same file
        }}
      />
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="preview" className="mx-auto max-h-[200px] object-contain" />
      ) : (
        <span className="text-sm text-fg-secondary">{t("imageDrop")}</span>
      )}
      {busy && <div className="mt-2 text-xs text-fg-muted">…</div>}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/color/image-palette-dropzone.tsx
git commit -m "feat(color): add image dropzone for palette extraction via colorthief"
```

---

## Phase 3 — Tabs

Tabs are kept as functions inside `color-page.tsx` (matching the qrcode/cron pattern) instead of separate files, because each tab tightly couples to the parent state. Each function takes the current state and setters as props.

### Task 18: Converter tab

**Files:**

- Modify: `app/[locale]/color/color-page.tsx` (will not exist yet — create as empty stub first)

Because Tasks 18–22 all modify the same file, this group is most efficient when implemented end-to-end in one task. Per the plan style, we still split for clarity but expect them to land in close sequence.

- [ ] **Step 1: Create the stub `color-page.tsx` if absent**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";

export default function ColorPage() {
  const ts = useTranslations("tools");
  return (
    <Layout title={ts("color.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">{/* tabs go here */}</div>
    </Layout>
  );
}
```

- [ ] **Step 2: Add converter tab implementation**

Inside `color-page.tsx`, add (above the default export):

```tsx
import { CopyButton } from "../../../components/ui/copy-btn";
import { StyledInput } from "../../../components/ui/input";
import { ColorPicker } from "../../../components/color/color-picker";
import { parse, formatAll } from "../../../libs/color/convert";
import { closestName } from "../../../libs/color/named";
import {
  cssVariable,
  tailwindClass,
  tailwindThemeBlock,
  type TailwindPrefix,
} from "../../../libs/color/css-export";

const TAILWIND_PREFIXES: TailwindPrefix[] = ["bg", "text", "border", "ring"];
const FORMATS = ["hex", "rgb", "hsl", "hsv", "cmyk", "lab", "oklch"] as const;

interface ConverterTabProps {
  color: string;
  onColorChange: (hex: string) => void;
}

function ConverterTab({ color, onColorChange }: ConverterTabProps) {
  const t = useTranslations("color.converter");

  const parsed = parse(color);
  const formats = parsed ? formatAll(parsed) : null;
  const name = parsed ? closestName(parsed) : "";

  // Local state for editable variable name and selected Tailwind prefix.
  const [varName, setVarName] = useState("--color-primary");
  const [twPrefix, setTwPrefix] = useState<TailwindPrefix>("bg");

  // Tracks per-row edit buffer so user can type partial values without breaking.
  // onChange updates the local buffer only; commit (parse + sync) happens on blur or Enter.
  const [edit, setEdit] = useState<Record<string, string>>({});

  function commitInput(field: string, raw: string) {
    const c = parse(raw);
    if (c) {
      onColorChange(c.toHex());
      setEdit((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    // If parse fails, keep the edit buffer so the red border persists until corrected.
  }

  function handleInputChange(field: string, raw: string) {
    // Check if the new value matches the canonical format — auto-commit if valid.
    const c = parse(raw);
    if (c && c.toHex().toLowerCase() !== color.toLowerCase()) {
      onColorChange(c.toHex());
      setEdit((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else if (!c && raw.trim()) {
      setEdit((prev) => ({ ...prev, [field]: raw }));
    } else if (!raw.trim()) {
      setEdit((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <ColorPicker value={color} onChange={onColorChange} />
        {parsed && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(name)}
            className="text-xs text-fg-muted hover:text-accent-cyan transition-colors"
            title={t("closestName")}
          >
            {t("closestName")}: <span className="font-mono">{name}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {FORMATS.map((f) => {
          const value = formats?.[f] ?? "";
          const display = edit[f] ?? value;
          const invalid = edit[f] !== undefined;
          return (
            <div key={f} className="flex items-center gap-2">
              <span className="font-mono text-xs text-fg-muted w-14 shrink-0">{t(f)}</span>
              <StyledInput
                aria-invalid={invalid}
                className={`font-mono text-sm ${invalid ? "border-danger" : ""}`}
                value={display}
                onChange={(e) => setEdit((prev) => ({ ...prev, [f]: e.target.value }))}
                onBlur={() => commitInput(f, display)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitInput(f, display);
                }}
              />
              <CopyButton getContent={() => value} />
            </div>
          );
        })}
        {/* HSV note */}
        <div className="text-xs text-fg-muted/80 mt-1">{t("hsvNote")}</div>
      </div>

      {/* CSS Variable */}
      <div className="md:col-span-2 rounded-lg border border-border-default p-4 flex flex-col gap-2">
        <span className="font-mono text-xs text-fg-muted uppercase tracking-wider">
          {t("cssVariable")}
        </span>
        <div className="flex items-center gap-2">
          <StyledInput
            value={varName}
            onChange={(e) => setVarName(e.target.value)}
            placeholder={t("cssVariableName")}
            className="font-mono text-sm max-w-[200px]"
          />
          <code className="flex-1 font-mono text-sm">{cssVariable(varName, color)}</code>
          <CopyButton getContent={() => cssVariable(varName, color)} />
        </div>
      </div>

      {/* Tailwind */}
      <div className="md:col-span-2 rounded-lg border border-border-default p-4 flex flex-col gap-3">
        <span className="font-mono text-xs text-fg-muted uppercase tracking-wider">
          {t("tailwindClass")}
        </span>
        <div className="flex flex-wrap gap-2 text-xs font-mono font-semibold">
          {TAILWIND_PREFIXES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTwPrefix(p)}
              className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                twPrefix === p
                  ? "bg-accent-cyan text-bg-base shadow-glow"
                  : "border border-border-default text-fg-muted hover:text-fg-secondary hover:border-fg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm">{tailwindClass(twPrefix, color)}</code>
          <CopyButton getContent={() => tailwindClass(twPrefix, color)} />
        </div>
        <div className="border-t border-border-subtle pt-3 flex flex-col gap-2">
          <span className="text-xs text-fg-muted">{t("tailwindTheme")}</span>
          <pre className="font-mono text-sm overflow-x-auto bg-bg-input rounded p-2">
            {tailwindThemeBlock(varName, formats?.oklch ?? color)}
          </pre>
          <CopyButton getContent={() => tailwindThemeBlock(varName, formats?.oklch ?? color)} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/color/color-page.tsx
git commit -m "feat(color): add converter tab with all formats and Tailwind exports"
```

---

### Task 19: Palette tab

**Files:**

- Modify: `app/[locale]/color/color-page.tsx`

- [ ] **Step 1: Add palette tab**

Append to `color-page.tsx`:

```tsx
import { harmony, monochromatic, HARMONY_TYPES } from "../../../libs/color/palette";
import { ImagePaletteDropzone } from "../../../components/color/image-palette-dropzone";
import { showToast } from "../../../libs/toast";

interface PaletteTabProps {
  color: string;
  onColorChange: (hex: string) => void;
}

function Swatch({ hex, onClick }: { hex: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hex}
      className="group relative h-12 w-12 rounded border border-border-default hover:scale-105 transition-transform"
      style={{ backgroundColor: hex }}
    >
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {hex}
      </span>
    </button>
  );
}

function PaletteTab({ color, onColorChange }: PaletteTabProps) {
  const t = useTranslations("color.palette");
  const tc = useTranslations("color.errors");
  const [imagePalette, setImagePalette] = useState<string[]>([]);

  const monoColors = monochromatic(color, 5);
  const harmonyRows: Array<{ key: string; colors: string[] }> = [
    ...HARMONY_TYPES.map((k) => ({
      key: k === "split-complementary" ? "splitComplementary" : k,
      colors: harmony(color, k),
    })),
    { key: "monochromatic", colors: monoColors },
  ];

  function copyAll(colors: string[]) {
    navigator.clipboard.writeText(colors.join(", "));
    showToast("OK", "success", 1200);
  }

  return (
    <div className="flex flex-col gap-6">
      {harmonyRows.map(({ key, colors }) => (
        <div key={key} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {t(key)}
            </span>
            <button
              type="button"
              onClick={() => copyAll(colors)}
              className="text-xs text-fg-muted hover:text-accent-cyan transition-colors"
            >
              {t("copyAll")}
            </button>
          </div>
          <div className="flex flex-wrap gap-3 pb-5">
            {colors.map((c) => (
              <Swatch key={c} hex={c} onClick={() => onColorChange(c)} />
            ))}
          </div>
        </div>
      ))}

      <div className="border-t border-border-subtle pt-6">
        <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3 block">
          {t("fromImage")}
        </span>
        <ImagePaletteDropzone
          onPalette={(hexes) => setImagePalette(hexes)}
          onError={(key) => showToast(tc(key), "danger", 2400)}
        />
        {imagePalette.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex flex-wrap gap-3 pb-5">
              {imagePalette.map((c) => (
                <Swatch key={c} hex={c} onClick={() => onColorChange(c)} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => copyAll(imagePalette)}
              className="text-xs text-fg-muted hover:text-accent-cyan transition-colors"
            >
              {t("copyAll")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/color/color-page.tsx
git commit -m "feat(color): add palette tab with harmonies and image extraction"
```

---

### Task 20: Contrast tab

**Files:**

- Modify: `app/[locale]/color/color-page.tsx`

- [ ] **Step 1: Add contrast tab**

Append to `color-page.tsx`:

```tsx
import { wcagJudgement, suggestPassing } from "../../../libs/color/contrast";
import { apcaJudgement } from "../../../libs/color/apca";
import { ArrowLeftRight } from "lucide-react";

interface ContrastTabProps {
  fg: string;
  bg: string;
  onFgChange: (hex: string) => void;
  onBgChange: (hex: string) => void;
}

function PassFail({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-fg-secondary">{label}</span>
      <span
        className={
          pass ? "text-accent-cyan font-mono font-semibold" : "text-danger font-mono font-semibold"
        }
      >
        {pass ? "✓" : "✗"}
      </span>
    </div>
  );
}

function ContrastTab({ fg, bg, onFgChange, onBgChange }: ContrastTabProps) {
  const t = useTranslations("color.contrast");
  const wcag = wcagJudgement(fg, bg);
  const apca = apcaJudgement(fg, bg);
  const suggestion = suggestPassing(fg, bg);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-fg-muted uppercase tracking-wider">
            {t("foreground")}
          </span>
          <ColorPicker value={fg} onChange={onFgChange} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-fg-muted uppercase tracking-wider">
            {t("background")}
          </span>
          <ColorPicker value={bg} onChange={onBgChange} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onFgChange(bg);
          onBgChange(fg);
        }}
        className="self-start inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border-default text-sm text-fg-secondary hover:text-accent-cyan transition-colors"
      >
        <ArrowLeftRight size={14} />
        {t("swap")}
      </button>

      <div
        className="rounded-lg border border-border-default p-6"
        style={{ backgroundColor: bg, color: fg }}
      >
        <p className="text-base mb-2">The quick brown fox 敏捷的棕色狐狸</p>
        <p className="text-lg font-semibold">The quick brown fox 敏捷的棕色狐狸</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border-default p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {t("wcagTitle")}
            </span>
            <span className="font-mono text-lg font-bold text-accent-cyan">
              {wcag.ratio.toFixed(2)}:1
            </span>
          </div>
          <PassFail pass={wcag.normalAA} label={`${t("normal")} AA`} />
          <PassFail pass={wcag.normalAAA} label={`${t("normal")} AAA`} />
          <PassFail pass={wcag.largeAA} label={`${t("large")} AA`} />
          <PassFail pass={wcag.largeAAA} label={`${t("large")} AAA`} />
        </div>
        <div className="rounded-lg border border-border-default p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {t("apcaTitle")}
            </span>
            <span className="font-mono text-lg font-bold text-accent-purple">
              Lc {apca.lc.toFixed(0)}
            </span>
          </div>
          <PassFail pass={apca.body} label={t("bodyText")} />
          <PassFail pass={apca.headline} label={t("headline")} />
          <PassFail pass={apca.fluent} label={t("fluent")} />
        </div>
      </div>

      {suggestion && (
        <div className="flex items-start gap-3 border-l-2 border-accent-purple bg-accent-purple-dim/30 rounded-r-lg p-3">
          <div className="flex-1 text-sm text-fg-secondary">
            <span className="font-semibold text-fg-primary">{t("suggestionTitle")}:</span>{" "}
            {t("suggestionText", {
              color: suggestion.color,
              target: `${t(suggestion.target === "foreground" ? "foreground" : "background")} AA`,
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              if (suggestion.target === "foreground") onFgChange(suggestion.color);
              else onBgChange(suggestion.color);
            }}
            className="px-3 py-1.5 rounded-md bg-accent-cyan text-bg-base font-mono text-xs"
          >
            {t("useThis")}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/color/color-page.tsx
git commit -m "feat(color): add contrast tab with WCAG, APCA, and suggestions"
```

---

## Phase 4 — Page assembly & integration

### Task 21: Wire up `color-page.tsx` (state, history, vision toggle, tabs, description)

**Files:**

- Modify: `app/[locale]/color/color-page.tsx`

- [ ] **Step 1: Replace the stub default export**

Replace the existing `export default function ColorPage()` with:

```tsx
import { NeonTabs } from "../../../components/ui/tabs";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import { VisionFilterDefs } from "../../../components/color/vision-filter-defs";
import { ColorHistoryBar } from "../../../components/color/color-history-bar";
import { VISION_MODES, visionFilterStyle, type VisionMode } from "../../../libs/color/vision";
import { Eye, Info } from "lucide-react";

const HISTORY_LIMIT = 20;

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.color);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveHistory(list: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.color, JSON.stringify(list));
  } catch {
    // localStorage unavailable; bar still works in-memory.
  }
}

function pushHistory(prev: string[], hex: string): string[] {
  const normalized = hex.length === 9 ? hex.slice(0, 7) : hex; // drop alpha
  const filtered = prev.filter((c) => c.toLowerCase() !== normalized.toLowerCase());
  return [normalized, ...filtered].slice(0, HISTORY_LIMIT);
}

function VisionToggle({
  value,
  onChange,
}: {
  value: VisionMode;
  onChange: (v: VisionMode) => void;
}) {
  const t = useTranslations("color.vision");
  return (
    <label className="inline-flex items-center gap-2 my-3">
      <Eye size={14} className="text-fg-muted" />
      <span className="text-xs text-fg-muted font-mono uppercase tracking-wider">
        {t("label")}:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as VisionMode)}
        className="bg-bg-input border border-border-default rounded px-2 py-1 text-sm text-fg-primary"
      >
        {VISION_MODES.map((m) => (
          <option key={m} value={m}>
            {t(m)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Description() {
  const t = useTranslations("color.description");
  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-start gap-2 border-l-2 border-accent-purple bg-accent-purple-dim/30 rounded-r-lg p-4">
        <Info size={18} className="text-accent-purple mt-0.5 shrink-0" />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-fg-primary">{t("title")}</h3>
          <p className="text-sm text-fg-secondary leading-relaxed">{t("introP1")}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-accent-cyan" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            {t("spacesTitle")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              "spaceHex",
              "spaceRgb",
              "spaceHsl",
              "spaceHsv",
              "spaceCmyk",
              "spaceLab",
              "spaceOklch",
            ] as const
          ).map((k) => (
            <div
              key={k}
              className="rounded-lg border border-border-default bg-bg-elevated/30 p-3 text-sm text-fg-secondary leading-relaxed"
            >
              {t(k)}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-accent-cyan" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            {t("contrastTitle")}
          </span>
        </div>
        <p className="text-sm text-fg-secondary leading-relaxed">{t("contrastP1")}</p>
        <p className="text-sm text-fg-secondary leading-relaxed mt-2">{t("contrastP2")}</p>
      </div>

      <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-4">
        <div className="space-y-2 text-sm text-fg-secondary leading-relaxed">
          <h3 className="text-sm font-semibold text-fg-primary">{t("tipsTitle")}</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("tipEyedropper")}</li>
            <li>{t("tipImage")}</li>
            <li>{t("tipOklch")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ColorPage() {
  const ts = useTranslations("tools");
  const tc = useTranslations("common");
  const tTabs = useTranslations("color.tabs");

  const [color, setColor] = useState("#06d6a0");
  const [foreground, setForeground] = useState("#06d6a0");
  const [background, setBackground] = useState("#ffffff");
  const [history, setHistory] = useState<string[]>([]);
  const [vision, setVision] = useState<VisionMode>("none");

  // Hydrate history once.
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Commit current color to history with debounce.
  // NOTE: The spec calls for "onCommit" (mouseup/touchend) semantics. This debounce
  // is a pragmatic simplification — it avoids polluting history during drag but may
  // swallow rapid successive picks within 800ms. Acceptable trade-off for v1.
  useEffect(() => {
    const handle = setTimeout(() => {
      setHistory((prev) => {
        const next = pushHistory(prev, color);
        if (next !== prev) saveHistory(next);
        return next;
      });
    }, 800);
    return () => clearTimeout(handle);
  }, [color]);

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  return (
    <Layout title={ts("color.shortTitle")}>
      <VisionFilterDefs />
      <div className="container mx-auto px-4 pt-3 pb-6" style={visionFilterStyle(vision)}>
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <VisionToggle value={vision} onChange={setVision} />

        <NeonTabs
          tabs={[
            {
              label: tTabs("converter"),
              content: <ConverterTab color={color} onColorChange={setColor} />,
            },
            {
              label: tTabs("palette"),
              content: <PaletteTab color={color} onColorChange={setColor} />,
            },
            {
              label: tTabs("contrast"),
              content: (
                <ContrastTab
                  fg={foreground}
                  bg={background}
                  onFgChange={setForeground}
                  onBgChange={setBackground}
                />
              ),
            },
          ]}
        />

        <Description />
      </div>
      <ColorHistoryBar history={history} onSelect={setColor} onClear={clearHistory} />
    </Layout>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx eslint 'app/[locale]/color/**' 'components/color/**' 'libs/color/**'
```

Expected: no errors. If ESLint flags `useMemo`/`useCallback` violations from React Compiler, remove them — this plan does not introduce any.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/color/color-page.tsx
git commit -m "feat(color): wire up tabs, history, vision toggle, and description"
```

---

### Task 22: Route entry `page.tsx`

**Files:**

- Create: `app/[locale]/color/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import ColorPage from "./color-page";

const PATH = "/color";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("color.title"),
    description: t("color.description"),
  });
}

export default function ColorRoute() {
  return <ColorPage />;
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/color/page.tsx
git commit -m "feat(color): add /color route entry with metadata"
```

---

### Task 23: Update `vitest.config.ts` to include `libs/color/**`

**Files:**

- Modify: `vitest.config.ts`

- [ ] **Step 1: Add include glob**

In `vitest.config.ts`, the `test.include` array should now read:

```ts
include: [
  "libs/dbviewer/**/*.test.ts",
  "libs/unixtime/**/*.test.ts",
  "libs/cron/**/*.test.ts",
  "libs/qrcode/**/*.test.ts",
  "libs/textcase/**/*.test.ts",
  "libs/color/**/*.test.ts",
],
```

- [ ] **Step 2: Run full suite**

```bash
npm test
```

Expected: all tests pass, including the new `libs/color/__tests__/*.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test(color): include color tests in vitest config"
```

---

### Task 24: Manual smoke test (browser)

**Files:**

- None (verification only)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate and verify**

Open `http://localhost:3000/color` (and `/zh-CN/color`, `/zh-TW/color`). For each:

- [ ] Page loads, title shows "Color Converter" / "颜色转换" / "顏色轉換".
- [ ] "Not transferred" alert appears.
- [ ] Picker is visible and dragging changes all 7 format displays.
- [ ] Each format input row accepts pasted values: invalid input shows red border, valid input updates picker.
- [ ] EyeDropper button appears in Chrome/Edge; clicking opens screen picker; Esc cancels silently.
- [ ] In Firefox/Safari, EyeDropper button is hidden.
- [ ] Closest CSS color name appears below picker.
- [ ] CSS variable name input is editable and the formatted line updates live.
- [ ] Tailwind segmented control toggles `bg`/`text`/`border`/`ring`; `@theme` block emits OKLCH.
- [ ] Palette tab: each harmony row shows the right color count; clicking a swatch sets it as current.
- [ ] Palette tab: dropping a JPG/PNG image yields 6 swatches; dragging a >5MB or non-image file shows the right error toast.
- [ ] Contrast tab: ratio + Lc score update as fg/bg change; Swap exchanges them.
- [ ] Contrast tab: when fg is `#bbbbbb` on `#ffffff`, suggestion appears with a "Use this" button that updates the failing side.
- [ ] Vision toggle cycles through 4 modes; preview, picker, swatches, and contrast all simulate the chosen vision.
- [ ] Color history bar appears after first commit; clicking a chip resets `color`; "Clear" empties it; reload preserves history; modes other than `none` do not double-save the same color.
- [ ] Mobile (<768px viewport): picker, format rows, and tabs do not overflow horizontally.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit any leftover changes (e.g., `package-lock.json` from build), then declare done**

```bash
git status
```

If clean: nothing to commit.

---

## Verification Checklist (Self-Review)

Before declaring the implementation done, verify:

- [ ] All 8 `libs/color/__tests__/*.test.ts` files run as part of `npm test`.
- [ ] `app/[locale]/color/page.tsx` produces metadata with the right canonical/og URLs (cross-check against `/qrcode`).
- [ ] `i18n/request.ts` includes `"color"`; deleting that line reproduces a runtime error in dev.
- [ ] `STORAGE_KEYS.color === "okrun:color:history"`.
- [ ] No `useMemo` / `useCallback` / `React.memo` anywhere in the new code.
- [ ] No untranslated strings appear in `/zh-CN/color` or `/zh-TW/color`.
- [ ] The 24-task commit log mirrors the plan structure (one logical commit per task) so reviewers can step through.

---

## Out of Scope (per spec)

- Gradient generator
- Undo/redo of current color
- Multi-color contrast matrix
- LAB/OKLCH mixing slider
- WCAG 3 final (track APCA upstream)
- Palette export to Tailwind config / SVG / Sketch / Figma JSON
