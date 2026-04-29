import { describe, it, expect } from "vitest";
import {
  parse,
  formatAll,
  formatHex,
  formatRgb,
  formatHsl,
  formatHsv,
  formatCmyk,
  formatLab,
} from "../convert";

describe("parse", () => {
  it("accepts HEX with and without leading #", () => {
    expect(parse("#06d6a0")).not.toBeNull();
    expect(parse("06d6a0")).not.toBeNull();
  });

  it("accepts 8-digit HEX with alpha", () => {
    const c = parse("#06d6a0cc");
    expect(c).not.toBeNull();
    expect(c!.alpha()).toBeCloseTo(204 / 255, 2);
  });

  it("accepts rgb()/rgba() with both comma and space syntax", () => {
    expect(parse("rgb(6, 214, 160)")).not.toBeNull();
    expect(parse("rgb(6 214 160)")).not.toBeNull();
    expect(parse("rgba(6, 214, 160, 0.8)")).not.toBeNull();
  });

  it("accepts hsl() and oklch() inputs", () => {
    expect(parse("hsl(163, 94%, 43%)")).not.toBeNull();
    expect(parse("oklch(78% 0.16 165)")).not.toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parse("not-a-color")).toBeNull();
    expect(parse("")).toBeNull();
  });
});

describe("formatters", () => {
  it("HEX returns 6-digit when alpha is 1, 8-digit otherwise", () => {
    expect(formatHex(parse("#06d6a0")!)).toBe("#06d6a0");
    expect(formatHex(parse("rgba(6,214,160,0.5)")!)).toMatch(/^#06d6a0(7f|80)$/i);
  });

  it("RGB uses comma form", () => {
    expect(formatRgb(parse("#06d6a0")!)).toBe("rgb(6, 214, 160)");
  });

  it("HSL uses degree+%/% form", () => {
    expect(formatHsl(parse("#06d6a0")!)).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it("HSV uses degree + 2 percents", () => {
    expect(formatHsv(parse("#06d6a0")!)).toMatch(/^\d+° \d+% \d+%$/);
  });

  it("CMYK uses 4 percent values inside cmyk()", () => {
    expect(formatCmyk(parse("#06d6a0")!)).toMatch(/^cmyk\(\d+% \d+% \d+% \d+%\)$/);
  });

  it("LAB uses lab() with space-separated values", () => {
    expect(formatLab(parse("#06d6a0")!)).toMatch(/^lab\([\d.\-]+ [\d.\-]+ [\d.\-]+\)$/);
  });
});

describe("formatAll", () => {
  it("returns every supported format for one color", () => {
    const all = formatAll(parse("#06d6a0")!);
    expect(all).toEqual(
      expect.objectContaining({
        hex: expect.any(String),
        rgb: expect.any(String),
        hsl: expect.any(String),
        hsv: expect.any(String),
        cmyk: expect.any(String),
        lab: expect.any(String),
        oklch: expect.any(String),
      })
    );
  });
});
