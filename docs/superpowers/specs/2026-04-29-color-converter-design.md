# Color Converter / Picker — Design Spec

## Overview

A browser-based color utility tool for OmniKit. Format conversion is the primary function, supplemented by a visual picker, screen eyedropper, palette generation (harmonies + image extraction), contrast checking (WCAG + APCA), and a page-wide color blindness preview. All computation runs client-side — no data leaves the browser.

**Route**: `/color`

## Architecture

### File Structure

```
app/[locale]/color/
├── page.tsx              # Route entry — generateMetadata + render ColorPage
└── color-page.tsx        # Main page component (use client)

libs/color/
├── convert.ts            # colord wrapper: parse + format every supported space
├── oklch.ts              # sRGB ↔ OKLab ↔ OKLCH (no colord plugin available)
├── palette.ts            # Harmony schemes + dominant colors from image
├── contrast.ts           # WCAG ratio (via colord a11y) + APCA Lc score
├── vision.ts             # Color blindness simulation matrices + SVG filter ids
├── named.ts              # Closest CSS named color lookup
└── css-export.ts         # CSS variable / Tailwind class output formatting

components/color/
├── color-picker.tsx      # react-colorful wrapper + EyeDropper button
└── vision-filter-defs.tsx # Inline <svg> with feColorMatrix filter defs

public/locales/{en,zh-CN,zh-TW}/
├── color.json            # Tool-specific translations (rich description block)
└── tools.json            # Append color metadata
```

### Dependencies

| Package          | Size (gzipped) | Purpose                               |
| ---------------- | -------------- | ------------------------------------- |
| `colord`         | ~2KB           | Core parsing/formatting + plugin host |
| `react-colorful` | ~3KB           | Visual color picker (HEX + alpha)     |
| `colorthief`     | ~3KB           | Dominant color extraction from image  |

`colord` plugins are subpath imports from the same package — **no separate npm packages**:

```ts
import { extend } from "colord";
import namesPlugin from "colord/plugins/names";
import cmykPlugin from "colord/plugins/cmyk";
import labPlugin from "colord/plugins/lab";
import lchPlugin from "colord/plugins/lch";
import harmoniesPlugin from "colord/plugins/harmonies";
import a11yPlugin from "colord/plugins/a11y";

extend([namesPlugin, cmykPlugin, labPlugin, lchPlugin, harmoniesPlugin, a11yPlugin]);
```

HSL is built into colord core — no plugin required. OKLCH is **not** offered by colord; we implement it manually in `libs/color/oklch.ts` (~50 lines, zero runtime dependency).

**Why colord over alternatives**: Smaller than `tinycolor2` (3KB vs 12KB), tree-shakeable, plugin-based architecture — load only what we need.

### Tool Registration

Append to `libs/tools.ts` after `qrcode`:

```typescript
{ key: "color", path: "/color" }
```

Append to `libs/storage-keys.ts`:

```typescript
export const STORAGE_KEYS = {
  // ...existing keys
  color: "okrun:color:history",
} as const;
```

Append to `public/locales/{en,zh-CN,zh-TW}/tools.json`:

```json
"color": {
  "title": "Color Converter & Picker - HEX, RGB, HSL, OKLCH",
  "shortTitle": "Color Converter",
  "description": "Convert HEX, RGB, HSL, HSV, CMYK, LAB, OKLCH. Visual picker with eyedropper, palette generator, image color extraction, WCAG + APCA contrast, and color-blindness preview. 100% client-side."
}
```

## Layout: Page Structure

```tsx
// color-page.tsx
"use client";

export default function ColorPage() {
  const ts = useTranslations("tools");
  const tc = useTranslations("common");
  const [color, setColor] = useState<string>("#06d6a0"); // matches --accent-cyan
  const [foreground, setForeground] = useState<string>("#06d6a0");
  const [background, setBackground] = useState<string>("#ffffff");
  const [history, setHistory] = useState<string[]>([]); // hydrated from localStorage
  const [vision, setVision] = useState<VisionMode>("none");

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
            { label: t("tabs.converter"), content: <ColorConverter ... /> },
            { label: t("tabs.palette"),   content: <PaletteGenerator ... /> },
            { label: t("tabs.contrast"),  content: <ContrastChecker ... /> },
          ]}
        />

        <ColorHistoryBar history={history} onSelect={setColor} onClear={...} />
      </div>
      <Description />
    </Layout>
  );
}
```

`VisionFilterDefs` injects an inline `<svg>` with named `feColorMatrix` filters. `visionFilterStyle` returns `{ filter: "url(#vision-protanopia)" }` (or empty when `none`) — applied to the content wrapper so picker, swatches, and preview all simulate together.

