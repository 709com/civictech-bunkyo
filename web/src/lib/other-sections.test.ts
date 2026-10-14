import { describe, expect, it } from "vitest";
import { isOtherSectionPath } from "./other-sections";

describe("isOtherSectionPath", () => {
  it.each([
    "/bills/abc",
    "/bills/abc/interview",
    "/preview/bills/abc",
    "/report/123",
    "/budget",
    "/budget/r8-02/general",
    "/committees",
    "/committees/somu/1/transcript",
    "/jimu-jigyo",
    "/jimu-jigyo/2024/1",
    "/press-conferences",
    "/press-conferences/2026-01-01",
    "/members",
    "/learn",
    "/archive",
    "/assembly",
  ])("一般質問以外の機能のページ %s は true", (path) => {
    expect(isOtherSectionPath(path)).toBe(true);
  });

  it.each([
    "/sessions",
    "/sessions/r8-02/bills",
    "/sessions/r8-02/other-bills",
  ])("会期の議案のページ %s は true", (path) => {
    expect(isOtherSectionPath(path)).toBe(true);
  });

  it.each([
    "/",
    "/questions",
    "/questions/abc",
    "/sessions/r8-02/questions",
    "/sessions/r8-02/questions/",
    "/about",
    "/faq",
    "/terms",
    "/privacy",
    "/search",
  ])("一般質問・サイトの説明のページ %s は false", (path) => {
    expect(isOtherSectionPath(path)).toBe(false);
  });

  it("名前の先頭が同じだけの別のページは対象にしない", () => {
    expect(isOtherSectionPath("/billsx")).toBe(false);
    expect(isOtherSectionPath("/members-info")).toBe(false);
  });
});
