# Number Base Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based number base converter supporting real-time bidirectional conversion between BIN/OCT/DEC/HEX with a bit visual editor, ASCII mapping, and reference table.

**Architecture:** Single BigInt source of truth drives all four panels. Core conversion logic lives in `libs/numbase/main.ts` as pure functions. The page component manages state and delegates to the pure functions. NeonTabs provides tab switching between Converter and Reference views.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS 4, next-intl, BigInt, Headless UI (NeonTabs)

**Spec:** `docs/superpowers/specs/2026-04-29-numbase-design.md`

---

## Task 1: Core Conversion Library

**Files:**

- Create: `libs/numbase/main.ts`

- [ ] **Step 1: Create the conversion library**

```typescript
// libs/numbase/main.ts

export type Radix = 2 | 8 | 10 | 16;
export type BitWidth = 8 | 16 | 32 | 64;

export interface ParseResult {
  value: bigint;
  error?: string; // "invalid_digit" | "overflow" | "empty"
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

/** Parse a string in the given radix to a BigInt, validating per-base rules */
export function parseInput(input: string, radix: Radix, bitWidth: BitWidth): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { value: 0n, error: "empty" };
  }

  // DEC allows negative sign; others do not
  if (radix !== 10 && trimmed.startsWith("-")) {
    return { value: 0n, error: "invalid_digit" };
  }

  // Check the remaining characters against the radix pattern
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

  // For non-decimal radix, parse using native BigInt with prefix
  if (radix !== 10) {
    try {
      const prefixed = RADIX_PREFIX[radix] + trimmed;
      value = BigInt(prefixed);
    } catch {
      return { value: 0n, error: "invalid_digit" };
    }
  }

  // Clamp to bit width (two's complement)
  const mask = BIT_MASKS[bitWidth];
  const clamped = value >= 0n ? value & mask : toTwosComplement(value, bitWidth) & mask;

  return { value: clamped };
}

/** Convert a BigInt to a formatted string in the target radix */
export function formatValue(value: bigint, radix: Radix, bitWidth: BitWidth): string {
  // Work with unsigned representation
  const mask = BIT_MASKS[bitWidth];
  const unsigned = value & mask;

  if (radix === 10) {
    // Show signed value for decimal
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

/** Format a binary string with 4-bit grouping */
export function groupBinary(binary: string): string {
  const groups: string[] = [];
  for (let i = 0; i < binary.length; i += 4) {
    groups.push(binary.slice(i, i + 4));
  }
  return groups.join(" ");
}

/** Get the two's complement representation for negative values */
export function toTwosComplement(value: bigint, bitWidth: BitWidth): bigint {
  if (value >= 0n) return value & BIT_MASKS[bitWidth];
  const mask = BIT_MASKS[bitWidth];
  return (mask + value + 1n) & mask;
}

/** Interpret an unsigned value as signed two's complement */
export function fromTwosComplement(unsigned: bigint, bitWidth: BitWidth): bigint {
  const mask = BIT_MASKS[bitWidth];
  const clamped = unsigned & mask;
  const signBit = 1n << BigInt(bitWidth - 1);
  if (clamped & signBit) {
    return clamped - (mask + 1n);
  }
  return clamped;
}

/** Get ASCII/Unicode info for a given value */
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

  // Control characters
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

/** Get bits array from BigInt value for the bit visual editor */
export function getBits(value: bigint, bitWidth: BitWidth): number[] {
  const mask = BIT_MASKS[bitWidth];
  const unsigned = value & mask;
  const bits: number[] = [];
  for (let i = bitWidth - 1; i >= 0; i--) {
    bits.push(Number((unsigned >> BigInt(i)) & 1n));
  }
  return bits;
}

/** Reconstruct BigInt from a toggled bit array */
export function bitsToValue(bits: number[], bitWidth: BitWidth): bigint {
  let value = 0n;
  for (let i = 0; i < bitWidth; i++) {
    if (bits[i]) {
      value |= 1n << BigInt(bitWidth - 1 - i);
    }
  }
  return value & BIT_MASKS[bitWidth];
}

/** Generate reference table data (0-15 in all four bases) */
export function getReferenceTable(): Array<{ dec: string; hex: string; oct: string; bin: string }> {
  return Array.from({ length: 16 }, (_, i) => ({
    dec: i.toString(10),
    hex: i.toString(16).toUpperCase().padStart(2, "0"),
    oct: i.toString(8).padStart(2, "0"),
    bin: groupBinary(i.toString(2).padStart(4, "0")),
  }));
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit libs/numbase/main.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add libs/numbase/main.ts
git commit -m "feat(numbase): add core conversion library"
```

