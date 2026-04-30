// Shared types for Regex Tester — used by main thread, worker, and UI.

export interface FlagDef {
  char: string; // "g" | "i" | "m" | "s" | "u" | "y" | "d"
  name: string; // i18n key for display name
  description: string; // i18n key for tooltip
  default: boolean; // initial state
}

export interface MatchResult {
  value: string; // matched text ("" for zero-width)
  index: number; // start position
  endIndex: number; // index + value.length
  isZeroWidth: boolean; // value.length === 0
  groups: Record<string, string>; // named capture groups
  groupValues: string[]; // [fullMatch, group1, group2, ...]
}

export interface MatchOutput {
  matches: MatchResult[];
  error: string | null; // human-readable error message
  errorOffset: number | null; // character offset in pattern (from regexpp)
  timedOut: boolean; // true if worker exceeded 1500ms
  pattern: string;
  flags: string;
  inputLength: number;
  matchCount: number;
  truncated: boolean; // true if matchCount > 1000 (rendered cap)
}

export interface ReplaceOutput {
  output: string; // result of replace(All)
  replaceCount: number; // number of substitutions
  error: string | null;
  errorOffset: number | null;
  timedOut: boolean;
}

export interface TokenExplanation {
  text: string; // the literal token text (e.g., "\\d+", "[a-z]")
  start: number; // start offset in pattern
  end: number; // end offset in pattern
  explanationKey: string; // i18n key
  params?: Record<string, string | number>; // template params (e.g., min=3, max=5)
}

export interface PatternPreset {
  name: string; // i18n key for display name
  pattern: string; // regex pattern (no delimiters)
  flags: string; // default flags
  description: string; // i18n key for description
  category: string; // i18n key (general | network | phone | code | security | datetime)
  note?: string; // i18n key for caveat (e.g., "html5SpecEmail")
}

// --- Worker message types ---

export interface RegexWorkerRequest {
  id: number;
  pattern: string;
  flags: string;
  input: string;
  replacement?: string;
  mode: "match" | "replace";
}

export interface RegexWorkerMatchResponse {
  id: number;
  ok: true;
  mode: "match";
  matches: MatchResult[];
  matchCount: number;
}

export interface RegexWorkerReplaceResponse {
  id: number;
  ok: true;
  mode: "replace";
  output: string;
  replaceCount: number;
}

export interface RegexWorkerErrorResponse {
  id: number;
  ok: false;
  message: string;
}

export type RegexWorkerResponse =
  | RegexWorkerMatchResponse
  | RegexWorkerReplaceResponse
  | RegexWorkerErrorResponse;
