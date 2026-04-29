import {
  camelCase,
  pascalCase,
  snakeCase,
  constantCase,
  kebabCase,
  dotCase,
  pathCase,
  sentenceCase,
  noCase,
} from "change-case";
import { titleCase } from "title-case";

function lowerCase(input: string): string {
  return noCase(input).toLowerCase();
}

function upperCase(input: string): string {
  return noCase(input).toUpperCase();
}

export interface FormatDefinition {
  key: string;
  convert: (input: string) => string;
}

export const FORMATS: readonly FormatDefinition[] = [
  { key: "camelCase", convert: camelCase },
  { key: "pascalCase", convert: pascalCase },
  { key: "snakeCase", convert: snakeCase },
  { key: "constantCase", convert: constantCase },
  { key: "kebabCase", convert: kebabCase },
  { key: "dotCase", convert: dotCase },
  { key: "lowerCase", convert: lowerCase },
  { key: "upperCase", convert: upperCase },
  { key: "titleCase", convert: titleCase },
  { key: "sentenceCase", convert: sentenceCase },
  { key: "pathCase", convert: pathCase },
] as const;

export const FORMAT_KEYS: readonly string[] = FORMATS.map((f) => f.key);

export interface ConversionResult {
  key: string;
  output: string;
}

export function convertAll(input: string): ConversionResult[] {
  return FORMATS.map((f) => ({
    key: f.key,
    output: input === "" ? "" : f.convert(input),
  }));
}

export function detectFormats(input: string): string[] {
  if (input.trim() === "") return [];
  return FORMATS.filter((f) => f.convert(input) === input).map((f) => f.key);
}

export const MAX_INPUT_LENGTH = 1000;

export interface ClipResult {
  value: string;
  clipped: boolean;
}

export function clipInput(input: string): ClipResult {
  if (input.length <= MAX_INPUT_LENGTH) {
    return { value: input, clipped: false };
  }
  return { value: input.slice(0, MAX_INPUT_LENGTH), clipped: true };
}
