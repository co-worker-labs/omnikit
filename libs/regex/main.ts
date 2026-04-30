// Regex Tester — Public API barrel

export type {
  FlagDef,
  MatchResult,
  MatchOutput,
  ReplaceOutput,
  TokenExplanation,
  PatternPreset,
} from "./types";

export { FLAGS, defaultFlags, toggleFlag } from "./flags";

export { PATTERN_PRESETS, PRESET_CATEGORIES } from "./patterns";

export { stripDelimiters } from "./delimiters";
export type { StripResult } from "./delimiters";

export { executeRegex, executeReplace, validatePattern, terminateWorker } from "./match";

export { expandReplacement, countReplacements } from "./replace";

export { explainPattern } from "./explain";
