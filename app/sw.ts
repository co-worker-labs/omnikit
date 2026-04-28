/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Worker types come from tsconfig.sw.json, not the root tsconfig —
// avoids leaking WebWorker types into regular components (Cache, Client name collisions).

import { defaultCache } from "@serwist/turbopack/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

// No precache — resources are cached on-demand via runtimeCaching as the user
// visits pages.  This avoids downloading every tool page's JS/CSS during the
// initial SW install, keeping first-load fast.  Offline support is preserved:
// once a page is visited, its assets are cached and available offline.
const serwist = new Serwist({
  precacheEntries: [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
