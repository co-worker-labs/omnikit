import { describe, it, expect } from "vitest";
import { flatten } from "../flatten";

describe("flatten", () => {
  it("flattens nested objects with dot notation", () => {
    const input = { user: { name: "John", age: 30 } };
    expect(flatten(input)).toEqual({
      "user.name": "John",
      "user.age": 30,
    });
  });

  it("flattens arrays of objects with numeric index keys", () => {
    const input = { tags: [{ name: "a" }, { name: "b" }] };
    expect(flatten(input)).toEqual({
      "tags.0.name": "a",
      "tags.1.name": "b",
    });
  });

  it("joins array of primitives with semicolons", () => {
    const input = { list: [1, 2, 3] };
    expect(flatten(input)).toEqual({ list: "1;2;3" });
  });

  it("handles empty array", () => {
    expect(flatten({ arr: [] })).toEqual({ arr: "" });
  });

  it("handles empty object", () => {
    expect(flatten({ obj: {} })).toEqual({ obj: "" });
  });

  it("preserves null, boolean, number as-is", () => {
    expect(flatten({ a: null, b: true, c: 42, d: "text" })).toEqual({
      a: null,
      b: true,
      c: 42,
      d: "text",
    });
  });

  it("flattens deeply nested structures", () => {
    const input = { a: { b: { c: { d: "deep" } } } };
    expect(flatten(input)).toEqual({ "a.b.c.d": "deep" });
  });

  it("handles mixed nested objects and arrays", () => {
    const input = {
      user: { name: "John", scores: [90, 85] },
    };
    expect(flatten(input)).toEqual({
      "user.name": "John",
      "user.scores": "90;85",
    });
  });
});
