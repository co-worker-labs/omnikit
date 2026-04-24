import CryptoJS from "crypto-js";

export type UuidVersion = "v1" | "v3" | "v4" | "v5" | "v7";
export type UuidFormat = "standard" | "no-hyphens" | "braces";
export type UuidBytes = Uint8Array; // always length 16

export const NAMESPACES = {
  DNS: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  URL: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  OID: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  X500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
} as const;

export type NamespaceLabel = keyof typeof NAMESPACES;

export interface GenerateOptions {
  version: UuidVersion;
  count: number;
  namespace?: string;
  name?: string;
}

const HEX = "0123456789abcdef";

function bytesToHex(bytes: UuidBytes): string {
  let s = "";
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 0x0f];
  return s;
}

export function formatUuid(bytes: UuidBytes, fmt: UuidFormat, upper: boolean): string {
  const h = bytesToHex(bytes);
  const dashed = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  let out: string;
  switch (fmt) {
    case "standard":
      out = dashed;
      break;
    case "no-hyphens":
      out = h;
      break;
    case "braces":
      out = `{${dashed}}`;
      break;
  }
  return upper ? out.toUpperCase() : out;
}

// Accept standard/no-hyphens/braces/any-case, ignore leading/trailing whitespace.
const UUID_HEX_RE = /^[0-9a-f]{32}$/i;

export function parseUuid(input: string): UuidBytes {
  let s = input.trim().toLowerCase();
  if (s.startsWith("{") && s.endsWith("}")) s = s.slice(1, -1);
  s = s.replace(/-/g, "");
  if (!UUID_HEX_RE.test(s)) {
    throw new Error("Invalid UUID");
  }
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function isValidUuid(input: string): boolean {
  try {
    parseUuid(input);
    return true;
  } catch {
    return false;
  }
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

function generateV4(): UuidBytes {
  if (typeof crypto.randomUUID === "function") {
    return parseUuid(crypto.randomUUID());
  }
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return b;
}

export function generate(opts: GenerateOptions): UuidBytes[] {
  const out: UuidBytes[] = [];
  const count = Math.max(1, Math.floor(opts.count));
  switch (opts.version) {
    case "v4":
      for (let i = 0; i < count; i++) out.push(generateV4());
      return out;
    default:
      throw new Error(`Unsupported version: ${opts.version}`);
  }
}
