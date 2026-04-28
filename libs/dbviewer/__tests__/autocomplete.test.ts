import { describe, it, expect } from "vitest";
import { detectContext, buildSchemaIndex } from "../autocomplete";
import type { TableSchema } from "../types";

const ts = (cols: string[]): TableSchema => ({
  columns: cols.map((name) => ({
    name,
    type: "TEXT",
    notnull: false,
    dflt_value: null,
    pk: 0,
  })),
  foreignKeys: [],
  indexes: [],
});

describe("detectContext", () => {
  it("after FROM expects tables", () => {
    expect(detectContext("SELECT * FROM ").mode).toBe("tables");
  });
  it("after JOIN expects tables", () => {
    expect(detectContext("SELECT * FROM a JOIN ").mode).toBe("tables");
  });
  it("after INTO expects tables", () => {
    expect(detectContext("REPLACE INTO ").mode).toBe("tables");
  });
  it("after SELECT (column list) expects columns", () => {
    expect(detectContext("SELECT ").mode).toBe("columns");
  });
  it("after WHERE expects columns", () => {
    expect(detectContext("SELECT * FROM t WHERE ").mode).toBe("columns");
  });
  it("after ORDER BY expects columns", () => {
    expect(detectContext("SELECT * FROM t ORDER BY ").mode).toBe("columns");
  });
  it("at start of buffer falls back to keywords", () => {
    expect(detectContext("").mode).toBe("keywords");
    expect(detectContext("  ").mode).toBe("keywords");
  });
  it("after a closing paren falls back to keywords", () => {
    expect(detectContext("SELECT count(*) ").mode).toBe("keywords");
  });
});

describe("buildSchemaIndex", () => {
  it("collects table names and a flat column list", () => {
    const idx = buildSchemaIndex(
      [
        { kind: "table", name: "users", sql: null },
        { kind: "table", name: "orders", sql: null },
        { kind: "view", name: "v_top", sql: null },
      ],
      {
        users: ts(["id", "name"]),
        orders: ts(["id", "user_id", "total"]),
        v_top: ts(["id", "name"]),
      }
    );
    expect(idx.tables.sort()).toEqual(["orders", "users", "v_top"]);
    expect(idx.columnsByTable.users).toEqual(["id", "name"]);
    expect(idx.allColumns.sort()).toEqual(["id", "name", "total", "user_id"]);
  });
});
