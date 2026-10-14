import { describe, expect, it } from "vitest";
import {
  buildElectionBlackoutMessage,
  formatMonthDay,
  isInElectionBlackout,
  isValidBlackoutPeriod,
  toJapanDateString,
} from "./election-blackout";

const period = { start: "2027-04-11", end: "2027-04-18" };

describe("isInElectionBlackout", () => {
  it("告示日・期間中・投開票日は true（両端を含む）", () => {
    expect(isInElectionBlackout(period, "2027-04-11")).toBe(true);
    expect(isInElectionBlackout(period, "2027-04-15")).toBe(true);
    expect(isInElectionBlackout(period, "2027-04-18")).toBe(true);
  });

  it("期間の前日・翌日は false", () => {
    expect(isInElectionBlackout(period, "2027-04-10")).toBe(false);
    expect(isInElectionBlackout(period, "2027-04-19")).toBe(false);
  });

  it("期間が空のあいだは、いつでも false", () => {
    expect(isInElectionBlackout({ start: "", end: "" }, "2027-04-15")).toBe(
      false
    );
    expect(
      isInElectionBlackout({ start: "2027-04-11", end: "" }, "2027-04-15")
    ).toBe(false);
  });
});

describe("isValidBlackoutPeriod", () => {
  it("正しい期間は true", () => {
    expect(isValidBlackoutPeriod(period)).toBe(true);
  });

  it("形がおかしい・前後が逆なら false", () => {
    expect(
      isValidBlackoutPeriod({ start: "2027/04/11", end: "2027-04-18" })
    ).toBe(false);
    expect(
      isValidBlackoutPeriod({ start: "2027-04-18", end: "2027-04-11" })
    ).toBe(false);
  });
});

describe("toJapanDateString", () => {
  it("日本時間の日付を返す（UTC では前日でも、日本時間で日付が変わっていれば翌日）", () => {
    // UTC 2027-04-10 15:00 = 日本時間 2027-04-11 0:00
    expect(toJapanDateString(new Date("2027-04-10T15:00:00Z"))).toBe(
      "2027-04-11"
    );
    expect(toJapanDateString(new Date("2027-04-10T14:59:59Z"))).toBe(
      "2027-04-10"
    );
  });
});

describe("formatMonthDay", () => {
  it("月と日を、先頭の0を付けずに返す", () => {
    expect(formatMonthDay("2027-04-08")).toBe("4月8日");
    expect(formatMonthDay("2027-11-18")).toBe("11月18日");
  });
});

describe("buildElectionBlackoutMessage", () => {
  it("設計書 9-6 の文言に日付を入れる", () => {
    expect(buildElectionBlackoutMessage(period)).toBe(
      "公職選挙法および政治的公平性に配慮し、4月11日から4月18日（投開票日）まで、本サイトのデータ更新および一部機能を休止します。"
    );
  });
});
