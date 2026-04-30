// libs/image/avif-worker.ts
import type { ImageDimensions } from "./types";

export interface AvifEncodeRequest {
  id: number;
  imageData: ImageData;
  width: number;
  height: number;
  quality: number;
}

export interface AvifEncodeResponse {
  id: number;
  ok: boolean;
  buffer?: ArrayBuffer;
  error?: string;
}

type Resolver = (res: AvifEncodeResponse) => void;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Resolver>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./avif-encode.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (ev: MessageEvent<AvifEncodeResponse>) => {
    const msg = ev.data;
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    entry(msg);
  };
  worker.onerror = () => {
    for (const resolve of pending.values()) {
      resolve({ id: 0, ok: false, error: "Worker error" });
    }
    pending.clear();
  };
  return worker;
}

export function encodeAvif(
  imageData: ImageData,
  options: { quality: number }
): Promise<ArrayBuffer> {
  const w = ensureWorker();
  const id = nextId++;
  const req: AvifEncodeRequest = {
    id,
    imageData,
    width: imageData.width,
    height: imageData.height,
    quality: options.quality,
  };

  return new Promise<ArrayBuffer>((resolve, reject) => {
    pending.set(id, (res) => {
      if (res.ok && res.buffer) {
        resolve(res.buffer);
      } else {
        reject(new Error(res.error || "AVIF encoding failed"));
      }
    });
    // Transfer imageData buffer to avoid copying
    w.postMessage(req, [imageData.data.buffer]);
  });
}

export function terminateAvifWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    pending.clear();
  }
}
