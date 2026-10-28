import { describe, expect, it } from "vitest";
import { toFullwidthAlnum, withFullwidthTerms } from "./to-fullwidth-alnum";

describe("toFullwidthAlnum", () => {
  it("半角の英数字と % を全角にする", () => {
    expect(toFullwidthAlnum("ICT2 20%")).toBe("ＩＣＴ２ ２０％");
  });

  it("日本語はそのまま", () => {
    expect(toFullwidthAlnum("保育園")).toBe("保育園");
  });
});

describe("withFullwidthTerms", () => {
  it("全角の形を足し、同じものは1つにまとめる", () => {
    expect(withFullwidthTerms(["ICT", "防災"])).toEqual([
      "ICT",
      "防災",
      "ＩＣＴ",
    ]);
  });
});
