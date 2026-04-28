# PWA Support Design Spec

**Date**: 2026-04-27
**Last revised**: 2026-04-28 (deep-review revisions)
**Status**: Draft (deep-review applied)
**Scope**: Add installability + basic offline support to ByteCraft

## Background

ByteCraft is a collection of browser-based developer utilities. All operations run client-side — no data is sent to any server. The site is built on Next.js 16 (App Router) with Turbopack as the default bundler, deployed on Vercel, and uses next-intl for i18n (en, zh-CN, zh-TW). Locale routing is handled by `proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts`), with `localePrefix: "as-needed"` — default locale (en) has no URL prefix.

Currently the project has zero PWA support: no manifest, no service worker, no PWA icons, no PWA meta tags.

## Goal

Make ByteCraft installable ("Add to Home Screen") and provide basic offline access to cached pages. Pass the Chrome DevTools `installable` audit. Provide a polished iOS install experience including launch splash screens. No custom install prompt, no push notifications, no background sync.

## Approach

Use **`@serwist/turbopack`** with the InjectManifest pattern. Serwist is a modern Workbox derivative; the `@serwist/turbopack` package is the only Serwist variant that supports Next.js 16's default Turbopack bundler.

### Why `@serwist/turbopack` over `@serwist/next`

`@serwist/next` (the older, more ergonomic GenerateSW-style package) is **webpack-only**. Using it on Next.js 16 would require running `next dev --webpack` and `next build --webpack` for the entire project, sacrificing Turbopack's compile-speed advantage. Since Next.js is moving toward Turbopack as the long-term default, locking the build to webpack is a regression we'd have to undo later anyway.

`@serwist/turbopack` only supports the **InjectManifest** pattern: we write `app/sw.ts` and Serwist injects the precache manifest at build time. The extra ~30 lines of SW code is a one-time cost; keeping Turbopack is a permanent benefit.

### Why InjectManifest is fine for our needs

ByteCraft is fully static — all pages are prerendered, no server-side data. The SW logic is small: precache build manifest entries, handle navigation fallbacks, basic runtime caching for fonts and images. This is well within InjectManifest's complexity budget.

## Changes

### 1. Install dependencies

```
npm install @serwist/turbopack serwist
npm install -D sharp esbuild png-to-ico
```