---

## Task 2: i18n Translation Files

**Files:**

- Create: `public/locales/en/numbase.json`
- Create: `public/locales/zh-CN/numbase.json`
- Create: `public/locales/zh-TW/numbase.json`
- Modify: `public/locales/en/tools.json`
- Modify: `public/locales/zh-CN/tools.json`
- Modify: `public/locales/zh-TW/tools.json`

- [ ] **Step 1: Create English translation file**

Create `public/locales/en/numbase.json`:

```json
{
  "tabConverter": "Converter",
  "tabReference": "Reference",
  "bitWidth": "Bit Width",
  "decimal": "Decimal",
  "hexadecimal": "Hexadecimal",
  "octal": "Octal",
  "binary": "Binary",
  "asciiChar": "ASCII",
  "unicodePoint": "Unicode",
  "invalidInput": "Invalid input",
  "overflowWarning": "Value exceeds bit width",
  "referenceTitle": "Base Reference (0-15)",
  "refDec": "DEC",
  "refHex": "HEX",
  "refOct": "OCT",
  "refBin": "BIN",
  "descriptions": {
    "whatIsTitle": "What is Number Base Conversion?",
    "whatIs": "Number base conversion transforms a number from one positional numeral system to another. Computers use binary (base 2), while humans typically work with decimal (base 10). Hexadecimal (base 16) and octal (base 8) offer compact representations of binary data, commonly used in debugging, network protocols, color codes, and file permissions.",
    "twosComplementTitle": "Two's Complement",
    "twosComplement": "Two's complement is the standard way to represent signed integers in binary. The most significant bit (MSB) acts as the sign bit: 0 for positive, 1 for negative. To get the negative value, invert all bits and add 1. For example, in 8-bit mode, -1 is represented as 11111111 (0xFF)."
  }
}
```

- [ ] **Step 2: Create Simplified Chinese translation file**

Create `public/locales/zh-CN/numbase.json`:

```json
{
  "tabConverter": "转换器",
  "tabReference": "参考表",
  "bitWidth": "位宽",
  "decimal": "十进制",
  "hexadecimal": "十六进制",
  "octal": "八进制",
  "binary": "二进制",
  "asciiChar": "ASCII",
  "unicodePoint": "Unicode",
  "invalidInput": "无效输入",
  "overflowWarning": "值超出位宽范围",
  "referenceTitle": "进制参考表 (0-15)",
  "refDec": "DEC",
  "refHex": "HEX",
  "refOct": "OCT",
  "refBin": "BIN",
  "descriptions": {
    "whatIsTitle": "什么是进制转换？",
    "whatIs": "进制转换是将数字从一个进制系统转换为另一个进制系统的过程。计算机使用二进制（基数为 2），而人类通常使用十进制（基数为 10）。十六进制（基数为 16）和八进制（基数为 8）提供了二进制数据的紧凑表示，常用于调试、网络协议、颜色代码和文件权限。",
    "twosComplementTitle": "二进制补码",
    "twosComplement": "二进制补码是表示有符号整数的标准方式。最高位（MSB）作为符号位：0 表示正数，1 表示负数。要获取负值，将所有位取反后加 1。例如，在 8 位模式下，-1 表示为 11111111（0xFF）。"
  }
}
```

- [ ] **Step 3: Create Traditional Chinese translation file**

Create `public/locales/zh-TW/numbase.json`:

```json
{
  "tabConverter": "轉換器",
  "tabReference": "參考表",
  "bitWidth": "位元寬度",
  "decimal": "十進位",
  "hexadecimal": "十六進位",
  "octal": "八進位",
  "binary": "二進位",
  "asciiChar": "ASCII",
  "unicodePoint": "Unicode",
  "invalidInput": "無效輸入",
  "overflowWarning": "值超出位元寬度範圍",
  "referenceTitle": "進位參考表 (0-15)",
  "refDec": "DEC",
  "refHex": "HEX",
  "refOct": "OCT",
  "refBin": "BIN",
  "descriptions": {
    "whatIsTitle": "什麼是進位轉換？",
    "whatIs": "進位轉換是將數字從一個進位系統轉換為另一個進位系統的過程。電腦使用二進位（基數為 2），而人類通常使用十進位（基數為 10）。十六進位（基數為 16）和八進位（基數為 8）提供了二進位資料的緊湊表示，常用於除錯、網路協定、顏色代碼和檔案權限。",
    "twosComplementTitle": "二進位補數",
    "twosComplement": "二進位補數是表示有號整數的標準方式。最高位元（MSB）作為符號位元：0 表示正數，1 表示負數。要獲取負值，將所有位元取反後加 1。例如，在 8 位元模式下，-1 表示為 11111111（0xFF）。"
  }
}
```

- [ ] **Step 4: Add tool entries to tools.json files**

Add the following entry to `public/locales/en/tools.json` (after the last entry, before the closing `}`):

```json
  "numbase": {
    "title": "Number Base Converter - Binary, Octal, Hex, Decimal",
    "shortTitle": "Number Base Converter",
    "description": "Convert numbers between binary, octal, decimal, and hexadecimal with real-time sync. Supports 8/16/32/64-bit two's complement, bit visual editor."
  }
```

Add the following entry to `public/locales/zh-CN/tools.json`:

```json
  "numbase": {
    "title": "进制转换器 - 二进制、八进制、十六进制、十进制",
    "shortTitle": "进制转换",
    "description": "在二进制、八进制、十进制、十六进制之间实时转换数字。支持 8/16/32/64 位二进制补码，可视化位编辑器。"
  }
```

Add the following entry to `public/locales/zh-TW/tools.json`:

```json
  "numbase": {
    "title": "進位轉換器 - 二進位、八進位、十六進位、十進位",
    "shortTitle": "進位轉換",
    "description": "在二進位、八進位、十進位、十六進位之間即時轉換數字。支援 8/16/32/64 位元二進位補數，視覺化位元編輯器。"
  }
```

- [ ] **Step 5: Commit**

```bash
git add public/locales/en/numbase.json public/locales/zh-CN/numbase.json public/locales/zh-TW/numbase.json public/locales/en/tools.json public/locales/zh-CN/tools.json public/locales/zh-TW/tools.json
git commit -m "feat(numbase): add i18n translations"
```

---

## Task 3: Tool Registry & Route Entry

**Files:**

- Modify: `libs/tools.ts` — add numbase entry
- Create: `app/[locale]/numbase/page.tsx` — route entry

- [ ] **Step 1: Add numbase to TOOLS array**

In `libs/tools.ts`, add before the closing `] as const;`:

```typescript
  { key: "numbase", path: "/numbase" },
```

The entry should be placed after `{ key: "color", path: "/color" }` (the last existing entry).

- [ ] **Step 2: Create route entry page**

Create `app/[locale]/numbase/page.tsx`:

```typescript
import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import NumbasePage from "./numbase-page";

const PATH = "/numbase";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("numbase.title"),
    description: t("numbase.description"),
  });
}

export default function NumbaseRoute() {
  return <NumbasePage />;
}
```

- [ ] **Step 3: Commit**

```bash
git add libs/tools.ts app/[locale]/numbase/page.tsx
git commit -m "feat(numbase): add tool registry entry and route"
```

---

## Task 4: Page Component — Converter & Reference Tabs

**Files:**