## Tab 1: Converter

### Layout

Two-column on desktop, stacked on mobile:

```
┌──────────────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │                 │  │ HEX:   #06d6a0       [📋]│   │
│  │  Color Picker   │  │ RGB:   rgb(6,214,160)[📋]│   │
│  │  + alpha slider │  │ HSL:   hsl(163,94%,43%)  │   │
│  │  + [💧 dropper] │  │ HSV:   163° 97% 84% (i)  │   │
│  │                 │  │ CMYK:  cmyk(97% 0% 25%   │   │
│  │  Closest name:  │  │        16%)              │   │
│  │  mediumspring   │  │ LAB:   lab(76 -56 20)    │   │
│  │  green          │  │ OKLCH: oklch(78% 0.16 165│   │
│  └─────────────────┘  └──────────────────────────┘   │
│                                                       │
│  ┌─ CSS Variable ──────────────────────────────────┐ │
│  │ name: [--color-primary    ] (editable)     [📋] │ │
│  │ --color-primary: #06d6a0;                       │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ Tailwind ──────────────────────────────────────┐ │
│  │ prefix: [bg ▾] [text] [border] [ring]           │ │
│  │ bg-[#06d6a0]                              [📋]  │ │
│  │                                                  │ │
│  │ Tailwind v4 @theme:                             │ │
│  │ @theme { --color-primary: oklch(78% .16 165); } │ │
│  │                                           [📋]  │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

Picker container: `w-full max-w-[280px] aspect-square` so it scales on mobile and never overflows.

### Supported Formats

| Format   | Input examples                                | Display                       | CSS-valid? |
| -------- | --------------------------------------------- | ----------------------------- | ---------- |
| HEX      | `#06d6a0`, `06d6a0`, `#06d6a0cc`              | `#06d6a0` (uppercase toggle?) | yes        |
| RGB/RGBA | `rgb(6, 214, 160)`, `rgba(6, 214, 160, 0.8)`  | `rgb(6, 214, 160)`            | yes        |
| HSL/HSLA | `hsl(163, 94%, 43%)`                          | `hsl(163, 94%, 43%)`          | yes        |
| HSV/HSB  | `hsv(163, 97%, 84%)`, `163° 97% 84%`          | `163° 97% 84%` + ⓘ tooltip    | **no**     |
| CMYK     | `cmyk(97 0 25 16)`, `cmyk(97%, 0%, 25%, 16%)` | `cmyk(97% 0% 25% 16%)`        | no         |
| LAB      | `lab(76 -56 20)`, `lab(76, -56, 20)`          | `lab(76 -56 20)`              | yes (L4)   |
| OKLCH    | `oklch(78% 0.16 165)`                         | `oklch(78% 0.16 165)`         | yes (L4)   |

**Notes**:

- HSV row carries an `ⓘ` tooltip: _"HSV is for reference — CSS does not have an `hsv()` function. Use HSL instead."_
- Parsers tolerate both legacy comma-separated (`rgb(6, 214, 160)`) and modern space-separated (`rgb(6 214 160)`) syntax. Output uses one canonical form per format.
- CMYK input/output both carry `%` to keep round-tripping safe.
- Closest CSS named color is shown below the picker (via `colord(c).toName({ closest: true })`). Click it to copy the name.

### Interaction

- **Picker → formats**: Drag updates all format displays in real-time (React Compiler memoizes the conversion chain).
- **Format input → picker + others**: Editing any field parses the value; on success, picker and all other formats sync.
- **Invalid input**: Field gets `border-danger` + `aria-invalid="true"`. Other formats stay at last valid state. No crashes.
- **Alpha channel**: Picker has an opacity slider. RGBA/HSLA and 8-digit HEX show alpha; other formats display the opaque approximation.
- **EyeDropper**: A 💧 button next to the picker calls `new EyeDropper().open()` (Chromium). Feature-detected — hidden in browsers without support.
- **CopyButton**: Each format row, the CSS variable line, and each Tailwind output have their own `<CopyButton>`.

### CSS / Tailwind Export

**CSS variable** — variable name is editable (default `--color-primary`); the displayed line updates live.

```css
--color-primary: #06d6a0;
```

**Tailwind utility** — segmented control toggles between `bg` / `text` / `border` / `ring`:

```
bg-[#06d6a0]
```

**Tailwind v4 `@theme`** — separate copy block, ideal for Tailwind 4 OKLCH-first workflows:

```css
@theme {
  --color-primary: oklch(78% 0.16 165);
}
```

## Tab 2: Palette Generator