- `@serwist/turbopack` + `serwist` — runtime + build integration
- `sharp` — PNG icon generation (devDep, not bundled into app)
- `esbuild` — required by Serwist Turbopack to compile `app/sw.ts`
- `png-to-ico` — convert 32×32 PNG → real multi-resolution `.ico` (sharp can't emit ICO format)

> **Why explicit `serwist`** (verified against `npm view @serwist/turbopack@9.5.7`): `serwist` is a _regular dependency_ of `@serwist/turbopack`, **not** a peer dep (peers are only `esbuild`, `esbuild-wasm`, `next`, `react`, `typescript`). npm hoists `serwist` to top-level `node_modules` so `import { Serwist } from "serwist"` resolves, but **without an explicit declaration in `package.json` it's a phantom dependency** — pnpm strict mode rejects it, and a future minor bump of `@serwist/turbopack` could swap to a different version of `serwist` and silently break `app/sw.ts`. Declaring it explicitly is the production-grade fix.

### 2. Modify `next.config.js`

Wrap existing config with `withSerwist` from `@serwist/turbopack`:

```js
import createNextIntlPlugin from "next-intl/plugin";
import { withSerwist } from "@serwist/turbopack";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withSerwistWrapper = withSerwist({
  // No options needed at this layer; SW config lives in the route handler.
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // SW must never be aggressively cached, otherwise users get stuck on stale versions.
        source: "/serwist/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withSerwistWrapper(withNextIntl(nextConfig));
```

Plugin wrapping order: `withSerwistWrapper(withNextIntl(nextConfig))`. Serwist needs to wrap last so its Turbopack rules apply on top of next-intl's transformations.

> Manifest cache headers are now set inside the manifest route handler (step 5) — they don't belong here.

### 3. Create `app/sw.ts`

The Service Worker source. Serwist injects `__SW_MANIFEST` at build time.

```ts
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Worker types come from tsconfig.sw.json (step 12), not the root tsconfig —
// avoids leaking WebWorker types into regular components (Cache, Client name collisions).

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

`defaultCache` from `@serwist/turbopack/worker` provides sensible runtime caching for fonts (cache-first), images (cache-first), and navigation requests (network-first with cache fallback). No custom strategies needed.

### 4. Create `app/serwist/[path]/route.ts`

Serwist Turbopack serves the SW from a Next.js route (not `/public`). The route handler compiles `app/sw.ts` and returns it as a JS response.

```ts
import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// SW revision: git HEAD captured at build time (route is statically generated,
// so this IIFE runs once during `next build`). Vercel build environment has
// git access, so the fallback only fires for local dev or detached states.
const revision =
  process.env.NODE_ENV === "development"
    ? crypto.randomUUID()
    : (spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
      crypto.randomUUID());

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    // Disable in dev to avoid HMR / stale-cache pain.
    disable: process.env.NODE_ENV === "development",
    additionalPrecacheEntries: [{ url: "/", revision }],
    // Goal: every prerendered page works offline. mermaid (/markdown) and
    // prismjs (/diff) chunk inclusion must be verified post-build (see step 13).
  }
);
```

**SW URL**: `/serwist/sw.js`. The URL is stable; the bundled SW source content changes when `revision` changes (new commit → new git HEAD → new SW response body), which triggers the browser's update/activate cycle.

`proxy.ts` matcher already excludes URLs containing `.` (the `.*\\..*` segment), so `/serwist/*.js` passes through without locale rewriting. ✓

### 5. Per-locale manifest as a dynamic route handler

Each locale serves its own manifest from `app/[locale]/manifest.webmanifest/route.ts`. Translations come from `messages/{locale}/site.json` via `getTranslations()` — no manual sync, no copy drift.

`messages/{locale}/site.json` adds a `pwa` block:

```json
{
  "pwa": {
    "name": "ByteCraft - Free Online Developer Tools",
    "shortName": "ByteCraft",
    "description": "A collection of free, browser-based developer utilities. All operations run entirely in the browser."
  }
}
```

(Translated equivalents in `zh-CN/site.json` and `zh-TW/site.json`.)

`app/[locale]/manifest.webmanifest/route.ts`:

```ts
import { getTranslations } from "next-intl/server";
import { routing } from "../../../i18n/routing";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.pwa" });
  const startUrl = locale === routing.defaultLocale ? "/" : `/${locale}`;

  const manifest = {
    name: t("name"),
    short_name: t("shortName"),
    description: t("description"),
    start_url: startUrl,
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    theme_color: "#06d6a0",
    background_color: "#f8fafc",
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
```

**URL pattern**: `/{locale}/manifest.webmanifest` — the same shape for all locales (`en` included), since the route is statically generated under `app/[locale]/...`. The `proxy.ts` matcher excludes paths containing `.` (the `.*\\..*` segment), so these URLs bypass next-intl rewriting and resolve directly to the route handler. ✓

#### 5.1 Manifest URL switching behavior (intentional)

All three manifests share `scope: "/"`, so the browser identifies a single PWA across the whole site. **When the user navigates between locales, the linked manifest URL changes** (`/en/manifest.webmanifest` → `/zh-CN/manifest.webmanifest`), and the browser may update the installed PWA's `name`, `theme_color`, etc. on the next manifest fetch.

This is per-spec browser behavior and intentional: a Chinese user who reads the site in Simplified Chinese gets a Chinese-labeled PWA after install. **The `start_url` captured at install time does not change**, so launches always go to the locale chosen at install. We considered locking the manifest via cookie but rejected it — the cookie approach forfeits the localized-label benefit and introduces server-side state for a purely cosmetic concern.

### 6. Maskable icon needs its own variant

A maskable icon must keep its content within the inner ~80% radius — the outer 10% on each side will be cropped by Android/iOS launcher masks. Reusing the same square icon as both regular and maskable will visibly clip the logo edges.

**Solution**: the icon-generation script produces a separate `maskable-512x512.png` with 10% transparent padding around the original SVG. Listed separately in the manifest with `"purpose": "maskable"`.

### 7. Modify `app/[locale]/layout.tsx`

Use Next.js 16's typed `viewport` export for `themeColor` and `viewportFit` (the meta-tag form is deprecated since 14). Link the per-locale manifest, mount iOS splash links, wrap children with `SerwistProvider`.

```tsx
import type { Viewport } from "next";
import { SerwistProvider } from "../serwist";
import { IOSSplashLinks } from "../../components/ios-splash-links";

export const viewport: Viewport = {
  // viewport-fit=cover is required for env(safe-area-inset-*) to be non-zero on
  // notched devices. Without it, black-translucent status bar still leaves the
  // inset at 0 and PWA content slides under the system status bar.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
};

// In <head>:
<link rel="manifest" href={`/${locale}/manifest.webmanifest`} />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
{/* black-translucent: status bar transparently shows the PWA background, so
    dark mode no longer flashes a white bar at the top. Requires viewport-fit=
    cover (above) plus body safe-area padding (step 14). */}
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="ByteCraft" />

