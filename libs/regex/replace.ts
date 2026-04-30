export function expandReplacement(replacement: string, match: RegExpMatchArray): string {
  return replacement.replace(
    /\$(\d+)|\$<([^>]+)>|\$&/g,
    (_, num: string | undefined, name: string | undefined) => {
      if (num !== undefined) {
        const idx = parseInt(num, 10);
        return (match[idx] ?? "") as string;
      }
      if (name !== undefined) {
        return (match.groups?.[name] ?? "") as string;
      }
      return (match[0] ?? "") as string;
    }
  );
}

export function countReplacements(
  input: string,
  pattern: string,
  flags: string,
  replacement: string
): number {
  try {
    const regex = new RegExp(pattern, flags);
    if (flags.includes("g")) {
      const matches = input.match(regex);
      return matches ? matches.length : 0;
    } else {
      return regex.test(input) ? 1 : 0;
    }
  } catch {
    return 0;
  }
}
