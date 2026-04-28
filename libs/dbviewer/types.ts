// Types shared between the worker and the main thread.
// Both files import from here; the file must remain free of runtime imports
// that aren't bundle-safe in a Web Worker.

export type SchemaItemKind = "table" | "view" | "index" | "trigger";

export interface SchemaItem {
  kind: SchemaItemKind;
  name: string;
  sql: string | null;
}

export interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  dflt_value: string | null;
  pk: number; // 0 = not PK, 1+ = PK position (composite PK supported)
}

export interface ForeignKeyInfo {
  id: number;
  seq: number;
  from: string;
  to_table: string;
  to_column: string;
  on_update: string;
  on_delete: string;
}

export interface IndexInfo {
  name: string;
  unique: boolean;
  origin: string;
  partial: boolean;
  columns: string[];
}

export interface TableSchema {
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
}

export interface DbInfo {
  name: string;
  sizeBytes: number;
  tableCount: number;
  viewCount: number;
  indexCount: number;
  triggerCount: number;
}

export type CellValue = null | string | number | bigint | Uint8Array | boolean;

export interface ColumnMeta {
  name: string;
  declaredType: string | null;
}

export interface RowsPayload {
  cursorId: string;
  columns: ColumnMeta[];
  rows: CellValue[][];
  done: boolean;
  rowsLoaded: number;
  elapsedMs: number;
}

export interface RejectedStatement {
  statementIndex: number;
  sql: string;
  reason: string;
}

export interface ExecResult {
  results: Array<
    | { kind: "ok"; statementIndex: number; sql: string; payload: RowsPayload }
    | { kind: "error"; statementIndex: number; sql: string; message: string }
    | { kind: "rejected"; statementIndex: number; sql: string; reason: string }
  >;
}

// ----- Worker message envelope -----

export type Req =
  | { id: string; type: "init" }
  | { id: string; type: "open"; buffer: ArrayBuffer; name: string }
  | { id: string; type: "close" }
  | { id: string; type: "schema" }
  | { id: string; type: "tableSchema"; name: string }
  | { id: string; type: "rowCount"; name: string }
  | { id: string; type: "exec"; sql: string; pageSize: number }
  | { id: string; type: "fetchMore"; cursorId: string; pageSize: number }
  | { id: string; type: "abort" };

export type Res =
  | { id: string; type: "ready" }
  | { id: string; type: "opened"; info: DbInfo }
  | { id: string; type: "closed" }
  | { id: string; type: "schema"; items: SchemaItem[] }
  | { id: string; type: "tableSchema"; name: string; schema: TableSchema }
  | { id: string; type: "rowCount"; name: string; count: number | bigint }
  | { id: string; type: "exec"; result: ExecResult }
  | { id: string; type: "rows"; payload: RowsPayload }
  | { id: string; type: "error"; message: string };