- Create: `app/[locale]/numbase/numbase-page.tsx`

This is the largest task. The file has three main sections: Converter tab, Reference tab, and Description section, all orchestrated by the default export.

- [ ] **Step 1: Create the page component**

Create `app/[locale]/numbase/numbase-page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { NeonTabs } from "../../../components/ui/tabs";
import { StyledInput } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Badge } from "../../../components/ui/badge";
import {
  type Radix,
  type BitWidth,
  DEFAULT_VALUE,
  DEFAULT_BIT_WIDTH,
  BIT_MASKS,
  parseInput,
  formatValue,
  getAsciiInfo,
  getBits,
  bitsToValue,
  getReferenceTable,
} from "../../../libs/numbase/main";

const BIT_WIDTHS: BitWidth[] = [8, 16, 32, 64];

interface PanelConfig {
  radix: Radix;
  labelKey: string;
  prefix: string;
}

const PANELS: PanelConfig[] = [
  { radix: 10, labelKey: "decimal", prefix: "DEC" },
  { radix: 16, labelKey: "hexadecimal", prefix: "HEX 0x" },
  { radix: 8, labelKey: "octal", prefix: "OCT 0o" },
  { radix: 2, labelKey: "binary", prefix: "BIN 0b" },
];

function BitWidthSelector({
  bitWidth,
  onChange,
  label,
}: {
  bitWidth: BitWidth;
  onChange: (w: BitWidth) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm text-fg-secondary font-medium">{label}:</span>
      <div className="flex gap-2">
        {BIT_WIDTHS.map((w) => (
          <Button
            key={w}
            variant={bitWidth === w ? "primary" : "outline-cyan"}
            size="sm"
            onClick={() => onChange(w)}
            className="font-mono"
          >
            {w}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ConversionPanel({
  config,
  value,
  bitWidth,
  error,
  onChange,
  t,
}: {
  config: PanelConfig;
  value: bigint;
  bitWidth: BitWidth;
  error: string | undefined;
  onChange: (text: string, radix: Radix) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const displayValue = formatValue(value, config.radix, bitWidth);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-mono font-bold text-fg-secondary">{config.prefix}</label>
        <CopyButton getContent={() => displayValue.replace(/\s/g, "")} className="-mr-1" />
      </div>
      <div className="relative">
        <StyledInput
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value, config.radix)}
          className={`font-mono text-sm ${error ? "border-danger ring-danger/20" : ""}`}
          aria-label={t(config.labelKey)}
        />
        {error && (
          <p role="alert" className="text-danger text-xs mt-1">
            {t(error === "invalid_digit" ? "invalidInput" : "overflowWarning")}
          </p>
        )}
      </div>
    </div>
  );
}

function BitVisualEditor({
  value,
  bitWidth,
  onToggle,
}: {
  value: bigint;
  bitWidth: BitWidth;
  onToggle: (index: number) => void;
}) {
  const bits = getBits(value, bitWidth);

  // Build rows of 8 bits (or bitWidth if < 8)
  const rowSize = 8;
  const rows: number[][] = [];
  for (let i = 0; i < bits.length; i += rowSize) {
    rows.push(bits.slice(i, i + rowSize));
  }

  return (
    <div className="space-y-1">
      {rows.map((row, rowIdx) => {
        const offset = rowIdx * rowSize;
        return (
          <div key={rowIdx}>
            {/* Bit position labels */}
            <div className="flex gap-0.5 mb-0.5">
              {row.map((_, bitIdx) => {
                const pos = bitWidth - 1 - (offset + bitIdx);
                const isGroupEnd = bitIdx > 0 && bitIdx % 4 === 0;
                return (
                  <span
                    key={pos}
                    className={`w-7 text-center text-xs text-fg-muted font-mono ${isGroupEnd ? "ml-1.5" : ""}`}
                  >
                    {pos}
                  </span>
                );
              })}
            </div>
            {/* Bit cells */}
            <div className="flex gap-0.5">
              {row.map((bit, bitIdx) => {
                const globalIdx = offset + bitIdx;
                const isGroupEnd = bitIdx > 0 && bitIdx % 4 === 0;
                return (
                  <button
                    key={globalIdx}
                    type="button"
                    onClick={() => onToggle(globalIdx)}
                    className={`
                      w-7 h-8 rounded text-xs font-mono font-bold flex items-center justify-center
                      transition-all duration-150 cursor-pointer border
                      ${
                        bit
                          ? "bg-accent-cyan/20 border-accent-cyan/40 text-accent-cyan"
                          : "bg-bg-input border-border-default text-fg-muted"
                      }
                      hover:scale-105 active:scale-95
                      ${isGroupEnd ? "ml-1.5" : ""}
                    `}
                  >
                    {bit}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AsciiMapping({ value }: { value: bigint }) {
  const info = getAsciiInfo(value);
  const num = Number(value);

  if (num < 0 || num > 127) {
    return (
      <div className="flex items-center gap-4 text-fg-muted text-sm">
        <span className="font-mono">{info.codePoint}</span>
        <span>—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="font-mono font-bold text-accent-cyan">{info.char}</span>
      <span className="text-fg-muted">|</span>
      <span className="font-mono text-fg-secondary">{info.codePoint}</span>
    </div>
  );
}

function ReferenceTable({ t }: { t: ReturnType<typeof useTranslations> }) {
  const data = getReferenceTable();

  return (
    <div className="rounded-lg border border-border-default overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead className="bg-bg-elevated/40">
            <tr className="border-b border-border-default">
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("refDec")}
              </th>
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("refHex")}
              </th>
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("refOct")}
              </th>
              <th className="py-2.5 px-4 text-fg-muted text-xs font-mono font-medium uppercase tracking-wider">
                {t("refBin")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-elevated/60 ${
                  idx === data.length - 1 ? "border-b-0" : ""
                } ${idx % 2 === 1 ? "bg-bg-elevated/30" : ""}`}
              >
                <td className="py-2.5 px-4 text-sm text-fg-secondary font-mono">{row.dec}</td>
                <td className="py-2.5 px-4 text-sm text-fg-secondary font-mono">{row.hex}</td>
                <td className="py-2.5 px-4 text-sm text-fg-secondary font-mono">{row.oct}</td>
                <td className="py-2.5 px-4 text-sm text-fg-secondary font-mono">{row.bin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Description() {
  const t = useTranslations("numbase");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h2>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">{t("descriptions.whatIs")}</p>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.twosComplementTitle")}
        </h2>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">
          {t("descriptions.twosComplement")}
        </p>
      </div>
    </section>
  );
}