{/* iOS PWA launch splash screens (14 device variants, portrait only) */}
<IOSSplashLinks />

// In <body> — wrap children:
<SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
```

Removals from existing layout:

- `<link rel="apple-touch-icon" href="/favicon.svg" />` (SVG not supported as Apple touch icon)

**Header positioning** (verified): `components/header.tsx` uses `sticky top-0 z-50`, normal flow. Body's `padding-top: env(safe-area-inset-top)` (step 14) pushes the sticky Header below the iOS notch automatically. **No changes needed in `Header` or `Layout`**.

**Footer caveat**: `components/layout.tsx` uses `Footer` with `position: fixed` in some modes; `body` padding does not affect fixed elements. The fixed-footer mode will overlap the iOS home indicator until `Footer` itself adds `padding-bottom: env(safe-area-inset-bottom)`. Out of scope for this PWA pass; tracked in Open TODOs.

### 8. Re-export the official `SerwistProvider`

Create `app/serwist.ts` to re-export the official client component from `@serwist/turbopack/react`:

```ts
"use client";
export { SerwistProvider } from "@serwist/turbopack/react";
```

Why re-export instead of importing the package directly in layout: keeps consumer imports project-local (`import { SerwistProvider } from "../serwist"`), so swapping the underlying package later is a one-file edit. The official provider already handles registration timing, `controllerchange` events, and update lifecycle — no custom client logic needed.

Notes:

- `swUrl="/serwist/sw.js"` is passed by the layout (step 7).
- `Service-Worker-Allowed: /` header (step 2) lets the SW claim the entire site even though it lives under `/serwist/`.
- Dev-mode disable: the route handler returns 404 in dev (step 4); the provider's registration call fails silently. Dev stays clean.

### 9. iOS launch splash screens

iOS PWAs show a launch splash from `<link rel="apple-touch-startup-image">` tags. Each tag must **exactly match** the target device's CSS pt × DPR, otherwise iOS silently falls back to a white screen. Coverage strategy: 14 unique device-width × device-height × DPR combinations, portrait orientation only (manifest already locks `orientation: "portrait"`).

#### 9.1 Shared device list

Create `libs/pwa/splash-devices.mjs` so the React component and the icon-generation script consume one source of truth. Plain `.mjs` with JSDoc types means both `.tsx` and Node consumers can import without extra tooling.

```js
/**
 * @typedef {Object} SplashDevice
 * @property {number} width  CSS reference points (device-width media query)
 * @property {number} height CSS reference points (device-height media query)
 * @property {2 | 3}  dpr    Device pixel ratio
 * @property {string} label  File slug
 */

