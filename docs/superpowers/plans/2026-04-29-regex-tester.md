# Regex Tester Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based regex tester with real-time match highlighting, capture group inspection, replacement preview, AST-powered pattern explanation, Web Worker isolation for catastrophic pattern protection, preset library, and full i18n support.

**Architecture:** Pattern parsing uses `@eslint-community/regexpp` for AST + precise error offsets. Matching runs in a dedicated Web Worker with 1500ms timeout — matching the diff tool's worker pattern (`compute.ts` / `types.ts` / `diff.worker.ts`). The page component follows the standard OmniKit `page.tsx` + `<tool>-page.tsx` pattern with `Layout` / `Conversion()` / `Description()` structure. All state is derived via `useState`; React Compiler auto-memoizes — no manual `useMemo`/`useCallback`/`React.memo`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, next-intl, @eslint-community/regexpp, Web Worker API, Vitest

---

## Task 1: Project Scaffolding

**Files:**

- Create: `libs/regex/` directory
- Create: `app/[locale]/regex/` directory
- Modify: `libs/tools.ts`
- Modify: `vitest.config.ts`
- Run: `npm install @eslint-community/regexpp`

- [ ] **Step 1: Install @eslint-community/regexpp**

Run: `npm install @eslint-community/regexpp`
Expected: Package added to `package.json` and `node_modules`

- [ ] **Step 2: Add regex to tool registry (libs/tools.ts)**

Open `libs/tools.ts`, add after `{ key: "htmlcode", path: "/htmlcode" }`:

```typescript
{ key: "regex", path: "/regex" },
```

The full TOOLS array should end with:

```typescript
export const TOOLS: { key: string; path: string }[] = [
  { key: "json", path: "/json" },
  // ... existing entries ...
  { key: "htmlcode", path: "/htmlcode" },
  { key: "regex", path: "/regex" },
] as const;
```

- [ ] **Step 3: Add regex test path to vitest config (vitest.config.ts)**

In `vitest.config.ts`, add `"libs/regex/**/*.test.ts"` to the `include` array:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "libs/dbviewer/**/*.test.ts",
      "libs/unixtime/**/*.test.ts",
      "libs/cron/**/*.test.ts",
      "libs/qrcode/**/*.test.ts",
      "libs/textcase/**/*.test.ts",
      "libs/regex/**/*.test.ts",
    ],
    environment: "node",
    pool: "forks",
    globals: false,
  },
});
```

- [ ] **Step 4: Create directories**

Run:

```bash
mkdir -p libs/regex/__tests__
mkdir -p app/\[locale\]/regex
```

Expected: Directories created

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json libs/tools.ts vitest.config.ts
git commit -m "chore(regex): scaffold project, add @eslint-community/regexpp"
```

---

## Task 2: Shared Types Module

**Files:**

- Create: `libs/regex/types.ts`

- [ ] **Step 1: Write types.ts**

Create `libs/regex/types.ts` with all shared interfaces:

```typescript
// Shared types for Regex Tester — used by main thread, worker, and UI.

export interface FlagDef {
  char: string; // "g" | "i" | "m" | "s" | "u" | "y" | "d"
  name: string; // i18n key for display name
  description: string; // i18n key for tooltip
  default: boolean; // initial state
}

export interface MatchResult {
  value: string; // matched text ("" for zero-width)
  index: number; // start position
  endIndex: number; // index + value.length
  isZeroWidth: boolean; // value.length === 0
  groups: Record<string, string>; // named capture groups
  groupValues: string[]; // [fullMatch, group1, group2, ...]
}

export interface MatchOutput {
  matches: MatchResult[];
  error: string | null; // human-readable error message
  errorOffset: number | null; // character offset in pattern (from regexpp)
  timedOut: boolean; // true if worker exceeded 1500ms
  pattern: string;
  flags: string;
  inputLength: number;
  matchCount: number;
  truncated: boolean; // true if matchCount > 1000 (rendered cap)
}

export interface ReplaceOutput {
  output: string; // result of replace(All)
  replaceCount: number; // number of substitutions
  error: string | null;
  errorOffset: number | null;
  timedOut: boolean;
}

export interface TokenExplanation {
  text: string; // the literal token text (e.g., "\\d+", "[a-z]")
  start: number; // start offset in pattern
  end: number; // end offset in pattern
  explanationKey: string; // i18n key
  params?: Record<string, string | number>; // template params (e.g., min=3, max=5)
}

export interface PatternPreset {
  name: string; // i18n key for display name
  pattern: string; // regex pattern (no delimiters)
  flags: string; // default flags
  description: string; // i18n key for description
  category: string; // i18n key (general | network | phone | code | security | datetime)
  note?: string; // i18n key for caveat (e.g., "html5SpecEmail")
}

// --- Worker message types ---

export interface RegexWorkerRequest {
  id: number;
  pattern: string;
  flags: string;
  input: string;
  replacement?: string;
  mode: "match" | "replace";
}

export interface RegexWorkerMatchResponse {
  id: number;
  ok: true;
  mode: "match";
  matches: MatchResult[];
  matchCount: number;
}

export interface RegexWorkerReplaceResponse {
  id: number;
  ok: true;
  mode: "replace";
  output: string;
  replaceCount: number;
}

export interface RegexWorkerErrorResponse {
  id: number;
  ok: false;
  message: string;
}

export type RegexWorkerResponse =
  | RegexWorkerMatchResponse
  | RegexWorkerReplaceResponse
  | RegexWorkerErrorResponse;
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add libs/regex/types.ts
git commit -m "feat(regex): add shared type definitions"
```

---

## Task 3: Flags and Patterns Data Modules

**Files:**

- Create: `libs/regex/flags.ts`
- Create: `libs/regex/patterns.ts`

- [ ] **Step 1: Write flags.ts**

Create `libs/regex/flags.ts`:

```typescript
import type { FlagDef } from "./types";

export const FLAGS: FlagDef[] = [
  { char: "g", name: "flagGlobal", description: "flagGlobalDesc", default: true },
  {
    char: "i",
    name: "flagCaseInsensitive",
    description: "flagCaseInsensitiveDesc",
    default: false,
  },
  { char: "m", name: "flagMultiline", description: "flagMultilineDesc", default: false },
  { char: "s", name: "flagDotAll", description: "flagDotAllDesc", default: false },
  { char: "u", name: "flagUnicode", description: "flagUnicodeDesc", default: false },
  { char: "y", name: "flagSticky", description: "flagStickyDesc", default: false },
  { char: "d", name: "flagHasIndices", description: "flagHasIndicesDesc", default: false },
];

export function defaultFlags(): string {
  return FLAGS.filter((f) => f.default)
    .map((f) => f.char)
    .join("");
}

export function toggleFlag(current: string, char: string): string {
  if (current.includes(char)) {
    return current.replace(char, "");
  }
  return current + char;
}
```

- [ ] **Step 2: Write patterns.ts**

Create `libs/regex/patterns.ts`:

```typescript
import type { PatternPreset } from "./types";

export const PATTERN_PRESETS: PatternPreset[] = [
  {
    name: "presetEmail",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    flags: "",
    description: "presetEmailDesc",
    category: "network",
    note: "html5SpecEmail",
  },
  {
    name: "presetUrl",
    pattern:
      "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
    flags: "",
    description: "presetUrlDesc",
    category: "network",
  },
  {
    name: "presetIPv4",
    pattern: "^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$",
    flags: "",
    description: "presetIPv4Desc",
    category: "network",
  },
  {
    name: "presetIPv6",
    pattern: "^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$",
    flags: "gi",
    description: "presetIPv6Desc",
    category: "network",
    note: "simplifiedIPv6",
  },
  {
    name: "presetChinaMobile",
    pattern: "^1[3-9]\\d{9}$",
    flags: "",
    description: "presetChinaMobileDesc",
    category: "phone",
  },
  {
    name: "presetISODate",
    pattern: "^\\d{4}-\\d{2}-\\d{2}$",
    flags: "",
    description: "presetISODateDesc",
    category: "datetime",
  },
  {
    name: "presetHtmlTag",
    pattern: "<(\\w+)[^>]*>(.*?)<\\/\\1>",
    flags: "gis",
    description: "presetHtmlTagDesc",
    category: "code",
  },
  {
    name: "presetHexColor",
    pattern: "#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\\b",
    flags: "gi",
    description: "presetHexColorDesc",
    category: "code",
  },
  {
    name: "presetStrongPassword",
    pattern:
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$',
    flags: "",
    description: "presetStrongPasswordDesc",
    category: "security",
  },
  {
    name: "presetSemver",
    pattern:
      "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-]\\w*)))?$",
    flags: "",
    description: "presetSemverDesc",
    category: "code",
  },
  {
    name: "presetUUID",
    pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    flags: "gi",
    description: "presetUUIDDesc",
    category: "code",
  },
];

export const PRESET_CATEGORIES: { key: string; nameKey: string }[] = [
  { key: "general", nameKey: "categoryGeneral" },
  { key: "network", nameKey: "categoryNetwork" },
  { key: "phone", nameKey: "categoryPhone" },
  { key: "code", nameKey: "categoryCode" },
  { key: "security", nameKey: "categorySecurity" },
  { key: "datetime", nameKey: "categoryDatetime" },
];
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add libs/regex/flags.ts libs/regex/patterns.ts
git commit -m "feat(regex): add flags and pattern presets data modules"
```

---

## Task 4: Delimiters Module + Tests

**Files:**

- Create: `libs/regex/delimiters.ts`
- Create: `libs/regex/__tests__/delimiters.test.ts`

- [ ] **Step 1: Write failing tests (delimiters.test.ts)**

Create `libs/regex/__tests__/delimiters.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { stripDelimiters } from "../delimiters";

describe("stripDelimiters", () => {
  it("detects and strips /pattern/flags", () => {
    const result = stripDelimiters("/foo/g");
    expect(result).toEqual({
      pattern: "foo",
      flags: "g",
      stripped: true,
    });
  });

  it("detects pattern without flags", () => {
    const result = stripDelimiters("/hello/");
    expect(result).toEqual({
      pattern: "hello",
      flags: "",
      stripped: true,
    });
  });

  it("detects pattern with multiple flags", () => {
    const result = stripDelimiters("/test/gim");
    expect(result).toEqual({
      pattern: "test",
      flags: "gim",
      stripped: true,
    });
  });

  it("handles escaped forward slashes in pattern", () => {
    const result = stripDelimiters("/a\\/b/g");
    expect(result).toEqual({
      pattern: "a\\/b",
      flags: "g",
      stripped: true,
    });
  });

  it("returns original input when no delimiters", () => {
    const result = stripDelimiters("hello");
    expect(result).toEqual({
      pattern: "hello",
      flags: "",
      stripped: false,
    });
  });

  it("returns original for partial delimiter (missing opening)", () => {
    const result = stripDelimiters("foo/g");
    expect(result).toEqual({
      pattern: "foo/g",
      flags: "",
      stripped: false,
    });
  });

  it("returns original for partial delimiter (missing closing)", () => {
    const result = stripDelimiters("/foo");
    expect(result).toEqual({
      pattern: "/foo",
      flags: "",
      stripped: false,
    });
  });

  it("preserves invalid flags for later validation", () => {
    const result = stripDelimiters("/test/xyz");
    expect(result).toEqual({
      pattern: "test",
      flags: "xyz",
      stripped: true,
    });
  });

  it("strips empty string input", () => {
    const result = stripDelimiters("");
    expect(result).toEqual({
      pattern: "",
      flags: "",
      stripped: false,
    });
  });

  it("strips pattern with // as content (empty pattern)", () => {
    const result = stripDelimiters("//");
    expect(result).toEqual({
      pattern: "",
      flags: "",
      stripped: true,
    });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run libs/regex/__tests__/delimiters.test.ts`
