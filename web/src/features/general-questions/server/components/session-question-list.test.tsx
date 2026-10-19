// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GeneralQuestion } from "../../shared/types";
import { SessionQuestionList } from "./session-question-list";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

function makeQuestion(
  id: string,
  name: string,
  session_day: number,
  question_order: number,
  meeting_date: string,
  topicTitle: string
): GeneralQuestion {
  return {
    id,
    council_session_id: "s1",
    questioner_name: name,
    questioner_party: null,
    questioner_number: null,
    session_day,
    question_order,
    meeting_date,
    summary: null,
    topics: [
      {
        title: topicTitle,
        question_summary: "",
        answer_summary: "",
        answerer_role: "",
        answerer_name: "",
      },
    ],
    raw_text: null,
    source_url: null,
    publish_status: "published",
    created_at: "",
    updated_at: "",
  };
}

describe("SessionQuestionList", () => {
  it("日ごとに、登壇順で並べる（テーマでまとめ直さない）", () => {
    // わざと順番を崩して渡す
    const questions = [
      makeQuestion("c", "議員C", 3, 1, "2026-02-12", "保育園の待機児童"),
      makeQuestion("b", "議員B", 2, 2, "2026-02-10", "避難所の運営"),
      makeQuestion("a", "議員A", 2, 1, "2026-02-10", "保育園の整備"),
    ];
    render(<SessionQuestionList questions={questions} />);

    const days = screen.getAllByRole("region");
    expect(days).toHaveLength(2);
    expect(
      within(days[0]).getByRole("heading", { level: 2 })
    ).toHaveTextContent("第2日2026年2月10日");
    expect(
      within(days[1]).getByRole("heading", { level: 2 })
    ).toHaveTextContent("第3日2026年2月12日");

    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/questions/a",
      "/questions/b",
      "/questions/c",
    ]);
  });

  it("テーマ別の見出しを出さない", () => {
    render(
      <SessionQuestionList
        questions={[makeQuestion("a", "議員A", 1, 1, "2026-02-10", "保育園")]}
      />
    );
    expect(screen.queryByText("子育て・教育")).not.toBeInTheDocument();
  });

  it("0件なら準備中の案内を出す", () => {
    render(<SessionQuestionList questions={[]} />);
    expect(
      screen.getByText("現在、一般質問のデータを準備中です。")
    ).toBeInTheDocument();
  });
});