Two sections share one tab.

### Section A: Harmonies (from current color)

Implemented via `colord/plugins/harmonies`. For monochromatic, use `tints/shades/tones`.

| Type                | Colors | Source                              |
| ------------------- | ------ | ----------------------------------- |
| Complementary       | 2      | `harmonies("complementary")`        |
| Analogous           | 3      | `harmonies("analogous")`            |
| Triadic             | 3      | `harmonies("triadic")`              |
| Split-complementary | 3      | `harmonies("split-complementary")`  |
| Tetradic            | 4      | `harmonies("tetradic")`             |
| Monochromatic       | 5      | `tints(5)` blended with `shades(5)` |

Layout per row:

```
Complementary
[#06d6a0] [#d6063a]                        [Copy All]
Analogous
[#06d6a4] [#06d6a0] [#0fd606]              [Copy All]
...
```

Each swatch shows its HEX. Hover reveals RGB + HSL. Click sets it as current color (also drives the Converter tab via shared state).

### Section B: Extract from Image

Drop or click to upload an image (JPEG/PNG/WebP, max 5MB to match the project's other tools). `colorthief` extracts a 6-color palette via median-cut quantization on a downscaled canvas (ImageBitmap). All processing client-side; image is **not** uploaded.

```
Drop image here or click to upload
┌──────────────┐
│   [preview]  │   Extracted: [■][■][■][■][■][■]   [Copy All]
└──────────────┘
```

- Preview thumbnail max 200×200, object-fit contain.
- Extracted swatches behave like Section A swatches — clickable, set as current color.
- "Copy All" copies HEX values comma-separated.
- Errors: file too large, unsupported type, decode failure → inline error message.

## Tab 3: Contrast Checker

### Layout

```
┌─────────────────────────────────────────────────┐
│  Foreground: [■ #06d6a0] [💧] [picker]         │
│  Background: [■ #0b0f1a] [💧] [picker]         │
│  [Swap fg/bg]                                   │
│                                                  │
│  ┌─ Preview ─────────────────────────────────┐  │
│  │ Normal text (14pt regular)                │  │
│  │ The quick brown fox 敏捷的棕色狐狸        │  │
│  │                                            │  │
│  │ Large text (18pt regular / 14pt bold)     │  │
│  │ The quick brown fox 敏捷的棕色狐狸        │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  WCAG 2.1                  APCA                  │
│  Ratio: 8.45:1             Lc: 87                │
│  ┌──────┬─────┬─────┐    ┌──────────┬─────────┐ │
│  │      │ AA  │ AAA │    │ Body     │ ✅ Pass │ │
│  │Normal│ ✅  │ ✅  │    │ Headline │ ✅ Pass │ │
│  │Large │ ✅  │ ✅  │    │ Fluent   │ ✅ Pass │ │
│  └──────┴─────┴─────┘    └──────────┴─────────┘ │
│                                                  │
│  Suggestions (if any failure):                   │
│  • Lighten background to #1a2332 → AA Normal ✅  │
└──────────────────────────────────────────────────┘
```

### WCAG (via `colord/plugins/a11y`)

| Level | Normal text | Large text (≥18pt regular OR ≥14pt bold) |
| ----- | ----------- | ---------------------------------------- |
| AA    | ≥ 4.5:1     | ≥ 3:1                                    |
| AAA   | ≥ 7:1       | ≥ 4.5:1                                  |

Plugin call: `colord(fg).contrast(bg)` returns the ratio; threshold checks live in `libs/color/contrast.ts`.

### APCA (Lc score, custom implementation)

APCA (Accessible Perceptual Contrast Algorithm — WCAG 3 candidate) returns a polarity-aware Lc score. Implementation in `libs/color/apca.ts` (~30 lines). Verify the upstream APCA license terms before merging — the reference repo carries usage restrictions; if those conflict with this project's license, fall back to a clean-room implementation of the published formula.

Recommended Lc thresholds (per APCA author, simplified):

| Use case               | Min Lc |
| ---------------------- | ------ |
| Body text (~16px)      | 75     |
| Headline (~24px+)      | 60     |
| Fluent / non-essential | 45     |

### Suggestions

When any WCAG check fails, compute and display **one** actionable fix: holding hue/saturation constant, adjust foreground or background lightness in HSL until the ratio crosses the AA Normal threshold (4.5:1). Show the suggested HEX with a "Use this" button. If both directions work, prefer the smaller delta. If no solution exists within the same hue, fall back to "consider a different hue".

### Interaction

- Two color pickers (foreground + background), each `react-colorful` inline.
- Each picker also gets an EyeDropper button.
- Foreground initialized to current color. Background defaults to `#ffffff` (light theme) or `#0b0f1a` (dark).
- "Swap" exchanges foreground/background.
- Preview renders bilingual sample text (English + Chinese) to verify CJK rendering.
- All metrics update in real-time; the suggestions block animates in only when a fail is detected.

## Shared: Vision Preview (Color Blindness Simulation)

A page-level toggle above the tabs:

```
Vision: [None ▾]  None | Protanopia | Deuteranopia | Tritanopia | Achromatopsia
```

When set, a CSS `filter: url(#vision-{mode})` is applied to the tabbed content wrapper (not the toggle itself). The picker, palette swatches, and contrast preview all simulate together so the user sees their design through the chosen vision condition.

Implementation: a single inline `<svg width="0" height="0">` containing four `<filter>` definitions with `feColorMatrix` matrices (standard Brettel/Viénot/Mollon coefficients). Lives in `components/color/vision-filter-defs.tsx`, mounted once per page.

## Shared: Color History Bar

```
┌──────────────────────────────────────────────┐
│ Recent: ■ ■ ■ ■ ■ ■ ■ ■ ■ ■        [Clear] │
└──────────────────────────────────────────────┘
```

### Behavior

- **Trigger**: Color enters history on picker `onCommit` (mouse up / touch end), debounced 800ms. Drag-in-progress does not pollute history.
- **De-duplication**: If the color is already in history, move it to the front rather than adding a duplicate.
- **Capacity**: Maximum 20. Oldest evicted (FIFO).
- **Persistence**: `STORAGE_KEYS.color` (`okrun:color:history`), JSON array of HEX strings.
- **Format**: 6-digit HEX (no alpha). Alpha is dropped on save.
- **Layout**: `sticky bottom-0` with `pb-[env(safe-area-inset-bottom)]` to respect iOS home indicator. Hidden when history is empty.
- **Interaction**: Click swatch → set as current color. Clear empties history.

## State Management

All state lives in `color-page.tsx` via `useState`. No context, no store. React Compiler handles memoization automatically — **never write `useMemo` / `useCallback` / `React.memo`** (project rule).

```typescript
const [color, setColor] = useState<string>("#06d6a0"); // current color, hex
const [foreground, setForeground] = useState<string>("#06d6a0");
const [background, setBackground] = useState<string>("#ffffff");
const [history, setHistory] = useState<string[]>([]);
const [vision, setVision] = useState<VisionMode>("none");
```

`history` is hydrated from localStorage in a `useEffect(..., [])` on mount; subsequent changes write back through a small wrapper that handles dedupe + capacity.

## i18n

```tsx
const t = useTranslations("color"); // tool-specific
const tc = useTranslations("common"); // alert.notTransferred etc.
const ts = useTranslations("tools"); // page title
```

### Translation keys (color.json) — content scaled to match `qrcode.json` density

```json
{
  "tabs": { "converter": "Converter", "palette": "Palette", "contrast": "Contrast" },
  "vision": {
    "label": "Vision",
    "none": "Normal vision",
    "protanopia": "Protanopia (red-blind)",
    "deuteranopia": "Deuteranopia (green-blind)",
    "tritanopia": "Tritanopia (blue-blind)",
    "achromatopsia": "Achromatopsia (no color)"
  },
  "converter": {
    "hex": "HEX",
    "rgb": "RGB",
    "hsl": "HSL",
    "hsv": "HSV",
    "cmyk": "CMYK",
    "lab": "LAB",
    "oklch": "OKLCH",
    "hsvNote": "HSV is for reference. CSS has no hsv() function — use HSL.",
    "closestName": "Closest CSS name",
    "eyedropper": "Pick color from screen",
    "eyedropperUnsupported": "Eyedropper requires a Chromium-based browser",
    "cssVariable": "CSS Variable",
    "cssVariableName": "Variable name",
    "tailwindClass": "Tailwind utility",
    "tailwindTheme": "Tailwind v4 @theme"
  },
  "palette": {
    "current": "Current",
    "complementary": "Complementary",
    "analogous": "Analogous",
    "triadic": "Triadic",
    "splitComplementary": "Split-complementary",
    "tetradic": "Tetradic",
    "monochromatic": "Monochromatic",
    "fromImage": "Extract from image",
    "imageDrop": "Drop image here or click to upload (max 5MB)",
    "imageError": "Could not extract colors from this image",
    "copyAll": "Copy All"
  },
  "contrast": {
    "foreground": "Foreground",
    "background": "Background",
    "swap": "Swap colors",
    "preview": "Preview",
    "wcagTitle": "WCAG 2.1",
    "apcaTitle": "APCA (WCAG 3 candidate)",
    "ratio": "Contrast Ratio",
    "lc": "Lc Score",
    "normal": "Normal Text",
    "large": "Large Text",
    "bodyText": "Body Text",
    "headline": "Headline",
    "fluent": "Fluent",
    "pass": "Pass",
    "fail": "Fail",
    "suggestionTitle": "Suggestion",
    "suggestionText": "Adjust to {color} to pass {target}",
    "useThis": "Use this"
  },
  "history": { "recent": "Recent", "clear": "Clear" },
  "errors": {
    "invalidColor": "Invalid color value",
    "fileTooLarge": "Image must be smaller than 5MB",
    "fileNotImage": "Please upload a PNG, JPG, or WebP image"
  },
  "description": {
    "title": "About Color Conversion",
    "introTitle": "What is a Color Converter?",
    "introP1": "A color converter translates the same color across the formats used in web, print, and design — HEX for CSS, RGB/HSL for live tweaking, CMYK for print, LAB/OKLCH for perceptual uniformity.",
    "spacesTitle": "Color Spaces",
    "spaceHex": "HEX — compact 6/8-digit RGB notation. The default for CSS.",
    "spaceRgb": "RGB — additive primaries 0–255. Maps directly to display pixels.",
    "spaceHsl": "HSL — hue/saturation/lightness. Easier for humans to reason about than RGB.",
    "spaceHsv": "HSV — hue/saturation/value. Common in design tools but not a CSS function.",
    "spaceCmyk": "CMYK — subtractive primaries used in print. Approximate when converted from RGB.",
    "spaceLab": "LAB — perceptually uniform; equal numeric distance ≈ equal visual distance.",
    "spaceOklch": "OKLCH — modern perceptual space; preferred by Tailwind v4 and CSS Color Module Level 4.",
    "harmoniesTitle": "Color Harmonies",
    "harmoniesP1": "Harmonies are mathematical relationships on the color wheel (complementary at 180°, triadic at 120°, etc.) that tend to produce balanced palettes.",
    "contrastTitle": "Contrast (WCAG vs APCA)",
    "contrastP1": "WCAG 2.1 uses a luminance ratio (1:1 to 21:1) with thresholds for AA/AAA. It is widely supported but doesn't fully account for perception of small text or dark mode.",
    "contrastP2": "APCA is a candidate for WCAG 3 with a polarity-aware Lc score. It correlates better with readability for thin or small text.",
    "visionTitle": "Color Blindness Preview",
    "visionP1": "Roughly 1 in 12 men and 1 in 200 women have a form of color vision deficiency. The Vision toggle simulates protanopia, deuteranopia, tritanopia, and achromatopsia so you can verify your design holds up.",
    "tipsTitle": "Tips",
    "tipEyedropper": "Use the eyedropper to pick a color from any pixel on your screen (Chromium browsers).",
    "tipImage": "Drop an image into the Palette tab to extract its 6 dominant colors via median-cut quantization.",
    "tipOklch": "Tailwind v4 emits colors in OKLCH for perceptual smoothness — copy the @theme block to align with that workflow."
  }
}
```

## Error Handling

| Scenario                                             | Behavior                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Invalid format input                                 | `border-danger` + `aria-invalid="true"`. Other formats stay at last valid value. |
| Alpha in non-alpha format                            | Alpha dropped silently in display.                                               |
| CMYK / LAB / OKLCH precision                         | Round to integers (CMYK %), 1 decimal (LAB), 2 decimals (OKLCH chroma).          |
| EyeDropper unsupported                               | Button hidden; tooltip explains on the disabled state if shown.                  |
| EyeDropper user-cancel (`AbortError`)                | Silent — no error toast.                                                         |
| Image > 5MB / non-image / decode fail                | Inline error message in the drop zone. Does not affect tab state.                |
| localStorage unavailable                             | History feature degrades silently; bar hidden.                                   |
| Vision filter on browsers without SVG filter support | None — universally supported on target browsers.                                 |

## Phase 2 (Out of Scope, Documented for Future)

- **Gradient generator** — separate tool or another tab. Out of scope to keep "Color Converter" focused.
- **Undo / redo** of current color across the session.
- **Multi-color contrast matrix** — paste N colors, see N×N AA/AAA grid.
- **Color mixing** — blend two colors with a ratio slider (LAB/OKLCH interpolation).
- **WCAG 3 final** — replace APCA section once the spec is finalized.
- **Palette export** — Tailwind config / CSS / SVG / Sketch / Figma JSON. Currently only "Copy All" as comma-separated HEX.
