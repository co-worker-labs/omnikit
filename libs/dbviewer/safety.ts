// Read-only enforcement primitives. Pure, no sql.js imports.

const READONLY_PRAGMAS = new Set([
  "table_info",
  "table_list",
  "foreign_key_list",
  "index_list",
  "index_info",
  "index_xinfo",
  "integrity_check",
  "database_list",
  "collation_list",
  "compile_options",
]);

const READONLY_KEYWORDS = new Set(["SELECT", "WITH", "EXPLAIN", "PRAGMA"]);

export function stripLeadingComments(sql: string): string {
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i + 2);
      if (nl === -1) return "";
      i = nl + 1;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) return "";
      i = end + 2;
      continue;
    }
    break;
  }
  return sql.slice(i);
}

export function firstKeyword(sql: string): string | null {
  const trimmed = stripLeadingComments(sql).trimStart();
  const m = /^([A-Za-z_]+)/.exec(trimmed);
  return m ? m[1].toUpperCase() : null;
}

export interface OkClassification {
  kind: "ok";
}
export interface RejectedClassification {
  kind: "rejected";
  reason: string;
}
export type Classification = OkClassification | RejectedClassification;

function inspectPragma(rest: string): Classification {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(rest);
  if (!m) return { kind: "rejected", reason: "Malformed PRAGMA." };
  const name = m[1].toLowerCase();
  if (!READONLY_PRAGMAS.has(name)) {
    return {
      kind: "rejected",
      reason: `PRAGMA "${name}" is not in the read-only whitelist.`,
    };
  }
  return { kind: "ok" };
}

const DML_RE =
  /\b(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER|REINDEX|VACUUM|ATTACH|DETACH|TRUNCATE)\b/i;

function inspectCte(stripped: string): Classification {
  const sanitized = sanitizeForScan(stripped);
  const dml = DML_RE.exec(sanitized);
  if (dml) {
    return { kind: "rejected", reason: `Data-modifying CTE detected (${dml[1].toUpperCase()}).` };
  }
  return { kind: "ok" };
}

export function sanitizeForScan(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i + 2);
      i = nl === -1 ? sql.length : nl;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (ch === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      out += " ";
      continue;
    }
    if (ch === '"') {
      i++;
      while (i < sql.length && sql[i] !== '"') i++;
      if (sql[i] === '"') i++;
      out += " ";
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

export function classifyStatement(sql: string): Classification {
  const stripped = stripLeadingComments(sql).trimEnd();
  if (stripped.length === 0) {
    return { kind: "rejected", reason: "Empty statement." };
  }
  const kw = firstKeyword(stripped);
  if (!kw) {
    return { kind: "rejected", reason: "No SQL keyword detected." };
  }
  if (!READONLY_KEYWORDS.has(kw)) {
    return { kind: "rejected", reason: `Only read-only statements are allowed (got: ${kw}).` };
  }
  if (kw === "PRAGMA") {
    return inspectPragma(stripped.slice("PRAGMA".length));
  }
  if (kw === "WITH") {
    return inspectCte(stripped);
  }
  return { kind: "ok" };
}

export const SAVEPOINT_NAME = "omnikit_dbviewer_query";

export function wrapInSavepoint(): { begin: string; end: string } {
  return {
    begin: `SAVEPOINT ${SAVEPOINT_NAME};`,
    end: `ROLLBACK TO ${SAVEPOINT_NAME}; RELEASE ${SAVEPOINT_NAME};`,
  };
}
