import { beforeEach, describe, it, expect } from "vitest";
import { addHistory, listHistory, clearHistory, HISTORY_KEY } from "../history";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(k: string) {
    return this.store.has(k) ? (this.store.get(k) as string) : null;
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

describe("history", () => {
  it("uses the documented key", () => {
    expect(HISTORY_KEY).toBe("bc:dbviewer:history");
  });

  it("starts empty", () => {
    expect(listHistory()).toEqual([]);
  });

  it("adds entries newest-first", () => {
    addHistory({ sql: "SELECT 1", success: true, rows: 1, ts: 1 });
    addHistory({ sql: "SELECT 2", success: true, rows: 1, ts: 2 });
    const list = listHistory();
    expect(list[0].sql).toBe("SELECT 2");
    expect(list[1].sql).toBe("SELECT 1");
  });

  it("dedupes adjacent identical SQL (keeps newest)", () => {
    addHistory({ sql: "SELECT 1", success: true, rows: 1, ts: 1 });
    addHistory({ sql: "SELECT 1", success: true, rows: 2, ts: 2 });
    const list = listHistory();
    expect(list).toHaveLength(1);
    expect(list[0].rows).toBe(2);
  });

  it("dedupes non-adjacent identical SQL (moves to top)", () => {
    addHistory({ sql: "A", success: true, rows: 0, ts: 1 });
    addHistory({ sql: "B", success: true, rows: 0, ts: 2 });
    addHistory({ sql: "A", success: true, rows: 0, ts: 3 });
    const list = listHistory();
    expect(list.map((e) => e.sql)).toEqual(["A", "B"]);
    expect(list[0].ts).toBe(3);
  });

  it("caps at 50 entries", () => {
    for (let i = 0; i < 60; i++) {
      addHistory({ sql: `SELECT ${i}`, success: true, rows: 0, ts: i });
    }
    const list = listHistory();
    expect(list).toHaveLength(50);
    expect(list[0].sql).toBe("SELECT 59");
    expect(list[49].sql).toBe("SELECT 10");
  });

  it("clears", () => {
    addHistory({ sql: "X", success: true, rows: 0, ts: 1 });
    clearHistory();
    expect(listHistory()).toEqual([]);
  });

  it("tolerates malformed stored payloads", () => {
    localStorage.setItem(HISTORY_KEY, "{not json");
    expect(listHistory()).toEqual([]);
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ not: "an array" }));
    expect(listHistory()).toEqual([]);
  });
});
