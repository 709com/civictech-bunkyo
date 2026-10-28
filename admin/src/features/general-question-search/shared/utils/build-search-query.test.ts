import { describe, expect, it } from "vitest";
import type { SearchFilters } from "../types";
import { buildSearchQuery } from "./build-search-query";
import { parseSearchParams } from "./parse-search-params";

const empty: SearchFilters = {
  terms: [],
  scope: "plenary",
  meetingBodyId: null,
  gqOnly: false,
  councilSessionId: null,
  memberId: null,
  factionName: null,
  answererRole: null,
};

describe("buildSearchQuery", () => {
  it("条件が1つもなければ空文字を返す", () => {
    expect(buildSearchQuery(empty)).toBe("");
  });

  it("キーワードは空白でつないで q に入れる", () => {
    const query = buildSearchQuery({ ...empty, terms: ["防災", "避難所"] });
    expect(new URLSearchParams(query).get("q")).toBe("防災 避難所");
  });

  it("指定のある条件だけを付ける", () => {
    const query = buildSearchQuery({ ...empty, answererRole: "教育長" });
    const params = new URLSearchParams(query);
    expect([...params.keys()]).toEqual(["answerer"]);
    expect(params.get("answerer")).toBe("教育長");
  });

  it("作ったパラメータを読み戻すと、元の条件に戻る", () => {
    const filters: SearchFilters = {
      terms: ["保育園", "待機児童"],
      scope: "plenary",
      meetingBodyId: null,
      gqOnly: false,
      councilSessionId: "6f0e1c7a-5b0d-4f6e-9a57-b0c7b1f2d3e4",
      memberId: "0a1b2c3d-0000-4000-8000-abcdefabcdef",
      factionName: "ぶんきょう子育て.ネット",
      answererRole: "区長",
    };
    const params = new URLSearchParams(buildSearchQuery(filters));
    expect(parseSearchParams(Object.fromEntries(params))).toEqual(filters);
  });

  it("委員会を探す条件も読み戻せる", () => {
    const filters: SearchFilters = {
      ...empty,
      terms: ["ICT"],
      scope: "committee",
      meetingBodyId: "6f0e1c7a-5b0d-4f6e-9a57-b0c7b1f2d3e4",
      gqOnly: true,
    };
    const params = new URLSearchParams(buildSearchQuery(filters));
    expect(parseSearchParams(Object.fromEntries(params))).toEqual(filters);
  });

  it("本会議（今までどおり）のときは scope を付けない", () => {
    const params = new URLSearchParams(
      buildSearchQuery({ ...empty, terms: ["防災"] })
    );
    expect(params.has("scope")).toBe(false);
  });
});
