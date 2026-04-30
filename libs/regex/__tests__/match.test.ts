import { describe, it, expect, vi } from "vitest";
import { executeRegex, validatePattern, terminateWorker } from "../match";

vi.mock("../match.worker", () => ({}));

describe("validatePattern", () => {
  it("returns null for valid pattern", () => {
    expect(validatePattern("\\d+", "g")).toBeNull();
  });

  it("returns null for empty pattern", () => {
    expect(validatePattern("", "g")).toBeNull();
  });

  it("returns error for unbalanced parentheses", () => {
    const result = validatePattern("a(", "g");
    expect(result).not.toBeNull();
    expect(result!.message).toBeTruthy();
    expect(typeof result!.offset).toBe("number");
  });

  it("returns error for unterminated character class", () => {
    const result = validatePattern("[abc", "g");
    expect(result).not.toBeNull();
    expect(result!.message).toBeTruthy();
  });

  it("returns null for complex valid pattern", () => {
    expect(validatePattern("^(?=.*[a-z])(?=.*\\d).{8,}$", "g")).toBeNull();
  });
});

describe("executeRegex", () => {
  it("returns error for invalid pattern immediately (no worker)", async () => {
    const result = await executeRegex("a(", "g", "test");
    expect(result.error).toBeTruthy();
    expect(result.errorOffset).toBeTypeOf("number");
    expect(result.matches).toEqual([]);
    expect(result.timedOut).toBe(false);
  });

  it("returns empty matches for empty input", async () => {
    const result = await executeRegex("\\d+", "g", "");
    expect(result.matches).toEqual([]);
    expect(result.error).toBeNull();
    expect(result.matchCount).toBe(0);
  });

  it("returns empty matches for empty pattern", async () => {
    const result = await executeRegex("", "g", "hello");
    expect(result.matches).toEqual([]);
    expect(result.error).toBeNull();
  });
});
