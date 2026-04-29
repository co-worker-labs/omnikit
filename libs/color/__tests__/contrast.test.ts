import { describe, it, expect } from "vitest";
import { wcagRatio, wcagJudgement, suggestPassing } from "../contrast";

describe("wcagRatio", () => {
  it("black on white is 21:1", () => {
    expect(wcagRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("identical colors give 1:1", () => {
    expect(wcagRatio("#777777", "#777777")).toBeCloseTo(1, 2);
  });

  it("is symmetric", () => {
    expect(wcagRatio("#06d6a0", "#0b0f1a")).toBeCloseTo(wcagRatio("#0b0f1a", "#06d6a0"), 5);
  });
});

describe("wcagJudgement", () => {
  it("white on black passes every threshold", () => {
    const j = wcagJudgement("#ffffff", "#000000");
    expect(j.normalAA).toBe(true);
    expect(j.normalAAA).toBe(true);
    expect(j.largeAA).toBe(true);
    expect(j.largeAAA).toBe(true);
  });

  it("light gray on white fails normal AA but may still pass large AA", () => {
    const j = wcagJudgement("#bbbbbb", "#ffffff");
    expect(j.normalAA).toBe(false);
    expect(j.normalAAA).toBe(false);
  });

  it("uses 4.5 / 7 / 3 / 4.5 thresholds correctly", () => {
    const j = wcagJudgement("#595959", "#ffffff");
    expect(j.normalAA).toBe(true);
    expect(j.normalAAA).toBe(true);
  });
});

describe("suggestPassing", () => {
  it("returns null when fg/bg already pass 4.5:1", () => {
    expect(suggestPassing("#000000", "#ffffff")).toBeNull();
  });

  it("returns a suggestion that meets 4.5:1 when input fails", () => {
    const s = suggestPassing("#06d6a0", "#ffffff");
    expect(s).not.toBeNull();
    expect(s!.target).toMatch(/^(foreground|background)$/);
    const r =
      s!.target === "foreground" ? wcagRatio(s!.color, "#ffffff") : wcagRatio("#06d6a0", s!.color);
    expect(r).toBeGreaterThanOrEqual(4.5);
  });
});
