import type { AvifEncodeRequest, AvifEncodeResponse } from "./avif-worker";

let encodeFn: ((data: ImageData, options?: { quality?: number }) => Promise<ArrayBuffer>) | null =
  null;
let initPromise: Promise<void> | null = null;

async function ensureModule() {
  if (encodeFn) return;
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
    const mod = await import("@jsquash/avif/encode");
    await mod.init({
      locateFile: (file: string) => `/wasm/${file}`,
    });
    encodeFn = mod.default;
  })();
  await initPromise;
}

self.addEventListener("message", async (ev: MessageEvent<AvifEncodeRequest>) => {
  const req = ev.data;
  try {
    await ensureModule();
    const buffer = await encodeFn!(req.imageData, {
      quality: req.quality,
    });
    const res: AvifEncodeResponse = { id: req.id, ok: true, buffer };
    self.postMessage(res, [buffer]);
  } catch (err) {
    const res: AvifEncodeResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : "AVIF encoding failed",
    };
    self.postMessage(res);
  }
});
