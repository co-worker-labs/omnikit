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
