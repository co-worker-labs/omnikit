import { describe, it, expect } from "vitest";
import { harmony, monochromatic, HARMONY_TYPES } from "../palette";

describe("HARMONY_TYPES", () => {
  it("contains 5 harmony types in stable order", () => {
    expect(HARMONY_TYPES).toEqual([
      "complementary",
      "analogous",
      "triadic",
      "split-complementary",
      "tetradic",
    ]);
  });
});

describe("harmony", () => {
  it("complementary returns 2 hex strings", () => {
    const out = harmony("#06d6a0", "complementary");
    expect(out).toHaveLength(2);
  });

  it("analogous returns 3 colors", () => {
    expect(harmony("#06d6a0", "analogous")).toHaveLength(3);
  });

  it("triadic returns 3 colors", () => {
    expect(harmony("#06d6a0", "triadic")).toHaveLength(3);
  });

  it("split-complementary returns 3 colors", () => {
    expect(harmony("#06d6a0", "split-complementary")).toHaveLength(3);
  });

  it("tetradic returns 4 colors", () => {
    expect(harmony("#06d6a0", "tetradic")).toHaveLength(4);
  });
});

describe("monochromatic", () => {
  it("returns 5 distinct hex strings sorted from light to dark (or vice versa)", () => {
    const out = monochromatic("#06d6a0", 5);
    expect(out).toHaveLength(5);
    expect(new Set(out).size).toBe(5);
  });
});
