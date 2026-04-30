import { describe, it, expect } from "vitest";
import { closestName } from "../named";
import { parse } from "../convert";

describe("closestName", () => {
  it("returns the exact name for a known CSS color", () => {
    expect(closestName(parse("#ff0000")!)).toBe("red");
  });

  it("returns the closest known name for an off-palette color", () => {
    const name = closestName(parse("#06d6a0")!);
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
  });

  it("never returns null for a valid color (closest mode)", () => {
    expect(closestName(parse("#123456")!)).not.toBeNull();
  });
});
