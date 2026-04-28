import { describe, it, expect } from "vitest";
import {
  parseTimestamp,
  formatUtc,
  formatSql,
  formatRfc2822,
  isoWeekNumber,
  formatTimezoneOffset,
  formatRelative,
  buildDate,
  presetParts,
} from "../main";

describe("parseTimestamp", () => {
  describe("auto mode", () => {
    it("treats 1-11 digit input as seconds", () => {
      expect(parseTimestamp("1714521600", "auto")).toEqual({ ms: 1714521600000 });
      expect(parseTimestamp("0", "auto")).toEqual({ ms: 0 });
      expect(parseTimestamp("99999999999", "auto")).toEqual({ ms: 99999999999000 });
    });

    it("treats 12-15 digit input as milliseconds", () => {
      expect(parseTimestamp("100000000000", "auto")).toEqual({ ms: 100000000000 });
      expect(parseTimestamp("1714521600000", "auto")).toEqual({ ms: 1714521600000 });
      expect(parseTimestamp("253402300799999", "auto")).toEqual({ ms: 253402300799999 });
    });

    it("rejects 16+ digit input", () => {
      const r = parseTimestamp("1234567890123456", "auto");
      expect(r.error).toBe("tooLong");
    });
  });

  describe("seconds mode", () => {
    it("multiplies by 1000", () => {
      expect(parseTimestamp("1714521600", "seconds")).toEqual({ ms: 1714521600000 });
    });

    it("rejects values too large for seconds (> 12 digits)", () => {
      const r = parseTimestamp("1000000000000", "seconds");
      expect(r.error).toBe("secondsTooLarge");
    });
  });

  describe("milliseconds mode", () => {
    it("returns ms directly", () => {
      expect(parseTimestamp("1714521600000", "milliseconds")).toEqual({ ms: 1714521600000 });
    });

    it("rejects 16+ digits", () => {
      const r = parseTimestamp("1234567890123456", "milliseconds");
      expect(r.error).toBe("tooLong");
    });
  });

  describe("validation", () => {
    it("rejects empty input as no-op (no error, no ms)", () => {
      expect(parseTimestamp("", "auto")).toEqual({});
      expect(parseTimestamp("   ", "auto")).toEqual({});
    });

    it("rejects negative input", () => {
      expect(parseTimestamp("-1", "auto").error).toBe("negative");
    });

    it("rejects non-numeric input", () => {
      expect(parseTimestamp("abc", "auto").error).toBe("notNumeric");
      expect(parseTimestamp("12.5", "auto").error).toBe("notNumeric");
    });

    it("rejects values exceeding year 9999 in milliseconds", () => {
      expect(parseTimestamp("253402300800000", "milliseconds").error).toBe("outOfRange");
    });
  });
});

describe("formatUtc", () => {
  it("formats a Date as 'YYYY-MM-DD HH:mm:ss' in UTC", () => {
    const d = new Date("2024-04-30T16:00:00.000Z");
    expect(formatUtc(d)).toBe("2024-04-30 16:00:00");
  });
});

describe("formatSql", () => {
  it("matches SQL DATETIME literal in UTC", () => {
    const d = new Date("2024-04-30T16:00:00.000Z");
    expect(formatSql(d)).toBe("2024-04-30 16:00:00");
  });
});

describe("formatRfc2822", () => {
  it("returns the toUTCString form", () => {
    const d = new Date("2024-04-30T16:00:00.000Z");
    expect(formatRfc2822(d)).toBe("Tue, 30 Apr 2024 16:00:00 GMT");
  });
});

describe("isoWeekNumber", () => {
  it("returns 1 for Jan 4 in any year (ISO 8601 anchor)", () => {
    expect(isoWeekNumber(new Date(Date.UTC(2024, 0, 4)))).toBe(1);
    expect(isoWeekNumber(new Date(Date.UTC(2020, 0, 4)))).toBe(1);
  });

  it("returns 53 for 2020-12-31 (ISO week 53)", () => {
    expect(isoWeekNumber(new Date(Date.UTC(2020, 11, 31)))).toBe(53);
  });

  it("returns 52 for 2023-01-01 (belongs to last week of 2022)", () => {
    expect(isoWeekNumber(new Date(Date.UTC(2023, 0, 1)))).toBe(52);
  });

  it("returns 18 for 2024-05-01", () => {
    expect(isoWeekNumber(new Date(Date.UTC(2024, 4, 1)))).toBe(18);
  });
});

