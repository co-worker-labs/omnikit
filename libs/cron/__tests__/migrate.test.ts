import { describe, it, expect } from "vitest";
import { migrateExpression } from "../migrate";

describe("migrateExpression", () => {
  it("standard → spring prepends second=0", () => {
    const r = migrateExpression("0 9 * * 1-5", "standard", "spring");
    expect(r.expression).toBe("0 0 9 * * 1-5");
    expect(r.warnings).toEqual([]);
  });

  it("standard → quartz prepends 0, appends *, sets DOW '?' when DOW=*", () => {
    const r = migrateExpression("0 9 1 * *", "standard", "quartz");
    expect(r.expression).toBe("0 0 9 1 * ? *");
  });

  it("standard → quartz with both DOM/DOW non-* keeps DOW, drops DOM to '?', warns", () => {
    const r = migrateExpression("0 9 1 * 1", "standard", "quartz");
    expect(r.expression).toBe("0 0 9 ? * 2 *");
    expect(r.warnings).toContain("warn.orSemanticsLost");
  });

  it("spring → standard drops second, warns when non-zero", () => {
    const r = migrateExpression("30 0 9 * * 1-5", "spring", "standard");
    expect(r.expression).toBe("0 9 * * 1-5");
    expect(r.warnings).toContain("warn.secondDropped");
  });

  it("quartz → standard drops second & year, converts ? back to *", () => {
    const r = migrateExpression("0 0 9 ? * 2-6 *", "quartz", "standard");
    expect(r.expression).toBe("0 9 * * 1-5");
  });

  it("quartz → spring drops year only", () => {
    const r = migrateExpression("0 0 9 ? * 2-6 *", "quartz", "spring");
    expect(r.expression).toBe("0 0 9 * * 1-5");
  });

  it("quartz → standard with L drops the special and warns", () => {
    const r = migrateExpression("0 0 0 L * ? *", "quartz", "standard");
    expect(r.warnings).toContain("warn.specialDroppedFromMode");
    expect(r.expression).toBe("0 0 * * *");
  });
});
