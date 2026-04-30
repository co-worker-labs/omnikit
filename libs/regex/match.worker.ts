import type {
  MatchResult,
  RegexWorkerRequest,
  RegexWorkerMatchResponse,
  RegexWorkerReplaceResponse,
  RegexWorkerErrorResponse,
} from "./types";

const MAX_MATCHES = 1000;

function mapMatch(match: RegExpMatchArray, hasD: boolean): MatchResult {
  const value = (match[0] ?? "") as string;
  const index = (match.index ?? 0) as number;
  const groups: Record<string, string> = {};

  if (match.groups) {
    for (const [name, val] of Object.entries(match.groups)) {
      groups[name] = val ?? "";
    }
  }

  const groupValues: string[] = [];
  for (let i = 0; i < match.length; i++) {
    groupValues.push(match[i] ?? "");
  }

  return {
    value,
    index,
    endIndex: index + value.length,
    isZeroWidth: value.length === 0,
    groups,
    groupValues,
  };
}

function executeMatch(
  pattern: string,
  flags: string,
  input: string
): Omit<RegexWorkerMatchResponse, "id" | "ok" | "mode"> {
  const regex = new RegExp(pattern, flags);

  if (flags.includes("g")) {
    const rawMatches = Array.from(input.matchAll(regex));
    const matchCount = rawMatches.length;
    const matches = rawMatches.slice(0, MAX_MATCHES).map((m) => mapMatch(m, flags.includes("d")));
    return { matches, matchCount };
  } else {
    try {
      const match = regex.exec(input);
      if (match) {
        return {
          matches: [mapMatch(match, flags.includes("d"))],
          matchCount: 1,
        };
      }
      return { matches: [], matchCount: 0 };
    } catch {
      return { matches: [], matchCount: 0 };
    }
  }
}

function formatReplacement(replacement: string, match: RegExpMatchArray): string {
  return replacement.replace(
    /\$(\d+)|\$<([^>]+)>|\$&/g,
    (_, num: string | undefined, name: string | undefined) => {
      if (num !== undefined) {
        const idx = parseInt(num, 10);
        return (match[idx] ?? "") as string;
      }
      if (name !== undefined) {
        return (match.groups?.[name] ?? "") as string;
      }
      return (match[0] ?? "") as string;
    }
  );
}

function executeReplace(
  pattern: string,
  flags: string,
  input: string,
  replacement: string
): Omit<RegexWorkerReplaceResponse, "id" | "ok" | "mode"> {
  const regex = new RegExp(pattern, flags);
  let replaceCount = 0;
  let result: string;

  if (flags.includes("g")) {
    replaceCount = 0;
    result = input.replace(new RegExp(pattern, flags), (...mArgs: unknown[]) => {
      replaceCount++;
      const m = mArgs as unknown as RegExpMatchArray;
      return formatReplacement(replacement, m);
    });
  } else {
    const m = regex.exec(input);
    if (m) {
      replaceCount = 1;
      result = input.replace(regex, formatReplacement(replacement, m));
    } else {
      result = input;
    }
  }

  return { output: result, replaceCount };
}

self.onmessage = (ev: MessageEvent<RegexWorkerRequest>) => {
  const req = ev.data;
  try {
    if (req.mode === "match") {
      const { matches, matchCount } = executeMatch(req.pattern, req.flags, req.input);
      const res: RegexWorkerMatchResponse = {
        id: req.id,
        ok: true,
        mode: "match",
        matches,
        matchCount,
      };
      (self as unknown as Worker).postMessage(res);
    } else {
      const { output, replaceCount } = executeReplace(
        req.pattern,
        req.flags,
        req.input,
        req.replacement ?? ""
      );
      const res: RegexWorkerReplaceResponse = {
        id: req.id,
        ok: true,
        mode: "replace",
        output,
        replaceCount,
      };
      (self as unknown as Worker).postMessage(res);
    }
  } catch (e) {
    const err: RegexWorkerErrorResponse = {
      id: req.id,
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    };
    (self as unknown as Worker).postMessage(err);
  }
};
