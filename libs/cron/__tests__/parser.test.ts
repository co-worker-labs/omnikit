import { describe, it, expect } from "vitest";
import { parseCron } from "../parser";

describe("parseCron — Standard mode", () => {
  it("accepts '* * * * *' as all-any", () => {
    const r = parseCron("* * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.fields.minute).toEqual({ type: "any" });
    expect(r.fields.hour).toEqual({ type: "any" });
    expect(r.fields.dayOfMonth).toEqual({ type: "any" });
    expect(r.fields.month).toEqual({ type: "any" });
    expect(r.fields.dayOfWeek).toEqual({ type: "any" });
    expect(r.expression).toBe("* * * * *");
    expect(r.raw).toBe("* * * * *");
  });

  it("rejects wrong field count with errors.wrongFieldCount", () => {
    const r = parseCron("* * * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.wrongFieldCount");
    expect(r.errors[0].params).toMatchObject({ expected: 5, got: 4, mode: "standard" });
  });

  it("collapses internal whitespace", () => {
    const r = parseCron("  *  *   *  *   *  ", "standard");
    expect(r.valid).toBe(true);
    expect(r.expression).toBe("* * * * *");
  });
});

describe("parseCron — specific / range / step", () => {
  it("parses a specific number", () => {
    const r = parseCron("5 * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.minute).toEqual({ type: "specific", values: [5] });
    expect(r.expression).toBe("5 * * * *");
  });

  it("rejects out-of-range specific value", () => {
    const r = parseCron("60 * * * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.outOfRange");
    expect(r.errors[0].params).toMatchObject({ field: "minute", min: 0, max: 59, value: 60 });
  });

  it("parses a range", () => {
    const r = parseCron("0 9-17 * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.hour).toEqual({ type: "range", range: { from: 9, to: 17 } });
  });

  it("rejects reversed range", () => {
    const r = parseCron("0 17-9 * * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.rangeReversed");
  });

  it("parses */k step", () => {
    const r = parseCron("*/15 * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.minute).toEqual({ type: "step", step: { start: "*", interval: 15 } });
  });

  it("parses range/k step", () => {
    const r = parseCron("0 0-23/2 * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.hour).toEqual({
      type: "step",
      step: { start: 0, from: 0, to: 23, interval: 2 },
    });
  });

  it("parses start/k step", () => {
    const r = parseCron("5/10 * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.minute).toEqual({ type: "step", step: { start: 5, interval: 10 } });
  });

  it("rejects zero or negative step interval", () => {
    const r = parseCron("*/0 * * * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.invalidStep");
  });
});

describe("parseCron — lists", () => {
  it("parses comma-separated specific values", () => {
    const r = parseCron("0,15,30,45 * * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.minute).toMatchObject({
      type: "list",
      listItems: [
        { type: "specific", values: [0] },
        { type: "specific", values: [15] },
        { type: "specific", values: [30] },
        { type: "specific", values: [45] },
      ],
    });
    expect(r.expression).toBe("0,15,30,45 * * * *");
  });

  it("parses mixed ranges and specifics in a list", () => {
    const r = parseCron("0 9-12,14,16-18 * * *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.hour?.type).toBe("list");
    expect(r.fields.hour?.listItems?.[0]).toMatchObject({
      type: "range",
      range: { from: 9, to: 12 },
    });
    expect(r.fields.hour?.listItems?.[1]).toMatchObject({ type: "specific", values: [14] });
  });

  it("rejects empty list segment", () => {
    const r = parseCron("0,,15 * * * *", "standard");
    expect(r.valid).toBe(false);
  });
});

describe("parseCron — aliases", () => {
  it("normalizes JAN..DEC in month field", () => {
    const r = parseCron("0 0 1 JAN *", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.month).toEqual({ type: "specific", values: [1] });
    expect(r.expression).toBe("0 0 1 1 *");
  });

  it("normalizes MON-FRI in dow field", () => {
    const r = parseCron("0 9 * * MON-FRI", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "range", range: { from: 1, to: 5 } });
    expect(r.expression).toBe("0 9 * * 1-5");
  });

  it("is case-insensitive", () => {
    const r = parseCron("0 9 * * mon-fri", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "range", range: { from: 1, to: 5 } });
  });

  it("supports aliases inside list", () => {
    const r = parseCron("0 0 * * SAT,SUN", "standard");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek?.type).toBe("list");
  });

  it("uses Quartz DOW base (SUN=1)", () => {
    const r = parseCron("0 0 0 ? * SUN *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "specific", values: [1] });
  });

  it("rejects unknown alias", () => {
    const r = parseCron("0 0 1 FOO *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.unknownAlias");
  });
});

describe("parseCron — macros", () => {
  it("@yearly expands in standard mode", () => {
    const r = parseCron("@yearly", "standard");
    expect(r.valid).toBe(true);
    expect(r.expression).toBe("0 0 1 1 *");
  });

  it("@annually is an alias of @yearly", () => {
    const r = parseCron("@annually", "standard");
    expect(r.valid).toBe(true);
    expect(r.expression).toBe("0 0 1 1 *");
  });

  it("@hourly expands in spring mode (prepends second=0)", () => {
    const r = parseCron("@hourly", "spring");
    expect(r.valid).toBe(true);
    expect(r.expression).toBe("0 0 * * * *");
  });

  it("@daily expands in quartz mode (7 fields)", () => {
    const r = parseCron("@daily", "quartz");
    expect(r.valid).toBe(true);
    expect(r.expression.split(" ").length).toBe(7);
  });

  it("@reboot is rejected", () => {
    const r = parseCron("@reboot", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.macroRebootUnsupported");
  });

  it("unknown macro errors", () => {
    const r = parseCron("@bogus", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.unknownMacro");
  });
});

describe("parseCron — Quartz specials", () => {
  it("parses '?' in dom", () => {
    const r = parseCron("0 0 9 ? * MON-FRI *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "noSpecific" });
  });

  it("parses 'L' (last day) in dom", () => {
    const r = parseCron("0 0 0 L * ? *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "lastDay" });
  });

  it("parses 'L-3' in dom", () => {
    const r = parseCron("0 0 0 L-3 * ? *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "lastDayOffset", lastDayOffset: 3 });
  });

  it("parses '15W' in dom", () => {
    const r = parseCron("0 0 0 15W * ? *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "weekday", weekdayDay: 15 });
  });

  it("parses 'LW' in dom", () => {
    const r = parseCron("0 0 0 LW * ? *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfMonth).toEqual({ type: "weekday", weekdayDay: "L" });
  });

  it("parses '6#3' in dow (3rd Friday)", () => {
    const r = parseCron("0 0 0 ? * 6#3 *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({
      type: "nthDayOfWeek",
      nthDayOfWeek: { weekday: 6, n: 3 },
    });
  });

  it("parses '6L' in dow (last Friday)", () => {
    const r = parseCron("0 0 0 ? * 6L *", "quartz");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "lastDay", weekdayDay: 6 });
  });

  it("rejects 'L' in standard", () => {
    const r = parseCron("0 0 L * *", "standard");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.specialNotAllowed");
  });

  it("rejects 'W' in dow", () => {
    const r = parseCron("0 0 0 * * 1W *", "quartz");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.weekdayOnNonDom");
  });

  it("rejects '#' in dom", () => {
    const r = parseCron("0 0 0 1#2 * ? *", "quartz");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.nthOnNonDow");
  });
});

describe("parseCron — Quartz DOM/DOW interaction", () => {
  it("requires exactly one '?'", () => {
    const r = parseCron("0 0 0 1 * 1 *", "quartz");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.quartzNeedsQuestionMark");
  });

  it("rejects '?' in both", () => {
    const r = parseCron("0 0 0 ? * ? *", "quartz");
    expect(r.valid).toBe(false);
    expect(r.errors[0].messageKey).toBe("errors.quartzBothQuestionMarks");
  });

  it("accepts '? * dom' shape", () => {
    const r = parseCron("0 0 0 1 * ? *", "quartz");
    expect(r.valid).toBe(true);
  });
});

describe("parseCron — Spring DOW", () => {
  it("normalizes 7 to 0 in spring DOW", () => {
    const r = parseCron("0 0 0 * * 7", "spring");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek).toEqual({ type: "specific", values: [0] });
    expect(r.expression).toBe("0 0 0 * * 0");
  });

  it("accepts 1,7 in spring (then normalizes 7→0 inside lists)", () => {
    const r = parseCron("0 0 0 * * 1,7", "spring");
    expect(r.valid).toBe(true);
    expect(r.fields.dayOfWeek?.type).toBe("list");
  });
});

describe("parseCron — never-triggers patterns parse cleanly", () => {
  it("'30 * Feb' is syntactically valid (executor catches dead-end later)", () => {
    const r = parseCron("0 0 30 2 *", "standard");
    expect(r.valid).toBe(true);
  });
});
