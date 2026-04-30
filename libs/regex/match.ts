import { parseRegExpLiteral } from "@eslint-community/regexpp";
import type { RegExpSyntaxError } from "@eslint-community/regexpp/regexp-syntax-error";
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

export function validatePattern(
  pattern: string,
  flags: string
): { message: string; offset: number } | null {
  if (!pattern) return null;
  try {
    parseRegExpLiteral(`/${pattern}/${flags}`);
    return null;
  } catch (e: unknown) {
    const err = e as RegExpSyntaxError & { index?: number };
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

export function executeRegex(pattern: string, flags: string, input: string): Promise<MatchOutput> {
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