function Converter() {
  const t = useTranslations("numbase");
  const [bitWidth, setBitWidth] = useState<BitWidth>(DEFAULT_BIT_WIDTH);
  const [value, setValue] = useState<bigint>(DEFAULT_VALUE);
  const [activeError, setActiveError] = useState<{ radix: Radix; message: string } | null>(null);

  function handleInputChange(text: string, radix: Radix) {
    const result = parseInput(text, radix, bitWidth);
    if (result.error === "empty") {
      setValue(0n);
      setActiveError(null);
      return;
    }
    if (result.error) {
      setActiveError({ radix, message: result.error });
      return;
    }
    setActiveError(null);
    setValue(result.value);
  }

  function handleBitToggle(index: number) {
    const bits = getBits(value, bitWidth);
    bits[index] = bits[index] === 0 ? 1 : 0;
    const newValue = bitsToValue(bits, bitWidth);
    setValue(newValue);
    setActiveError(null);
  }

  function handleBitWidthChange(newWidth: BitWidth) {
    // Mask current value to new bit width
    const masked = value & BIT_MASKS[newWidth];
    setValue(masked);
    setBitWidth(newWidth);
    setActiveError(null);
  }

  return (
    <div>
      <BitWidthSelector bitWidth={bitWidth} onChange={handleBitWidthChange} label={t("bitWidth")} />

      {/* Four-panel grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {PANELS.map((panel) => (
          <ConversionPanel
            key={panel.radix}
            config={panel}
            value={value}
            bitWidth={bitWidth}
            error={activeError?.radix === panel.radix ? activeError.message : undefined}
            onChange={handleInputChange}
            t={t}
          />
        ))}
      </div>

      {/* Bit Visual Editor */}
      <div className="mb-4 p-4 rounded-lg border border-border-default bg-bg-elevated/30">
        <BitVisualEditor value={value} bitWidth={bitWidth} onToggle={handleBitToggle} />
      </div>

      {/* ASCII Mapping */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border-default bg-bg-elevated/30 mb-4">
        <span className="text-sm font-medium text-fg-muted">{t("asciiChar")}:</span>
        <AsciiMapping value={value} />
      </div>
    </div>
  );
}

export default function NumbasePage() {
  const t = useTranslations("numbase");
  const ts = useTranslations("tools");
  const tc = useTranslations("common");

  return (
    <Layout title={ts("numbase.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <NeonTabs
          tabs={[
            {
              label: <span className="font-mono text-sm font-bold">{t("tabConverter")}</span>,
              content: <Converter />,
            },
            {
              label: <span className="font-mono text-sm font-bold">{t("tabReference")}</span>,
              content: (
                <div>
                  <h3 className="text-sm font-semibold text-fg-primary mb-3">
                    {t("referenceTitle")}
                  </h3>
                  <ReferenceTable t={t} />
                </div>
              ),
            },
          ]}
        />

        <Description />
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run linter**

Run: `npx eslint app/\\[locale\\]/numbase/numbase-page.tsx`
Expected: No errors (React Compiler auto-memoization means no `useMemo`/`useCallback` needed)

- [ ] **Step 4: Run dev server and verify**

Run: `npm run dev`
Navigate to `http://localhost:3000/numbase`
Expected:

- Page loads with default value 65
- DEC shows `65`, HEX shows `41`, OCT shows `101`, BIN shows `0100 0001`
- Bit editor shows 8 clickable cells
- ASCII mapping shows `'A' | U+0041`
- Reference tab shows 16-row table
- Description section visible below tabs

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/numbase/numbase-page.tsx
git commit -m "feat(numbase): add converter page with bit editor and reference table"
```

---

## Task 5: Update AGENTS.md

**Files:**

- Modify: `AGENTS.md`

- [ ] **Step 1: Add tool to the Available Tools table**

In `AGENTS.md`, find the `| Route | Tool | Description |` table and add a row for numbase:

```markdown
| `/numbase` | Number Base Converter | BIN/OCT/DEC/HEX conversion, two's complement, bit editor |
```

Place it in alphabetical order after `/markdown` and before `/password`.

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs(numbase): add tool to AGENTS.md"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run linter on all new files**

Run: `npx eslint libs/numbase/main.ts app/\\[locale\\]/numbase/`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

Verify all of the following:

1. **Page load**: `http://localhost:3000/numbase` loads with default value 65
2. **Four-panel sync**: Type `255` in DEC → HEX shows `FF`, OCT shows `377`, BIN shows `1111 1111`
3. **Negative numbers**: Type `-1` in DEC → BIN shows `1111 1111`, HEX shows `FF`
4. **Bit toggle**: Click bit 0 (LSB) to toggle it off → DEC changes from 65 to 64
5. **Bit width change**: Switch to 16-bit → BIN shows `0000 0000 0100 0001`, DEC still 65
6. **Invalid input**: Type `G` in HEX → red border, inline error message
7. **ASCII mapping**: Value 65 shows `'A' | U+0041`; value 0 shows `NUL`
8. **Reference tab**: Click Reference tab → 16-row table with DEC/HEX/OCT/BIN columns
9. **Description**: Educational content visible below tabs
10. **Copy**: Click copy button next to any panel → value copied to clipboard
11. **i18n**: Switch to `/zh-CN/numbase` → all text in Simplified Chinese
12. **Responsive**: Resize to mobile → four panels stack vertically
