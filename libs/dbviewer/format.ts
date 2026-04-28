import { format as sqlFormat } from "sql-formatter";

export function formatSql(sql: string): string {
  if (!sql.trim()) return "";
  return sqlFormat(sql, {
    language: "sqlite",
    keywordCase: "upper",
    indentStyle: "standard",
    tabWidth: 2,
    useTabs: false,
    linesBetweenQueries: 1,
  });
}

export function compressSql(sql: string): string {
  if (!sql.trim()) return "";
  let out = "";
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i + 2);
      i = nl === -1 ? n : nl;
      out += " ";
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      out += " ";
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (sql[j] === "'") {
          j++;
          break;
        }
        j++;
      }
      out += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < n && sql[j] !== '"') j++;
      if (sql[j] === '"') j++;
      out += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === "\n" || ch === "\r" || ch === "\t" || ch === " ") {
      if (out.length && out[out.length - 1] !== " ") out += " ";
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out.trim();
}
