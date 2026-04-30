/**
 * Recursively unflatten a dot-notation object back into a nested structure.
 * Inverse of flatten.ts — mirrors its rules for round-trip fidelity.
 */
function tryParseSemicolonArray(value: string): unknown[] | null {
  if (!value.includes(";")) return null;
  const segments = value.split(";");
  const parsed: unknown[] = [];
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (trimmed === "") return null;
    if (trimmed === "true") {
      parsed.push(true);
      continue;
    }
    if (trimmed === "false") {
      parsed.push(false);
      continue;
    }
    if (trimmed === "null") {
      parsed.push(null);
      continue;
    }
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== "") {
      parsed.push(num);
      continue;
    }
    parsed.push(trimmed);
  }
  return parsed;
}

function allKeysAreNumeric(keys: string[]): boolean {
  return keys.every((k) => /^\d+$/.test(k));
}

type NestedMap = Map<string, unknown>;

function buildNested(groups: NestedMap): unknown {
  const topKeys = Array.from(groups.keys());

  if (allKeysAreNumeric(topKeys)) {
    const maxIndex = Math.max(...topKeys.map(Number));
    const arr: unknown[] = new Array(maxIndex + 1);
    for (const [key, children] of groups) {
      const idx = Number(key);
      const childMap = children as NestedMap;
      arr[idx] = childMap.has("") ? childMap.get("") : buildNested(childMap);
    }
    return arr;
  }

  const obj: Record<string, unknown> = {};
  for (const [key, children] of groups) {
    const childMap = children as NestedMap;
    if (childMap.has("")) {
      obj[key] = childMap.get("");
    } else if (childMap.size === 0) {
      obj[key] = "";
    } else {
      obj[key] = buildNested(childMap);
    }
  }
  return obj;
}

export function unflatten(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const topLevelKeys = new Set<string>();
  for (const key of Object.keys(obj)) {
    topLevelKeys.add(key.includes(".") ? key.slice(0, key.indexOf(".")) : key);
  }

  for (const topKey of topLevelKeys) {
    const dottedEntries: Array<{ restKey: string; value: unknown }> = [];
    let directValue: unknown = undefined;
    let hasDirectValue = false;

    for (const [key, value] of Object.entries(obj)) {
      if (key === topKey) {
        directValue = value;
        hasDirectValue = true;
      } else if (key.startsWith(topKey + ".")) {
        dottedEntries.push({ restKey: key.slice(topKey.length + 1), value });
      }
    }

    if (dottedEntries.length === 0) {
      if (hasDirectValue) {
        if (typeof directValue === "string") {
          const parsed = tryParseSemicolonArray(directValue);
          result[topKey] = parsed !== null ? parsed : directValue;
        } else {
          result[topKey] = directValue;
        }
      }
      continue;
    }

    const groups = new Map<string, unknown>();
    for (const entry of dottedEntries) {
      const segments = entry.restKey.split(".");
      let current = groups;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!current.has(seg)) current.set(seg, new Map<string, unknown>());
        if (i === segments.length - 1) {
          (current.get(seg) as NestedMap).set("", entry.value);
        } else {
          current = current.get(seg) as NestedMap;
        }
      }
    }

    result[topKey] = buildNested(groups);
  }

  return result;
}
