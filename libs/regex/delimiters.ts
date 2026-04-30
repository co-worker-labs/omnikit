export interface StripResult {
  pattern: string;
  flags: string;
  stripped: boolean;
}

const DELIMITER_RE = /^\/(.*)\/([a-z]*)$/;

export function stripDelimiters(input: string): StripResult {
  if (!input) {
    return { pattern: "", flags: "", stripped: false };
  }
  const match = input.match(DELIMITER_RE);
  if (match) {
    return {
      pattern: match[1],
      flags: match[2],
      stripped: true,
    };
  }
  return { pattern: input, flags: "", stripped: false };
}

export function parseRegexLiteral(input: string): { pattern: string; flags: string } {
  const result = stripDelimiters(input);
  return { pattern: result.pattern, flags: result.flags };
}
