const DEFAULT_NAME = "--color-primary";

function normalizeVarName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_NAME;
  return trimmed.startsWith("--") ? trimmed : `--${trimmed}`;
}

export function cssVariable(name: string, value: string): string {
  return `${normalizeVarName(name)}: ${value};`;
}

export type TailwindPrefix = "bg" | "text" | "border" | "ring";

export function tailwindClass(prefix: TailwindPrefix, hex: string): string {
  return `${prefix}-[${hex}]`;
}

export function tailwindThemeBlock(name: string, value: string): string {
  return `@theme {\n  ${normalizeVarName(name)}: ${value};\n}`;
}
