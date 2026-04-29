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
  const half = Math.max(1, Math.floor(count / 2));
  const tints = (c as ColorWithTintsShades)
    .tints(half + 1)
    .slice(1)
    .reverse();
  const shades = (c as ColorWithTintsShades).shades(half + 1).slice(1);
  const ordered: Colord[] = [...tints, c, ...shades].slice(0, count);
  return ordered.map((co) => formatHex(co));
}

export interface ImagePalette {
  colors: string[];
}
