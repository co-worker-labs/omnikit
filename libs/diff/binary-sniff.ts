// Heuristic binary detection on the first 8KB of a file.
// A file is binary if either:
//   (a) any byte is NUL (0x00), or
//   (b) > 5% of decoded UTF-8 code units are the replacement char U+FFFD.

const SAMPLE_BYTES = 8 * 1024;
const REPLACEMENT_RATIO_THRESHOLD = 0.05;

export async function isBinaryFile(file: File): Promise<boolean> {
  const slice = file.slice(0, SAMPLE_BYTES);
  const buf = new Uint8Array(await slice.arrayBuffer());

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x00) return true;
  }

  if (buf.length === 0) return false;

  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  let replacements = 0;
  for (const ch of decoded) {
    if (ch === "\uFFFD") replacements++;
  }
  return replacements / decoded.length > REPLACEMENT_RATIO_THRESHOLD;
}
