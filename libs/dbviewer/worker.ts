/// <reference lib="webworker" />

import initSqlJs, { type Database, type Statement, type SqlJsStatic } from "sql.js";
import type {
  Req,
  Res,
  SchemaItem,
  TableSchema,
  ColumnInfo,
  ForeignKeyInfo,
  IndexInfo,
  DbInfo,
  ColumnMeta,
  CellValue,
  RowsPayload,
  ExecResult,
} from "./types";
import { WASM_PATH, SQLITE_MAGIC } from "./constants";
import { classifyStatement, wrapInSavepoint } from "./safety";

declare const self: DedicatedWorkerGlobalScope;

type SqlDb = Database;
type SqlStmt = Statement;

let SQL: SqlJsStatic | null = null;
let db: SqlDb | null = null;
let dbName = "";
let dbSize = 0;

interface Cursor {
  stmt: SqlStmt;
  columns: ColumnMeta[];
  rowsLoaded: number;
  done: boolean;
  startedAt: number;
  inSavepoint: boolean;
}

const cursors = new Map<string, Cursor>();

function post(msg: Res) {
  self.postMessage(msg);
}

async function ensureSql() {
  if (SQL) return SQL;
  SQL = await initSqlJs({ locateFile: () => WASM_PATH });
  return SQL;
}

function isSqliteHeader(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 16) return false;
  const view = new Uint8Array(buf, 0, 16);
  for (let i = 0; i < SQLITE_MAGIC.length; i++) {
    if (view[i] !== SQLITE_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = "";
  let sq = false;
  let dq = false;
  let lineCmt = false;
  let blockCmt = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const nx = sql[i + 1];

    if (lineCmt) {
      cur += ch;
      if (ch === "\n") lineCmt = false;
      continue;
    }
    if (blockCmt) {
      cur += ch;
      if (ch === "*" && nx === "/") {
        blockCmt = false;
        i++;
        cur += "/";
      }
      continue;
    }
    if (sq) {
      cur += ch;
      if (ch === "'" && nx !== "'") sq = false;
      else if (ch === "'" && nx === "'") {
        i++;
        cur += "'";
      }
      continue;
    }
    if (dq) {
      cur += ch;
      if (ch === '"' && nx !== '"') dq = false;
      else if (ch === '"' && nx === '"') {
        i++;
        cur += '"';
      }
      continue;
    }

    if (ch === "-" && nx === "-") {
      lineCmt = true;
      cur += ch;
      continue;
    }
    if (ch === "/" && nx === "*") {
      blockCmt = true;
      cur += ch;
      continue;
    }
    if (ch === "'") {
      sq = true;
      cur += ch;
      continue;
    }
    if (ch === '"') {
      dq = true;
      cur += ch;
      continue;
    }
    if (ch === ";") {
      const t = cur.trim();
      if (t) out.push(t);
      cur = "";
      continue;
    }
    cur += ch;
  }

  const t = cur.trim();
  if (t) out.push(t);
  return out;
}

function enumerateSchema(database: SqlDb): SchemaItem[] {
  const stmt = database.prepare(
    "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','view','index','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type, name"
  );
  const out: SchemaItem[] = [];
  while (stmt.step()) {
    const r = stmt.get() as Array<string | null>;
    out.push({
      name: r[0] as string,
      kind: r[1] as SchemaItem["kind"],
      sql: (r[2] as string | null) ?? null,
    });
  }
  stmt.free();
  return out;
}

function counts(items: SchemaItem[]) {
  let tableCount = 0,
    viewCount = 0,
    indexCount = 0,
    triggerCount = 0;
  for (const i of items) {
    if (i.kind === "table") tableCount++;
    else if (i.kind === "view") viewCount++;
    else if (i.kind === "index") indexCount++;
    else if (i.kind === "trigger") triggerCount++;
  }
  return { tableCount, viewCount, indexCount, triggerCount };
}

