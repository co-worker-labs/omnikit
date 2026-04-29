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
  const cs = c < 0.005 ? "0" : c.toFixed(2);
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
