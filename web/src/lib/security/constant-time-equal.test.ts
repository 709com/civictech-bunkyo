import { describe, expect, it } from "vitest";
import { constantTimeStringEqual } from "./constant-time-equal";

describe("constantTimeStringEqual", () => {
  it("同じ文字列なら true", () => {
    expect(constantTimeStringEqual("secret-token", "secret-token")).toBe(true);
    expect(constantTimeStringEqual("", "")).toBe(true);
    expect(constantTimeStringEqual("ぶんきょう", "ぶんきょう")).toBe(true);
  });

  it("違う文字列なら false", () => {
    expect(constantTimeStringEqual("secret-token", "wrong-token")).toBe(false);
    expect(constantTimeStringEqual("secret", "secret ")).toBe(false);
    expect(constantTimeStringEqual("abc123", "abc124")).toBe(false);
    expect(constantTimeStringEqual("Secret", "secret")).toBe(false);
  });

  it("長さが違えば false（片方が他方の先頭部分でも）", () => {
    expect(constantTimeStringEqual("a", "abcdefghij")).toBe(false);
    expect(constantTimeStringEqual("abcdefghij", "a")).toBe(false);
    expect(constantTimeStringEqual("", "a")).toBe(false);
  });

  it("末尾に 0 のバイトを足しても同じとみなさない", () => {
    expect(constantTimeStringEqual("abc", "abc\u0000")).toBe(false);
  });
});
