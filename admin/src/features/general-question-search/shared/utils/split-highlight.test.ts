import { describe, expect, it } from "vitest";
import { splitHighlight } from "./split-highlight";

const join = (segments: { text: string }[]) =>
  segments.map((s) => s.text).join("");

describe("splitHighlight", () => {
  it("キーワードに当たった部分だけ hit になる", () => {
    expect(splitHighlight("避難所の環境を確保する", ["避難所"])).toEqual([
      { text: "避難所", hit: true },
      { text: "の環境を確保する", hit: false },
    ]);
  });

  it("文中に複数回出てくる場合、すべて hit になる", () => {
    const segments = splitHighlight("防災計画と地域防災の連携", ["防災"]);
    expect(segments).toEqual([
      { text: "防災", hit: true },
      { text: "計画と地域", hit: false },
      { text: "防災", hit: true },
      { text: "の連携", hit: false },
    ]);
  });

  it("複数のキーワードをそれぞれ hit にする", () => {
    const segments = splitHighlight("保育園と幼稚園の連携", [
      "保育園",
      "幼稚園",
    ]);
    expect(segments.filter((s) => s.hit).map((s) => s.text)).toEqual([
      "保育園",
      "幼稚園",
    ]);
  });

  it("重なり合うキーワードは1つの範囲にまとめる", () => {
    expect(
      splitHighlight("避難所運営協議会", ["避難所運営", "運営協議会"])
    ).toEqual([{ text: "避難所運営協議会", hit: true }]);
  });

  it("英字は大文字・小文字を区別しない", () => {
    expect(splitHighlight("区のDX推進", ["dx"])).toEqual([
      { text: "区の", hit: false },
      { text: "DX", hit: true },
      { text: "推進", hit: false },
    ]);
  });

  it("当たらなければ全体が hit なしで返る", () => {
    expect(splitHighlight("基金について", ["防災"])).toEqual([
      { text: "基金について", hit: false },
    ]);
  });

  it("キーワードが空なら全体が hit なしで返る", () => {
    expect(splitHighlight("基金について", [])).toEqual([
      { text: "基金について", hit: false },
    ]);
    expect(splitHighlight("基金について", [""])).toEqual([
      { text: "基金について", hit: false },
    ]);
  });

  it("空の文章は空のリストを返す", () => {
    expect(splitHighlight("", ["防災"])).toEqual([]);
  });

  it("切り分けた結果をつなげると、元の文章に戻る", () => {
    const text = "まず、防災についてのお尋ねですが、\n避難所の備蓄を進めます。";
    expect(join(splitHighlight(text, ["防災", "避難所", "備蓄"]))).toBe(text);
  });
});