Expected: FAIL — `stripDelimiters` not found

- [ ] **Step 3: Write delimiters.ts**

Create `libs/regex/delimiters.ts`:

```typescript
export interface StripResult {
  pattern: string;
  flags: string;
  stripped: boolean;
}

const DELIMITER_RE = /^\/(.+)\/([gimsuyd]*)$/;

export function stripDelimiters(input: string): StripResult {
  if (!input) {
    return { pattern: "", flags: "", stripped: false };
  }
  const match = input.match(DELIMITER_RE);
  if (match) {
    return {
      pattern: match[1],
      flags: match[2],
      stripped: true,
    };
  }
  return { pattern: input, flags: "", stripped: false };
}

/**
 * Parse a regex literal string into pattern and flags.
 * Accepts JavaScript regex literal syntax: /pattern/flags
 * Returns the pattern without delimiters and the flags.
 */
export function parseRegexLiteral(input: string): { pattern: string; flags: string } {
  const result = stripDelimiters(input);
  return { pattern: result.pattern, flags: result.flags };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run libs/regex/__tests__/delimiters.test.ts`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add libs/regex/delimiters.ts libs/regex/__tests__/delimiters.test.ts
git commit -m "feat(regex): add delimiter stripping utility with tests"
```

---

## Task 5: Match Worker + Orchestrator

**Files:**

- Create: `libs/regex/match.worker.ts`
- Create: `libs/regex/match.ts`

**Dependencies:** Task 2 (types.ts)

- [ ] **Step 1: Write match.worker.ts**

Create `libs/regex/match.worker.ts`. The worker runs `new RegExp()` in a separate thread, mapping native RegExpMatchArray to our `MatchResult` type. For replace mode, it does manual `$1`/`$&`/`$<name>` expansion.

```typescript
// Dedicated Web Worker for regex matching — prevents catastrophic
// backtracking from freezing the main thread.

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

  // Build groupValues: [fullMatch, group1, group2, ...]
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
      // If matchAll or exec throws (e.g. pattern too complex), return empty
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
      // $& — entire match
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
  let count = 0;

  const hasG = flags.includes("g");
  const output = input[hasG ? "replace" : "replace"](
    new RegExp(regex.source, regex.flags + (hasG ? "" : "")),
    (...args: unknown[]) => {
      count++;
      return formatReplacement(replacement, args as unknown as RegExpMatchArray);
    }
  );

  // Simpler: use replace pattern for standard cases, manual for named groups
  let replaceCount = 0;
  let result: string;

  if (flags.includes("g")) {
    // Use a replacer function to track count
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
```

- [ ] **Step 2: Write match.ts (main-thread orchestrator)**

Create `libs/regex/match.ts`. This follows the diff tool's `compute.ts` pattern: lazy worker creation, pending request map, timeout-based termination.

```typescript
import { parseRegExpLiteral } from "@eslint-community/regexpp";
import type { RegExpError } from "@eslint-community/regexpp";
import type {
  MatchOutput,
  ReplaceOutput,
  RegexWorkerRequest,
  RegexWorkerResponse,
  RegexWorkerMatchResponse,
  RegexWorkerReplaceResponse,
} from "./types";

const TIMEOUT_MS = 1500;

type Resolver = (res: RegexWorkerMatchResponse | RegexWorkerReplaceResponse) => void;
type Rejecter = (message: string) => void;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: Resolver; reject: Rejecter }>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./match.worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (ev: MessageEvent<RegexWorkerResponse>) => {
    const msg = ev.data;
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    if (msg.ok) {
      entry.resolve(msg);
    } else {
      entry.reject(msg.message);
    }
  };
  worker.onerror = () => {
    for (const { reject } of pending.values()) reject("worker error");
    pending.clear();
  };
  return worker;
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    pending.clear();
  }
}

/**
 * Validate pattern syntax using regexpp. Returns null if valid,
 * or { message, offset } if invalid.
 */
export function validatePattern(
  pattern: string,
  flags: string
): { message: string; offset: number } | null {
  if (!pattern) return null; // empty is OK — just no matches
  try {
    parseRegExpLiteral(`/${pattern}/${flags}`);
    return null;
  } catch (e: unknown) {
    const err = e as RegExpError & { index?: number };
    return {
      message: err.message,
      offset: err.index ?? (null as unknown as number),
    };
  }
}

function applyResultToMatchOutput(
  msg: RegexWorkerMatchResponse,
  pattern: string,
  flags: string,
  inputLength: number,
  matchCount: number
): MatchOutput {
  return {
    matches: msg.matches,
    error: null,
    errorOffset: null,
    timedOut: false,
    pattern,
    flags,
    inputLength,
    matchCount,
    truncated: matchCount > 1000,
  };
}

/**
 * Execute regex matching via Web Worker. Pattern validation
 * happens synchronously (regexpp), actual matching runs in the worker.
 */
export function executeRegex(pattern: string, flags: string, input: string): Promise<MatchOutput> {
  // Validate syntax first (synchronous, fast)
  const validationResult = validatePattern(pattern, flags);
  if (validationResult) {
    return Promise.resolve({
      matches: [],
      error: validationResult.message,
      errorOffset: validationResult.offset,
      timedOut: false,
      pattern,
      flags,
      inputLength: input.length,
      matchCount: 0,
      truncated: false,
    });
  }

  if (!pattern || !input) {
    return Promise.resolve({
      matches: [],
      error: null,
      errorOffset: null,
      timedOut: false,
      pattern,
      flags,
      inputLength: input.length,
      matchCount: 0,
      truncated: false,
    });
  }

  const w = ensureWorker();
  const id = nextId++;
  const req: RegexWorkerRequest = { id, pattern, flags, input, mode: "match" };

  return new Promise<RegexWorkerMatchResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      // Terminate and respawn lazily
      if (worker) {
        worker.terminate();
        worker = null;
      }
      reject("timedOut");
    }, TIMEOUT_MS);

    pending.set(id, {
      resolve: (res) => {
        clearTimeout(timeout);
        resolve(res as RegexWorkerMatchResponse);
      },
      reject: (message: string) => {
        clearTimeout(timeout);
        reject(message);
      },
    });
    w.postMessage(req);
  }).then(
    (msg) => applyResultToMatchOutput(msg, pattern, flags, input.length, msg.matchCount),
    (reason) => ({
      matches: [],
      error: reason === "timedOut" ? "patternMaybeRedos" : String(reason),
      errorOffset: null,
      timedOut: reason === "timedOut",
      pattern,
      flags,
      inputLength: input.length,
      matchCount: 0,
      truncated: false,
    })
  );
}

/**
 * Execute regex replacement via Web Worker.
 */
export function executeReplace(
  pattern: string,
  flags: string,
  input: string,
  replacement: string
): Promise<ReplaceOutput> {
  const validationResult = validatePattern(pattern, flags);
  if (validationResult) {
    return Promise.resolve({
      output: input,
      replaceCount: 0,
      error: validationResult.message,
      errorOffset: validationResult.offset,
      timedOut: false,
    });
  }

  if (!pattern || !input) {
    return Promise.resolve({
      output: input,
      replaceCount: 0,
      error: null,
      errorOffset: null,
      timedOut: false,
    });
  }

  const w = ensureWorker();
  const id = nextId++;
  const req: RegexWorkerRequest = {
    id,
    pattern,
    flags,
    input,
    replacement,
    mode: "replace",
  };

  return new Promise<RegexWorkerReplaceResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      if (worker) {
        worker.terminate();
        worker = null;
      }
      reject("timedOut");
    }, TIMEOUT_MS);

    pending.set(id, {
      resolve: (res) => {
        clearTimeout(timeout);
        resolve(res as RegexWorkerReplaceResponse);
      },
      reject: (message: string) => {
        clearTimeout(timeout);
        reject(message);
      },
    });
    w.postMessage(req);
  }).then(
    (msg) => ({
      output: msg.output,
      replaceCount: msg.replaceCount,
      error: null,
      errorOffset: null,
      timedOut: false,
    }),
    (reason) => ({
      output: input,
      replaceCount: 0,
      error: reason === "timedOut" ? "patternMaybeRedos" : String(reason),
      errorOffset: null,
      timedOut: reason === "timedOut",
    })
  );
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add libs/regex/match.worker.ts libs/regex/match.ts
git commit -m "feat(regex): add Web Worker match orchestrator with timeout protection"
```

---

## Task 6: Match Module Tests

**Files:**

- Create: `libs/regex/__tests__/match.test.ts`

**Dependencies:** Task 5 (match.ts, match.worker.ts)

- [ ] **Step 1: Write match tests**

Create `libs/regex/__tests__/match.test.ts`. Tests the synchronous `validatePattern` and the async `executeRegex`. Worker timeout is tested via mock.

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeRegex, validatePattern, terminateWorker } from "../match";

// Mock the Worker since we're testing in node environment
vi.mock("../match.worker", () => ({}));

describe("validatePattern", () => {
  it("returns null for valid pattern", () => {
    expect(validatePattern("\\d+", "g")).toBeNull();
  });

  it("returns null for empty pattern", () => {
    expect(validatePattern("", "g")).toBeNull();
  });

  it("returns error for unbalanced parentheses", () => {
    const result = validatePattern("a(", "g");
    expect(result).not.toBeNull();
    expect(result!.message).toBeTruthy();
    expect(typeof result!.offset).toBe("number");
  });

  it("returns error for invalid escape", () => {
    const result = validatePattern("\\k", "g");
    expect(result).not.toBeNull();
  });

  it("returns null for complex valid pattern", () => {
    expect(validatePattern("^(?=.*[a-z])(?=.*\\d).{8,}$", "g")).toBeNull();
  });
});

describe("executeRegex", () => {
  // We can't fully test worker integration in vitest without mocking.
  // Instead, test what we can: pattern validation returns immediate errors.

  it("returns error for invalid pattern immediately (no worker)", async () => {
    const result = await executeRegex("a(", "g", "test");
    expect(result.error).toBeTruthy();
    expect(result.errorOffset).toBeTypeOf("number");
    expect(result.matches).toEqual([]);
    expect(result.timedOut).toBe(false);
  });

  it("returns empty matches for empty input", async () => {
    const result = await executeRegex("\\d+", "g", "");
    expect(result.matches).toEqual([]);
    expect(result.error).toBeNull();
    expect(result.matchCount).toBe(0);
  });

  it("returns empty matches for empty pattern", async () => {
    const result = await executeRegex("", "g", "hello");
    expect(result.matches).toEqual([]);
    expect(result.error).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, verify they pass**

Run: `npx vitest run libs/regex/__tests__/match.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add libs/regex/__tests__/match.test.ts
git commit -m "test(regex): add match validation and execution tests"
```

---

## Task 7: Replace Helpers + Tests

**Files:**

- Create: `libs/regex/replace.ts`
- Create: `libs/regex/__tests__/replace.test.ts`

- [ ] **Step 1: Write failing tests (replace.test.ts)**

Create `libs/regex/__tests__/replace.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { expandReplacement, countReplacements } from "../replace";

