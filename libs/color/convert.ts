import { Colord, colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import cmykPlugin from "colord/plugins/cmyk";
import labPlugin from "colord/plugins/lab";
import lchPlugin from "colord/plugins/lch";
import harmoniesPlugin from "colord/plugins/harmonies";
import a11yPlugin from "colord/plugins/a11y";
import mixPlugin from "colord/plugins/mix";
import { parseOklch, rgbToOklch, oklchToRgb, formatOklch } from "./oklch";

extend([namesPlugin, cmykPlugin, labPlugin, lchPlugin, harmoniesPlugin, a11yPlugin, mixPlugin]);

export type ColorObject = Colord;

export function parse(input: string): ColorObject | null {
  if (!input) return null;
  const trimmed = input.trim();

  const oklch = parseOklch(trimmed);
  if (oklch) {
    const { r, g, b } = oklchToRgb(oklch);
    return colord({ r, g, b });
  }

  const candidate = /^[0-9a-f]{3,8}$/i.test(trimmed) ? `#${trimmed}` : trimmed;
  const c = colord(candidate);
  return c.isValid() ? c : null;
}

export function formatHex(c: ColorObject): string {
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