function tableSchema(database: SqlDb, name: string): TableSchema {
  const esc = name.replace(/"/g, '""');
  const cols: ColumnInfo[] = [];
  const tinfo = database.prepare(`PRAGMA table_info("${esc}")`);
  while (tinfo.step()) {
    const r = tinfo.get() as Array<string | number | null>;
    cols.push({
      name: r[1] as string,
      type: (r[2] as string) ?? "",
      notnull: Number(r[3]) === 1,
      dflt_value: (r[4] as string | null) ?? null,
      pk: Number(r[5] ?? 0),
    });
  }
  tinfo.free();

  const fks: ForeignKeyInfo[] = [];
  const finfo = database.prepare(`PRAGMA foreign_key_list("${esc}")`);
  while (finfo.step()) {
    const r = finfo.get() as Array<string | number | null>;
    fks.push({
      id: Number(r[0]),
      seq: Number(r[1]),
      from: r[3] as string,
      to_table: r[2] as string,
      to_column: r[4] as string,
      on_update: (r[5] as string) ?? "",
      on_delete: (r[6] as string) ?? "",
    });
  }
  finfo.free();

  const idxs: IndexInfo[] = [];
  const ilist = database.prepare(`PRAGMA index_list("${esc}")`);
  const idxNames: Array<{ name: string; unique: boolean; origin: string; partial: boolean }> = [];
  while (ilist.step()) {
    const r = ilist.get() as Array<string | number | null>;
    idxNames.push({
      name: r[1] as string,
      unique: Number(r[2]) === 1,
      origin: (r[3] as string) ?? "",
      partial: Number(r[4]) === 1,
    });
  }
  ilist.free();
  for (const idx of idxNames) {
    const cols2: string[] = [];
    const ii = database.prepare(`PRAGMA index_info("${idx.name.replace(/"/g, '""')}")`);
    while (ii.step()) {
      const r = ii.get() as Array<string | number | null>;
      cols2.push(r[2] as string);
    }
    ii.free();
    idxs.push({ ...idx, columns: cols2 });
  }

  return { columns: cols, foreignKeys: fks, indexes: idxs };
}

self.addEventListener("message", async (ev: MessageEvent<Req>) => {
  const req = ev.data;
  try {
    switch (req.type) {
      case "init": {
        await ensureSql();
        post({ id: req.id, type: "ready" });
        return;
      }
      case "open": {
        const sql = await ensureSql();
        if (!isSqliteHeader(req.buffer)) {
          post({ id: req.id, type: "error", message: "Not a valid SQLite database file." });
          return;
        }
        if (db) db.close();
        db = new sql.Database(new Uint8Array(req.buffer));
        dbName = req.name;
        dbSize = req.buffer.byteLength;
        const items = enumerateSchema(db);
        const c = counts(items);
        const info: DbInfo = { name: dbName, sizeBytes: dbSize, ...c };
        post({ id: req.id, type: "opened", info });
        return;
      }
      case "schema": {
        if (!db) return post({ id: req.id, type: "error", message: "No database open." });
        post({ id: req.id, type: "schema", items: enumerateSchema(db) });
        return;
      }
      case "tableSchema": {
        if (!db) return post({ id: req.id, type: "error", message: "No database open." });
        post({
          id: req.id,
          type: "tableSchema",
          name: req.name,
          schema: tableSchema(db, req.name),
        });
        return;
      }
      case "rowCount": {
        if (!db) return post({ id: req.id, type: "error", message: "No database open." });
        const stmt = db.prepare(`SELECT COUNT(*) FROM "${req.name.replace(/"/g, '""')}"`);
        stmt.step();
        const v = (stmt.get() as Array<bigint | number | string | null>)[0] as bigint | number;
        stmt.free();
        post({ id: req.id, type: "rowCount", name: req.name, count: v });
        return;
      }
      case "close": {
        for (const c of cursors.values()) {
          try {
            c.stmt.free();
          } catch {}
        }
        cursors.clear();
        if (db) {
          db.close();
          db = null;
        }
        post({ id: req.id, type: "closed" });
        return;
      }
      case "exec": {
        if (!db) return post({ id: req.id, type: "error", message: "No database open." });
        const result = execStatements(db, req.sql, req.pageSize);
        post({ id: req.id, type: "exec", result });
        return;
      }
      case "fetchMore": {
        if (!db) return post({ id: req.id, type: "error", message: "No database open." });
        const cur = cursors.get(req.cursorId);
        if (!cur) {
          post({ id: req.id, type: "error", message: "Cursor not found or expired." });
          return;
        }
        const payload = stepCursor(cur, req.cursorId, req.pageSize);
        post({ id: req.id, type: "rows", payload });
        if (cur.done) finalizeCursor(req.cursorId);
        return;
      }
      case "abort": {
        post({ id: req.id, type: "error", message: "Aborted." });
        return;
      }
    }
  } catch (e) {
    post({
      id: req.id,
      type: "error",
      message: e instanceof Error ? e.message : String(e),
    });
  }
});

function execStatements(database: SqlDb, sql: string, pageSize: number): ExecResult {
  const exec: ExecResult = { results: [] };
  const stmts = splitStatements(sql);

  for (let i = 0; i < stmts.length; i++) {
    const text = stmts[i];
    const c = classifyStatement(text);
    if (c.kind === "rejected") {
      exec.results.push({ kind: "rejected", statementIndex: i, sql: text, reason: c.reason });
      continue;
    }
    try {
      const wrap = wrapInSavepoint();
      database.exec(wrap.begin);
      const cursorId = `c_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
      const stmt = database.prepare(text);
      const cols = stmt.getColumnNames();
      const columns: ColumnMeta[] = cols.map((name) => ({
        name,
        declaredType: null,
      }));
      const cur: Cursor = {
        stmt,
        columns,
        rowsLoaded: 0,
        done: false,
        startedAt: performance.now(),
        inSavepoint: true,
      };
      cursors.set(cursorId, cur);
      const payload = stepCursor(cur, cursorId, pageSize);
      exec.results.push({ kind: "ok", statementIndex: i, sql: text, payload });
      if (cur.done) finalizeCursor(cursorId);
    } catch (e) {
      try {
        database.exec("ROLLBACK TO omnikit_dbviewer_query; RELEASE omnikit_dbviewer_query;");
      } catch {}
      exec.results.push({
        kind: "error",
        statementIndex: i,
        sql: text,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return exec;
}

function stepCursor(cur: Cursor, cursorId: string, pageSize: number): RowsPayload {
  const rows: CellValue[][] = [];
  let stepped = 0;
  while (stepped < pageSize) {
    const more = cur.stmt.step();
    if (!more) {
      cur.done = true;
      break;
    }
    const r = cur.stmt.get() as CellValue[];
    rows.push(r);
    stepped++;
    cur.rowsLoaded++;
  }
  return {
    cursorId,
    columns: cur.columns,
    rows,
    done: cur.done,
    rowsLoaded: cur.rowsLoaded,
    elapsedMs: Math.max(0, Math.round(performance.now() - cur.startedAt)),
  };
}

function finalizeCursor(cursorId: string) {
  const cur = cursors.get(cursorId);
  if (!cur) return;
  try {
    cur.stmt.free();
  } catch {}
  if (cur.inSavepoint && db) {
    try {
      db.exec("ROLLBACK TO omnikit_dbviewer_query; RELEASE omnikit_dbviewer_query;");
    } catch {}
  }
  cursors.delete(cursorId);
}

export {};
