import { describe, it, expect } from "vitest";
import { cssVariable, tailwindClass, tailwindThemeBlock } from "../css-export";

describe("cssVariable", () => {
  it("emits a single CSS custom property line", () => {
    expect(cssVariable("--color-primary", "#06d6a0")).toBe("--color-primary: #06d6a0;");
  });

  it("trims a leading -- if user did not include it", () => {
    expect(cssVariable("color-primary", "#06d6a0")).toBe("--color-primary: #06d6a0;");
  });

  it("falls back to a sane default name on empty input", () => {
    expect(cssVariable("", "#06d6a0")).toBe("--color-primary: #06d6a0;");
  });
});

describe("tailwindClass", () => {
  it.each([
    ["bg", "bg-[#06d6a0]"],
    ["text", "text-[#06d6a0]"],
    ["border", "border-[#06d6a0]"],
    ["ring", "ring-[#06d6a0]"],
  ])("emits %s utility", (prefix, expected) => {
    expect(tailwindClass(prefix as "bg" | "text" | "border" | "ring", "#06d6a0")).toBe(expected);
  });
});

describe("tailwindThemeBlock", () => {
  it("wraps a single property in @theme", () => {
    const out = tailwindThemeBlock("--color-primary", "oklch(78% 0.16 165)");
    expect(out).toContain("@theme {");
    expect(out).toContain("--color-primary: oklch(78% 0.16 165);");
    expect(out.trim().endsWith("}")).toBe(true);
  });
});
