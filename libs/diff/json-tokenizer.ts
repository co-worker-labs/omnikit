// Tiny single-line JSON tokenizer. Not a full parser — it operates per line and
// is intentionally tolerant: unrecognized bytes fall into the "plain" bucket.

export type JsonTokenKind = "string" | "number" | "keyword" | "key" | "punct" | "plain";

export type JsonToken = { kind: JsonTokenKind; text: string };

const KEYWORD_RE = /^(true|false|null)\b/;
const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const PUNCT = new Set(["{", "}", "[", "]", ":", ","]);

export function tokenizeJsonLine(line: string): JsonToken[] {
  const out: JsonToken[] = [];
  let i = 0;
  let plain = "";

  const flushPlain = () => {
    if (plain.length > 0) {
      out.push({ kind: "plain", text: plain });
      plain = "";
    }
  };

  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      flushPlain();
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === "\\" && j + 1 < line.length) {
          j += 2;
          continue;
        }
        if (line[j] === '"') {
          j++;
          break;
        }
        j++;
      }
      const text = line.slice(i, j);
      let k = j;
      while (k < line.length && /\s/.test(line[k])) k++;
      const isKey = line[k] === ":";
      out.push({ kind: isKey ? "key" : "string", text });
      i = j;
      continue;
    }

    if (PUNCT.has(ch)) {
      flushPlain();
      out.push({ kind: "punct", text: ch });
      i++;
      continue;
    }

    const rest = line.slice(i);
    const kwMatch = KEYWORD_RE.exec(rest);
    if (kwMatch) {
      flushPlain();
      out.push({ kind: "keyword", text: kwMatch[0] });
      i += kwMatch[0].length;
      continue;
    }

    const numMatch = NUMBER_RE.exec(rest);
    if (numMatch) {
      flushPlain();
      out.push({ kind: "number", text: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }

    plain += ch;
    i++;
  }
  flushPlain();
  return out;
}

export function looksLikeJson(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return false;
  const first = t[0];
  const last = t[t.length - 1];
  if (!((first === "{" && last === "}") || (first === "[" && last === "]"))) {
    return false;
  }
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}
