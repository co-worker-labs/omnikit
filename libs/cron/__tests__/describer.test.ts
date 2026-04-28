import { describe, it, expect } from "vitest";
import { describeCron } from "../describer";
import { parseCron } from "../parser";

const stubT = (key: string, params?: Record<string, unknown>): string =>
  params ? `${key}(${JSON.stringify(params)})` : key;

describe("describeCron", () => {
  it("describes '* * * * *' as everyMinute", () => {
    const p = parseCron("* * * * *", "standard");
    expect(describeCron(p, stubT as never, "en")).toContain("describe.everyMinute");
  });

  it("describes '0 9 * * 1-5' with atTime + range of weekdays", () => {
    const p = parseCron("0 9 * * 1-5", "standard");
    const out = describeCron(p, stubT as never, "en");
    expect(out).toContain("describe.atTime");
    expect(out).toContain('"time":"09:00"');
    expect(out).toContain("describe.throughDays");
  });

  it("describes 'L' as lastDayOfMonth", () => {
    const p = parseCron("0 0 0 L * ? *", "quartz");
    const out = describeCron(p, stubT as never, "en");
    expect(out).toContain("describe.lastDayOfMonth");
  });

  it("describes '6#3' as nth weekday", () => {
    const p = parseCron("0 0 0 ? * 6#3 *", "quartz");
    const out = describeCron(p, stubT as never, "en");
    expect(out).toContain("describe.nthWeekday");
    expect(out).toContain('"ordinal":"ordinal.3"');
  });

  it("describes '*/15 * * * *' as everyN", () => {
    const p = parseCron("*/15 * * * *", "standard");
    const out = describeCron(p, stubT as never, "en");
    expect(out).toContain("describe.everyN");
    expect(out).toContain('"n":15');
  });

  it("returns empty string for invalid parsed", () => {
    const p = parseCron("bogus", "standard");
    expect(describeCron(p, stubT as never, "en")).toBe("");
  });
});