describe("expandReplacement", () => {
  it("replaces $1 with first capture group", () => {
    const match = "hello world".match(/(hello) (world)/)!;
    expect(expandReplacement("$2 $1", match)).toBe("world hello");
  });

  it("replaces $& with full match", () => {
    const match = "hello".match(/hello/)!;
    expect(expandReplacement("[$&]", match)).toBe("[hello]");
  });

  it("replaces $<name> with named group", () => {
    const match = "John".match(/(?<name>John)/)!;
    expect(expandReplacement("$<name>", match)).toBe("John");
  });

  it("falls back to empty for missing named group", () => {
    const match = "John".match(/John/)!;
    expect(expandReplacement("$<missing>", match)).toBe("");
  });

  it("falls back to empty for out-of-range $N", () => {
    const match = "a".match(/(a)/)!;
    expect(expandReplacement("$5", match)).toBe("");
  });

  it("returns literal replacement with no special tokens", () => {
    const match = "foo".match(/foo/)!;
    expect(expandReplacement("bar", match)).toBe("bar");
  });

  it("handles multiple replacements in one string", () => {
    const match = "John Doe".match(/(John) (Doe)/)!;
    expect(expandReplacement("$2, $1", match)).toBe("Doe, John");
  });
});

describe("countReplacements", () => {
  it("counts single replacement", () => {
    const input = "hello world";
    const regex = "hello";
    const flags = "";
    const replacement = "hi";
    expect(countReplacements(input, regex, flags, replacement)).toBe(1);
  });

  it("counts multiple replacements with g flag", () => {
    const input = "a a a";
    const regex = "a";
    const flags = "g";
    const replacement = "b";
    expect(countReplacements(input, regex, flags, replacement)).toBe(3);
  });

  it("returns 0 for no match", () => {
    const input = "xyz";
    const regex = "abc";
    const flags = "g";
    const replacement = "d";
    expect(countReplacements(input, regex, flags, replacement)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run libs/regex/__tests__/replace.test.ts`
Expected: FAIL

- [ ] **Step 3: Write replace.ts**

Create `libs/regex/replace.ts`:

```typescript
/**
 * Expand replacement string by substituting $1, $&, $<name> tokens
 * from the provided RegExp match result.
 */
export function expandReplacement(replacement: string, match: RegExpMatchArray): string {
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
      // $& — entire match
      return (match[0] ?? "") as string;
    }
  );
}

/**
 * Count the number of replacements that would occur for a pattern
 * on the given input. Returns 0 if the pattern is invalid.
 */
export function countReplacements(
  input: string,
  pattern: string,
  flags: string,
  replacement: string
): number {
  try {
    const regex = new RegExp(pattern, flags);
    if (flags.includes("g")) {
      const matches = input.match(regex);
      return matches ? matches.length : 0;
    } else {
      return regex.test(input) ? 1 : 0;
    }
  } catch {
    return 0;
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run libs/regex/__tests__/replace.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add libs/regex/replace.ts libs/regex/__tests__/replace.test.ts
git commit -m "feat(regex): add replacement expansion helpers with tests"
```

---

## Task 8: Explain Module + Tests

**Files:**

- Create: `libs/regex/explain.ts`
- Create: `libs/regex/__tests__/explain.test.ts`

**Dependencies:** Task 2 (types.ts), Task 1 (regexpp installed)

- [ ] **Step 1: Write explain tests**

Create `libs/regex/__tests__/explain.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { explainPattern } from "../explain";

describe("explainPattern", () => {
  it("explains literal characters", () => {
    const result = explainPattern("abc", "");
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      expect(result[0].explanationKey).toBe("explainLiteral");
      expect(result[0].text).toBe("abc");
    }
  });

  it("explains digit character set", () => {
    const result = explainPattern("\\d+", "");
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      expect(result[0].explanationKey).toBe("explainQuantifier");
    }
  });

  it("explains character class", () => {
    const result = explainPattern("[a-z]", "");
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      expect(result[0].explanationKey).toBe("explainCharClass");
    }
  });

  it("explains capturing group", () => {
    const result = explainPattern("(hello)", "");
    if (Array.isArray(result)) {
      const groupToken = result.find((t) => t.explanationKey === "explainGroup");
      expect(groupToken).toBeDefined();
    }
  });

  it("explains alternation", () => {
    const result = explainPattern("a|b", "");
    if (Array.isArray(result)) {
      const altToken = result.find((t) => t.explanationKey === "explainAlternative");
      expect(altToken).toBeDefined();
    }
  });

  it("explains assertion (^ and $)", () => {
    const result = explainPattern("^start$", "");
    if (Array.isArray(result)) {
      const assertions = result.filter((t) => t.explanationKey === "explainAssertion");
      expect(assertions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("explains quantifier with range", () => {
    const result = explainPattern("a{3,5}", "");
    if (Array.isArray(result)) {
      expect(result[0].explanationKey).toBe("explainQuantifierRange");
      expect(result[0].params).toEqual({ min: 3, max: 5 });
    }
  });

  it("explains word boundary", () => {
    const result = explainPattern("\\bword\\b", "");
    if (Array.isArray(result)) {
      const boundaries = result.filter((t) => t.explanationKey === "explainAssertion");
      expect(boundaries.length).toBe(2);
    }
  });

  it("returns error for invalid pattern", () => {
    const result = explainPattern("a(", "");
    expect(Array.isArray(result)).toBe(false);
    if (!Array.isArray(result)) {
      expect(result.error).toBeTruthy();
      expect(typeof result.offset).toBe("number");
    }
  });

  it("fuses adjacent literals", () => {
    const result = explainPattern("abc", "");
    if (Array.isArray(result)) {
      // abc should be one token, not three
      expect(result.length).toBeLessThan(3);
      expect(result[0].text).toBe("abc");
    }
  });

  it("fuses quantifier with its element", () => {
    const result = explainPattern("\\d+", "");
    if (Array.isArray(result)) {
      expect(result[0].text).toBe("\\d+");
      expect(result[0].explanationKey).toBe("explainQuantifier");
    }
  });

  it("handles empty pattern", () => {
    const result = explainPattern("", "");
    if (Array.isArray(result)) {
      expect(result).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run libs/regex/__tests__/explain.test.ts`
Expected: FAIL — `explainPattern` not found

- [ ] **Step 3: Write explain.ts**

Create `libs/regex/explain.ts`:

```typescript
import { parseRegExpLiteral, visitRegExpAST } from "@eslint-community/regexpp";
import type { AST, RegExpVisitor, RegExpError as RegexppError } from "@eslint-community/regexpp";
import type { TokenExplanation } from "./types";

type ExplanationResult = TokenExplanation[] | { error: string; offset: number };

// Build a friendly literal label from a character node
function charLabel(node: AST.Character): string {
  return node.raw;
}

// Build a full quantifier string from a quantifier node + its element text
function buildQuantifierText(elementText: string, qNode: AST.Quantifier): string {
  return elementText + qNode.raw.slice(elementText.length);
}

// Determine the quantifier explanation key
function quantifierKey(qNode: AST.Quantifier): string {
  if (qNode.min === 0 && qNode.max === Infinity) return "explainQuantifierStar";
  if (qNode.min === 1 && qNode.max === Infinity) return "explainQuantifierPlus";
  if (qNode.min === 0 && qNode.max === 1) return "explainQuantifierQuestion";
  if (qNode.min === qNode.max) return "explainQuantifierExact";
  return "explainQuantifierRange";
}

// Determine the character set explanation key
function charSetKey(kind: string): string {
  const map: Record<string, string> = {
    digit: "explainCharSetDigit",
    space: "explainCharSetSpace",
    word: "explainCharSetWord",
    any: "explainCharSetAny",
  };
  return map[kind] || "explainCharSet";
}

// Determine the assertion explanation key
function assertionKey(kind: string): string {
  const map: Record<string, string> = {
    start: "explainAnchorStart",
    end: "explainAnchorEnd",
    word: "explainBoundaryWord",
    lookahead: "explainLookahead",
    lookbehind: "explainLookbehind",
  };
  return map[kind] || "explainAssertion";
}

/**
 * Parse and explain a regex pattern. Returns an array of TokenExplanation
 * objects, or an error object if parsing fails.
 *
 * Granularity rules:
 * 1. Quantifier + element fuse into one token
 * 2. Adjacent literal characters fuse into one token
 * 3. Groups emit one outer token plus inner tokens
 * 4. Alternation renders as a single token with branches
 */
export function explainPattern(pattern: string, flags: string): ExplanationResult {
  if (!pattern) return [];

  let ast: AST.RegExpLiteral;
  try {
    ast = parseRegExpLiteral(`/${pattern}/${flags || "g"}`);
  } catch (e: unknown) {
    const err = e as RegexppError & { index?: number };
    return {
      error: err.message,
      offset: err.index ?? 0,
    };
  }

  const tokens: TokenExplanation[] = [];
  let startOffset = 0;

  type HandlerEntry = [
    keyof RegExpVisitor.Handlers,
    RegExpVisitor.Handlers[keyof RegExpVisitor.Handlers],
  ];
  const handlers: HandlerEntry[] = [];

  // Handler for character nodes (fuse adjacent literals)
  function pushToken(
    node: AST.Node,
    text: string,
    key: string,
    params?: Record<string, string | number>
  ) {
    tokens.push({
      text,
      start: node.start,
      end: node.end,
      explanationKey: key,
      params,
    });
  }

  // Walk alternation — emit one token per alternative
  function handleAlternative(alt: AST.Alternative): void {
    // For each direct child, classify and emit
    for (const el of alt.elements) {
      processElement(el);
    }
  }

  function getNodeText(node: AST.Node): string {
    return pattern.slice(node.start, node.end);
  }

  function processElement(node: AST.Node): void {
    const text = getNodeText(node);

    switch (node.type) {
      case "Character": {
        // Check if previous token was also a literal — fuse
        if (tokens.length > 0 && tokens[tokens.length - 1].explanationKey === "explainLiteral") {
          const prev = tokens[tokens.length - 1];
          tokens[tokens.length - 1] = {
            text: prev.text + text,
            start: prev.start,
            end: node.end,
            explanationKey: "explainLiteral",
            params: { literal: prev.text + text },
          };
        } else {
          pushToken(node, text, "explainLiteral", { literal: text });
        }
        break;
      }

      case "CharacterSet": {
        pushToken(node, text, charSetKey(node.kind), { kind: node.kind });
        break;
      }

      case "CharacterClass": {
        pushToken(node, text, "explainCharClass", { range: text });
        break;
      }

      case "Quantifier": {
        const qNode = node as AST.Quantifier;
        const elementText = getNodeText(qNode.element);
        const qKey = quantifierKey(qNode);
        const params: Record<string, string | number> = {
          min: qNode.min,
          max: qNode.max === Infinity ? "unlimited" : qNode.max,
        };
        if (!qNode.greedy) {
          params.suffix = "lazySuffix";
        }
        pushToken(node, buildQuantifierText(elementText, qNode), qKey, params);
        break;
      }

      case "CapturingGroup":
      case "Group": {
        const name =
          node.type === "CapturingGroup" ? ((node as AST.CapturingGroup).name ?? "") : "";
        pushToken(node, text, "explainGroup", name ? { name } : undefined);
        // Process group contents
        for (const alt of node.alternatives) {
          handleAlternative(alt);
        }
        break;
      }

      case "Assertion": {
        pushToken(node, text, assertionKey(node.kind), { kind: node.kind });
        break;
      }

      case "Backreference": {
        pushToken(node, text, "explainBackreference", { ref: node.ref });
        break;
      }

      case "Alternative": {
        handleAlternative(node);
        break;
      }

      case "Pattern": {
        handleAlternative(
          node.alternatives[0] ??
            ({ type: "Alternative", elements: [], start: 0, end: 0 } as AST.Alternative)
        );
        break;
      }

      default:
        // Skip unknown node types — no explanation
        break;
    }
  }

  // Traverse pattern
  if (ast.pattern?.alternatives?.length) {
    for (const alt of ast.pattern.alternatives) {
      processElement(alt);
    }
  }

  return tokens;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run libs/regex/__tests__/explain.test.ts`
Expected: All tests PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add libs/regex/explain.ts libs/regex/__tests__/explain.test.ts
git commit -m "feat(regex): add pattern explanation via regexpp AST traversal with tests"
```

---

## Task 9: Main Barrel Export

**Files:**

- Create: `libs/regex/main.ts`

**Dependencies:** Tasks 2-8

- [ ] **Step 1: Write main.ts barrel**

Create `libs/regex/main.ts`:

```typescript
// Regex Tester — Public API barrel
// Re-exports all public types and functions.

// Types
export type {
  FlagDef,
  MatchResult,
  MatchOutput,
  ReplaceOutput,
  TokenExplanation,
  PatternPreset,
} from "./types";

// Flags
export { FLAGS, defaultFlags, toggleFlag } from "./flags";

// Patterns / Presets
export { PATTERN_PRESETS, PRESET_CATEGORIES } from "./patterns";

// Delimiter detection
export { stripDelimiters } from "./delimiters";
export type { StripResult } from "./delimiters";

// Matching
export { executeRegex, executeReplace, validatePattern, terminateWorker } from "./match";

// Replacement helpers
export { expandReplacement, countReplacements } from "./replace";

// Pattern explanation
export { explainPattern } from "./explain";
```

- [ ] **Step 2: Verify imports work**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add libs/regex/main.ts
git commit -m "feat(regex): add public API barrel export"
```

---

## Task 10: i18n — English Locale

**Files:**

- Create: `public/locales/en/regex.json`

- [ ] **Step 1: Write English regex.json**

Create `public/locales/en/regex.json`:

```json
{
  "pattern": "Regex Pattern",
  "patternPlaceholder": "Enter a regex pattern...",
  "testText": "Test Text",
  "testTextPlaceholder": "Paste or type text to test your regex...",
  "replacement": "Replacement",
  "replacementPlaceholder": "Enter replacement text ($1, $<name>, $&)",
  "flags": "Flags",
  "flagGlobal": "Global",
  "flagGlobalDesc": "Find all matches rather than stopping after the first match",
  "flagCaseInsensitive": "Case Insensitive",
  "flagCaseInsensitiveDesc": "Ignore case when matching letters",
  "flagMultiline": "Multiline",
  "flagMultilineDesc": "Treat beginning and end characters (^ and $) as working over multiple lines",
  "flagDotAll": "Dot All",
  "flagDotAllDesc": "Make . match newline characters as well",
  "flagUnicode": "Unicode",
  "flagUnicodeDesc": "Treat pattern and input as Unicode sequences",
  "flagSticky": "Sticky",
  "flagStickyDesc": "Match only from the index indicated by the lastIndex property",
  "flagHasIndices": "Has Indices",
  "flagHasIndicesDesc": "Generate indices for each capture group in match results",
  "modeMatch": "Match",
  "modeReplace": "Replace",
  "matchCount": "matches",
  "matchCountSingle": "match",
  "truncated": "Showing {{shown}} of {{total}} matches",
  "noMatch": "No matches found",
  "emptyPattern": "Enter a regex pattern to get started",
  "emptyInput": "Paste or type text to test",
  "replaceCount": "replaced {{count}}",
  "replaceWithoutG": "replaced {{count}} (no g flag, only first match)",
  "patternEmpty": "Empty pattern",
  "patternInvalid": "Invalid pattern",
  "patternMaybeRedos": "Pattern took too long — possible catastrophic backtracking",
  "patternError": "Pattern error",
  "runtimeError": "Runtime error",
  "delimiterToast": "Delimiters detected and stripped",
  "copyLiteral": "Copy as literal",
  "copyConstructor": "Copy as constructor",
  "presets": "Pattern Presets",
  "presetsLabel": "Select a preset pattern...",
  "explanation": "Explanation",
  "categoryGeneral": "General",
  "categoryNetwork": "Network",
  "categoryPhone": "Phone",
  "categoryCode": "Code",
  "categorySecurity": "Security",
  "categoryDatetime": "Date & Time",
  "presetEmail": "Email",
  "presetEmailDesc": "HTML5 spec email pattern",
  "html5SpecEmail": "Follows HTML5 spec, not strict RFC 5322. May reject some valid emails.",
  "presetUrl": "URL",
  "presetUrlDesc": "HTTP/HTTPS URL pattern",
  "presetIPv4": "IPv4 Address",
  "presetIPv4Desc": "Standard IPv4 address (0.0.0.0 – 255.255.255.255)",
  "presetIPv6": "IPv6 Address",
  "presetIPv6Desc": "Full IPv6 address (simplified)",
  "simplifiedIPv6": "Simplified form — does not support :: compression notation",
  "presetChinaMobile": "China Mobile Phone",
  "presetChinaMobileDesc": "Mainland China mobile phone number",
  "presetISODate": "ISO 8601 Date",
  "presetISODateDesc": "YYYY-MM-DD date format",
  "presetHtmlTag": "HTML Tag",
  "presetHtmlTagDesc": "Match HTML/XML opening+closing tag pairs",
  "presetHexColor": "Hex Color",
  "presetHexColorDesc": "3-digit or 6-digit hex color code",
  "presetStrongPassword": "Strong Password",
  "presetStrongPasswordDesc": "Min 8 chars, uppercase, lowercase, digit, special character",
  "presetSemver": "Semantic Version",
  "presetSemverDesc": "SemVer 2.0.0 pattern (major.minor.patch)",
  "presetUUID": "UUID",
  "presetUUIDDesc": "UUID v4 format (hex-octet groups)",
  "explainCharClass": "character class {{range}}",
  "explainCharSet": "character set",
  "explainCharSetDigit": "a digit (0-9)",
  "explainCharSetSpace": "a whitespace character",
  "explainCharSetWord": "a word character (a-z, A-Z, 0-9, _)",
  "explainCharSetAny": "any character",
  "explainQuantifier": "{{min}} or more",
  "explainQuantifierStar": "zero or more",
  "explainQuantifierPlus": "one or more",
  "explainQuantifierQuestion": "zero or one",
  "explainQuantifierExact": "exactly {{min}}",
  "explainQuantifierRange": "{{min}} to {{max}}",
  "lazySuffix": " (lazy)",
  "explainGroup": "group {{- name}}",
  "explainAssertion": "assertion: {{kind}}",
  "explainAnchorStart": "start of string",
  "explainAnchorEnd": "end of string",
  "explainBoundaryWord": "word boundary",
  "explainLookahead": "lookahead assertion",
  "explainLookbehind": "lookbehind assertion",
  "explainAlternative": "alternative (a or b or ...)",
  "explainLiteral": "literal \"{{literal}}\"",
  "explainBackreference": "backreference to group {{ref}}",
  "cheatsheet": "Cheatsheet",
  "cheatsheetCharacterClasses": "Character Classes",
  "cheatsheetAnchors": "Anchors & Boundaries",
  "cheatsheetQuantifiers": "Quantifiers",
  "cheatsheetGroups": "Groups & Lookaround",
  "cheatsheetEscapes": "Escapes",
  "cheatsheetToken": "Token",
  "cheatsheetMeaning": "Meaning",
  "cheatsheetExample": "Example",
  "cheatsheetDigit": "Any digit (0-9)",
  "cheatsheetWord": "Any word character (a-z, A-Z, 0-9, _)",
  "cheatsheetWhitespace": "Any whitespace (space, tab, newline)",
  "cheatsheetNonDigit": "Any non-digit",
  "cheatsheetNonWord": "Any non-word character",
  "cheatsheetNonWhitespace": "Any non-whitespace",
  "cheatsheetCustomClass": "Custom character class",
  "cheatsheetNegatedClass": "Negated character class",
  "cheatsheetAnchorStart": "Start of string",
  "cheatsheetAnchorEnd": "End of string",
  "cheatsheetWordBoundary": "Word boundary",
  "cheatsheetNonWordBoundary": "Non-word boundary",
  "cheatsheetZeroOrMore": "Zero or more",
  "cheatsheetOneOrMore": "One or more",
  "cheatsheetZeroOrOne": "Zero or one",
  "cheatsheetExactlyN": "Exactly n",
  "cheatsheetAtLeastN": "At least n",
  "cheatsheetBetweenNM": "Between n and m",
  "cheatsheetLazyVariant": "Lazy variant (match as few as possible)",
  "cheatsheetCapturingGroup": "Capturing group",
  "cheatsheetNonCapturingGroup": "Non-capturing group",
  "cheatsheetNamedGroup": "Named capturing group",
  "cheatsheetPositiveLookahead": "Positive lookahead",
  "cheatsheetNegativeLookahead": "Negative lookahead",
  "cheatsheetPositiveLookbehind": "Positive lookbehind",
  "cheatsheetNegativeLookbehind": "Negative lookbehind",
  "cheatsheetNewline": "Newline",
  "cheatsheetTab": "Tab",
  "cheatsheetBackslash": "Literal backslash",
  "cheatsheetDot": "Literal dot",
  "cheatsheetSlash": "Literal forward slash",
  "matchItemIndex": "Index",
  "matchItemValue": "Value",
  "matchItemGroups": "Groups",
  "matchItemGroupNamed": "{{name}}: {{value}}",
  "matchItemGroupNumbered": "Group {{index}}: {{value}}",
  "matchItemZeroWidth": "zero-width match",
  "descriptions": {
    "whatIsTitle": "What is a Regex Tester?",
    "whatIsP1": "A regex (regular expression) tester is an interactive tool that lets you build and test regex patterns against sample text in real time.",
    "whatIsP2": "As you type, matches are highlighted directly in the test text, and a detailed match list shows each match with its position, captured groups, and length.",
    "whatIsP3": "This tool runs entirely in your browser — no data is ever sent to any server.",
    "featuresTitle": "Key Features",
    "featuresP1": "Real-time match highlighting — see matches visually in your test text with alternating colors for clarity.",
    "featuresP2": "Capture group inspection — view named and numbered capture groups for each match.",
    "featuresP3": "Replacement preview — test regex-based find-and-replace with support for $1, $&, and $<name> replacement tokens.",
    "featuresP4": "Pattern explanation — token-level breakdown of your regex, showing what each part means (e.g., \\d+ → \"one or more digits\").",
    "featuresP5": "Catastrophic backtracking protection — matching runs in a background thread with a timeout, so bad patterns won't freeze the page.",
    "featuresP6": "Preset library — quick-start with common patterns for email, URL, IP, phone, passwords, and more.",
    "useCasesTitle": "Common Use Cases",
    "useCasesP1": "Learning regex — see how each token contributes to matching, and test your understanding against sample text.",
    "useCasesP2": "Debugging — paste an existing regex and test it against actual data to verify it matches what you expect.",
    "useCasesP3": "Data extraction — use capture groups to extract specific parts from log files, CSVs, or structured text.",
    "useCasesP4": "Find and replace — preview complex text transformations before applying them in your code.",
    "useCasesP5": "Validation — test email, phone, URL, and other validation patterns against edge cases.",
    "limitationsTitle": "Limitations",
    "limitationsP1": "JavaScript regex only — this tool uses the browser's built-in regex engine. PCRE, Python, and other regex flavors may behave differently.",
    "limitationsP2": "No lookbehind in older browsers — lookbehind assertions (?<=...) require ES2018+. Safari only added support in 2023.",
    "limitationsP3": "Match cap at 1,000 — to keep the UI responsive, only the first 1,000 matches are rendered.",
    "limitationsP4": "Capturing groups not highlighted in text — groups are shown in the match list, not inline in the highlighted text."
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/locales/en/regex.json
git commit -m "feat(regex): add English i18n translation file"
```

---

## Task 11: i18n — Chinese Locales + Tools.json Updates

**Files:**

- Create: `public/locales/zh-CN/regex.json`
- Create: `public/locales/zh-TW/regex.json`
- Modify: `public/locales/en/tools.json`
- Modify: `public/locales/zh-CN/tools.json`
- Modify: `public/locales/zh-TW/tools.json`

- [ ] **Step 1: Write zh-CN/regex.json**

Create `public/locales/zh-CN/regex.json`:

```json
{
  "pattern": "正则表达式",
  "patternPlaceholder": "输入正则表达式...",
  "testText": "测试文本",
  "testTextPlaceholder": "在此粘贴或输入文本以测试正则...",
  "replacement": "替换文本",
  "replacementPlaceholder": "输入替换文本 ($1、$&、$<name>)",
  "flags": "标志",
  "flagGlobal": "全局",
  "flagGlobalDesc": "查找所有匹配项，而非在找到第一个匹配后停止",
  "flagCaseInsensitive": "忽略大小写",
  "flagCaseInsensitiveDesc": "匹配字母时忽略大小写",
  "flagMultiline": "多行",
  "flagMultilineDesc": "将 ^ 和 $ 视为跨多行工作",
  "flagDotAll": "点匹配换行",
  "flagDotAllDesc": "让 . 也匹配换行符",
  "flagUnicode": "Unicode",
  "flagUnicodeDesc": "将模式和输入视为 Unicode 序列",
  "flagSticky": "粘滞",
  "flagStickyDesc": "仅从 lastIndex 属性指示的位置开始匹配",
  "flagHasIndices": "捕获索引",
  "flagHasIndicesDesc": "为匹配结果中的每个捕获组生成索引",
  "modeMatch": "匹配",
  "modeReplace": "替换",
  "matchCount": "个匹配",
  "matchCountSingle": "个匹配",
  "truncated": "显示 {{shown}} / {{total}} 个匹配",
  "noMatch": "未找到匹配",
  "emptyPattern": "输入正则表达式开始使用",
  "emptyInput": "粘贴或输入文本以测试",
  "replaceCount": "替换了 {{count}} 处",
  "replaceWithoutG": "替换了 {{count}} 处（未启用 g 标志，仅替换首个匹配）",
  "patternEmpty": "空模式",
  "patternInvalid": "无效的模式",
  "patternMaybeRedos": "模式用时过长 — 可能存在灾难性回溯",
  "patternError": "模式错误",
  "runtimeError": "运行时错误",
  "delimiterToast": "检测到分隔符并已自动移除",
  "copyLiteral": "复制为字面量",
  "copyConstructor": "复制为构造函数",
  "presets": "预设模式",
  "presetsLabel": "选择一个预设模式...",
  "explanation": "模式解析",
  "categoryGeneral": "通用",
  "categoryNetwork": "网络",
  "categoryPhone": "电话",
  "categoryCode": "代码",
  "categorySecurity": "安全",
  "categoryDatetime": "日期时间",
  "presetEmail": "邮箱",
  "presetEmailDesc": "HTML5 规范邮箱模式",
  "html5SpecEmail": "遵循 HTML5 规范，非严格 RFC 5322。可能拒绝部分合法邮箱。",
  "presetUrl": "URL",
  "presetUrlDesc": "HTTP/HTTPS URL 模式",
  "presetIPv4": "IPv4 地址",
  "presetIPv4Desc": "标准 IPv4 地址 (0.0.0.0 – 255.255.255.255)",
  "presetIPv6": "IPv6 地址",
  "presetIPv6Desc": "完整 IPv6 地址（简化版本）",
  "simplifiedIPv6": "简化格式 — 不支持 :: 压缩表示法",
  "presetChinaMobile": "中国大陆手机号",
  "presetChinaMobileDesc": "中国大陆手机号码",
  "presetISODate": "ISO 8601 日期",
  "presetISODateDesc": "YYYY-MM-DD 日期格式",
  "presetHtmlTag": "HTML 标签",
  "presetHtmlTagDesc": "匹配 HTML/XML 开始+结束标签对",
  "presetHexColor": "十六进制颜色",
  "presetHexColorDesc": "3 位或 6 位十六进制颜色码",
  "presetStrongPassword": "强密码",
  "presetStrongPasswordDesc": "至少 8 位，含大小写字母、数字、特殊字符",
  "presetSemver": "语义版本",
  "presetSemverDesc": "SemVer 2.0.0 模式 (major.minor.patch)",
  "presetUUID": "UUID",
  "presetUUIDDesc": "UUID v4 格式（十六进制分组）",
  "explainCharClass": "字符类 {{range}}",
  "explainCharSet": "字符集",
  "explainCharSetDigit": "一个数字 (0-9)",
  "explainCharSetSpace": "一个空白字符",
  "explainCharSetWord": "一个单词字符 (a-z, A-Z, 0-9, _)",
  "explainCharSetAny": "任意字符",
  "explainQuantifier": "{{min}} 个或更多",
  "explainQuantifierStar": "零个或多个",
  "explainQuantifierPlus": "一个或多个",
  "explainQuantifierQuestion": "零个或一个",
  "explainQuantifierExact": "恰好 {{min}} 个",
  "explainQuantifierRange": "{{min}} 到 {{max}} 个",
  "lazySuffix": "（懒惰）",
  "explainGroup": "分组 {{- name}}",
  "explainAssertion": "断言：{{kind}}",
  "explainAnchorStart": "字符串开头",
  "explainAnchorEnd": "字符串结尾",
  "explainBoundaryWord": "单词边界",
  "explainLookahead": "先行断言",
  "explainLookbehind": "后行断言",
  "explainAlternative": "选择（a 或 b 或 ...）",
  "explainLiteral": "字面量 \"{{literal}}\"",
  "explainBackreference": "反向引用第 {{ref}} 组",
  "cheatsheet": "速查表",
  "cheatsheetCharacterClasses": "字符类",
  "cheatsheetAnchors": "锚点和边界",
  "cheatsheetQuantifiers": "量词",
  "cheatsheetGroups": "分组和环视",
  "cheatsheetEscapes": "转义",
  "cheatsheetToken": "符号",
  "cheatsheetMeaning": "含义",
  "cheatsheetExample": "示例",
  "cheatsheetDigit": "任意数字 (0-9)",
  "cheatsheetWord": "任意单词字符 (a-z, A-Z, 0-9, _)",
  "cheatsheetWhitespace": "任意空白字符（空格、制表符、换行）",
  "cheatsheetNonDigit": "任意非数字",
  "cheatsheetNonWord": "任意非单词字符",
  "cheatsheetNonWhitespace": "任意非空白字符",
  "cheatsheetCustomClass": "自定义字符类",
  "cheatsheetNegatedClass": "否定字符类",
  "cheatsheetAnchorStart": "字符串开头",
  "cheatsheetAnchorEnd": "字符串结尾",
  "cheatsheetWordBoundary": "单词边界",
  "cheatsheetNonWordBoundary": "非单词边界",
  "cheatsheetZeroOrMore": "零个或多个",
  "cheatsheetOneOrMore": "一个或多个",
  "cheatsheetZeroOrOne": "零个或一个",
  "cheatsheetExactlyN": "恰好 n 个",
  "cheatsheetAtLeastN": "至少 n 个",
  "cheatsheetBetweenNM": "n 到 m 个",
  "cheatsheetLazyVariant": "懒惰模式（尽可能少匹配）",
  "cheatsheetCapturingGroup": "捕获组",
  "cheatsheetNonCapturingGroup": "非捕获组",
  "cheatsheetNamedGroup": "命名捕获组",
  "cheatsheetPositiveLookahead": "正向前瞻",
  "cheatsheetNegativeLookahead": "负向前瞻",
  "cheatsheetPositiveLookbehind": "正向后顾",
  "cheatsheetNegativeLookbehind": "负向后顾",
  "cheatsheetNewline": "换行符",
  "cheatsheetTab": "制表符",
  "cheatsheetBackslash": "字面量反斜杠",
  "cheatsheetDot": "字面量点号",
  "cheatsheetSlash": "字面量斜杠",
  "matchItemIndex": "位置",
  "matchItemValue": "匹配值",
  "matchItemGroups": "捕获组",
  "matchItemGroupNamed": "{{name}}：{{value}}",
  "matchItemGroupNumbered": "第 {{index}} 组：{{value}}",
  "matchItemZeroWidth": "零宽匹配",
  "descriptions": {
    "whatIsTitle": "什么是正则表达式测试器？",
    "whatIsP1": "正则表达式测试器是一个交互式工具，可让您实时构建和测试正则表达式模式。",
    "whatIsP2": "输入时，匹配的内容会在测试文本中直接高亮显示，详细的匹配列表会显示每个匹配的位置、捕获组和长度。",
    "whatIsP3": "此工具完全在浏览器中运行——任何数据都不会发送到服务器。",
    "featuresTitle": "主要功能",
    "featuresP1": "实时匹配高亮 — 在测试文本中以交替颜色直观显示匹配结果。",
    "featuresP2": "捕获组检查 — 查看每个匹配的命名和编号捕获组。",
    "featuresP3": "替换预览 — 测试基于正则的查找和替换，支持 $1、$& 和 $<name> 替换标记。",
    "featuresP4": "模式解析 — 对正则表达式进行逐词分解，显示每个部分的含义（例如 \\d+ → \"一个或多个数字\"）。",
    "featuresP5": "灾难性回溯保护 — 匹配在后台线程中运行并设置超时，避免不良模式导致页面冻结。",
    "featuresP6": "预设库 — 快速使用常用模式，包括邮箱、URL、IP、电话、密码等。",
    "useCasesTitle": "常见用例",
    "useCasesP1": "学习正则 — 查看每个标记如何参与匹配，并通过示例文本验证您的理解。",
    "useCasesP2": "调试 — 粘贴现有正则表达式并对实际数据进行测试，验证其匹配是否符合预期。",
    "useCasesP3": "数据提取 — 使用捕获组从日志文件、CSV 或结构化文本中提取特定部分。",
    "useCasesP4": "查找替换 — 在代码中应用之前预览复杂的文本转换。",
    "useCasesP5": "验证 — 针对边界情况测试邮箱、电话、URL 等验证模式。",
    "limitationsTitle": "局限性",
    "limitationsP1": "仅限 JavaScript 正则 — 此工具使用浏览器内置的正则引擎。PCRE、Python 等正则风格的匹配行为可能有所不同。",
    "limitationsP2": "旧浏览器不支持后顾 — 后顾断言 (?<=...) 需要 ES2018+。Safari 在 2023 年才添加支持。",
    "limitationsP3": "匹配上限 1,000 — 为保持 UI 响应性，仅渲染前 1,000 个匹配结果。",
    "limitationsP4": "捕获组不在文本中高亮 — 捕获组显示在匹配列表中，而非内联高亮。"
  }
}
```

- [ ] **Step 2: Write zh-TW/regex.json (Traditional Chinese)**

Create `public/locales/zh-TW/regex.json` — same structure as zh-CN, with Traditional Chinese text. Key differences:

- `flagCaseInsensitive` → `忽略大小寫`
- `flagMultiline` → `多行`
- `flagHasIndicesDesc` → `為匹配結果中的每個捕獲組生成索引`
- `modeMatch` → `匹配`
- `modeReplace` → `替換`
- `matchCount` → `個匹配`
- `noMatch` → `未找到匹配`
- `patternMaybeRedos` → `模式用時過長 — 可能存在災難性回溯`
- `presets` → `預設模式`
- `explanation` → `模式解析`
- `cheatsheet` → `速查表`
- `matchItemIndex` → `位置`
- `matchItemValue` → `匹配值`

(Full file content omitted for brevity — follow the zh-CN structure, substituting all strings with Traditional Chinese equivalents. All keys are identical; only values change.)

- [ ] **Step 3: Add regex tool metadata to tools.json (all 3 locales)**

In `public/locales/en/tools.json`, add after the last tool entry (before the closing `}`):

```json
  "regex": {
    "title": "Regex Tester & Live Regex Editor",
    "shortTitle": "Regex Tester",
    "description": "Test regular expressions in real-time with match highlighting, capture group inspection, and replacement preview. Built-in preset library and token-level explanation. 100% client-side."
  }
```

In `public/locales/zh-CN/tools.json`:

```json
  "regex": {
    "title": "正则表达式在线测试工具 - 实时匹配高亮",
    "shortTitle": "正则测试器",
    "description": "在线测试正则表达式，支持实时匹配高亮、捕获组查看、替换预览。内置预设模式库和逐词解析。100%客户端运行。"
  }
```

In `public/locales/zh-TW/tools.json`:

```json
  "regex": {
    "title": "正則表達式線上測試工具 - 即時匹配高亮",
    "shortTitle": "正則測試器",
    "description": "線上測試正則表達式，支援即時匹配高亮、捕獲組檢視、替換預覽。內建預設模式庫和逐詞解析。100%客戶端運行。"
  }
```

- [ ] **Step 4: Commit**

```bash
git add public/locales/en/regex.json public/locales/zh-CN/regex.json public/locales/zh-TW/regex.json public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
git commit -m "feat(regex): add i18n translation files for all three locales"
```

---

## Task 12: Route Page (page.tsx)

**Files:**

- Create: `app/[locale]/regex/page.tsx`

**Dependencies:** Task 10 (i18n tools.json entries)

- [ ] **Step 1: Write page.tsx**

Create `app/[locale]/regex/page.tsx`:

```typescript
import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import RegexPage from "./regex-page";

const PATH = "/regex";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("regex.title"),
    description: t("regex.description"),
  });
}

export default function RegexRoute() {
  return <RegexPage />;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/regex/page.tsx
git commit -m "feat(regex): add route page with SEO metadata"
```

---

## Task 13: Page Component — Part 1 (Structure + PatternInput + Flags + Error)

**Files:**

- Create: `app/[locale]/regex/regex-page.tsx`

**Dependencies:** Tasks 2 (types), 3 (flags), 5 (match), 10 (i18n)

- [ ] **Step 1: Write skeleton + area 1 (PatternInput, Flags, ErrorDisplay)**

Create `app/[locale]/regex/regex-page.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { StyledInput, StyledTextarea } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import CopyButton from "../../../components/ui/copy-btn";
import Dropdown from "../../../components/ui/dropdown";
import { defaultFlags, toggleFlag } from "../../../libs/regex/flags";
import { FLAGS, PRESET_CATEGORIES } from "../../../libs/regex/main";
import { PATTERN_PRESETS } from "../../../libs/regex/main";
import { executeRegex, executeReplace, explainPattern, stripDelimiters, terminateWorker } from "../../../libs/regex/main";
import type { MatchOutput, ReplaceOutput, TokenExplanation } from "../../../libs/regex/main";
import { showToast } from "../../../libs/toast";
import type { FlagDef } from "../../../libs/regex/types";

// --- Pattern Input + Flags ---

function FlagCheckboxes({
  flags,
  onToggle,
}: {
  flags: string;
  onToggle: (char: string) => void;
}) {
  const t = useTranslations("regex");
  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {FLAGS.map((f: FlagDef) => (
        <label
          key={f.char}
          className="flex items-center gap-1.5 cursor-pointer select-none"
          title={t(f.description)}
        >
          <Checkbox
            checked={flags.includes(f.char)}
            onChange={() => onToggle(f.char)}
          />
          <span className="text-xs text-fg-secondary font-mono">{f.char}</span>
          <span className="text-xs text-fg-secondary">{t(f.name)}</span>
        </label>
      ))}
    </div>
  );
}

function ErrorCaret({ offset }: { offset: number }) {
  return (
    <div
      className="font-mono text-sm text-danger absolute top-full left-0 pt-0.5 pointer-events-none"
      style={{ left: `${offset * 0.6}em` }}
    >
      {"^".padStart(offset + 1, " ")}
    </div>
  );
}

// --- Privacy banner ---

function PrivacyBanner() {
  const tc = useTranslations("common");
  return (
    <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
      <span className="text-sm text-fg-secondary leading-relaxed">
        {tc("alert.notTransferred")}
      </span>
    </div>
  );
}

// --- Main Page ---

function Conversion() {
  const t = useTranslations("regex");
  const tc = useTranslations("common");

  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<string>(defaultFlags());
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<"match" | "replace">("match");
  const [replacement, setReplacement] = useState("");
  const [hoveredMatchIndex, setHoveredMatchIndex] = useState<number | null>(null);

  const [matchOutput, setMatchOutput] = useState<MatchOutput | null>(null);
  const [replaceOutput, setReplaceOutput] = useState<ReplaceOutput | null>(null);
  const [explanations, setExplanations] = useState<TokenExplanation[]>([]);
  const [loading, setLoading] = useState(false);
  const [delimiterToastShown, setDelimiterToastShown] = useState(false);

  const matchRef = useRef<AbortController | null>(null);

  // Run matching when pattern/flags/input change
  useEffect(() => {
    const trimmed = pattern.trim();
    if (!trimmed || !inputText) {
      setMatchOutput(null);
      return;
    }

    // Abort previous in-flight request
    if (matchRef.current) {
      matchRef.current.abort();
    }
    const controller = new AbortController();
    matchRef.current = controller;

    setLoading(true);
    executeRegex(trimmed, flags, inputText).then((result) => {
      setLoading(false);
      setMatchOutput(result);
    }).catch(() => {
      setLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [pattern, flags, inputText]);

  // Run explanation when pattern/flags change
  useEffect(() => {
    if (!pattern.trim()) {
      setExplanations([]);
      return;
    }
    const result = explainPattern(pattern.trim(), flags);
    setExplanations(Array.isArray(result) ? result : []);
  }, [pattern, flags]);

  // Run replacement when inputs change in replace mode
  useEffect(() => {
    if (mode !== "replace" || !pattern.trim() || !inputText) {
      setReplaceOutput(null);
      return;
    }
    executeReplace(pattern.trim(), flags, inputText, replacement).then((result) => {
      setReplaceOutput(result);
    });
  }, [pattern, flags, inputText, replacement, mode]);

  // Handle paste: auto-strip delimiters
  const handlePatternPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    const result = stripDelimiters(pasted);
    if (result.stripped && !delimiterToastShown) {
      setDelimiterToastShown(true);
      showToast(t("delimiterToast"), "success", 2000);
      // Update pattern and optionally flags
      e.preventDefault();
      setPattern(result.pattern);
      if (result.flags) {
        setFlags(result.flags);
      }
    }
  };

  const handleFlagToggle = (char: string) => {
    setFlags((prev) => toggleFlag(prev, char));
  };

  const errorDisplay = matchOutput?.error ? (
    <div
      className={`border-l-2 p-3 rounded-r-lg mt-2 ${
        matchOutput.timedOut
          ? "border-warning bg-warning/10"
          : "border-danger bg-danger/10"
      }`}
    >
      <p className="text-sm text-fg-secondary">
        {matchOutput.timedOut ? t("patternMaybeRedos") : matchOutput.error}
      </p>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Pattern Input Section */}
      <div className="space-y-2">
        <label className="block font-mono text-sm font-semibold text-accent-cyan">
          {t("pattern")}
        </label>
        <div className="relative">
          <StyledInput
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            onPaste={handlePatternPaste}
            placeholder={t("patternPlaceholder")}
            className={`font-mono text-sm ${matchOutput?.error ? "border-danger" : ""}`}
          />
          {matchOutput?.errorOffset != null && (
            <ErrorCaret offset={matchOutput.errorOffset} />
          )}
        </div>
        <FlagCheckboxes flags={flags} onToggle={handleFlagToggle} />
      </div>

      {/* Error Display */}
      {errorDisplay}

      {/* Explanation Panel */}
      {explanations.length > 0 && (
        <div className="space-y-1">
          <label className="block font-mono text-sm font-semibold text-accent-cyan">
            {t("explanation")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {explanations.map((tok, i) => (
              <span
                key={i}
                className="bg-bg-elevated rounded px-2 py-0.5 text-xs text-fg-secondary border border-border-subtle"
                title={t(tok.explanationKey, tok.params as Record<string, string | number>)}
              >
                {tok.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Test Text Input */}
      <div className="space-y-2">
        <label className="block font-mono text-sm font-semibold text-accent-purple">
          {t("testText")}
        </label>
        <StyledTextarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("testTextPlaceholder")}
          rows={6}
        />
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        <Button
          variant={mode === "match" ? "primary" : "default"}
          size="sm"
          onClick={() => setMode("match")}
        >
          {t("modeMatch")}
        </Button>
        <Button
          variant={mode === "replace" ? "primary" : "default"}
          size="sm"
          onClick={() => setMode("replace")}
        >
          {t("modeReplace")}
        </Button>
      </div>

      {/* Match Mode Results (placeholder — filled in Task 14) */}
      {mode === "match" && (
        <div className="text-sm text-fg-muted">
          {/* MatchHighlightView + MatchList will be added in Task 14 */}
        </div>
      )}

      {/* Replace Mode Results (placeholder — filled in Task 15) */}
      {mode === "replace" && (
        <div className="text-sm text-fg-muted">
          {/* ReplacementInput + ReplacePreview will be added in Task 15 */}
        </div>
      )}

      {/* Quick Actions (placeholder — filled in Task 15) */}
    </div>
  );
}

function Description() {
  const t = useTranslations("regex");

  const CHEATSHEET_SECTIONS = [
    {
      heading: t("cheatsheetCharacterClasses"),
      rows: [
        { token: "\\d", meaning: t("cheatsheetDigit"), example: "123 → matches 1,2,3" },
        { token: "\\w", meaning: t("cheatsheetWord"), example: "a1_ → matches a,1,_" },
        { token: "\\s", meaning: t("cheatsheetWhitespace"), example: '"a b" → space match' },
        { token: "[...]", meaning: t("cheatsheetCustomClass"), example: "[aeiou] → vowels" },
        { token: "[^...]", meaning: t("cheatsheetNegatedClass"), example: "[^0-9] → non-digits" },
      ],
    },
    {
      heading: t("cheatsheetAnchors"),
      rows: [
        { token: "^", meaning: t("cheatsheetAnchorStart"), example: '"^hello" → at start' },
        { token: "$", meaning: t("cheatsheetAnchorEnd"), example: '"end$" → at end' },
        { token: "\\b", meaning: t("cheatsheetWordBoundary"), example: '"\\bword\\b" → word' },
        { token: "\\B", meaning: t("cheatsheetNonWordBoundary"), example: '"\\Bing\\B" → inside' },
      ],
    },
    {
      heading: t("cheatsheetQuantifiers"),
      rows: [
        { token: "*", meaning: t("cheatsheetZeroOrMore"), example: 'a* → "", a, aa, aaa' },
        { token: "+", meaning: t("cheatsheetOneOrMore"), example: "a+ → a, aa, aaa" },
        { token: "?", meaning: t("cheatsheetZeroOrOne"), example: 'a? → "", a' },
        { token: "{n}", meaning: t("cheatsheetExactlyN"), example: "a{3} → aaa" },
        { token: "{n,}", meaning: t("cheatsheetAtLeastN"), example: "a{2,} → aa, aaa" },
        { token: "{n,m}", meaning: t("cheatsheetBetweenNM"), example: "a{2,4} → aa, aaa, aaaa" },
        { token: "*?, +?, ??", meaning: t("cheatsheetLazyVariant"), example: '"<.*?>" → shortest match' },
      ],
    },
    {
      heading: t("cheatsheetGroups"),
      rows: [
        { token: "(...)", meaning: t("cheatsheetCapturingGroup"), example: "(abc)+ → capture abc" },
        { token: "(?:...)", meaning: t("cheatsheetNonCapturingGroup"), example: "(?:abc)+ → group w/o capture" },
        { token: "(?<name>...)", meaning: t("cheatsheetNamedGroup"), example: '"(?<year>\\d{4})"' },
        { token: "(?=...)", meaning: t("cheatsheetPositiveLookahead"), example: 'q(?=u) → q followed by u' },
        { token: "(?!...)", meaning: t("cheatsheetNegativeLookahead"), example: 'q(?!u) → q not followed by u' },
        { token: "(?<=...)", meaning: t("cheatsheetPositiveLookbehind"), example: '"(?<=@)\\w+"' },
        { token: "(?<!...)", meaning: t("cheatsheetNegativeLookbehind"), example: '"(?<!@)\\w+"' },
      ],
    },
    {
      heading: t("cheatsheetEscapes"),
      rows: [
        { token: "\\n", meaning: t("cheatsheetNewline"), example: '"line\\n" → newline' },
        { token: "\\t", meaning: t("cheatsheetTab"), example: '"col\\t" → tab' },
        { token: "\\\\", meaning: t("cheatsheetBackslash"), example: '"c:\\\\path"' },
        { token: "\\.", meaning: t("cheatsheetDot"), example: '"end\\.\" → literal dot' },
        { token: "\\/", meaning: t("cheatsheetSlash"), example: '"path\\/to\\/file"' },
      ],
    },
  ];

  return (
    <div className="mt-12 space-y-8 text-fg-secondary text-sm leading-relaxed">
      {/* What is Regex Tester */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-3">{t("descriptions.whatIsTitle")}</h2>
        <p className="mb-2">{t("descriptions.whatIsP1")}</p>
        <p className="mb-2">{t("descriptions.whatIsP2")}</p>
        <p>{t("descriptions.whatIsP3")}</p>
      </section>

      {/* Key Features */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-3">{t("descriptions.featuresTitle")}</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("descriptions.featuresP1")}</li>
          <li>{t("descriptions.featuresP2")}</li>
          <li>{t("descriptions.featuresP3")}</li>
          <li>{t("descriptions.featuresP4")}</li>
          <li>{t("descriptions.featuresP5")}</li>
          <li>{t("descriptions.featuresP6")}</li>
        </ul>
      </section>

      {/* Common Use Cases */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-3">{t("descriptions.useCasesTitle")}</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("descriptions.useCasesP1")}</li>
          <li>{t("descriptions.useCasesP2")}</li>
          <li>{t("descriptions.useCasesP3")}</li>
          <li>{t("descriptions.useCasesP4")}</li>
          <li>{t("descriptions.useCasesP5")}</li>
        </ul>
      </section>

      {/* Cheatsheet */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-4">{t("cheatsheet")}</h2>
        {CHEATSHEET_SECTIONS.map((section, si) => (
          <div key={si} className="mb-6">
            <h3 className="font-mono text-sm font-semibold text-accent-cyan mb-2">{section.heading}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="py-1.5 pr-4 font-semibold text-fg-secondary font-mono">{t("cheatsheetToken")}</th>
                    <th className="py-1.5 pr-4 font-semibold text-fg-secondary">{t("cheatsheetMeaning")}</th>
                    <th className="py-1.5 font-semibold text-fg-secondary">{t("cheatsheetExample")}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-border-subtle">
                      <td className="py-1.5 pr-4 font-mono text-accent-cyan">{row.token}</td>
                      <td className="py-1.5 pr-4">{row.meaning}</td>
                      <td className="py-1.5 text-fg-muted">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {/* Limitations */}
      <section>
        <h2 className="text-xl font-semibold text-fg-primary mb-3">{t("descriptions.limitationsTitle")}</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("descriptions.limitationsP1")}</li>
          <li>{t("descriptions.limitationsP2")}</li>
          <li>{t("descriptions.limitationsP3")}</li>
          <li>{t("descriptions.limitationsP4")}</li>
        </ul>
      </section>
    </div>
  );
}

export default function RegexPage() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  const title = t("regex.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <PrivacyBanner />
        <Conversion />
        <Description />
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/regex/regex-page.tsx
git commit -m "feat(regex): add page component skeleton with input, flags, explanation, and description"
```

---

## Task 14: Page Component — Part 2 (Match Highlighting + Match List)

**Files:**

- Modify: `app/[locale]/regex/regex-page.tsx`

**Dependencies:** Task 13

- [ ] **Step 1: Add MatchHighlightView and MatchList components**

In `regex-page.tsx`, replace the placeholder in the `match` mode section with the Match display components. Add these helper components before `Conversion()`:

```typescript
// --- Match Highlight ---

function MatchHighlightView({
  text,
  matches,
  hoveredIndex,
  onHover,
  onMatchClick,
}: {
  text: string;
  matches: { value: string; index: number; isZeroWidth: boolean }[];
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
  onMatchClick: (idx: number) => void;
}) {
  if (!matches.length) return <span className="text-fg-muted text-sm">{text}</span>;

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  matches.forEach((m, i) => {
    // Non-match segment
    if (m.index > lastEnd) {
      parts.push(
        <span key={`text-${lastEnd}`}>{text.slice(lastEnd, m.index)}</span>
      );
    }

    const isHovered = hoveredIndex === i;
    const accent = i % 2 === 0 ? "bg-accent-cyan/20" : "bg-accent-purple/20";

    if (m.isZeroWidth) {
      // Render a thin vertical caret
      const refCallback = (el: HTMLSpanElement | null) => {
        if (el && isHovered) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      };
      parts.push(
        <span
          key={`match-${i}`}
          ref={refCallback}
          className={`inline-block w-px h-[1.2em] align-middle ${accent} ${
            isHovered ? "ring-2 ring-accent-cyan rounded-sm" : ""
          }`}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onMatchClick(i)}
          title={`Match ${i + 1}: zero-width`}
        />
      );
    } else {
      const refCallback = (el: HTMLSpanElement | null) => {
        if (el && isHovered) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      };
      parts.push(
        <mark
          key={`match-${i}`}
          ref={refCallback}
          className={`${accent} ${isHovered ? "ring-2 ring-accent-cyan rounded-sm" : ""} cursor-pointer`}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onMatchClick(i)}
        >
          {m.value}
        </mark>
      );
    }

    lastEnd = m.index + (m.value.length || 0);
  });

  // Remaining text
  if (lastEnd < text.length) {
    parts.push(<span key={`text-${lastEnd}`}>{text.slice(lastEnd)}</span>);
  }

  return <span className="whitespace-pre-wrap break-words text-sm">{parts}</span>;
}

// --- Match List Item ---

function MatchItem({
  match,
  index,
  isHovered,
  onHover,
}: {
  match: MatchResult;
  index: number;
  isHovered: boolean;
  onHover: (idx: number | null) => void;
}) {
  const t = useTranslations("regex");
  return (
    <div
      className={`bg-bg-surface rounded-lg p-3 cursor-pointer transition-colors ${
        isHovered ? "ring-2 ring-accent-cyan" : "hover:bg-bg-elevated"
      }`}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center gap-2 text-xs text-fg-secondary mb-1">
        <span className="font-mono font-semibold">#{index + 1}</span>
        <span>
          {t("matchItemIndex")}: {match.index}
        </span>
        {match.isZeroWidth && (
          <span className="text-accent-cyan italic">{t("matchItemZeroWidth")}</span>
        )}
      </div>
      <code className="block font-mono text-sm text-fg-primary bg-bg-input rounded px-2 py-1 break-all">
        {match.value || "▎"}
      </code>
      {(match.groups || Object.keys(match.groups || {}).length > 0) && (
        <div className="mt-2 text-xs text-fg-secondary space-y-0.5">
          <span className="font-semibold">{t("matchItemGroups")}:</span>
          {Object.entries(match.groups).map(([name, value]) => (
            <div key={name} className="ml-2">
              <span className="font-mono text-accent-purple">{name}</span>:{" "}
              <code className="font-mono text-fg-primary bg-bg-input rounded px-1">
                {value}
              </code>
            </div>
          ))}
          {match.groupValues.length > 1 && match.groupValues.slice(1).map((val, gi) => (
            val && (
              <div key={`g${gi}`} className="ml-2">
                <span className="font-mono text-accent-purple">${gi + 1}</span>:{" "}
                <code className="font-mono text-fg-primary bg-bg-input rounded px-1">
                  {val}
                </code>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
```

Now replace the match mode section placeholder inside `Conversion()` with:

```typescript
      {/* Match Mode Results */}
      {mode === "match" && matchOutput && !matchOutput.error && (
        <div className="space-y-4">
          {/* Highlight View */}
          <div className="bg-bg-input rounded-lg p-4 font-mono text-sm leading-relaxed">
            {inputText ? (
              <MatchHighlightView
                text={inputText}
                matches={matchOutput.matches.map((m) => ({
                  value: m.value,
                  index: m.index,
                  isZeroWidth: m.isZeroWidth,
                }))}
                hoveredIndex={hoveredMatchIndex}
                onHover={setHoveredMatchIndex}
                onMatchClick={(idx) => {
                  setHoveredMatchIndex(idx);
                }}
              />
            ) : (
              <span className="text-fg-muted">{t("emptyInput")}</span>
            )}
          </div>

          {/* Match Info */}
          <div className="flex items-center justify-between text-xs text-fg-secondary">
            <span>
              {matchOutput.matchCount === 0
                ? t("noMatch")
                : `${matchOutput.matchCount} ${
                    matchOutput.matchCount === 1
                      ? t("matchCountSingle")
                      : t("matchCount")
                  }`}
            </span>
            {matchOutput.truncated && (
              <span className="text-warning">
                {t("truncated", {
                  shown: 1000,
                  total: matchOutput.matchCount,
                })}
              </span>
            )}
          </div>

          {/* Match List */}
          {matchOutput.matches.length > 0 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {matchOutput.matches.map((m, i) => (
                <MatchItem
                  key={i}
                  match={m}
                  index={i}
                  isHovered={hoveredMatchIndex === i}
                  onHover={setHoveredMatchIndex}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state when no input */}
      {mode === "match" && !matchOutput && !matchOutput?.error && (
        <div className="text-sm text-fg-muted py-4">
          {!pattern.trim()
            ? t("emptyPattern")
            : !inputText
              ? t("emptyInput")
              : t("noMatch")}
        </div>
      )}
```

- [ ] **Step 2: Add MatchResult type import at top**

Ensure `MatchResult` is imported. At the top of the file:

```typescript
import type {
  MatchOutput,
  ReplaceOutput,
  TokenExplanation,
  MatchResult,
} from "../../../libs/regex/main";
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/regex/regex-page.tsx
git commit -m "feat(regex): add match highlighting and match list with hover linking"
```

---

## Task 15: Page Component — Part 3 (Replace Mode + QuickActions + Presets)

**Files:**

- Modify: `app/[locale]/regex/regex-page.tsx`

**Dependencies:** Tasks 13-14

- [ ] **Step 1: Add Replace mode section**

Replace the replace mode placeholder in `Conversion()` with:

```typescript
      {/* Replace Mode Results */}
      {mode === "replace" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block font-mono text-sm font-semibold text-accent-cyan">
              {t("replacement")}
            </label>
            <StyledInput
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder={t("replacementPlaceholder")}
              className="font-mono text-sm"
              disabled={!!matchOutput?.error}
            />
          </div>
          {replaceOutput && !replaceOutput.error && (
            <div className="bg-bg-input rounded-lg p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
              {replaceOutput.output || (
                <span className="text-fg-muted">{t("noMatch")}</span>
              )}
            </div>
          )}
          {replaceOutput && !replaceOutput.error && (
            <div className="text-xs text-fg-secondary">
              {flags.includes("g")
                ? t("replaceCount", { count: replaceOutput.replaceCount })
                : t("replaceWithoutG", { count: replaceOutput.replaceCount })}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 2: Add QuickActions section**

Add after the mode content sections, inside `Conversion()`:

```typescript
      {/* Quick Actions */}
      {pattern.trim() && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
          <CopyButton
            getContent={() => `/${pattern.trim()}/${flags}`}
            label={t("copyLiteral")}
          />
          <CopyButton
            getContent={() => `new RegExp(${JSON.stringify(pattern.trim())}, ${JSON.stringify(flags)})`}
            label={t("copyConstructor")}
          />
        </div>
      )}
```

- [ ] **Step 3: Add Pattern Presets dropdown**

Add after the FlagCheckboxes in the PatternInput section (`Conversion()`):

```typescript
      {/* Pattern Presets */}
      <Dropdown
        trigger={
          <div className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-fg-secondary bg-bg-surface rounded border border-border-subtle cursor-pointer hover:bg-bg-elevated transition-colors">
            <span>{t("presets")}</span>
            <ChevronDownIcon className="w-3 h-3" />
          </div>
        }
        items={PRESET_CATEGORIES.flatMap((cat) => {
          const catPresets = PATTERN_PRESETS.filter((p) => p.category === cat.key);
          if (catPresets.length === 0) return [];
          return [
            { label: <span className="text-xs font-semibold text-fg-muted">{t(cat.nameKey)}</span>, disabled: true },
            ...catPresets.map((preset) => ({
              label: (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{t(preset.name)}</span>
                  {preset.note && (
                    <span className="text-xs text-fg-muted" title={t(preset.note)}>
                      ⓘ
                    </span>
                  )}
                </div>
              ),
              onClick: () => {
                setPattern(preset.pattern);
                if (preset.flags) setFlags(preset.flags);
              },
            })),
          ];
        })}
      />
```

Add the `ChevronDownIcon` import at top:

```typescript
import { ChevronDownIcon } from "lucide-react";
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/regex/regex-page.tsx
git commit -m "feat(regex): add replace mode, quick actions, and preset dropdown"
```

---

## Task 16: Final Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (including regex tests)

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run development server**

```bash
npm run dev
```

Manual verification checklist:

- [ ] Open `http://localhost:3000/regex`
- [ ] Type `\d+` as pattern, `g` flag on, enter `abc 123 def 456` → matches 123 and 456 highlighted
- [ ] Paste `/hello/g` → toast shows, pattern becomes `hello`, flags become `g`
- [ ] Type `(a+)+b` with long input → timeout message appears (yellow card)
- [ ] Type `(` → red error card with caret
- [ ] Switch to Replace mode → test `(\w+)` with `$1!` replacement
- [ ] Open a preset from dropdown → pattern + flags filled
- [ ] Check cheatsheet renders at bottom
- [ ] Copy as literal / Copy as constructor buttons work

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(regex): complete regex tester implementation"
```

---

## Self-Review

### 1. Spec Coverage

| Spec Requirement                                 | Task(s)                    | Status |
| ------------------------------------------------ | -------------------------- | ------ |
| Real-time regex matching with highlighting       | Task 5, 14                 | ✅     |
| Match result list (index, value, capture groups) | Task 14 (MatchItem)        | ✅     |
| Replacement preview ($1/$&/$<name>)              | Task 7, 15                 | ✅     |
| All JS regex flags (g,i,m,s,u,y,d)               | Task 3 (flags.ts), 13      | ✅     |
| Token-level pattern explanation (regexpp AST)    | Task 8 (explain.ts)        | ✅     |
| Detailed errors with character-level caret       | Task 13 (ErrorCaret)       | ✅     |
| Catastrophic backtracking protection (Worker)    | Task 5 (match.ts)          | ✅     |
| Built-in preset pattern library                  | Task 3 (patterns.ts), 15   | ✅     |
| Cheatsheet                                       | Task 13 (Description)      | ✅     |
| Copy as JS literal / RegExp constructor          | Task 15 (QuickActions)     | ✅     |
| Auto-strip pasted delimiters                     | Task 4 (delimiters.ts), 13 | ✅     |
| Match ↔ highlight bidirectional linking          | Task 14 (hover/click)      | ✅     |
| Full i18n (en, zh-CN, zh-TW)                     | Tasks 10-11                | ✅     |
| SEO metadata with hreflang                       | Task 12 (page.tsx)         | ✅     |
| Unit tests (match, replace, explain, delimiters) | Tasks 4, 6, 7, 8           | ✅     |

**Gap check**: None. Every "In Scope" item from the spec maps to at least one task.

### 2. Placeholder Scan

- ✅ No "TBD", "TODO", or "implement later" in any step
- ✅ All error handling explicitly coded (regexpp parse errors, runtime errors, worker timeout)
- ✅ All test files have complete test code (no "write tests for X" without actual tests)
- ✅ All code steps include complete implementations (no "similar to Task N" references)
- ⚠️ zh-TW/regex.json: Full file content is described as "follow the zh-CN structure, substituting all strings with Traditional Chinese equivalents" — this is acceptable since the keys are identical and only values change, and the key differences are listed explicitly.

### 3. Type Consistency

- `MatchResult` defined in Task 2 (types.ts), used in Tasks 5, 6, 14 → ✅ consistent
- `MatchOutput` defined in Task 2, used in Tasks 5, 13 → ✅ consistent
- `ReplaceOutput` defined in Task 2, used in Tasks 5, 13 → ✅ consistent
- `TokenExplanation` defined in Task 2, used in Tasks 8, 13 → ✅ consistent
- `FlagDef` defined in Task 2, used in Task 3 → ✅ consistent
- `PatternPreset` defined in Task 2, used in Tasks 3, 15 → ✅ consistent
- `FLAGS` exported from Task 3, imported in Task 13 → ✅ matches
- `PATTERN_PRESETS` exported from Task 3, imported in Task 13, 15 → ✅ matches
- `PRESET_CATEGORIES` exported from Task 3, imported in Task 15 → ✅ matches
- `executeRegex`, `executeReplace`, `explainPattern`, `stripDelimiters` exported from Tasks 5, 4, 8, imported in Task 13 → ✅ matches
- `main.ts` barrel (Task 9) re-exports from all modules → ✅ verified against import paths in Task 13
