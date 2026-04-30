# Number Base Converter — Design Spec

## Overview

A browser-based number base conversion tool supporting real-time bidirectional conversion between Binary (BIN), Octal (OCT), Decimal (DEC), and Hexadecimal (HEX). Supports negative integers via two's complement with selectable bit widths (8/16/32/64). Includes a bit-level visual editor, ASCII character mapping, and a reference table.

All computation runs client-side. No data leaves the browser.

## Requirements

### Core

| Requirement      | Detail                                                    |
| ---------------- | --------------------------------------------------------- |
| Bases            | BIN (2), OCT (8), DEC (10), HEX (16) only                 |
| Value type       | Integers, including negative via two's complement         |
| Bit widths       | 8, 16, 32, 64 (user-selectable)                           |
| Number size      | BigInt for arbitrary-precision integers                   |
| Input validation | Per-base character restrictions, real-time error feedback |
| Overflow         | Truncate to selected bit width, show warning              |

### Features

| Feature              | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| Four-panel live sync | Editing any panel updates the other three instantly                     |
| Binary grouping      | BIN output grouped by 4 bits (e.g., `1010 0011`)                        |
| Bit visual editor    | Clickable bit cells showing 0/1 state, toggle on click                  |
| ASCII mapping        | Show corresponding ASCII char, Unicode code point, or control char name |
| Reference table      | Fixed 0–15 lookup table in four bases                                   |
| Description section  | Educational content explaining number base conversion                   |

## UI Design

### Page Structure

Two tabs using `NeonTabs` (matching ASCII tool pattern):

1. **Converter** — main conversion workspace
2. **Reference** — static lookup table

Below both tabs: a Description section with educational content.

### Converter Tab Layout (top to bottom)

```
┌─────────────────────────────────────────────┐
│  Bit Width: [8] [16] [32] [64]              │
├──────────────────┬──────────────────────────┤
│  DEC (Decimal)   │  HEX (Hexadecimal)       │
│  ┌────────────┐  │  ┌────────────┐          │
│  │ input      │  │  │ input      │          │
│  └────────────┘  │  └────────────┘          │
├──────────────────┼──────────────────────────┤
│  OCT (Octal)     │  BIN (Binary)            │
│  ┌────────────┐  │  ┌────────────┐          │
│  │ input      │  │  │ input      │          │
│  └────────────┘  │  └────────────┘          │
├──────────────────┴──────────────────────────┤
│  Bit Visual Editor                          │
│  7  6  5  4  3  2  1  0                     │
│  [1][0][1][0] [0][0][1][1]                  │
├─────────────────────────────────────────────┤
│  ASCII: 'A'  |  U+0041  |  Decimal 65       │
└─────────────────────────────────────────────┘

  ── Description Section ──
  What is Number Base Conversion?
  [Educational content...]
```

### Initial State

Page loads with default value **65** (ASCII 'A'):

- DEC: `65`, HEX: `41`, OCT: `101`, BIN: `0100 0001`
- Bit editor: bits set to `01000001`
- ASCII mapping: `'A' | U+0041`
- Default bit width: **8**

This demonstrates all features immediately — four-base conversion, bit editor, and ASCII mapping — giving users a working example to learn from.

### Panel Component

Each of the four panels contains:

- **Label**: Base name + prefix indicator (e.g., `BIN 0b`, `HEX 0x`, `OCT 0o`, `DEC`)
- **Input**: `StyledInput`, font-mono (`className="font-mono text-sm"`), editable, user types in this base
- **Output state**: The computed result shown in the input field itself (panels are both input and display)
- **CopyButton**: Inline copy button (`getContent={() => value}`) to copy the current value
- **Error indicator**: On validation failure, apply `border-danger ring-danger/20` to `StyledInput` via conditional `className`, plus a small `text-danger` message below the input

### Bit Width Selector

A row of toggle buttons using `Button variant="outline-cyan"` for inactive, `variant="primary"` for active. Buttons: `8` / `16` / `32` / `64`. Changing bit width re-computes all panels and the bit editor from the current BigInt value.

### Bit Visual Editor

- Renders one clickable cell per bit
- Cells display `0` or `1` in font-mono
- Active bits (1) highlighted with accent-cyan background
- Bits grouped by 4 with visual spacing
- Bit position labels above (MSB left, LSB right)
- Clicking a cell toggles the bit → recomputes BigInt → updates all four panels
- Responsive: 8 bits in one row; 16/32/64 wrap to multiple rows as needed

### ASCII Mapping

A compact info bar below the bit editor:

- Shows the character if value is a printable ASCII char (32–126)
- Shows control character name for 0–31 and 127 (e.g., `NUL`, `DEL`)
- Shows Unicode code point (e.g., `U+0041`)
- Greyed out / muted for values outside 0–127 range
- Read-only, no interaction

### Reference Tab

Static table, 16 rows, columns: `DEC | HEX | OCT | BIN`

- Styled like ASCII tool tables: `border border-border-default`, `bg-bg-elevated/40` header, hover highlight
- BIN column grouped by 4 bits (`0000` through `1111`)
- Alternating row tint for readability

### Description Section

Below the NeonTabs, matching the pattern used by all existing tools (Base64, JWT, ASCII, etc.):

- **Title**: "What is Number Base Conversion?"
- **Content**: Brief explanation of number bases, common use cases (debugging, network protocols, color codes, file permissions), and how two's complement represents negative numbers
- Styled consistently with other tools' Description components

## Data Flow

### State Model

Single source of truth: a `BigInt` value and the "active panel" (which base the user is editing).

