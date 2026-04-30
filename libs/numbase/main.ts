export type Radix = 2 | 8 | 10 | 16;
export type BitWidth = 8 | 16 | 32 | 64;

export interface ParseResult {
  value: bigint;
  error?: string;
}

export interface AsciiInfo {
  char: string;
  codePoint: string;
  display: string;
}

export const DEFAULT_VALUE = 65n;
export const DEFAULT_BIT_WIDTH: BitWidth = 8;

export const BIT_MASKS: Record<BitWidth, bigint> = {
  8: (1n << 8n) - 1n,
  16: (1n << 16n) - 1n,
  32: (1n << 32n) - 1n,
  64: (1n << 64n) - 1n,
};

const RADIX_REGEX: Record<Radix, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^-?[0-9]+$/,
  16: /^[0-9a-fA-F]+$/,
};

const RADIX_PREFIX: Record<Radix, string> = {
  2: "0b",
  8: "0o",
  10: "",
  16: "0x",
};

export function parseInput(input: string, radix: Radix, bitWidth: BitWidth): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { value: 0n, error: "empty" };
  }

  if (radix !== 10 && trimmed.startsWith("-")) {
    return { value: 0n, error: "invalid_digit" };
  }

  const pattern = radix === 10 ? /^[0-9]+$/ : RADIX_REGEX[radix];
  const body = radix === 10 && trimmed.startsWith("-") ? trimmed.slice(1) : trimmed;

  if (!pattern.test(body)) {
    return { value: 0n, error: "invalid_digit" };
  }

  let value: bigint;
  try {
    value = BigInt(body);
    if (radix === 10 && trimmed.startsWith("-")) {
      value = -value;
    }
  } catch {
    return { value: 0n, error: "invalid_digit" };
  }

  if (radix !== 10) {
    try {
      const prefixed = RADIX_PREFIX[radix] + trimmed;
      value = BigInt(prefixed);
    } catch {
      return { value: 0n, error: "invalid_digit" };
    }
  }

  const mask = BIT_MASKS[bitWidth];
  const clamped = value >= 0n ? value & mask : toTwosComplement(value, bitWidth) & mask;

  return { value: clamped };
}

export function formatValue(value: bigint, radix: Radix, bitWidth: BitWidth): string {
  const mask = BIT_MASKS[bitWidth];
  const unsigned = value & mask;

  if (radix === 10) {
    const signed = fromTwosComplement(unsigned, bitWidth);
    return signed.toString(10);
  }

  const str = unsigned.toString(radix).toUpperCase();
  const paddedLen = Math.ceil(bitWidth / Math.log2(radix));
  const padded = str.padStart(paddedLen, "0");

  if (radix === 2) {
    return groupBinary(padded);
  }

  return padded;
}

export function groupBinary(binary: string): string {
  const groups: string[] = [];
  for (let i = 0; i < binary.length; i += 4) {
    groups.push(binary.slice(i, i + 4));
  }
  return groups.join(" ");
}

export function toTwosComplement(value: bigint, bitWidth: BitWidth): bigint {
  if (value >= 0n) return value & BIT_MASKS[bitWidth];
  const mask = BIT_MASKS[bitWidth];
  return (mask + value + 1n) & mask;
}

export function fromTwosComplement(unsigned: bigint, bitWidth: BitWidth): bigint {
  const mask = BIT_MASKS[bitWidth];
  const clamped = unsigned & mask;
  const signBit = 1n << BigInt(bitWidth - 1);
  if (clamped & signBit) {
    return clamped - (mask + 1n);
  }
  return clamped;
}

export function getAsciiInfo(value: bigint): AsciiInfo {
  const num = Number(value);
  const codePoint = `U+${num.toString(16).toUpperCase().padStart(4, "0")}`;

  if (num < 0 || num > 127) {
    return { char: "", codePoint, display: "" };
  }

  if (num >= 32 && num <= 126) {
    return {
      char: `'${String.fromCharCode(num)}'`,
      codePoint,
      display: String.fromCharCode(num),
    };
  }

  const controlNames: Record<number, string> = {
    0: "NUL",
    1: "SOH",
    2: "STX",
    3: "ETX",
    4: "EOT",
    5: "ENQ",
    6: "ACK",
    7: "BEL",
    8: "BS",
    9: "TAB",
    10: "LF",
    11: "VT",
    12: "FF",
    13: "CR",
    14: "SO",
    15: "SI",
    16: "DLE",
    17: "DC1",
    18: "DC2",
    19: "DC3",
    20: "DC4",
    21: "NAK",
    22: "SYN",
    23: "ETB",
    24: "CAN",
    25: "EM",
    26: "SUB",
    27: "ESC",
    28: "FS",
    29: "GS",
    30: "RS",
    31: "US",
    32: "Space",
    127: "DEL",
  };

  const name = controlNames[num] || `CTRL+${String.fromCharCode(num + 64)}`;
  return { char: name, codePoint, display: name };
}

export function getBits(value: bigint, bitWidth: BitWidth): number[] {
  const mask = BIT_MASKS[bitWidth];
  const unsigned = value & mask;
  const bits: number[] = [];
  for (let i = bitWidth - 1; i >= 0; i--) {
    bits.push(Number((unsigned >> BigInt(i)) & 1n));
  }
  return bits;
}

export function bitsToValue(bits: number[], bitWidth: BitWidth): bigint {
  let value = 0n;
  for (let i = 0; i < bitWidth; i++) {
    if (bits[i]) {
      value |= 1n << BigInt(bitWidth - 1 - i);
    }
  }
  return value & BIT_MASKS[bitWidth];
}

export function getReferenceTable(): Array<{ dec: string; hex: string; oct: string; bin: string }> {
  return Array.from({ length: 16 }, (_, i) => ({
    dec: i.toString(10),
    hex: i.toString(16).toUpperCase().padStart(2, "0"),
    oct: i.toString(8).padStart(2, "0"),
    bin: groupBinary(i.toString(2).padStart(4, "0")),
  }));
}
