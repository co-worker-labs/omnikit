import { describe, it, expect } from "vitest";
import {
  stripLeadingComments,
  firstKeyword,
  classifyStatement,
  wrapInSavepoint,
  SAVEPOINT_NAME,
} from "../safety";

describe("stripLeadingComments", () => {
  it("removes -- line comment", () => {
    expect(stripLeadingComments("-- hi\nSELECT 1")).toBe("SELECT 1");
  });
  it("removes /* block */ comment", () => {
    expect(stripLeadingComments("/* hi */ SELECT 1")).toBe("SELECT 1");
  });
  it("removes nested mixed leading whitespace + comments", () => {
    expect(stripLeadingComments("\n  -- a\n /* b */ \n SELECT 1")).toBe("SELECT 1");
  });
  it("leaves trailing comments alone", () => {
    expect(stripLeadingComments("SELECT 1 -- trailing")).toBe("SELECT 1 -- trailing");
  });
  it("returns empty for all-comments", () => {
    expect(stripLeadingComments("-- only a comment")).toBe("");
  });
});

describe("firstKeyword", () => {
  it("returns SELECT", () => {
    expect(firstKeyword("SELECT 1")).toBe("SELECT");
  });
  it("uppercases lowercase keywords", () => {
    expect(firstKeyword("select 1")).toBe("SELECT");
  });
  it("returns null for empty", () => {
    expect(firstKeyword("")).toBeNull();
  });
});

describe("classifyStatement", () => {
  it("accepts SELECT", () => {
    expect(classifyStatement("SELECT * FROM t")).toEqual({ kind: "ok" });
  });
  it("accepts EXPLAIN", () => {
    expect(classifyStatement("EXPLAIN QUERY PLAN SELECT 1")).toEqual({ kind: "ok" });
  });
  it("accepts WITH cte AS (SELECT) SELECT", () => {
    expect(classifyStatement("WITH t AS (SELECT 1) SELECT * FROM t")).toEqual({ kind: "ok" });
  });
  it("accepts whitelisted PRAGMA", () => {
    expect(classifyStatement("PRAGMA table_info('t')")).toEqual({ kind: "ok" });
  });
  it("rejects non-whitelisted PRAGMA", () => {
    const r = classifyStatement("PRAGMA journal_mode = WAL");
    expect(r.kind).toBe("rejected");
    if (r.kind === "rejected") expect(r.reason).toContain("journal_mode");
  });
  it("rejects INSERT", () => {
    const r = classifyStatement("INSERT INTO t VALUES(1)");
    expect(r.kind).toBe("rejected");
    if (r.kind === "rejected") expect(r.reason).toContain("INSERT");
  });
  it("rejects UPDATE", () => {
    expect(classifyStatement("UPDATE t SET a=1").kind).toBe("rejected");
  });
  it("rejects DELETE", () => {
    expect(classifyStatement("DELETE FROM t").kind).toBe("rejected");
  });
  it("rejects DDL — DROP/CREATE/ALTER/REINDEX/VACUUM", () => {
    expect(classifyStatement("DROP TABLE t").kind).toBe("rejected");
    expect(classifyStatement("CREATE TABLE t(a)").kind).toBe("rejected");
    expect(classifyStatement("ALTER TABLE t ADD COLUMN b").kind).toBe("rejected");
    expect(classifyStatement("REINDEX").kind).toBe("rejected");
    expect(classifyStatement("VACUUM").kind).toBe("rejected");
  });
  it("rejects ATTACH/DETACH", () => {
    expect(classifyStatement("ATTACH DATABASE 'x.db' AS x").kind).toBe("rejected");
    expect(classifyStatement("DETACH DATABASE x").kind).toBe("rejected");
  });
  it("rejects empty / whitespace-only", () => {
    expect(classifyStatement("").kind).toBe("rejected");
    expect(classifyStatement("   ").kind).toBe("rejected");
  });
  it("strips leading comments before classifying", () => {
    expect(classifyStatement("-- innocent\nSELECT 1").kind).toBe("ok");
    expect(classifyStatement("/* sneaky */ DELETE FROM t").kind).toBe("rejected");
  });
});

describe("wrapInSavepoint", () => {
  it("emits the SAVEPOINT/ROLLBACK/RELEASE triplet", () => {
    const { begin, end } = wrapInSavepoint();
    expect(begin).toBe(`SAVEPOINT ${SAVEPOINT_NAME};`);
    expect(end).toBe(`ROLLBACK TO ${SAVEPOINT_NAME}; RELEASE ${SAVEPOINT_NAME};`);
  });

  it("uses a fixed identifier safe to embed in SQL", () => {
    expect(/^[A-Za-z_][A-Za-z0-9_]*$/.test(SAVEPOINT_NAME)).toBe(true);
  });
});