```
Page load
  → initialize BigInt = 65n, bitWidth = 8
  → compute all panels from BigInt
  → render bit editor from BigInt
  → render ASCII mapping from BigInt

User types in DEC panel
  → parse input as base-10 BigInt (handle negative sign)
  → clamp to bit width (two's complement mask)
  → recompute BIN, OCT, HEX from clamped BigInt
  → update bit editor cells
  → update ASCII mapping
```

### Conversion Logic

All conversion flows through a central BigInt:

1. **Input → BigInt**: Parse string in source base, validate characters, handle negative sign (DEC only) or two's complement (other bases)
2. **BigInt → Output**: Convert to each target base string, apply formatting (zero-padding, grouping for BIN)
3. **Bit toggle → BigInt**: Reconstruct from bit array → update all panels

### Two's Complement Behavior

- **DEC panel**: Accepts negative sign (`-1`). The BigInt is stored as a signed value internally.
- **BIN/OCT/HEX panels**: Input is always treated as unsigned bit patterns (no `-` sign allowed). The unsigned value is interpreted as a two's complement signed integer: if the MSB bit is 1 (i.e., value >= 2^(N-1)), the signed value is `value - 2^N`. Example: HEX `FF` in 8-bit mode → signed DEC shows `-1`.
- **Display rules**: DEC panel shows the signed interpretation. BIN/OCT/HEX panels always show the full unsigned bit pattern padded to bit width.
- **Bit width change**: The stored BigInt is masked to the new bit width. If the value exceeds the new width, it is truncated and the DEC panel updates to reflect the new signed interpretation.

## File Structure

### New Files

| File                                    | Purpose                                                       |
| --------------------------------------- | ------------------------------------------------------------- |
| `app/[locale]/numbase/page.tsx`         | Route entry, SEO metadata via `generatePageMeta`              |
| `app/[locale]/numbase/numbase-page.tsx` | Client component: Converter tab + Reference tab + Description |
| `libs/numbase/main.ts`                  | Core conversion logic (parse, convert, format, validate)      |
| `public/locales/en/numbase.json`        | English translations                                          |
| `public/locales/zh-CN/numbase.json`     | Simplified Chinese translations                               |
| `public/locales/zh-TW/numbase.json`     | Traditional Chinese translations                              |

### Modified Files

| File                              | Change                                                           |
| --------------------------------- | ---------------------------------------------------------------- |
| `libs/tools.ts`                   | Add `{ key: "numbase", path: "/numbase" }` to TOOLS array        |
| `public/locales/en/tools.json`    | Add `numbase.title`, `numbase.shortTitle`, `numbase.description` |
| `public/locales/zh-CN/tools.json` | Same keys in Simplified Chinese                                  |
| `public/locales/zh-TW/tools.json` | Same keys in Traditional Chinese                                 |
| `AGENTS.md`                       | Add Number Base Converter to tools table                         |

## Core API (`libs/numbase/main.ts`)

```typescript
type Radix = 2 | 8 | 10 | 16;
type BitWidth = 8 | 16 | 32 | 64;

interface ParseResult {
  value: bigint;
  error?: string; // "invalid_digit" | "overflow" | "empty"
}

/** Parse a string in the given radix to a BigInt, validating per-base rules */
function parseInput(input: string, radix: Radix, bitWidth: BitWidth): ParseResult;

/** Convert a BigInt to a formatted string in the target radix */
function formatValue(value: bigint, radix: Radix, bitWidth: BitWidth): string;

/** Format a binary string with 4-bit grouping */
function groupBinary(binary: string): string;

/** Get the two's complement representation for negative values */
function toTwosComplement(value: bigint, bitWidth: BitWidth): bigint;

/** Interpret an unsigned value as signed two's complement */
function fromTwosComplement(unsigned: bigint, bitWidth: BitWidth): bigint;

/** Get ASCII/Unicode info for a given value */
function getAsciiInfo(value: bigint): { char: string; codePoint: string; display: string };

/** Bit width constants for masking */
const BIT_MASKS: Record<BitWidth, bigint>;

/** Valid character regex per radix */
const RADIX_PATTERNS: Record<Radix, RegExp>;

/** Default initial value */
const DEFAULT_VALUE = 65n;

/** Default bit width */
const DEFAULT_BIT_WIDTH: BitWidth = 8;
```

## Error Handling

| Scenario                   | Behavior                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Invalid character for base | Apply `border-danger ring-danger/20` to `StyledInput`, show `text-danger` message below input      |
| Empty input                | Clear all other panels, clear bit editor and ASCII mapping                                         |
| Value exceeds bit width    | Truncate + show `Badge variant="danger"` with overflow warning                                     |
| NaN / unparseable          | Apply `border-danger ring-danger/20` to `StyledInput`, show `text-danger` "invalid number" message |

All validation feedback is inline — no `showToast` for input errors. This avoids disrupting the typing flow.

## i18n Keys

### `tools.json` additions

```json
{
  "numbase": {
    "title": "Number Base Converter - Binary, Octal, Hex, Decimal",
    "shortTitle": "Number Base Converter",
    "description": "Convert numbers between binary, octal, decimal, and hexadecimal with real-time sync. Supports 8/16/32/64-bit two's complement, bit visual editor."
  }
}
```

### `numbase.json`

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

## Out of Scope

- Floating-point / fractional number conversion
- Custom radix (base 3, base 32, etc.)
- Arithmetic operations between panels
- History / undo
- Shareable URL state
- Clear / reset button
