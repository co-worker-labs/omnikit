import { describe, it, expect } from "vitest";
import { explainPattern } from "../explain";

describe("explainPattern", () => {
  it("explains literal characters", () => {
    const result = explainPattern("abc", "");
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      expect(result[0].explanationKey).toBe("explainLiteral");
      expect(result[0].text).toBe("abc");
    }
  });

  it("explains digit character set", () => {
    const result = explainPattern("\\d+", "");
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      expect(result[0].explanationKey).toBe("explainQuantifierPlus");
    }
  });

  it("explains character class", () => {
    const result = explainPattern("[a-z]", "");
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      expect(result[0].explanationKey).toBe("explainCharClass");
    }
  });

  it("explains capturing group", () => {
    const result = explainPattern("(hello)", "");
    if (Array.isArray(result)) {
      const groupToken = result.find((t) => t.explanationKey === "explainGroup");
      expect(groupToken).toBeDefined();
    }
  });

  it("explains alternation", () => {
    const result = explainPattern("a|b", "");
    if (Array.isArray(result)) {
      const altToken = result.find((t) => t.explanationKey === "explainAlternative");
      expect(altToken).toBeDefined();
    }
  });

  it("explains assertion (^ and $)", () => {
    const result = explainPattern("^start$", "");
    if (Array.isArray(result)) {
      const assertions = result.filter(
        (t) =>
          t.explanationKey === "explainAnchorStart" ||
          t.explanationKey === "explainAnchorEnd" ||
          t.explanationKey === "explainAssertion"
      );
      expect(assertions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("explains quantifier with range", () => {
    const result = explainPattern("a{3,5}", "");
    if (Array.isArray(result)) {
      expect(result[0].explanationKey).toBe("explainQuantifierRange");
      expect(result[0].params).toEqual({ min: 3, max: 5 });
    }
  });

  it("explains word boundary", () => {
    const result = explainPattern("\\bword\\b", "");
    if (Array.isArray(result)) {
      const boundaries = result.filter((t) => t.explanationKey === "explainBoundaryWord");
      expect(boundaries.length).toBe(2);
    }
  });

  it("returns error for invalid pattern", () => {
    const result = explainPattern("a(", "");
    expect(Array.isArray(result)).toBe(false);
    if (!Array.isArray(result)) {
      expect(result.error).toBeTruthy();
      expect(typeof result.offset).toBe("number");
    }
  });

  it("fuses adjacent literals", () => {
    const result = explainPattern("abc", "");
    if (Array.isArray(result)) {
      expect(result.length).toBeLessThan(3);
      expect(result[0].text).toBe("abc");
    }
  });

  it("fuses quantifier with its element", () => {
    const result = explainPattern("\\d+", "");
    if (Array.isArray(result)) {
      expect(result[0].text).toBe("\\d+");
      expect(result[0].explanationKey).toBe("explainQuantifierPlus");
    }
  });

  it("handles empty pattern", () => {
    const result = explainPattern("", "");
    if (Array.isArray(result)) {
      expect(result).toEqual([]);
    }
  });
});
