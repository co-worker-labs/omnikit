import type {
  CompletionContext,
  CompletionResult,
  CompletionSource,
  Completion,
} from "@codemirror/autocomplete";
import type { SchemaItem, TableSchema } from "./types";

export type ContextMode = "tables" | "columns" | "keywords";

export interface ContextDetect {
  mode: ContextMode;
  scopedTables: string[];
}

const TABLE_TRIGGERS = /\b(FROM|JOIN|INTO|UPDATE)\s*$/i;
const COLUMN_TRIGGERS = /\b(SELECT|WHERE|ON|AND|OR|GROUP\s+BY|ORDER\s+BY|HAVING|SET)\s*$/i;

export function detectContext(prefix: string): ContextDetect {
  const trimmedRight = prefix.replace(/\s+$/, "");
  const padded = trimmedRight + " ";
  const tables = collectScopedTables(prefix);

  if (TABLE_TRIGGERS.test(padded)) return { mode: "tables", scopedTables: tables };
  if (COLUMN_TRIGGERS.test(padded)) return { mode: "columns", scopedTables: tables };

  return { mode: "keywords", scopedTables: tables };
}

function collectScopedTables(prefix: string): string[] {
  const re = /\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(prefix)) !== null) out.push(m[1]);
  return out;
}

export interface SchemaIndex {
  tables: string[];
  columnsByTable: Record<string, string[]>;
  allColumns: string[];
}

export function buildSchemaIndex(
  items: SchemaItem[],
  perTable: Record<string, TableSchema>
): SchemaIndex {
  const tables = items.filter((i) => i.kind === "table" || i.kind === "view").map((i) => i.name);
  const columnsByTable: Record<string, string[]> = {};
  const seen = new Set<string>();
  for (const name of tables) {
    const t = perTable[name];
    if (!t) continue;
    columnsByTable[name] = t.columns.map((c) => c.name);
    for (const c of t.columns) seen.add(c.name);
  }
  return {
    tables: [...tables],
    columnsByTable,
    allColumns: [...seen],
  };
}

const SQL_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "ON",
  "GROUP",
  "BY",
  "ORDER",
  "ASC",
  "DESC",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "WITH",
  "AS",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "IS",
  "IN",
  "BETWEEN",
  "LIKE",
  "DISTINCT",
  "UNION",
  "ALL",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "EXPLAIN",
  "PRAGMA",
];

export function makeCompletionSource(getIndex: () => SchemaIndex | null): CompletionSource {
  return (cx: CompletionContext): CompletionResult | null => {
    const word = cx.matchBefore(/\w*/);
    if (!word || (word.from === word.to && !cx.explicit)) return null;

    const index = getIndex();
    const before = cx.state.doc.sliceString(0, word.from);
    const ctx = detectContext(before);

    const options: Completion[] = [];

    if (ctx.mode === "tables" && index) {
      for (const t of index.tables) options.push({ label: t, type: "class" });
    } else if (ctx.mode === "columns" && index) {
      const scope = ctx.scopedTables.filter((t) => index.columnsByTable[t]);
      const seen = new Set<string>();
      const pushCol = (name: string) => {
        if (seen.has(name)) return;
        seen.add(name);
        options.push({ label: name, type: "property" });
      };
      if (scope.length > 0) {
        for (const t of scope) {
          for (const c of index.columnsByTable[t] ?? []) pushCol(c);
        }
      } else {
        for (const c of index.allColumns) pushCol(c);
      }
      for (const k of SQL_KEYWORDS) options.push({ label: k, type: "keyword", boost: -1 });
    } else {
      for (const k of SQL_KEYWORDS) options.push({ label: k, type: "keyword" });
      if (index) for (const t of index.tables) options.push({ label: t, type: "class", boost: -1 });
    }

    return { from: word.from, options, validFor: /^\w*$/ };
  };
}
