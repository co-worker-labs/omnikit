import { describe, it, expect } from "vitest";
import { csvMdConvert } from "../csv-md-convert";

describe("csvMdConvert", () => {
  describe("CSV → Markdown Table", () => {
    it("converts simple CSV to Markdown table", () => {
      const csv = "name,age\nJohn,30\nAlice,25";
      const result = csvMdConvert(csv, "csv", "markdown");
      expect(result.error).toBeUndefined();
      expect(result.output).toContain("| name");
      expect(result.output).toContain("| John");
      expect(result.output).toContain("| Alice");
    });

    it("respects delimiter option", () => {
      const csv = "name;age\nJohn;30";
      const result = csvMdConvert(csv, "csv", "markdown", { delimiter: ";" });
      expect(result.error).toBeUndefined();
      expect(result.output).toContain("| name");
      expect(result.output).toContain("| John");
    });

    it("applies alignment option", () => {
      const csv = "name,age\nJohn,30";
      const result = csvMdConvert(csv, "csv", "markdown", { alignment: "center" });
      expect(result.error).toBeUndefined();
      expect(result.output).toMatch(/:---:/);
    });

    it("returns empty output for empty input", () => {
      const result = csvMdConvert("", "csv", "markdown");
      expect(result.output).toBe("");
      expect(result.error).toBeUndefined();
    });

    it("returns error for invalid CSV", () => {
      const csv = 'name\n"unclosed quote';
      const result = csvMdConvert(csv, "csv", "markdown");
      expect(result.error).toBeDefined();
    });
  });

  describe("Markdown Table → CSV", () => {
    it("converts simple Markdown table to CSV", () => {
      const md = "| name | age |\n| --- | --- |\n| John | 30 |";
      const result = csvMdConvert(md, "markdown", "csv");
      expect(result.error).toBeUndefined();
      expect(result.output).toContain("name");
      expect(result.output).toContain("John");
    });

    it("respects delimiter option for CSV output", () => {
      const md = "| name | age |\n| --- | --- |\n| John | 30 |";
      const result = csvMdConvert(md, "markdown", "csv", { delimiter: ";" });
      expect(result.error).toBeUndefined();
      expect(result.output).toContain(";");
    });

    it("returns error for invalid Markdown table", () => {
      const result = csvMdConvert("not a table", "markdown", "csv");
      expect(result.error).toBeDefined();
    });
  });

  describe("Round-trip", () => {
    it("CSV → MD → CSV preserves data", () => {
      const csv = "name,age\nJohn,30\nAlice,25";
      const mdResult = csvMdConvert(csv, "csv", "markdown");
      expect(mdResult.error).toBeUndefined();
      const csvResult = csvMdConvert(mdResult.output, "markdown", "csv");
      expect(csvResult.error).toBeUndefined();
      expect(csvResult.output).toContain("name");
      expect(csvResult.output).toContain("John");
      expect(csvResult.output).toContain("Alice");
    });
  });
});
