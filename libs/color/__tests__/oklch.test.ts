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
