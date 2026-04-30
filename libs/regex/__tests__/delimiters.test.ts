import { describe, it, expect } from "vitest";
import { stripDelimiters } from "../delimiters";

describe("stripDelimiters", () => {
  it("detects and strips /pattern/flags", () => {
    const result = stripDelimiters("/foo/g");
    expect(result).toEqual({ pattern: "foo", flags: "g", stripped: true });
  });

  it("detects pattern without flags", () => {
    const result = stripDelimiters("/hello/");
    expect(result).toEqual({ pattern: "hello", flags: "", stripped: true });
  });

  it("detects pattern with multiple flags", () => {
    const result = stripDelimiters("/test/gim");
    expect(result).toEqual({ pattern: "test", flags: "gim", stripped: true });
  });

  it("handles escaped forward slashes in pattern", () => {
    const result = stripDelimiters("/a\\/b/g");
    expect(result).toEqual({ pattern: "a\\/b", flags: "g", stripped: true });
  });

  it("returns original input when no delimiters", () => {
    const result = stripDelimiters("hello");
    expect(result).toEqual({ pattern: "hello", flags: "", stripped: false });
  });

  it("returns original for partial delimiter (missing opening)", () => {
    const result = stripDelimiters("foo/g");
    expect(result).toEqual({ pattern: "foo/g", flags: "", stripped: false });
  });

  it("returns original for partial delimiter (missing closing)", () => {
    const result = stripDelimiters("/foo");
    expect(result).toEqual({ pattern: "/foo", flags: "", stripped: false });
  });

  it("preserves invalid flags for later validation", () => {
    const result = stripDelimiters("/test/xyz");
    expect(result).toEqual({ pattern: "test", flags: "xyz", stripped: true });
  });

  it("strips empty string input", () => {
    const result = stripDelimiters("");
    expect(result).toEqual({ pattern: "", flags: "", stripped: false });
  });

  it("strips pattern with // as content (empty pattern)", () => {
    const result = stripDelimiters("//");
    expect(result).toEqual({ pattern: "", flags: "", stripped: true });
  });
});
