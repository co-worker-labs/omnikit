import { parse, formatHex } from "./convert";
import { colord } from "colord";
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

export interface ContrastSuggestion {
  target: "foreground" | "background";
  color: string;
  delta: number;
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
  let best: ContrastSuggestion | null = null;
  for (let delta = 1; delta <= 100; delta += 1) {
    for (const sign of [-1, 1] as const) {
      const candidate = adjustLightness(baseHex, sign * delta);
      if (!candidate) continue;
      const r = side === "foreground" ? wcagRatio(candidate, bg) : wcagRatio(fg, candidate);
      if (r >= TARGET_RATIO) {
        const cur = { target: side, color: candidate, delta };
        if (!best || cur.delta < best.delta) best = cur;
        break;
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
