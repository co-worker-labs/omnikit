"use client";

import { useEffect, useRef, useState } from "react";
import type { Req, Res, DbInfo, SchemaItem, TableSchema, ExecResult, RowsPayload } from "./types";
import { addHistory } from "./history";

export type EngineStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "opening"
  | "open"
  | "running"
  | "closing"
  | "error";

interface Pending {
  resolve: (value: Res) => void;
  reject: (err: Error) => void;
}

function totalRowCount(r: ExecResult): number {
  let n = 0;
  for (const item of r.results) {
    if (item.kind === "ok") n += item.payload.rows.length;
  }
  return n;
}

class Engine {
  private worker: Worker | null = null;
  private buffer: ArrayBuffer | null = null;
  private bufferName = "";
  private pending = new Map<string, Pending>();
  private nextId = 1;
  private listeners = new Set<() => void>();
  status: EngineStatus = "idle";
  dbInfo: DbInfo | null = null;
  schema: SchemaItem[] = [];
  lastError = "";

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    for (const fn of this.listeners) fn();
  }
  private setStatus(s: EngineStatus) {
    this.status = s;
    this.emit();
  }

  private spawn(): Worker {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (ev: MessageEvent<Res>) => {
      const msg = ev.data;
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.type === "error") p.reject(new Error(msg.message));
      else p.resolve(msg);
    };
    w.onerror = () => {
      for (const p of this.pending.values()) p.reject(new Error("Worker crashed"));
      this.pending.clear();
      this.setStatus("error");
    };
    return w;
  }

  private send(req: Req): Promise<Res> {
    if (!this.worker) this.worker = this.spawn();
    return new Promise<Res>((resolve, reject) => {
      this.pending.set(req.id, { resolve, reject });
      if (req.type === "open") {
        this.worker!.postMessage(req, [req.buffer]);
      } else {
        this.worker!.postMessage(req);
      }
    });
  }

  private id(): string {
    return `m_${this.nextId++}`;
  }

  async init() {
    this.setStatus("initializing");
    try {
      await this.send({ id: this.id(), type: "init" });
      this.setStatus("ready");
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      this.setStatus("error");
    }
  }

  async open(buffer: ArrayBuffer, name: string) {
    this.buffer = buffer.slice(0);
    this.bufferName = name;
    this.setStatus("opening");
    try {
      const res = (await this.send({ id: this.id(), type: "open", buffer, name })) as Extract<
        Res,
        { type: "opened" }
      >;
      this.dbInfo = res.info;
      const schemaRes = (await this.send({ id: this.id(), type: "schema" })) as Extract<
        Res,
        { type: "schema" }
      >;
      this.schema = schemaRes.items;
      this.setStatus("open");
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      this.setStatus("error");
    }
  }

  async tableSchema(name: string): Promise<TableSchema> {
    const res = (await this.send({
      id: this.id(),
      type: "tableSchema",
      name,
    })) as Extract<Res, { type: "tableSchema" }>;
    return res.schema;
  }

  async rowCount(name: string): Promise<number | bigint> {
    const res = (await this.send({
      id: this.id(),
      type: "rowCount",
      name,
    })) as Extract<Res, { type: "rowCount" }>;
    return res.count;
  }

  async exec(sql: string, pageSize: number): Promise<ExecResult> {
    this.setStatus("running");
    try {
      const res = (await this.send({
        id: this.id(),
        type: "exec",
        sql,
        pageSize,
      })) as Extract<Res, { type: "exec" }>;
      this.setStatus("open");
      addHistory({ sql, success: true, rows: totalRowCount(res.result), ts: Date.now() });
      return res.result;
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      addHistory({ sql, success: false, rows: 0, ts: Date.now() });
      this.setStatus("open");
      throw e;
    }
  }

  async fetchMore(cursorId: string, pageSize: number): Promise<RowsPayload> {
    const res = (await this.send({
      id: this.id(),
      type: "fetchMore",
      cursorId,
      pageSize,
    })) as Extract<Res, { type: "rows" }>;
    return res.payload;
  }

  async abort() {
    if (!this.worker) return;
    this.worker.terminate();
    this.worker = null;
    for (const p of this.pending.values()) p.reject(new Error("Aborted"));
    this.pending.clear();
    this.setStatus("opening");
    if (this.buffer && this.bufferName) {
      this.worker = this.spawn();
      try {
        await this.send({ id: this.id(), type: "init" });
        const fresh = this.buffer.slice(0);
        const res = (await this.send({
          id: this.id(),
          type: "open",
          buffer: fresh,
          name: this.bufferName,
        })) as Extract<Res, { type: "opened" }>;
        this.dbInfo = res.info;
        const schemaRes = (await this.send({ id: this.id(), type: "schema" })) as Extract<
          Res,
          { type: "schema" }
        >;
        this.schema = schemaRes.items;
        this.setStatus("open");
      } catch (e) {
        this.lastError = e instanceof Error ? e.message : String(e);
        this.setStatus("error");
      }
    } else {
      this.setStatus("ready");
    }
  }

  async close() {
    this.setStatus("closing");
    try {
      if (this.worker) {
        await this.send({ id: this.id(), type: "close" });
      }
    } catch {}
    this.buffer = null;
    this.bufferName = "";
    this.dbInfo = null;
    this.schema = [];
    this.setStatus("ready");
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const p of this.pending.values()) p.reject(new Error("Engine destroyed"));
    this.pending.clear();
    this.buffer = null;
    this.bufferName = "";
    this.dbInfo = null;
    this.schema = [];
    this.lastError = "";
    this.setStatus("idle");
  }
}

const engine = new Engine();

export function getEngine() {
  return engine;
}

export function useDatabase() {
  const [, force] = useState(0);
  const tickRef = useRef(0);
  useEffect(() => {
    const unsub = engine.subscribe(() => {
      tickRef.current++;
      force(tickRef.current);
    });
    return unsub;
  }, []);
  useEffect(() => {
    if (engine.status === "idle") {
      void engine.init();
    }
    return () => {
      engine.destroy();
    };
  }, []);
  return engine;
}