/** @type {SplashDevice[]} */
export const SPLASH_DEVICES = [
  { width: 440, height: 956, dpr: 3, label: "iphone-16-pro-max" },
  { width: 402, height: 874, dpr: 3, label: "iphone-16-pro" },
  { width: 430, height: 932, dpr: 3, label: "iphone-16-plus" }, // covers 15 Pro Max, 15 Plus, 14 Pro Max
  { width: 393, height: 852, dpr: 3, label: "iphone-16" }, // covers 15 Pro, 15, 14 Pro
  { width: 428, height: 926, dpr: 3, label: "iphone-14-plus" }, // covers 13 Pro Max, 12 Pro Max
  { width: 390, height: 844, dpr: 3, label: "iphone-14" }, // covers 13 Pro, 13, 12 Pro, 12
  { width: 375, height: 812, dpr: 3, label: "iphone-13-mini" }, // covers 12 mini, 11 Pro, XS, X
  { width: 414, height: 896, dpr: 3, label: "iphone-11-pro-max" }, // covers XS Max
  { width: 414, height: 896, dpr: 2, label: "iphone-11" }, // covers XR
  { width: 1032, height: 1376, dpr: 2, label: "ipad-pro-13" }, // M4
  { width: 1024, height: 1366, dpr: 2, label: "ipad-pro-12-9" }, // Gen 2–6
  { width: 834, height: 1194, dpr: 2, label: "ipad-pro-11" }, // covers iPad Air 11"
  { width: 820, height: 1180, dpr: 2, label: "ipad-air" }, // 13"/11"
  { width: 768, height: 1024, dpr: 2, label: "ipad-mini" }, // covers standard iPad
];
```

Source: Apple HIG device specs as of 2026-04. Portrait orientation only.

#### 9.2 Component

`components/ios-splash-links.tsx`:

```tsx
// Server component: do NOT add "use client". Renders <link> tags into <head>.
import { SPLASH_DEVICES } from "../libs/pwa/splash-devices.mjs";

export function IOSSplashLinks() {
  return (
    <>
      {SPLASH_DEVICES.map((d) => {
        const w = d.width * d.dpr;
        const h = d.height * d.dpr;
        const href = `/icons/splash/${d.label}-${w}x${h}.png`;
        const media =
          `(device-width: ${d.width}px) and (device-height: ${d.height}px) ` +
          `and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait)`;
        return <link key={href} rel="apple-touch-startup-image" href={href} media={media} />;
      })}
    </>
  );
}
```

Layout imports it and drops `<IOSSplashLinks />` in `<head>`.

#### 9.3 Splash image content

- **Background**: `#f8fafc` (matches `--bg-base` light). Single set, light only — Apple supports `prefers-color-scheme: dark` in splash media queries (iOS 17+), but doubling to 28 images for marginal benefit isn't worth it. Most users don't notice splash theming since it's <1s on screen.
- **Foreground**: centered logo from `public/favicon.svg`, sized at 30% of the image's shorter edge.
- **Format**: PNG, opaque background.

#### 9.4 Generation

Splash generation lives in `scripts/generate-pwa-icons.mjs` (next section), which imports `SPLASH_DEVICES` from `libs/pwa/splash-devices.mjs` — the same module the React component uses. One source of truth, no manual sync.

### 10. Generate PWA icons

Create `scripts/generate-pwa-icons.mjs`:

