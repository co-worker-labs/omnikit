import { describe, it, expect } from "vitest";
import { nextExecutions } from "../executor";
import { parseCron } from "../parser";

function iso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

describe("nextExecutions — standard", () => {
  it("'* * * * *' produces consecutive minutes", () => {
    const from = new Date(2026, 3, 28, 10, 0, 30);
    const r = nextExecutions(parseCron("* * * * *", "standard"), 3, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual([
      "2026-04-28 10:01:00",
      "2026-04-28 10:02:00",
      "2026-04-28 10:03:00",
    ]);
    expect(r.searchExhausted).toBe(false);
  });

  it("'0 9 * * *' yields next 09:00 daily", () => {
    const from = new Date(2026, 3, 28, 12, 0, 0);
    const r = nextExecutions(parseCron("0 9 * * *", "standard"), 2, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-04-29 09:00:00", "2026-04-30 09:00:00"]);
  });

  it("'0 9 * * 1-5' skips weekends", () => {
    const from = new Date(2026, 4, 1, 12, 0, 0);
    const r = nextExecutions(parseCron("0 9 * * 1-5", "standard"), 3, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual([
      "2026-05-04 09:00:00",
      "2026-05-05 09:00:00",
      "2026-05-06 09:00:00",
    ]);
  });

  it("'0 0 1 * *' fires on day 1 of each month", () => {
    const from = new Date(2026, 3, 28, 12, 0, 0);
    const r = nextExecutions(parseCron("0 0 1 * *", "standard"), 3, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual([
      "2026-05-01 00:00:00",
      "2026-06-01 00:00:00",
      "2026-07-01 00:00:00",
    ]);
  });
});

describe("nextExecutions — Quartz special chars", () => {
  it("'L' fires on the last day of the month", () => {
    const from = new Date(2026, 3, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 L * ? *", "quartz"), 3, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual([
      "2026-04-30 00:00:00",
      "2026-05-31 00:00:00",
      "2026-06-30 00:00:00",
    ]);
  });

  it("'L-3' fires 3 days before the last day", () => {
    const from = new Date(2026, 3, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 L-3 * ? *", "quartz"), 2, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-04-27 00:00:00", "2026-05-28 00:00:00"]);
  });

  it("'15W' fires on the nearest weekday to day 15", () => {
    const from = new Date(2026, 7, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 15W * ? *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-08-14 00:00:00"]);
  });

  it("'1W' jumps Monday when day 1 is a Sunday", () => {
    const from = new Date(2026, 9, 25, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 1W * ? *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-11-02 00:00:00"]);
  });

  it("'LW' fires on the last weekday of the month", () => {
    const from = new Date(2026, 4, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 LW * ? *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-05-29 00:00:00"]);
  });

  it("'6#3' fires on the 3rd Friday of the month", () => {
    const from = new Date(2026, 4, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 ? * 6#3 *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-05-15 00:00:00"]);
  });

  it("'6#5' skips months without a 5th Friday", () => {
    const from = new Date(2026, 3, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 ? * 6#5 *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-05-29 00:00:00"]);
  });

  it("'6L' fires on the last Friday of the month", () => {
    const from = new Date(2026, 3, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 ? * 6L *", "quartz"), 1, { from, tz: "local" });
    expect(r.executions.map(iso)).toEqual(["2026-04-24 00:00:00"]);
  });

  it("never-triggers pattern returns empty with neverTriggers notice", () => {
    const from = new Date(2026, 0, 1, 0, 0, 0);
    const r = nextExecutions(parseCron("0 0 0 30 2 ? *", "quartz"), 5, { from, tz: "local" });
    expect(r.executions).toEqual([]);
    expect(r.searchExhausted).toBe(true);
  });

  it("performance: 5 executions within 100ms", () => {
    const from = new Date(2026, 0, 1, 0, 0, 0);
    const t0 = performance.now();
    nextExecutions(parseCron("0 0 9 ? * MON-FRI *", "quartz"), 5, { from, tz: "local" });
    expect(performance.now() - t0).toBeLessThan(100);
  });
});

describe("nextExecutions — UTC mode", () => {
  it("matches against UTC fields when tz='utc'", () => {
    const from = new Date(Date.UTC(2026, 3, 28, 23, 0, 0));
    const r = nextExecutions(parseCron("0 0 * * *", "standard"), 1, { from, tz: "utc" });
    expect(r.executions[0].toISOString()).toBe("2026-04-29T00:00:00.000Z");
  });

  it("midnight UTC and midnight local can differ", () => {
    const from = new Date(Date.UTC(2026, 3, 28, 23, 0, 0));
    const utc = nextExecutions(parseCron("0 0 * * *", "standard"), 1, { from, tz: "utc" });
    const local = nextExecutions(parseCron("0 0 * * *", "standard"), 1, { from, tz: "local" });
    expect(utc.executions[0].getTime()).toBeGreaterThan(from.getTime());
    expect(local.executions[0].getTime()).toBeGreaterThan(from.getTime());
  });
});
