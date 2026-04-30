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
    const sapc = (Math.pow(bgY, NORM_BG) - Math.pow(txtY, NORM_TXT)) * SCALE_BoW;
    outputContrast = sapc < LO_CLIP ? 0 : sapc - LO_BoW_OFFSET;
  } else {
    const sapc = (Math.pow(bgY, REV_BG) - Math.pow(txtY, REV_TXT)) * SCALE_WoB;
    outputContrast = sapc > -LO_CLIP ? 0 : sapc + LO_WoB_OFFSET;
  }

  return outputContrast * 100;
}

export interface ApcaJudgement {
  lc: number;
  body: boolean;
  headline: boolean;
  fluent: boolean;
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
