// Parse input as JSON and pretty-print with 2-space indent.
// Returns { ok: true, text } or { ok: false, message }.

export type FormatResult = { ok: true; text: string } | { ok: false; message: string };

export function formatJson(input: string): FormatResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "empty input" };
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return { ok: true, text: JSON.stringify(parsed, null, 2) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}
