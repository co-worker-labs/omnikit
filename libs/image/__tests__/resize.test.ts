import { describe, it, expect } from "vitest";
import { calculateDimensions } from "../resize";

describe("calculateDimensions", () => {
  const origW = 1920;
  const origH = 1080;

  it("returns original dimensions when mode is none", () => {
    expect(calculateDimensions(origW, origH, "none", 100)).toEqual({ width: 1920, height: 1080 });
  });

  it("scales by percentage", () => {
    expect(calculateDimensions(origW, origH, "percent", 50)).toEqual({ width: 960, height: 540 });
  });

  it("scales by 200% percentage", () => {
    expect(calculateDimensions(origW, origH, "percent", 200)).toEqual({
      width: 3840,
      height: 2160,
    });
  });

  it("keeps aspect ratio when only width is provided", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, 960, undefined, true)).toEqual({
      width: 960,
      height: 540,
    });
  });

  it("keeps aspect ratio when only height is provided", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, undefined, 540, true)).toEqual({
      width: 960,
      height: 540,
    });
  });

  it("uses both dimensions when aspect ratio is unlocked", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, 800, 600, false)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("uses both dimensions when keepAspectRatio is undefined", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, 800, 600)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("clamps minimum dimension to 1px", () => {
    expect(calculateDimensions(origW, origH, "percent", 0)).toEqual({ width: 1, height: 1 });
  });

  it("rounds to integers", () => {
    // 1920 * 33 / 100 = 633.6 → 634
    const result = calculateDimensions(origW, origH, "percent", 33);
    expect(result.width).toBe(634);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(Number.isInteger(result.height)).toBe(true);
  });

  it("handles square images", () => {
    expect(calculateDimensions(1000, 1000, "percent", 50)).toEqual({ width: 500, height: 500 });
  });

  it("custom mode with only width and no aspect ratio lock uses original height", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, 960, undefined, false)).toEqual({
      width: 960,
      height: 1080,
    });
  });

  it("custom mode with only height and no aspect ratio lock uses original width", () => {
    expect(calculateDimensions(origW, origH, "custom", 100, undefined, 540, false)).toEqual({
      width: 1920,
      height: 540,
    });
  });
});
