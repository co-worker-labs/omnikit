import { describe, it, expect } from "vitest";
import { FIELD_SPECS, getFieldSpec } from "../field-spec";

describe("FIELD_SPECS", () => {
  it("standard mode has 5 fields in canonical order", () => {
    expect(FIELD_SPECS.standard.map((s) => s.kind)).toEqual([
      "minute",
      "hour",
      "dayOfMonth",
      "month",
      "dayOfWeek",
    ]);
  });

  it("spring mode has 6 fields with second prepended", () => {
    expect(FIELD_SPECS.spring.map((s) => s.kind)).toEqual([
      "second",
      "minute",
      "hour",
      "dayOfMonth",
      "month",
      "dayOfWeek",
    ]);
  });

  it("quartz mode has 7 fields with year appended", () => {
    expect(FIELD_SPECS.quartz.map((s) => s.kind)).toEqual([
      "second",
      "minute",
      "hour",
      "dayOfMonth",
      "month",
      "dayOfWeek",
      "year",
    ]);
  });

  it("standard DOW base is 0..6 (Sun=0)", () => {
    const dow = getFieldSpec("standard", "dayOfWeek")!;
    expect(dow.min).toBe(0);
    expect(dow.max).toBe(6);
    expect(dow.aliases?.SUN).toBe(0);
  });

  it("spring DOW base is 0..7 (accepts both 0 and 7 for Sunday)", () => {
    const dow = getFieldSpec("spring", "dayOfWeek")!;
    expect(dow.min).toBe(0);
    expect(dow.max).toBe(7);
  });

  it("quartz DOW base is 1..7 (Sun=1)", () => {
    const dow = getFieldSpec("quartz", "dayOfWeek")!;
    expect(dow.min).toBe(1);
    expect(dow.max).toBe(7);
    expect(dow.aliases?.SUN).toBe(1);
    expect(dow.aliases?.SAT).toBe(7);
  });

  it("month aliases are JAN..DEC mapped to 1..12 in every mode", () => {
    for (const mode of ["standard", "spring", "quartz"] as const) {
      const month = getFieldSpec(mode, "month")!;
      expect(month.aliases?.JAN).toBe(1);
      expect(month.aliases?.DEC).toBe(12);
    }
  });

  it("only quartz dom/dow allow noSpecific (?)", () => {
    expect(getFieldSpec("quartz", "dayOfMonth")!.allowedTypes).toContain("noSpecific");
    expect(getFieldSpec("quartz", "dayOfWeek")!.allowedTypes).toContain("noSpecific");
    expect(getFieldSpec("standard", "dayOfMonth")!.allowedTypes).not.toContain("noSpecific");
    expect(getFieldSpec("spring", "dayOfWeek")!.allowedTypes).not.toContain("noSpecific");
  });

  it("only quartz dom allows W and L-N; only quartz dow allows # and nL", () => {
    const qDom = getFieldSpec("quartz", "dayOfMonth")!;
    const qDow = getFieldSpec("quartz", "dayOfWeek")!;
    expect(qDom.allowedTypes).toEqual(
      expect.arrayContaining(["weekday", "lastDay", "lastDayOffset"])
    );
    expect(qDow.allowedTypes).toEqual(expect.arrayContaining(["nthDayOfWeek", "lastDay"]));
    expect(getFieldSpec("standard", "dayOfMonth")!.allowedTypes).not.toContain("weekday");
  });
});
