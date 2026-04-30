import type { FlagDef } from "./types";

export const FLAGS: FlagDef[] = [
  { char: "g", name: "flagGlobal", description: "flagGlobalDesc", default: true },
  {
    char: "i",
    name: "flagCaseInsensitive",
    description: "flagCaseInsensitiveDesc",
    default: false,
  },
  { char: "m", name: "flagMultiline", description: "flagMultilineDesc", default: false },
  { char: "s", name: "flagDotAll", description: "flagDotAllDesc", default: false },
  { char: "u", name: "flagUnicode", description: "flagUnicodeDesc", default: false },
  { char: "y", name: "flagSticky", description: "flagStickyDesc", default: false },
  { char: "d", name: "flagHasIndices", description: "flagHasIndicesDesc", default: false },
];

export function defaultFlags(): string {
  return FLAGS.filter((f) => f.default)
    .map((f) => f.char)
    .join("");
}

export function toggleFlag(current: string, char: string): string {
  if (current.includes(char)) {
    return current.replace(char, "");
  }
  return current + char;
}
