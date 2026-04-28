# PWA Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ByteCraft installable ("Add to Home Screen") and provide basic offline access to all prerendered pages, with polished iOS install experience including launch splash screens.

**Architecture:** Use `@serwist/turbopack` with the InjectManifest pattern (the only Serwist variant compatible with Next.js 16's default Turbopack bundler). Service worker source lives in `app/sw.ts` and is compiled+served by a Next.js route handler. Per-locale Web App Manifest is served by a dynamic route handler that pulls labels from next-intl translations. iOS launch splash screens are precomputed PNGs generated from `public/favicon.svg`. No custom install prompt, no push notifications, no background sync.

**Tech Stack:**

- `@serwist/turbopack@^9` + `serwist@^9` — runtime + Turbopack-compatible build integration (declared explicitly to avoid phantom dep)
- `sharp` (devDep) — PNG icon + splash generation
- `png-to-ico` (devDep) — wrap PNG buffer as multi-resolution ICO (sharp can't emit ICO)
- `esbuild` (devDep) — required by `@serwist/turbopack` to compile `app/sw.ts`
- Next.js 16 App Router, next-intl 4 (already present)

---

## Deviations from `2026-04-27-pwa-design.md`

The spec was written before all repo state was confirmed. This plan reconciles three differences. Implementers MUST follow this plan, not the spec, where they disagree:

| Spec assumption                                                          | Repo reality                                                                                                           | Plan resolution                                                                                                                                  |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Translations live in `messages/{locale}/site.json` with a `pwa` block    | Translations live in `public/locales/{locale}/{namespace}.json`; `i18n/request.ts` explicitly registers each namespace | Add a new `pwa.json` namespace per locale; register it in `i18n/request.ts`; manifest route uses `getTranslations({ locale, namespace: "pwa" })` |
| `getTranslations({ namespace: "site.pwa" })`                             | No `site` namespace exists                                                                                             | Use `namespace: "pwa"` directly                                                                                                                  |
| Existing `<link rel="apple-touch-icon" href="/favicon.svg" />` in layout | Confirmed at `app/[locale]/layout.tsx:53`                                                                              | Removal is explicit in Task 11                                                                                                                   |

No test framework is present (no vitest/jest/playwright in `package.json`). Verification is manual: `npm run dev`, `npm run build`, `npm run typecheck:sw`, `curl` against the dev server, and Chrome DevTools (Application + Lighthouse). The plan structures each task as **write code → verify → commit** rather than red/green TDD.

---

## File Structure (created or modified)

| Action | Path                                         | Responsibility                                                          |
| ------ | -------------------------------------------- | ----------------------------------------------------------------------- |
| Create | `public/locales/{en,zh-CN,zh-TW}/pwa.json`   | PWA manifest labels per locale                                          |
| Modify | `i18n/request.ts`                            | Register new `pwa` namespace                                            |
| Create | `libs/pwa/splash-devices.mjs`                | Shared device list (component + icon script consume it)                 |
| Create | `scripts/generate-pwa-icons.mjs`             | One-shot icon + splash + favicon.ico generation                         |
| Create | `public/icons/icon-192x192.png`              | PWA icon 192×192                                                        |
| Create | `public/icons/icon-512x512.png`              | PWA icon 512×512                                                        |
| Create | `public/icons/maskable-512x512.png`          | Maskable icon with 10% safe-zone padding                                |
| Create | `public/icons/apple-touch-icon.png`          | iOS icon 180×180                                                        |
| Create | `public/icons/splash/*.png` (14 files)       | iOS launch splash screens (portrait, light)                             |
| Create | `app/favicon.ico`                            | Favicon at App Router convention path                                   |
| Create | `app/[locale]/manifest.webmanifest/route.ts` | Per-locale manifest dynamic route                                       |
| Create | `app/sw.ts`                                  | Service Worker source (InjectManifest)                                  |
| Create | `tsconfig.sw.json`                           | Worker-only TS config                                                   |
| Create | `app/serwist/[path]/route.ts`                | SW route handler (compiles + serves `app/sw.ts`)                        |
| Create | `app/serwist.ts`                             | Re-export `SerwistProvider` from `@serwist/turbopack/react`             |
| Create | `components/ios-splash-links.tsx`            | Server component rendering `<link rel="apple-touch-startup-image">` set |
| Modify | `next.config.js`                             | Wrap with `withSerwist` + add `/serwist/*` cache headers                |
| Modify | `app/[locale]/layout.tsx`                    | Viewport export, manifest link, splash, PWA meta, SerwistProvider       |
| Modify | `app/globals.css`                            | Safe-area padding on `<body>`                                           |
| Modify | `tsconfig.json`                              | Exclude `app/sw.ts`                                                     |
| Modify | `package.json`                               | Add deps + `icons:generate` and `typecheck:sw` scripts                  |

---

## Task 1: Add PWA translations namespace

**Files:**

- Create: `public/locales/en/pwa.json`
- Create: `public/locales/zh-CN/pwa.json`
- Create: `public/locales/zh-TW/pwa.json`
- Modify: `i18n/request.ts`

- [ ] **Step 1: Create `public/locales/en/pwa.json`**

```json
{
  "name": "ByteCraft - Free Online Developer Tools",
  "shortName": "ByteCraft",
  "description": "A collection of free, browser-based developer utilities. All operations run entirely in the browser."
}
```

- [ ] **Step 2: Create `public/locales/zh-CN/pwa.json`**

```json
{
  "name": "ByteCraft - 免费在线开发者工具",
  "shortName": "ByteCraft",
  "description": "免费的浏览器开发者工具集合，所有操作在浏览器中完成，数据不会上传至任何服务器。"
}
```

- [ ] **Step 3: Create `public/locales/zh-TW/pwa.json`**

```json
{
  "name": "ByteCraft - 免費線上開發者工具",
  "shortName": "ByteCraft",
  "description": "免費的瀏覽器開發者工具集合，所有操作在瀏覽器中完成，資料不會上傳至任何伺服器。"
}
```

- [ ] **Step 4: Register `pwa` namespace in `i18n/request.ts`**

Modify the `namespaces` array in `i18n/request.ts` (currently lines 4–23) to include `"pwa"` as the last entry:

```ts
const namespaces = [
  "common",
  "tools",
  "home",
  "password",
  "hashing",
  "json",
  "base64",
  "ascii",
  "htmlcode",
  "checksum",
  "cipher",
  "storageunit",
  "terms",
  "privacy",
  "uuid",
  "urlencoder",
  "diff",
  "markdown",
  "pwa",
];
```

- [ ] **Step 5: Verify dev server still resolves messages**

Run: `npm run dev`
Open `http://localhost:3000/` — page must load without next-intl errors. Stop dev server.
Expected: no console error like "Could not find namespace pwa".

- [ ] **Step 6: Commit**

```bash
git add public/locales/en/pwa.json public/locales/zh-CN/pwa.json public/locales/zh-TW/pwa.json i18n/request.ts
git commit -m "feat(pwa): add pwa translations namespace"
```

---

## Task 2: Install dependencies and add scripts

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json` (auto-updated)

- [ ] **Step 1: Install runtime deps**

Run:

```bash
npm install @serwist/turbopack serwist
```

Expected: `@serwist/turbopack` and `serwist` appear under `dependencies` in `package.json`.

- [ ] **Step 2: Install dev deps**

Run:

```bash
npm install -D sharp esbuild png-to-ico
```

Expected: `sharp`, `esbuild`, `png-to-ico` appear under `devDependencies`.

- [ ] **Step 3: Add `icons:generate` and `typecheck:sw` scripts to `package.json`**

In the `"scripts"` block, add two entries (preserve existing scripts):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "prepare": "husky",
    "icons:generate": "node scripts/generate-pwa-icons.mjs",
    "typecheck:sw": "tsc -p tsconfig.sw.json"
  }
}
```

- [ ] **Step 4: Verify install**

Run: `npm ls @serwist/turbopack serwist sharp esbuild png-to-ico`
Expected: all five packages listed without errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(pwa): add serwist + icon generation deps and scripts"
```

---

## Task 3: Shared splash device list

**Files:**

- Create: `libs/pwa/splash-devices.mjs`

- [ ] **Step 1: Create `libs/pwa/splash-devices.mjs`**

```js
/**
 * Apple device specs for iOS PWA launch splash screens.
 * Source: Apple HIG device specs as of 2026-04. Portrait only.
 *
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
  { width: 430, height: 932, dpr: 3, label: "iphone-16-plus" },
  { width: 393, height: 852, dpr: 3, label: "iphone-16" },
  { width: 428, height: 926, dpr: 3, label: "iphone-14-plus" },
  { width: 390, height: 844, dpr: 3, label: "iphone-14" },
  { width: 375, height: 812, dpr: 3, label: "iphone-13-mini" },
  { width: 414, height: 896, dpr: 3, label: "iphone-11-pro-max" },
  { width: 414, height: 896, dpr: 2, label: "iphone-11" },
  { width: 1032, height: 1376, dpr: 2, label: "ipad-pro-13" },
  { width: 1024, height: 1366, dpr: 2, label: "ipad-pro-12-9" },
  { width: 834, height: 1194, dpr: 2, label: "ipad-pro-11" },
  { width: 820, height: 1180, dpr: 2, label: "ipad-air" },
  { width: 768, height: 1024, dpr: 2, label: "ipad-mini" },
];
```

- [ ] **Step 2: Verify shape**

Run: `node -e "import('./libs/pwa/splash-devices.mjs').then(m => console.log(m.SPLASH_DEVICES.length))"`
Expected output: `14`

- [ ] **Step 3: Commit**

```bash
git add libs/pwa/splash-devices.mjs
git commit -m "feat(pwa): add shared splash device spec list"
```

---

## Task 4: Icon + splash + favicon generation script

**Files:**

- Create: `scripts/generate-pwa-icons.mjs`

- [ ] **Step 1: Create `scripts/generate-pwa-icons.mjs`**

```js
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pngToIco from "png-to-ico";
import { SPLASH_DEVICES } from "../libs/pwa/splash-devices.mjs";

const SVG = readFileSync("public/favicon.svg");
const OUT = "public/icons";
mkdirSync(OUT, { recursive: true });

// Standard square icons (logo fills the canvas).
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

// Maskable: logo fills inner 80%, 10% transparent padding on each side.
const MASKABLE_SIZE = 512;
const INNER = Math.round(MASKABLE_SIZE * 0.8);
const PAD = Math.round((MASKABLE_SIZE - INNER) / 2);
await sharp({
  create: {
    width: MASKABLE_SIZE,
    height: MASKABLE_SIZE,
    channels: 4,
    background: { r: 6, g: 214, b: 160, alpha: 1 },
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

// iOS launch splash screens — shared device list.
// CSS pt × DPR = physical PNG resolution; portrait only.
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

- [ ] **Step 2: Run the script**

Run: `npm run icons:generate`
Expected console output: `PWA icons + splash screens + favicon generated.`

- [ ] **Step 3: Verify outputs exist**

Run: `ls public/icons/ public/icons/splash/ app/favicon.ico`
Expected:

- `public/icons/` contains `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`, `maskable-512x512.png`
- `public/icons/splash/` contains 14 PNG files
- `app/favicon.ico` exists

- [ ] **Step 4: Spot-check one image**

Run: `node -e "import('sharp').then(s => s.default('public/icons/icon-512x512.png').metadata().then(m => console.log(m.width + 'x' + m.height + ' ' + m.format)))"`
Expected output: `512x512 png`

- [ ] **Step 5: Commit script + generated assets**

```bash
git add scripts/generate-pwa-icons.mjs public/icons/ app/favicon.ico
git commit -m "feat(pwa): add icon/splash/favicon generation and assets"
```

---

## Task 5: Per-locale Web App Manifest route handler

**Files:**

- Create: `app/[locale]/manifest.webmanifest/route.ts`

- [ ] **Step 1: Create `app/[locale]/manifest.webmanifest/route.ts`**

```ts
import { getTranslations } from "next-intl/server";
import { routing } from "../../../i18n/routing";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pwa" });
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

- [ ] **Step 2: Verify route resolves in dev**

Run: `npm run dev` (background or separate terminal)
Then in another shell:

```bash
curl -i http://localhost:3000/en/manifest.webmanifest
curl -i http://localhost:3000/zh-CN/manifest.webmanifest
```

Expected:

- HTTP 200 on both URLs
- `Content-Type: application/manifest+json`
- `Cache-Control: public, max-age=300, must-revalidate`
- `en` body has `"name": "ByteCraft - Free Online Developer Tools"`
- `zh-CN` body has Chinese name and `"start_url": "/zh-CN"`
- `en` body has `"start_url": "/"`

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/manifest.webmanifest/route.ts
git commit -m "feat(pwa): add per-locale web app manifest route"
```

---

## Task 6: Service Worker source + isolated TypeScript config

Combined into one task so every commit leaves the repo in a buildable state. Creating `app/sw.ts` without first excluding it from the root tsconfig would break `npx tsc --noEmit`; creating the SW tsconfig before `app/sw.ts` exists would make `npm run typecheck:sw` find no input files.

**Files:**

- Modify: `tsconfig.json`
- Create: `tsconfig.sw.json`
- Create: `app/sw.ts`

- [ ] **Step 1: Modify `tsconfig.json` `exclude` array**

Change line 30 from:

```json
  "exclude": ["node_modules"]
```

to:

```json
  "exclude": ["node_modules", "app/sw.ts"]
```

- [ ] **Step 2: Create `tsconfig.sw.json`**

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

- [ ] **Step 3: Create `app/sw.ts`**

```ts
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Worker types come from tsconfig.sw.json, not the root tsconfig —
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

- [ ] **Step 4: Run worker type-check**

Run: `npm run typecheck:sw`
Expected: exits 0 with no output (or only info lines). Worker types are recognized; no DOM/`Cache` collision errors.

- [ ] **Step 5: Run root type-check (sanity)**

Run: `npx tsc --noEmit`
Expected: exits 0. `app/sw.ts` is excluded, so worker types do not leak into regular components.

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json tsconfig.sw.json app/sw.ts
git commit -m "feat(pwa): add service worker source with isolated tsconfig"
```

---

## Task 7: Service Worker route handler

**Files:**

- Create: `app/serwist/[path]/route.ts`

- [ ] **Step 1: Create `app/serwist/[path]/route.ts`**

```ts
import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// SW revision: git HEAD captured at build time. The route is statically generated,
// so this IIFE runs once during `next build`. Vercel build env has git access; the
// fallback only fires for local dev or detached HEAD states.
const revision =
  process.env.NODE_ENV === "development"
    ? crypto.randomUUID()
    : (spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
      crypto.randomUUID());

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    // Disabled in dev to avoid HMR / stale-cache pain.
    disable: process.env.NODE_ENV === "development",
    additionalPrecacheEntries: [{ url: "/", revision }],
    // Goal: every prerendered page works offline. mermaid (/markdown) and
    // prismjs (/diff) chunk inclusion verified post-build (Task 13).
  }
);
```

- [ ] **Step 2: Verify route exists in dev (will return 404 by design)**

Run: `npm run dev` then in another shell:

```bash
curl -o /dev/null -s -w "%{http_code}\n" http://localhost:3000/serwist/sw.js
```

Expected: `404` (route handler is intentionally disabled in dev). Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add app/serwist/[path]/route.ts
git commit -m "feat(pwa): add service worker compile/serve route"
```

---

## Task 8: Re-export SerwistProvider

**Files:**

- Create: `app/serwist.ts`

- [ ] **Step 1: Create `app/serwist.ts`**

```ts
"use client";
export { SerwistProvider } from "@serwist/turbopack/react";
```

- [ ] **Step 2: Verify import resolves**

Run: `npx tsc --noEmit`
Expected: exits 0. The re-export type-checks against the installed `@serwist/turbopack/react` types.

- [ ] **Step 3: Commit**

```bash
git add app/serwist.ts
git commit -m "feat(pwa): re-export SerwistProvider as project-local module"
```

---

## Task 9: Wrap `next.config.js` with Serwist + add cache headers

**Files:**

- Modify: `next.config.js`

- [ ] **Step 1: Replace `next.config.js` content**

Current contents (10 lines) are replaced with:

```js
import createNextIntlPlugin from "next-intl/plugin";
import { withSerwist } from "@serwist/turbopack";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withSerwistWrapper = withSerwist({
  // No options at this layer; SW config lives in app/serwist/[path]/route.ts.
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

Note the wrapping order: `withSerwistWrapper(withNextIntl(nextConfig))` — Serwist wraps last so its Turbopack rules apply on top of next-intl's transformations.

- [ ] **Step 2: Verify dev server boots**

Run: `npm run dev`
Expected: starts without config errors. `Ready in N ms` log line appears. Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add next.config.js
git commit -m "feat(pwa): wrap next config with serwist and add SW cache headers"
```

---

## Task 10: IOSSplashLinks server component

**Files:**

- Create: `components/ios-splash-links.tsx`

- [ ] **Step 1: Create `components/ios-splash-links.tsx`**

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

- [ ] **Step 2: Type-check the component**

Run: `npx tsc --noEmit`
Expected: exits 0. Component imports the `.mjs` device list cleanly (the existing `tsconfig.json` has `allowJs: true`).

- [ ] **Step 3: Commit**

```bash
git add components/ios-splash-links.tsx
git commit -m "feat(pwa): add iOS launch splash link component"
```

---

## Task 11: Update `app/[locale]/layout.tsx` for PWA

**Files:**

- Modify: `app/[locale]/layout.tsx`

This is the largest single edit: add a `viewport` export, swap the favicon-as-apple-touch-icon for real PWA meta tags, mount `<IOSSplashLinks />`, link the per-locale manifest, and wrap children in `SerwistProvider`.

- [ ] **Step 1: Replace `app/[locale]/layout.tsx` with the PWA-enabled version**

```tsx
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing } from "../../i18n/routing";
import { Providers } from "../providers";
import { COOKIE_KEYS } from "../../libs/storage-keys";
import type { Theme } from "../../libs/theme";
import { SITE_URL } from "../../libs/site";
import { SerwistProvider } from "../serwist";
import { IOSSplashLinks } from "../../components/ios-splash-links";
import "../globals.css";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;

  return {
    alternates: {
      languages: {
        en: SITE_URL + "/",
        "zh-CN": SITE_URL + "/zh-CN",
        "zh-TW": SITE_URL + "/zh-TW",
      },
    },
  };
}

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

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const [messages, cookieStore] = await Promise.all([getMessages(), cookies()]);
  const themeCookie = cookieStore.get(COOKIE_KEYS.theme)?.value;
  const initialTheme: Theme = themeCookie === "dark" ? "dark" : "light";

  return (
    <html lang={locale} className={initialTheme === "dark" ? "dark" : ""} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href={`/${locale}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* black-translucent: status bar transparently shows the PWA background, so
            dark mode no longer flashes a white bar at the top. Requires
            viewport-fit=cover (above) plus body safe-area padding (Task 12). */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ByteCraft" />
        <IOSSplashLinks />
        <meta property="og:image" content="/og-image.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers initialTheme={initialTheme}>
            <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
          </Providers>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

Notable changes vs. the previous file:

- Removed: `<link rel="apple-touch-icon" href="/favicon.svg" />` (SVG not supported as Apple touch icon)
- Added: `Viewport` import + `export const viewport`
- Added: `<link rel="manifest" href={...} />`
- Added: real `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />`
- Added: four PWA meta tags (`apple-mobile-web-app-*`, `mobile-web-app-capable`)
- Added: `<IOSSplashLinks />` server component
- Added: `<SerwistProvider swUrl="/serwist/sw.js">` wrapping `{children}` inside `<Providers>`

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Verify dev server renders manifest link**

Run: `npm run dev` then in another shell:

```bash
curl -s http://localhost:3000/ | grep -E 'manifest|apple-touch|apple-mobile'
```

Expected: lines for `<link rel="manifest" href="/en/manifest.webmanifest">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`, and the four `apple-mobile-web-app-*` meta tags.

```bash
curl -s http://localhost:3000/zh-CN | grep manifest
```

Expected: `<link rel="manifest" href="/zh-CN/manifest.webmanifest">`.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/layout.tsx
git commit -m "feat(pwa): wire manifest, splash, meta tags and SerwistProvider in layout"
```

---

## Task 12: Safe-area padding in `app/globals.css`

**Files:**

- Modify: `app/globals.css`

- [ ] **Step 1: Augment the existing `body` rule**

Currently lines 79–81 in `app/globals.css` are:

```css
body {
  min-height: 100vh;
}
```

Change to:

```css
body {
  min-height: 100vh;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

(Inside the existing `@layer base { ... }` block — keep surrounding `html`/scrollbar rules untouched.)

- [ ] **Step 2: Verify no visual regression on desktop**

Run: `npm run dev`
Open `http://localhost:3000/` in Chrome. The header should sit flush at the top (desktop has `env(safe-area-inset-top) = 0`). Navigate to `/base64`, `/uuid`, `/password` — layouts unchanged.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(pwa): add safe-area padding for iOS PWA notch/home-indicator"
```

---

## Task 13: Verification (manual checklist)

This task does not touch code. It runs the spec's verification checklist against the dev + production builds and resolves any post-build precache gaps. Implementer should not mark the overall plan complete until every box passes (or the deviation is documented in code comments / Open TODOs).

**Files:**

- Possibly modify: `app/serwist/[path]/route.ts` (only if Step 4 finds chunk-precache gaps)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds. The Serwist plugin emits a precache manifest log (look for "Precaching N entries").

- [ ] **Step 2: Worker type-check in CI parity**

Run: `npm run typecheck:sw`
Expected: exits 0.

- [ ] **Step 3: Start production server and load DevTools**

Run: `npm run start` (background). Open `http://localhost:3000/` in Chrome.

DevTools > **Application > Manifest**:

- Expected: manifest loaded from `/en/manifest.webmanifest`, "Installable: yes" shown, all three icons render including the maskable preview.

DevTools > **Application > Service Workers**:

- Expected: SW from `/serwist/sw.js` registered, status "activated and is running".

DevTools > **Lighthouse > Generate report (Categories: Performance + best practices, "Mobile")**:

- Expected: the `installable-manifest` audit passes. (Lighthouse 12+ removed the standalone PWA category; this is the relevant individual audit.)

- [ ] **Step 4: Offline test for dynamic-import chunks**

DevTools > Network > tick **Offline**, then:

1. Navigate to `/markdown` — verify mermaid diagrams render.
2. Navigate to `/diff` — verify prism syntax highlighting renders.

If either page fails offline:

1. Untick Offline, reload page, capture the failed chunk URL from the Network tab (look under `.next/static/chunks/`).
2. Add the URL(s) to `additionalPrecacheEntries` in `app/serwist/[path]/route.ts`. Each entry needs `{ url, revision }` — reuse the same `revision` constant.
3. Rebuild (`npm run build`), restart, repeat the offline test until both pages render.
4. Commit:

```bash
git add app/serwist/[path]/route.ts
git commit -m "fix(pwa): precache mermaid/prismjs dynamic chunks"
```

- [ ] **Step 5: Offline test for prerendered pages**

Still under DevTools Offline, navigate between `/base64`, `/uuid`, `/password`, `/`. Each must load from cache without errors.

- [ ] **Step 6: Install test (desktop)**

Untick Offline. The Chrome address bar shows the install icon. Install the app. Launched standalone window must open at `/` (default-locale `start_url`).

- [ ] **Step 7: Locale install test**

Open `http://localhost:3000/zh-CN/base64`. DevTools > Application > Manifest must show the Chinese strings (`name`, `short_name`). Install. Launched window must open at `/zh-CN`.

- [ ] **Step 8: Locale switch test (post-install)**

Inside the running zh-CN PWA, navigate to `/en/uuid`. DevTools > Application > Manifest URL updates to `/en/manifest.webmanifest`. The installed PWA's `start_url` (captured at install) does not change — this is the documented behavior in spec section 5.1.

- [ ] **Step 9: Theme color test**

Toggle macOS / Chrome dark mode. Browser UA chrome (window title bar / tab bar in standalone PWA) updates from `#f8fafc` light to `#0b0f1a` dark.

- [ ] **Step 10: Header positioning sanity (proxy for iOS notch)**

In Chrome DevTools > Device Mode, switch to "iPhone 14 Pro". The sticky `Header` must remain visible at the top below the simulated notch (the body's `padding-top: env(safe-area-inset-top)` pushes the sticky-top header down). On a real device, repeat after install — see Steps 11–12 below.

- [ ] **Step 11: Real iOS install test (if device available)**

On a physical iPhone in `SPLASH_DEVICES` (or Safari Responsive Design Mode emulating one):

1. Add to Home Screen.
2. Launch from home screen — splash image renders for ≥1 frame instead of a white flash.
3. Status bar (in dark mode) shows PWA background, not a white strip.
4. Sticky Header is fully visible below the notch.

Devices outside `SPLASH_DEVICES` will white-flash — accepted (out-of-scope).

- [ ] **Step 12: Real Android install test (if device available)**

Add to Home Screen via Chrome on Android. The launcher icon must render the maskable variant without clipping the logo edges.

- [ ] **Step 13: Vercel deploy verification**

After merging, on the Vercel preview/production deploy, repeat header checks via `curl`:

```bash
curl -I https://<vercel-url>/serwist/sw.js
# Expect: Cache-Control: public, max-age=0, must-revalidate
# Expect: Service-Worker-Allowed: /

curl -I https://<vercel-url>/en/manifest.webmanifest
# Expect: Content-Type: application/manifest+json
# Expect: Cache-Control: public, max-age=300, must-revalidate

curl -o /dev/null -s -w "%{http_code}\n" https://<vercel-url>/icons/splash/iphone-16-pro-1206x2622.png
# Expect: 200
```

- [ ] **Step 14: Stop production server**

Stop the `npm run start` process from Step 3.

---

## Open TODOs (deferred, tracked in code comments)

These items are explicitly out of scope for this plan but should be left as in-code `// TODO(pwa):` comments where they would otherwise be implemented:

- SW update notification UI (toast: "new version, refresh") — add after observing real update friction.
- Multi-size `.ico` (16×16 + 32×32 + 48×48) — current single-size 32×32 is sufficient for modern browsers.
- Dark-mode iOS splash variants — would double image count to 28; revisit if user feedback shows light-only feels jarring on dark systems.
- iPad landscape splash variants — revisit if iPad install feedback shows the rotation white-flash is jarring.
- `Footer` fixed-mode home-indicator overlap — `components/footer.tsx` needs `padding-bottom: env(safe-area-inset-bottom)` on its fixed branch. Body padding does not reach fixed elements; deferred until reported as visually distracting.
