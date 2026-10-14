import { describe, expect, it } from "vitest";
import { getOfficialMinutesLink } from "./official-minutes-link";

const SEARCH_TOP = "https://www.city.bunkyo.tokyo.dbsr.jp/";

describe("getOfficialMinutesLink", () => {
  it("原典の URL があれば、その会議のページへ「公式会議録を見る」", () => {
    expect(
      getOfficialMinutesLink("https://example.com/minutes/1", SEARCH_TOP)
    ).toEqual({
      href: "https://example.com/minutes/1",
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
