import { describe, expect, it } from "vitest";
import { getOfficialMinutesLink } from "./official-minutes-link";

const SEARCH_TOP = "https://www.city.bunkyo.tokyo.dbsr.jp/";
const LIST =
  "https://www.city.bunkyo.tokyo.dbsr.jp/100000?Template=list&QueryType=New&ListOrder=Asc&Cabinet=2";

describe("getOfficialMinutesLink", () => {
  it("定例会ごとの会議録一覧なら「（この定例会の会議録一覧）」を添える", () => {
    const href = `${LIST}&TermStart=2026-02-09&TermEnd=2026-03-17`;
    expect(getOfficialMinutesLink(href, SEARCH_TOP)).toEqual({
      href,
      label: "公式会議録を見る（この定例会の会議録一覧）",
    });
  });

  it("1日だけの会議録一覧なら「（この日の会議録一覧）」を添える", () => {
    const href = `${LIST}&TermStart=2026-02-12&TermEnd=2026-02-12`;
    expect(getOfficialMinutesLink(href, SEARCH_TOP)).toEqual({
      href,
      label: "公式会議録を見る（この日の会議録一覧）",
    });
  });

  it("一覧ではない原典の URL なら「公式会議録を見る」", () => {
    expect(
      getOfficialMinutesLink("https://example.com/minutes/1", SEARCH_TOP)
    ).toEqual({
      href: "https://example.com/minutes/1",
      label: "公式会議録を見る",
    });
  });

  it("URL として読めない値でも、リンク先はそのまま「公式会議録を見る」", () => {
    expect(getOfficialMinutesLink("not a url", SEARCH_TOP)).toEqual({
      href: "not a url",
      label: "公式会議録を見る",
    });
  });

  it("原典の URL が無ければ、検索システムのトップへ「公式会議録を検索する」", () => {
    const expected = { href: SEARCH_TOP, label: "公式会議録を検索する" };
    expect(getOfficialMinutesLink(null, SEARCH_TOP)).toEqual(expected);
    expect(getOfficialMinutesLink(undefined, SEARCH_TOP)).toEqual(expected);
    expect(getOfficialMinutesLink("", SEARCH_TOP)).toEqual(expected);
    expect(getOfficialMinutesLink("   ", SEARCH_TOP)).toEqual(expected);
  });
});
