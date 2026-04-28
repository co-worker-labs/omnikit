import { describe, it, expect } from "vitest";
import { generateCron } from "../generator";
import { parseCron } from "../parser";
import type { CronFieldValue } from "../types";

describe("generateCron", () => {
  it("emits '* * * * *' for all-any standard", () => {
    expect(
      generateCron(
        {
          minute: { type: "any" },
          hour: { type: "any" },
          dayOfMonth: { type: "any" },
          month: { type: "any" },
          dayOfWeek: { type: "any" },
        },
        "standard"
      )
    ).toBe("* * * * *");
  });

  it("emits a Quartz expression with all 7 fields", () => {
    expect(
      generateCron(
        {
          second: { type: "specific", values: [0] },
          minute: { type: "specific", values: [0] },
          hour: { type: "specific", values: [9] },
          dayOfMonth: { type: "noSpecific" },
          month: { type: "any" },
          dayOfWeek: { type: "range", range: { from: 2, to: 6 } },
          year: { type: "any" },
        },
        "quartz"
      )
    ).toBe("0 0 9 ? * 2-6 *");
  });

  it("round-trips every valid parser input", () => {
    const samples: { expr: string; mode: "standard" | "spring" | "quartz" }[] = [
      { expr: "* * * * *", mode: "standard" },
      { expr: "0 9 * * 1-5", mode: "standard" },
      { expr: "*/15 * * * *", mode: "standard" },
      { expr: "0 0 1,15 * *", mode: "standard" },
      { expr: "0 0 * * * *", mode: "spring" },
      { expr: "0 0 9 ? * 2-6 *", mode: "quartz" },
      { expr: "0 0 0 L * ? *", mode: "quartz" },
      { expr: "0 0 0 ? * 6#3 *", mode: "quartz" },
      { expr: "0 0 0 LW * ? *", mode: "quartz" },
      { expr: "0 0 0 L-3 * ? *", mode: "quartz" },
    ];

    for (const { expr, mode } of samples) {
      const parsed = parseCron(expr, mode);
      expect(parsed.valid, `parsing ${expr}`).toBe(true);
      const regen = generateCron(parsed.fields as Record<string, CronFieldValue>, mode);
      expect(regen, `regen of ${expr}`).toBe(expr);
    }
  });
});
