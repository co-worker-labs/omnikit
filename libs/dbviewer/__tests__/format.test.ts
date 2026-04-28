import { describe, it, expect } from "vitest";
import { formatSql, compressSql } from "../format";

describe("formatSql", () => {
  it("uppercases keywords", () => {
    const out = formatSql("select * from t where a=1");
    expect(out).toMatch(/SELECT/);
    expect(out).toMatch(/FROM/);
    expect(out).toMatch(/WHERE/);
  });

  it("introduces newlines between top-level clauses", () => {
    const out = formatSql("SELECT a FROM t WHERE a=1");
    expect(out.split("\n").length).toBeGreaterThanOrEqual(3);
  });

  it("is idempotent", () => {
    const once = formatSql("SELECT a, b FROM t WHERE a = 1 ORDER BY a");
    const twice = formatSql(once);
    expect(twice).toBe(once);
  });

  it("preserves comments", () => {
    const out = formatSql("-- keep me\nSELECT 1");
    expect(out).toContain("-- keep me");
  });

  it("returns empty string for empty input", () => {
    expect(formatSql("")).toBe("");
    expect(formatSql("   \n  ")).toBe("");
  });
});

describe("compressSql", () => {
  it("collapses to a single line", () => {
    const out = compressSql("SELECT a\nFROM t\nWHERE a = 1");
    expect(out.includes("\n")).toBe(false);
  });

  it("strips line comments", () => {
    const out = compressSql("SELECT 1 -- trailing");
    expect(out.includes("--")).toBe(false);
  });

  it("strips block comments", () => {
    const out = compressSql("/* hi */ SELECT 1");
    expect(out.startsWith("SELECT")).toBe(true);
  });

  it("collapses runs of whitespace to single spaces", () => {
    const out = compressSql("SELECT     a   FROM     t");
    expect(out).toBe("SELECT a FROM t");
  });

  it("preserves single-quoted literals", () => {
    const out = compressSql("SELECT 'a   b'");
    expect(out).toContain("'a   b'");
  });

  it("returns empty for empty input", () => {
    expect(compressSql("")).toBe("");
  });
});
