import { describe, expect, it } from "vitest";
import {
  compareBySpeakingOrder,
  formatMeetingDate,
  groupBySpeakingDay,
  sortBySpeakingOrder,
  sortSessionsNewestFirst,
} from "./speaking-order";

type Q = {
  id: string;
  session_day: number;
  question_order: number;
  meeting_date?: string | null;
};

const q = (
  id: string,
  session_day: number,
  question_order: number,
  meeting_date: string | null = null
): Q => ({ id, session_day, question_order, meeting_date });

describe("sortBySpeakingOrder", () => {
  it("定例会の中を、日付順・その日の登壇順に並べる", () => {
    const input = [
      q("d3-1", 3, 1, "2026-02-12"),
      q("d2-3", 2, 3, "2026-02-10"),
      q("d2-1", 2, 1, "2026-02-10"),
      q("d4-2", 4, 2, "2026-02-13"),
      q("d3-2", 3, 2, "2026-02-12"),
      q("d2-2", 2, 2, "2026-02-10"),
      q("d4-1", 4, 1, "2026-02-13"),
    ];
    expect(sortBySpeakingOrder(input).map((x) => x.id)).toEqual([
      "d2-1",
      "d2-2",
      "d2-3",
      "d3-1",
      "d3-2",
      "d4-1",
      "d4-2",
    ]);
  });

  it("日付が無いときは、定例会の何日目か → 登壇順で並べる", () => {
    const input = [q("b", 2, 1), q("c", 2, 2), q("a", 1, 3)];
    expect(sortBySpeakingOrder(input).map((x) => x.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("日付を何日目より優先する", () => {
    // 何日目と日付が食い違う場合も、日付の順を正とする
    expect(
      compareBySpeakingOrder(
        q("x", 3, 1, "2026-02-10"),
        q("y", 2, 1, "2026-02-12")
      )
    ).toBeLessThan(0);
  });

  it("元の配列は並べ替えない", () => {
    const input = [q("b", 2, 1), q("a", 1, 1)];
    sortBySpeakingOrder(input);
    expect(input.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("テーマ（質問の題名）で並びが変わらない", () => {
    const input = [
      { ...q("1", 1, 1), topics: [{ title: "防災" }] },
      { ...q("2", 1, 2), topics: [{ title: "子育て" }] },
      { ...q("3", 1, 3), topics: [{ title: "防災" }] },
    ];
    expect(sortBySpeakingOrder(input).map((x) => x.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });
});

describe("groupBySpeakingDay", () => {
  it("会議の日ごとにまとめ、日も中身も登壇順に並べる", () => {
    const groups = groupBySpeakingDay([
      q("d3-1", 3, 1, "2026-02-12"),
      q("d2-2", 2, 2, "2026-02-10"),
      q("d2-1", 2, 1, "2026-02-10"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].sessionDay).toBe(2);
    expect(groups[0].meetingDate).toBe("2026-02-10");
    expect(groups[0].questions.map((x) => x.id)).toEqual(["d2-1", "d2-2"]);
    expect(groups[1].sessionDay).toBe(3);
    expect(groups[1].questions.map((x) => x.id)).toEqual(["d3-1"]);
  });

  it("空なら空を返す", () => {
    expect(groupBySpeakingDay([])).toEqual([]);
  });
});

describe("sortSessionsNewestFirst", () => {
  it("定例会を新しい順（開会日の降順）に並べる", () => {
    const sessions = [
      { slug: "r7-11", start_date: "2025-11-20" },
      { slug: "r8-02", start_date: "2026-02-09" },
      { slug: "r5-06", start_date: "2023-06-05" },
    ];
    expect(sortSessionsNewestFirst(sessions).map((s) => s.slug)).toEqual([
      "r8-02",
      "r7-11",
      "r5-06",
    ]);
  });
});

describe("formatMeetingDate", () => {
  it("YYYY-MM-DD を和文の日付にする", () => {
    expect(formatMeetingDate("2026-02-10")).toBe("2026年2月10日");
  });

  it("読めない値はそのまま返す", () => {
    expect(formatMeetingDate("不明")).toBe("不明");
  });
});
