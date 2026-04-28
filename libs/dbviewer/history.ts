import { HISTORY_CAP } from "./constants";
import { STORAGE_KEYS } from "../storage-keys";

export const HISTORY_KEY = STORAGE_KEYS.dbviewerHistory;

export interface HistoryEntry {
  sql: string;
  success: boolean;
  rows: number;
  ts: number;
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function listHistory(): HistoryEntry[] {
  const s = safeStorage();
  if (!s) return [];
  const raw = s.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is HistoryEntry =>
        e &&
        typeof e === "object" &&
        typeof e.sql === "string" &&
        typeof e.success === "boolean" &&
        typeof e.rows === "number" &&
        typeof e.ts === "number"
    );
  } catch {
    return [];
  }
}

export function addHistory(entry: HistoryEntry): void {
  const s = safeStorage();
  if (!s) return;
  const current = listHistory().filter((e) => e.sql !== entry.sql);
  current.unshift(entry);
  const trimmed = current.slice(0, HISTORY_CAP);
  s.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function clearHistory(): void {
  const s = safeStorage();
  if (!s) return;
  s.removeItem(HISTORY_KEY);
}
