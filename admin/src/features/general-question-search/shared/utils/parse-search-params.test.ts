import { describe, expect, it } from "vitest";
import {
  hasAnyCondition,
  isUuid,
  MAX_SEARCH_TERMS,
  parseSearchParams,
  parseSearchTerms,
} from "./parse-search-params";

describe("parseSearchTerms", () => {
  it("1語はそのまま返す", () => {
    expect(parseSearchTerms("保育園")).toEqual(["保育園"]);
  });

  it("半角スペースと全角スペースで区切る", () => {
    expect(parseSearchTerms("防災 避難所　備蓄")).toEqual([
      "防災",
      "避難所",
      "備蓄",
    ]);
  });

  it("前後や連続した空白は無視する", () => {
    expect(parseSearchTerms("  防災   避難所  ")).toEqual(["防災", "避難所"]);
  });

  it("全角英数字は半角にそろえる", () => {
    expect(parseSearchTerms("ＤＸ ＩＣＴ２")).toEqual(["DX", "ICT2"]);
  });

  it("同じ語は1つにまとめる", () => {
    expect(parseSearchTerms("防災 防災")).toEqual(["防災"]);
  });

  it("空・null・undefined は空のリストを返す", () => {
    expect(parseSearchTerms("")).toEqual([]);
    expect(parseSearchTerms("　 ")).toEqual([]);
    expect(parseSearchTerms(null)).toEqual([]);
    expect(parseSearchTerms(undefined)).toEqual([]);
  });

  it("語の数は上限までに切り詰める", () => {
    const many = "あ い う え お か き";
    expect(parseSearchTerms(many)).toHaveLength(MAX_SEARCH_TERMS);
  });
});

describe("parseSearchParams", () => {
  const sessionId = "6f0e1c7a-5b0d-4f6e-9a57-b0c7b1f2d3e4";
  const memberId = "0A1B2C3D-0000-4000-8000-ABCDEFABCDEF";

  it("すべての条件を読み取る", () => {
    expect(
      parseSearchParams({
        q: "防災 避難所",
        session: sessionId,
        member: memberId,
        faction: "公明党文京区議団",
        answerer: "教育長",
      })
    ).toEqual({
      terms: ["防災", "避難所"],
      scope: "plenary",
      meetingBodyId: null,
      gqOnly: false,
      councilSessionId: sessionId,
      memberId,
      factionName: "公明党文京区議団",
      answererRole: "教育長",
    });
  });

  it("何も指定がなければ、すべて指定なしになる", () => {
    expect(parseSearchParams({})).toEqual({
      terms: [],
      scope: "plenary",
      meetingBodyId: null,
      gqOnly: false,
      councilSessionId: null,
      memberId: null,
      factionName: null,
      answererRole: null,
    });
  });

  it("ID の形をしていない値は指定なしとして扱う", () => {
    const filters = parseSearchParams({
      session: "abc",
      member: "1; drop table",
    });
    expect(filters.councilSessionId).toBeNull();
    expect(filters.memberId).toBeNull();
  });

  it("空文字の絞り込みは指定なしとして扱う", () => {
    const filters = parseSearchParams({ faction: "", answerer: "  " });
    expect(filters.factionName).toBeNull();
    expect(filters.answererRole).toBeNull();
  });

  it("委員会を探す条件を読み取る", () => {
    const filters = parseSearchParams({
      q: "保育園",
      scope: "committee",
      body: sessionId,
      gq: "1",
    });
    expect(filters.scope).toBe("committee");
    expect(filters.meetingBodyId).toBe(sessionId);
    expect(filters.gqOnly).toBe(true);
  });

  it("範囲が committee 以外なら本会議、gq が 1 以外なら一般質問だけにしない", () => {
    const filters = parseSearchParams({ scope: "abc", gq: "true", body: "x" });
    expect(filters.scope).toBe("plenary");
    expect(filters.gqOnly).toBe(false);
    expect(filters.meetingBodyId).toBeNull();
  });

  it("同じパラメータが複数あるときは最初の値を使う", () => {
    expect(parseSearchParams({ q: ["防災", "保育園"] }).terms).toEqual([
      "防災",
    ]);
  });
});

describe("hasAnyCondition", () => {
  it("何も指定がなければ false", () => {
    expect(hasAnyCondition(parseSearchParams({}))).toBe(false);
  });

  it("キーワードがあれば true", () => {
    expect(hasAnyCondition(parseSearchParams({ q: "防災" }))).toBe(true);
  });

  it("範囲を委員会にしただけでは false", () => {
    expect(hasAnyCondition(parseSearchParams({ scope: "committee" }))).toBe(
      false
    );
  });

  it("絞り込みだけでも true", () => {
    expect(hasAnyCondition(parseSearchParams({ answerer: "区長" }))).toBe(true);
  });
});

describe("isUuid", () => {
  it("ID の形（UUID）なら true", () => {
    expect(isUuid("6f0e1c7a-5b0d-4f6e-9a57-b0c7b1f2d3e4")).toBe(true);
    expect(isUuid("0A1B2C3D-0000-4000-8000-ABCDEFABCDEF")).toBe(true);
  });

  it("ID の形でなければ false", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("6f0e1c7a-5b0d-4f6e-9a57-b0c7b1f2d3e4x")).toBe(false);
  });
});
