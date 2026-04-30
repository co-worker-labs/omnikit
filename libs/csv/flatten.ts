/**
 * Recursively flatten a nested object using dot-notation keys.
 *
 * Rules:
 * - Nested objects → dot-separated keys (parent.child.grandchild)
 * - Arrays of objects → numeric index keys (items.0, items.1)
 * - Arrays of primitives → semicolon-joined string ("a;b;c")
 * - Empty array → ""
 * - Empty object → ""
 * - null / boolean / number → preserved as-is
 */
export function flatten(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  function walk(current: unknown, prefix: string): void {
    if (current === null || current === undefined) {
      result[prefix] = current;
      return;
    }

    if (typeof current !== "object") {
      result[prefix] = current;
      return;
    }

    if (Array.isArray(current)) {
      if (current.length === 0) {
        result[prefix] = "";
        return;
      }

      const allPrimitive = current.every((item) => item === null || typeof item !== "object");

      if (allPrimitive) {
        result[prefix] = current.join(";");
        return;
      }

      for (let i = 0; i < current.length; i++) {
        walk(current[i], `${prefix}.${i}`);
      }
      return;
    }

    const entries = Object.entries(current as Record<string, unknown>);
    if (entries.length === 0) {
      result[prefix] = "";
      return;
    }

    for (const [key, value] of entries) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      walk(value, newKey);
    }
  }

  walk(obj, "");
  return result;
}
