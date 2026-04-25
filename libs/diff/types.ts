// Shared types used by the Web Worker (libs/diff/.. is bundle-safe) and the main thread.

export type WordSeg = {
  text: string;
  changed: boolean;
};

export type DiffRowData =
  | { kind: "context"; oldNo: number; newNo: number; text: string }
  | { kind: "del"; oldNo: number; segments: WordSeg[] }
  | { kind: "add"; newNo: number; segments: WordSeg[] };

export type DiffRequest = {
  id: number;
  original: string;
  modified: string;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
};

export type DiffResponse = {
  id: number;
  ok: true;
  rows: DiffRowData[];
  unifiedPatch: string;
  hasChanges: boolean;
};

export type DiffErrorResponse = {
  id: number;
  ok: false;
  message: string;
};

export type DiffWorkerMessage = DiffResponse | DiffErrorResponse;
