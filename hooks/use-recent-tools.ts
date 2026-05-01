"use client";

import { useSyncExternalStore, useCallback } from "react";
import { STORAGE_KEYS } from "../libs/storage-keys";

const MAX_RECENT_TOOLS = 10;
const EMPTY: string[] = [];

function loadRecentTools(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.recentTools);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const filtered = parsed.filter((item): item is string => typeof item === "string");
    return filtered.length === 0 ? EMPTY : filtered;
  } catch {
    return EMPTY;
  }
}

function saveRecentTools(tools: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.recentTools, JSON.stringify(tools));
  } catch {
    // quota exceeded or unavailable
  }
}

let cachedSnapshot: string[] | null = null;
let cachedRaw: string | null = null;

function getSnapshot(): string[] {
  const raw = localStorage.getItem(STORAGE_KEYS.recentTools);
  if (raw === cachedRaw && cachedSnapshot !== null) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = loadRecentTools();
  return cachedSnapshot;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe() {
  return () => {};
}

export function useRecentTools() {
  const recentTools = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const trackUsage = useCallback((toolKey: string) => {
    const prev = loadRecentTools();
    const filtered = prev.filter((k) => k !== toolKey);
    const updated = [toolKey, ...filtered].slice(0, MAX_RECENT_TOOLS);
    saveRecentTools(updated);
    cachedRaw = JSON.stringify(updated);
    cachedSnapshot = updated;
  }, []);

  return { recentTools, trackUsage };
}
