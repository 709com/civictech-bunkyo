import { describe, expect, it } from "vitest";
import { itemTitleSourceLabel, itemTitleText } from "./item-title-label";

describe("itemTitleText", () => {
  it("項目名があればそのまま（推定のかっこも残す）", () => {
    expect(itemTitleText("（教育）")).toBe("（教育）");
  });

  it("空欄は「項目名なし」と出す（推測で埋めない）", () => {
    expect(itemTitleText(null)).toBe("（項目名なし）");
    expect(itemTitleText(" ")).toBe("（項目名なし）");
  });
});

describe("itemTitleSourceLabel", () => {
  it("推定のときは推定であることを書く", () => {
    expect(itemTitleSourceLabel("言葉から推定")).toContain("推定");
  });

  it("空欄のときは見つからなかったと書く", () => {
    expect(itemTitleSourceLabel(null)).toBe("項目名は見つからなかった");
  });
});