```js
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pngToIco from "png-to-ico";
import { SPLASH_DEVICES } from "../libs/pwa/splash-devices.mjs";

const SVG = readFileSync("public/favicon.svg");
const OUT = "public/icons";
mkdirSync(OUT, { recursive: true });

// Standard square icons (logo fills the canvas)
const SQUARE = [
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of SQUARE) {
  await sharp(SVG, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(OUT, name));
}

// Maskable: logo fills inner 80%, 10% padding on each side (transparent).
const MASKABLE_SIZE = 512;
const INNER = Math.round(MASKABLE_SIZE * 0.8);
const PAD = Math.round((MASKABLE_SIZE - INNER) / 2);
await sharp({
  create: {
    width: MASKABLE_SIZE,
    height: MASKABLE_SIZE,
    channels: 4,
    background: { r: 6, g: 214, b: 160, alpha: 1 }, // accent-cyan as bg
  },
})
  .composite([
    {
      input: await sharp(SVG, { density: 384 }).resize(INNER, INNER).png().toBuffer(),
      top: PAD,
      left: PAD,
    },
  ])
  .png()
  .toFile(join(OUT, "maskable-512x512.png"));

// iOS launch splash screens — shared device list with components/ios-splash-links.tsx.
// CSS pt × DPR = physical PNG resolution; portrait only (manifest locks portrait).
const SPLASH_OUT = join(OUT, "splash");
mkdirSync(SPLASH_OUT, { recursive: true });

// Background color = --bg-base light = #f8fafc.
const BG = { r: 0xf8, g: 0xfa, b: 0xfc, alpha: 1 };

for (const d of SPLASH_DEVICES) {
  const w = d.width * d.dpr;
  const h = d.height * d.dpr;
  const logoSize = Math.round(Math.min(w, h) * 0.3);
  const logo = await sharp(SVG, { density: 384 }).resize(logoSize, logoSize).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: BG } })
    .composite([
      { input: logo, top: Math.round((h - logoSize) / 2), left: Math.round((w - logoSize) / 2) },
    ])
    .png()
    .toFile(join(SPLASH_OUT, `${d.label}-${w}x${h}.png`));
}

// Favicon — sharp produces the PNG buffer, png-to-ico wraps it as real ICO.
const faviconPng = await sharp(SVG, { density: 192 }).resize(32, 32).png().toBuffer();
writeFileSync("app/favicon.ico", await pngToIco(faviconPng));

console.log("PWA icons + splash screens + favicon generated.");
```

Add to `package.json`:

```json
{
  "scripts": {
    "icons:generate": "node scripts/generate-pwa-icons.mjs"
  }
}
```

**Run once, commit the output.** Not part of `prebuild` — avoids slowing CI and adding `sharp` to the runtime dependency surface unnecessarily.

### 11. Favicon

Move favicon to Next.js App Router convention so browsers find it at `/favicon.ico`:

- `app/favicon.ico` — generated by the icon script (step 10) and committed.

The existing `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` in layout stays — modern browsers prefer SVG. The `.ico` is the fallback for browsers that don't request the SVG.

### 12. Isolated TypeScript config for `app/sw.ts`

