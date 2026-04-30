import { describe, it, expect } from "vitest";
import { expandReplacement, countReplacements } from "../replace";

describe("expandReplacement", () => {
  it("replaces $1 with first capture group", () => {
    const match = "hello world".match(/(hello) (world)/)!;
    expect(expandReplacement("$2 $1", match)).toBe("world hello");
  });

  it("replaces $& with full match", () => {
    const match = "hello".match(/hello/)!;
    expect(expandReplacement("[$&]", match)).toBe("[hello]");
  });

  it("replaces $<name> with named group", () => {
    const match = "John".match(/(?<name>John)/)!;
    expect(expandReplacement("$<name>", match)).toBe("John");
  });

  it("falls back to empty for missing named group", () => {
    const match = "John".match(/John/)!;
    expect(expandReplacement("$<missing>", match)).toBe("");
  });

  it("falls back to empty for out-of-range $N", () => {
    const match = "a".match(/(a)/)!;
    expect(expandReplacement("$5", match)).toBe("");
  });

  it("returns literal replacement with no special tokens", () => {
    const match = "foo".match(/foo/)!;
    expect(expandReplacement("bar", match)).toBe("bar");
  });

  it("handles multiple replacements in one string", () => {
    const match = "John Doe".match(/(John) (Doe)/)!;
    expect(expandReplacement("$2, $1", match)).toBe("Doe, John");
  });
});

describe("countReplacements", () => {
  it("counts single replacement", () => {
    expect(countReplacements("hello world", "hello", "", "hi")).toBe(1);
  });

  it("counts multiple replacements with g flag", () => {
    expect(countReplacements("a a a", "a", "g", "b")).toBe(3);
  });

  it("returns 0 for no match", () => {
    expect(countReplacements("xyz", "abc", "g", "d")).toBe(0);
  });
});
