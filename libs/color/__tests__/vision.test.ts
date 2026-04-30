import { describe, it, expect } from "vitest";
import { VISION_MODES, visionFilterId, visionFilterStyle, VISION_MATRICES } from "../vision";

describe("VISION_MODES", () => {
  it("contains expected modes in order", () => {
    expect(VISION_MODES).toEqual([
      "none",
      "protanopia",
      "deuteranopia",
      "tritanopia",
      "achromatopsia",
    ]);
  });
});

describe("visionFilterId", () => {
  it("returns null for none", () => {
    expect(visionFilterId("none")).toBeNull();
  });

  it("returns a stable id for each mode", () => {
    expect(visionFilterId("protanopia")).toBe("vision-protanopia");
    expect(visionFilterId("deuteranopia")).toBe("vision-deuteranopia");
    expect(visionFilterId("tritanopia")).toBe("vision-tritanopia");
    expect(visionFilterId("achromatopsia")).toBe("vision-achromatopsia");
  });
});

describe("visionFilterStyle", () => {
  it("returns empty object for none", () => {
    expect(visionFilterStyle("none")).toEqual({});
  });

  it("returns a CSS filter url for non-none", () => {
    expect(visionFilterStyle("protanopia")).toEqual({ filter: "url(#vision-protanopia)" });
  });
});

describe("VISION_MATRICES", () => {
  it("provides a 20-value matrix for each non-none mode", () => {
    for (const mode of ["protanopia", "deuteranopia", "tritanopia", "achromatopsia"] as const) {
      const m = VISION_MATRICES[mode];
      expect(m).toHaveLength(20);
      for (const v of m) expect(typeof v).toBe("number");
    }
  });
});