WebWorker types and DOM types overlap on names like `Cache` and `Client`. Adding `"webworker"` to the root `lib` array (the workaround mentioned in serwist#348) leaks worker types into every component file and creates name collisions. Instead, isolate the worker type-check.

**Update `tsconfig.json`** — exclude `app/sw.ts`:

```json
{
  "exclude": ["node_modules", "app/sw.ts"]
}
```

**Create `tsconfig.sw.json`** — worker-only config:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["esnext", "webworker"],
    "noEmit": true
  },
  "include": ["app/sw.ts"],
  "exclude": []
}
```

**Add to `package.json`**:

```json
{
  "scripts": {
    "typecheck:sw": "tsc -p tsconfig.sw.json"
  }
}
```

CI runs `npm run typecheck:sw` alongside the regular type-check (or as part of `lint-staged`). Regular components keep clean DOM-only autocomplete; `app/sw.ts` gets the worker types it needs; no type-name collisions across the boundary.

### 13. Caching strategy summary

| Resource                              | Strategy                  | Handled by                                                                   |
| ------------------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| HTML pages (prerendered, all locales) | Precache                  | Serwist `__SW_MANIFEST` (auto)                                               |
| Static JS/CSS bundles                 | Precache                  | Serwist `__SW_MANIFEST` (auto)                                               |
| `mermaid`, `prismjs` chunks           | **Verify, then precache** | `__SW_MANIFEST` if Serwist scans them; otherwise `additionalPrecacheEntries` |
| Fonts (Inter, JetBrains Mono)         | Cache-first               | `defaultCache`                                                               |
| Images / icons                        | Cache-first               | `defaultCache`                                                               |
| Navigation requests                   | Network-first             | `defaultCache`                                                               |

**Dynamic-import precache caveat**: `__SW_MANIFEST` is generated from Serwist's scan of the `.next` build output. mermaid (loaded by `/markdown` via dynamic import) and prismjs (loaded by `/diff`) are split into separate chunks. **Whether these chunks land in `__SW_MANIFEST` depends on Serwist's chunk-discovery heuristic — it is not guaranteed.** Implementation must verify in DevTools > Application > Cache Storage after install: search for "mermaid" and "prismjs" entries. If absent, list their chunk URLs explicitly via `additionalPrecacheEntries` in the route handler (chunk URLs are visible under `.next/static/chunks/` post-build).

**Goal**: every prerendered page is usable offline. Track total install size in production; revisit if it grows past ~5MB.

### 14. Modify `app/globals.css` for safe-area padding

`black-translucent` status bar (step 7) requires the PWA body to pad for the iOS notch and home indicator. Without padding, content slides under the status bar.

In `app/globals.css`, augment the existing `body` rule (currently `body { min-height: 100vh; }`):

```css
@layer base {
  body {
    min-height: 100vh;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

`env(safe-area-inset-*)` evaluates to `0` on devices without notches/home indicators, so this is a no-op for desktop browsers and pre-notch iPhones. The sticky `Header` (`sticky top-0`) sits below the top padding automatically. Fixed `Footer` modes still overlap the home indicator (see step 7 footer caveat).

## Out of Scope

- Custom install prompt UI
- Push notifications, background sync, periodic background sync
- Offline fallback page (`/~offline`)
- Dark-mode iOS splash screens (light-only set covers >99% of perceived install experience)
- Service worker update prompt UI ("New version available, refresh")
- Per-tool offline data persistence
- Landscape-orientation iOS splash screens for iPhone (manifest locks `orientation: "portrait"`)
- **Landscape iPad splash screens** — iPadOS does not enforce manifest orientation lock, so rotated iPads will white-flash on launch; accepted

## Verification

After implementation, verify with:

1. **Chrome DevTools > Application > Manifest** — manifest loaded, "Installable: yes" shown, icons render correctly (including maskable preview)
2. **Chrome DevTools > Application > Service Workers** — SW from `/serwist/sw.js` registered, status "activated and is running"
3. **Chrome DevTools > Lighthouse** — `installable` audit passes (note: Lighthouse 12+ removed the standalone PWA category; check the individual audit instead)
4. **Offline test (basic pages)** — DevTools Network → Offline mode, navigate between simple tools (`/base64`, `/uuid`, `/password`), verify cached pages load
5. **Offline test (dynamic chunks)** — DevTools Network → Offline mode, navigate to `/markdown` (mermaid) and `/diff` (prismjs), verify they render. If either fails, capture the failed chunk URL from the network tab and add it to `additionalPrecacheEntries` (step 4)
6. **Install test (desktop)** — Chrome address bar shows install icon → install → app launches standalone, opens at the correct locale's `start_url`
7. **Install test (Android)** — Add to Home Screen, verify maskable icon renders without edge clipping in launcher
8. **Locale install test** — install from `/zh-CN/base64`, verify the zh-CN manifest is used (DevTools > Application > Manifest shows Chinese strings; launched app opens at `/zh-CN`)
9. **Locale switch test** — after install, navigate to a different locale within the running PWA; verify the manifest URL the browser shows in DevTools updates accordingly. `start_url` from install time stays unchanged — this is the documented behavior (step 5.1)
10. **Theme color test** — toggle OS dark mode, verify browser UA chrome color updates
11. **iOS splash test** — install on physical iPhone (or Safari responsive design mode emulating an iPhone in `SPLASH_DEVICES`), launch from home screen, verify the matching splash image renders for ≥1 frame instead of a white flash. Devices outside the list white-flash (acceptable)
12. **iOS dark status bar test** — launch installed PWA on a device in dark mode; verify status bar matches PWA background instead of showing a white bar at the top, AND verify the sticky Header is not cut off behind the notch (requires step 14 padding to be in effect)
13. **Vercel deploy** — `npm run build` succeeds, deployed app passes all above checks; verify:
    - `/serwist/sw.js` responses have `Cache-Control: max-age=0, must-revalidate` and `Service-Worker-Allowed: /`
    - `/{locale}/manifest.webmanifest` responses have `Content-Type: application/manifest+json` and `Cache-Control: public, max-age=300, must-revalidate`
    - `/icons/splash/*` resolves with 200 OK
    - `npm run typecheck:sw` passes in CI

## File Summary

| Action | File                                         | Description                                                                                 |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Create | `app/sw.ts`                                  | Service worker source (InjectManifest)                                                      |
| Create | `app/serwist/[path]/route.ts`                | SW route handler (compiles + serves sw.ts)                                                  |
| Create | `app/serwist.ts`                             | Re-export `SerwistProvider` from `@serwist/turbopack/react`                                 |
| Create | `app/[locale]/manifest.webmanifest/route.ts` | Per-locale manifest route (translations from messages)                                      |
| Create | `app/favicon.ico`                            | Favicon at App Router convention path                                                       |
| Create | `components/ios-splash-links.tsx`            | Server component rendering `<link rel="apple-touch-startup-image">` set                     |
| Create | `libs/pwa/splash-devices.mjs`                | Shared device list (consumed by component + script)                                         |
| Create | `public/icons/icon-192x192.png`              | PWA icon 192×192                                                                            |
| Create | `public/icons/icon-512x512.png`              | PWA icon 512×512                                                                            |
| Create | `public/icons/maskable-512x512.png`          | Maskable icon with 10% safe-zone padding                                                    |
| Create | `public/icons/apple-touch-icon.png`          | iOS icon 180×180                                                                            |
| Create | `public/icons/splash/*.png` (14 files)       | iOS launch splash screens (portrait, light)                                                 |
| Create | `scripts/generate-pwa-icons.mjs`             | One-shot icon + splash + favicon.ico generation                                             |
| Create | `tsconfig.sw.json`                           | Worker-only TS config (isolated `webworker` lib)                                            |
| Modify | `next.config.js`                             | Add Serwist Turbopack wrapper + `/serwist/*` cache headers                                  |
| Modify | `app/[locale]/layout.tsx`                    | PWA meta tags, manifest link, splash links, SerwistProvider wrapping body                   |
| Modify | `tsconfig.json`                              | Exclude `app/sw.ts` (typed via `tsconfig.sw.json` instead)                                  |
| Modify | `package.json`                               | Add deps + `icons:generate` and `typecheck:sw` scripts                                      |
| Modify | `messages/{en,zh-CN,zh-TW}/site.json`        | Add `pwa.name` / `pwa.shortName` / `pwa.description` keys                                   |
| Modify | `app/globals.css`                            | Add safe-area `padding-top` / `padding-bottom` on `body` for `black-translucent` status bar |

## Open TODOs (deferred, tracked in code)

- [ ] SW update notification UI (toast: "new version, refresh") — consider after observing real update friction
- [ ] Multi-size `.ico` (16×16 + 32×32 + 48×48) if analytics show benefit — current single-size 32×32 ICO is sufficient for modern browsers
- [ ] Dark-mode iOS splash variants (would double image count to 28; revisit if user feedback shows light-only feels jarring on dark systems)
- [ ] iPad landscape splash variants — revisit if iPad install feedback shows the rotation white-flash is jarring
- [ ] `Footer` fixed-mode home-indicator overlap — `Footer` element needs `padding-bottom: env(safe-area-inset-bottom)`. Body padding doesn't reach fixed elements; deferred until reported as visually distracting