describe("formatTimezoneOffset", () => {
  it("formats positive UTC offsets as UTC+HH:MM", () => {
    expect(formatTimezoneOffset(-480)).toBe("UTC+08:00");
    expect(formatTimezoneOffset(-330)).toBe("UTC+05:30");
  });

  it("formats negative UTC offsets as UTC-HH:MM", () => {
    expect(formatTimezoneOffset(300)).toBe("UTC-05:00");
  });

  it("formats zero offset as UTC+00:00", () => {
    expect(formatTimezoneOffset(0)).toBe("UTC+00:00");
  });
});

describe("formatRelative", () => {
  const now = new Date("2025-04-28T12:00:00.000Z");

  it("uses seconds for sub-minute diffs", () => {
    expect(formatRelative(new Date("2025-04-28T11:59:30.000Z"), now, "en")).toMatch(
      /30 seconds ago/
    );
  });

  it("uses minutes for sub-hour diffs", () => {
    expect(formatRelative(new Date("2025-04-28T11:30:00.000Z"), now, "en")).toMatch(
      /30 minutes ago/
    );
  });

  it("uses hours for sub-day diffs", () => {
    expect(formatRelative(new Date("2025-04-28T05:00:00.000Z"), now, "en")).toMatch(/7 hours ago/);
  });

  it("uses days for sub-month diffs", () => {
    expect(formatRelative(new Date("2025-04-20T12:00:00.000Z"), now, "en")).toMatch(/8 days ago/);
  });

  it("uses years for >= 12 months", () => {
    expect(formatRelative(new Date("2024-04-28T12:00:00.000Z"), now, "en")).toMatch(/last year/);
  });

  it("supports future direction", () => {
    expect(formatRelative(new Date("2025-04-28T12:00:30.000Z"), now, "en")).toMatch(
      /in 30 seconds/
    );
  });
});

describe("buildDate", () => {
  it("interprets inputs as UTC when tz='utc'", () => {
    const d = buildDate({ date: "2024-05-01", time: "00:00:00", ms: 0, tz: "utc" });
    expect(d?.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  it("interprets inputs as local when tz='local'", () => {
    const d = buildDate({ date: "2024-05-01", time: "12:00:00", ms: 0, tz: "local" });
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(4); // May = 4
    expect(d?.getDate()).toBe(1);
    expect(d?.getHours()).toBe(12);
  });

  it("includes milliseconds in resulting timestamp (UTC)", () => {
    const d = buildDate({ date: "2024-05-01", time: "00:00:00", ms: 123, tz: "utc" });
    expect(d!.getTime() % 1000).toBe(123);
  });

  it("returns null when date is empty", () => {
    expect(buildDate({ date: "", time: "00:00:00", ms: 0, tz: "utc" })).toBe(null);
  });

  it("returns null when time is malformed", () => {
    expect(buildDate({ date: "2024-05-01", time: "bad", ms: 0, tz: "utc" })).toBe(null);
  });
});

describe("presetParts", () => {
  it("'now' returns the supplied reference time's parts", () => {
    const ref = new Date("2024-05-01T03:04:05.678Z");
    const parts = presetParts("now", "local", ref);
    expect(parts.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parts.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(parts.ms).toBeGreaterThanOrEqual(0);
    expect(parts.ms).toBeLessThanOrEqual(999);
  });

  it("'todayMidnightUtc' returns 00:00:00 with ms=0", () => {
    const ref = new Date("2024-05-01T03:04:05.678Z");
    const parts = presetParts("todayMidnightUtc", "utc", ref);
    expect(parts.date).toBe("2024-05-01");
    expect(parts.time).toBe("00:00:00");
    expect(parts.ms).toBe(0);
  });
});
