import type { DiffRequest, DiffResponse, DiffWorkerMessage } from "./types";
import { buildRows } from "./build-rows";

export const AUTO_COMPUTE_MAX_BYTES = 512 * 1024;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const WORKER_THRESHOLD = 50 * 1024;
export const DEBOUNCE_MS = 300;
export const VIRTUALIZATION_THRESHOLD = 2000;

export function runDiffSync(
  original: string,
  modified: string,
  ignoreWhitespace: boolean,
  ignoreCase: boolean
): DiffResponse {
  const { rows, hasChanges, unifiedPatch } = buildRows(
    original,
    modified,
    ignoreWhitespace,
    ignoreCase
  );
  return { id: 0, ok: true, rows, unifiedPatch, hasChanges };
}

type Resolver = (res: DiffResponse) => void;
type Rejecter = (message: string) => void;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: Resolver; reject: Rejecter }>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./diff.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (ev: MessageEvent<DiffWorkerMessage>) => {
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

export function compute(
  original: string,
  modified: string,
  ignoreWhitespace: boolean,
  ignoreCase: boolean
): Promise<DiffResponse> {
  const w = ensureWorker();
  const id = nextId++;
  const req: DiffRequest = { id, original, modified, ignoreWhitespace, ignoreCase };

  return new Promise<DiffResponse>((resolve, reject) => {
    pending.set(id, {
      resolve,
      reject: (message) => reject(new Error(message)),
    });
    w.postMessage(req);
  });
}

export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    pending.clear();
  }
}
