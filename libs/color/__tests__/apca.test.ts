import { describe, it, expect } from "vitest";
import { apcaLc, apcaJudgement } from "../apca";

describe("apcaLc", () => {
  it("returns 0 (or near-0) for identical colors", () => {
    expect(Math.abs(apcaLc("#777777", "#777777"))).toBeLessThan(1);
  });

  it("returns negative Lc for light text on dark bg", () => {
    expect(apcaLc("#ffffff", "#000000")).toBeLessThan(-100);
  });

  it("returns positive Lc for dark text on light bg", () => {
    expect(apcaLc("#000000", "#ffffff")).toBeGreaterThan(100);
  });
});

describe("apcaJudgement", () => {
  it("white-on-black passes body, headline, and fluent thresholds", () => {
    const j = apcaJudgement("#ffffff", "#000000");
    expect(j.body).toBe(true);
    expect(j.headline).toBe(true);
    expect(j.fluent).toBe(true);
  });
});
