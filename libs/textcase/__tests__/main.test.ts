import { describe, it, expect } from "vitest";
import {
  FORMATS,
  FORMAT_KEYS,
  convertAll,
  detectFormats,
  clipInput,
  MAX_INPUT_LENGTH,
} from "../main";

describe("FORMATS & FORMAT_KEYS", () => {
  it("exposes exactly 11 format definitions", () => {
    expect(FORMATS).toHaveLength(11);
  });

  it("FORMAT_KEYS matches FORMATS in stable order", () => {
    expect(FORMAT_KEYS).toEqual(FORMATS.map((f) => f.key));
    expect(FORMAT_KEYS).toEqual([
      "camelCase",
      "pascalCase",
      "snakeCase",
      "constantCase",
      "kebabCase",
      "dotCase",
      "lowerCase",
      "upperCase",
      "titleCase",
      "sentenceCase",
      "pathCase",
    ]);
  });

  it("every format has a key and a convert function", () => {
    for (const f of FORMATS) {
      expect(typeof f.key).toBe("string");
      expect(typeof f.convert).toBe("function");
    }
  });
});

describe("convertAll", () => {
  it("returns one entry per format in stable order", () => {
    const results = convertAll("hello");
    expect(results).toHaveLength(11);
    expect(results.map((r) => r.key)).toEqual([...FORMAT_KEYS]);
  });

  it("converts camelCase 'myVariableName' into all 11 expected outputs", () => {
    const results = convertAll("myVariableName");
    const map = Object.fromEntries(results.map((r) => [r.key, r.output]));

    expect(map.camelCase).toBe("myVariableName");
    expect(map.pascalCase).toBe("MyVariableName");
    expect(map.snakeCase).toBe("my_variable_name");
    expect(map.constantCase).toBe("MY_VARIABLE_NAME");
    expect(map.kebabCase).toBe("my-variable-name");
    expect(map.dotCase).toBe("my.variable.name");
    expect(map.lowerCase).toBe("my variable name");
    expect(map.upperCase).toBe("MY VARIABLE NAME");
    expect(map.titleCase).toBe("MyVariableName");
    expect(map.sentenceCase).toBe("My variable name");
    expect(map.pathCase).toBe("my/variable/name");
  });

  it("returns empty strings for empty input", () => {
    const results = convertAll("");
    expect(results.every((r) => r.output === "")).toBe(true);
  });
});

describe("detectFormats", () => {
  it("returns [] for empty input", () => {
    expect(detectFormats("")).toEqual([]);
  });

  it("returns [] for whitespace-only input", () => {
    expect(detectFormats("   ")).toEqual([]);
    expect(detectFormats("\t\n")).toEqual([]);
  });

  it("detects camelCase uniquely", () => {
    expect(detectFormats("myVariableName")).toEqual(["camelCase"]);
  });

  it("detects snake_case uniquely", () => {
    expect(detectFormats("my_variable_name")).toEqual(["snakeCase"]);
  });

  it("detects kebab-case uniquely", () => {
    expect(detectFormats("my-variable-name")).toEqual(["kebabCase"]);
  });

  it("returns multiple matches for ambiguous single word 'abc'", () => {
    const detected = detectFormats("abc");
    expect(detected.length).toBeGreaterThanOrEqual(3);
    expect(detected).toContain("camelCase");
    expect(detected).toContain("snakeCase");
    expect(detected).toContain("kebabCase");
  });

  it("matches both upperCase and constantCase for 'JSON'", () => {
    const detected = detectFormats("JSON");
    expect(detected).toContain("upperCase");
    expect(detected).toContain("constantCase");
  });
});

describe("clipInput", () => {
  it("returns input unchanged when within cap", () => {
    const result = clipInput("hello world");
    expect(result).toEqual({ value: "hello world", clipped: false });
  });

  it("clips input longer than MAX_INPUT_LENGTH and reports clipped=true", () => {
    const longInput = "a".repeat(MAX_INPUT_LENGTH + 50);
    const result = clipInput(longInput);
    expect(result.clipped).toBe(true);
    expect(result.value).toHaveLength(MAX_INPUT_LENGTH);
    expect(result.value).toBe(longInput.slice(0, MAX_INPUT_LENGTH));
  });

  it("exposes a 1000-char cap", () => {
    expect(MAX_INPUT_LENGTH).toBe(1000);
  });
});

describe("edge cases", () => {
  it("does not split on number boundaries: utf8Encoding → snake_case utf8_encoding", () => {
    const results = convertAll("utf8Encoding");
    const map = Object.fromEntries(results.map((r) => [r.key, r.output]));
    expect(map.snakeCase).toBe("utf8_encoding");
  });

  it("normalizes mixed separators: my-variable_name deterministically", () => {
    const results = convertAll("my-variable_name");
    const map = Object.fromEntries(results.map((r) => [r.key, r.output]));
    expect(map.camelCase).toBe("myVariableName");
    expect(map.snakeCase).toBe("my_variable_name");
    expect(map.kebabCase).toBe("my-variable-name");
  });

  it("preserves non-ASCII: 用户_name contains both 用户 and name in snakeCase", () => {
    const results = convertAll("用户_name");
    const map = Object.fromEntries(results.map((r) => [r.key, r.output]));
    expect(map.snakeCase).toContain("用户");
    expect(map.snakeCase).toContain("name");
  });
});
