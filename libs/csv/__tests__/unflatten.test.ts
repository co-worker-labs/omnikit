import { describe, it, expect } from "vitest";
import { unflatten } from "../unflatten";
import { flatten } from "../flatten";

describe("unflatten", () => {
  it("unflattens dot-notation keys into nested objects", () => {
    const input = { "user.name": "John", "user.age": 30 };
    expect(unflatten(input)).toEqual({ user: { name: "John", age: 30 } });
  });

  it("converts numeric index keys into arrays", () => {
    const input = { "tags.0": "a", "tags.1": "b" };
    expect(unflatten(input)).toEqual({ tags: ["a", "b"] });
  });

  it("converts semicolon-joined numeric strings into number arrays", () => {
    const input = { list: "1;2;3" };
    expect(unflatten(input)).toEqual({ list: [1, 2, 3] });
  });

  it("converts semicolon-joined booleans", () => {
    const input = { flags: "true;false;true" };
    expect(unflatten(input)).toEqual({ flags: [true, false, true] });
  });

  it("converts semicolon-joined string arrays", () => {
    const input = { name: "hello;world" };
    expect(unflatten(input)).toEqual({ name: ["hello", "world"] });
  });

  it("handles empty string as leaf value", () => {
    const input = { arr: "" };
    expect(unflatten(input)).toEqual({ arr: "" });
  });

  it("unflattens deeply nested structures", () => {
    const input = { "a.b.c.d": "deep" };
    expect(unflatten(input)).toEqual({ a: { b: { c: { d: "deep" } } } });
  });

  it("passes through keys without dots as-is", () => {
    const input = { name: "John", age: 30 };
    expect(unflatten(input)).toEqual({ name: "John", age: 30 });
  });

  it("handles mixed dotted and non-dotted keys", () => {
    const input = { name: "John", "address.city": "NYC", "address.zip": "10001" };
    expect(unflatten(input)).toEqual({
      name: "John",
      address: { city: "NYC", zip: "10001" },
    });
  });

  it("unflattens array of objects via numeric indices", () => {
    const input = {
      "items.0.name": "Apple",
      "items.0.price": 1.5,
      "items.1.name": "Banana",
      "items.1.price": 0.8,
    };
    expect(unflatten(input)).toEqual({
      items: [
        { name: "Apple", price: 1.5 },
        { name: "Banana", price: 0.8 },
      ],
    });
  });

  it("handles null and boolean values", () => {
    const input = { a: null, b: true, c: false };
    expect(unflatten(input)).toEqual({ a: null, b: true, c: false });
  });

  it("round-trips with flatten for nested objects", () => {
    const original = { user: { name: "John", address: { city: "NYC", zip: "10001" } } };
    const flat = flatten(original);
    const restored = unflatten(flat);
    expect(restored).toEqual(original);
  });

  it("round-trips with flatten for arrays of primitives", () => {
    const original = { scores: [90, 85, 100] };
    const flat = flatten(original);
    const restored = unflatten(flat);
    expect(restored).toEqual(original);
  });

  it("round-trips with flatten for arrays of objects", () => {
    const original = {
      items: [
        { name: "Apple", price: 1.5 },
        { name: "Banana", price: 0.8 },
      ],
    };
    const flat = flatten(original);
    const restored = unflatten(flat);
    expect(restored).toEqual(original);
  });

  it("round-trips with flatten for deeply nested structures", () => {
    const original = { a: { b: { c: { d: "deep" } } } };
    const flat = flatten(original);
    const restored = unflatten(flat);
    expect(restored).toEqual(original);
  });

  it("round-trips with flatten for mixed structures", () => {
    const original = {
      name: "John",
      age: 30,
      address: { city: "NYC", zip: "10001" },
      tags: ["dev", "js"],
    };
    const flat = flatten(original);
    const restored = unflatten(flat);
    expect(restored).toEqual(original);
  });
});
