// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GeneralQuestionTopic } from "../../shared/types";
import { QuestionChatView } from "./question-chat-view";
import { QuestionViewToggle } from "./question-view-toggle";

// 今のデータ（会議録からの抜き出し）と同じ形：質問側の文は空、答弁側は原文の抜き出し
const extractedTopics: GeneralQuestionTopic[] = [
  {
    title: "防災について",
    question_summary: "",
    answer_summary: "防災についてのお尋ねですが、答弁の本文です。",
    answerer_role: "区長",
    answerer_name: "見本太郎",
  },
];

const rawText =
  "◯見本花子議員\n質問の本文です。\n\n◯区長（見本太郎）\n答弁の本文です。";

describe("QuestionChatView", () => {
  it("質問側の文が空なら、質問の吹き出しを出さない", () => {
    const { container } = render(<QuestionChatView topics={extractedTopics} />);
    expect(screen.getByText("防災について")).toBeInTheDocument();
    expect(
      screen.getByText("防災についてのお尋ねですが、答弁の本文です。")
    ).toBeInTheDocument();
    // 質問の吹き出し（bg-primary の右寄せ）が1つも無い
    expect(container.querySelectorAll(".justify-end")).toHaveLength(0);
  });

  it("質問側の文があれば（将来の要約など）、質問の吹き出しを出す", () => {
    const { container } = render(
      <QuestionChatView
        topics={[{ ...extractedTopics[0], question_summary: "質問の要約" }]}
      />
    );
    expect(screen.getByText("質問の要約")).toBeInTheDocument();
    expect(container.querySelectorAll(".justify-end")).toHaveLength(1);
  });
});

describe("QuestionViewToggle", () => {
  it("ボタンは「論点ごと」と「全文」", () => {
    render(<QuestionViewToggle topics={extractedTopics} rawText={rawText} />);
    expect(
      screen.getByRole("button", { name: "論点ごと" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全文" })).toBeInTheDocument();
    expect(screen.queryByText("要約")).not.toBeInTheDocument();
  });

  it("質問側の文が無いときは、質問は「全文」で見られると書き添える", () => {
    render(<QuestionViewToggle topics={extractedTopics} rawText={rawText} />);
    expect(
      screen.getByText(/質問の内容は「全文」でご覧ください/)
    ).toBeInTheDocument();
  });

  it("質問側の文があるときは、書き添えを出さない", () => {
    render(
      <QuestionViewToggle
        topics={[{ ...extractedTopics[0], question_summary: "質問の要約" }]}
        rawText={rawText}
      />
    );
    expect(
      screen.queryByText(/質問の内容は「全文」でご覧ください/)
    ).not.toBeInTheDocument();
  });

  it("「全文」では、議員の発言を質問者の側（右寄せ）に出す", () => {
    render(<QuestionViewToggle topics={extractedTopics} rawText={rawText} />);
    fireEvent.click(screen.getByRole("button", { name: "全文" }));
    const questionText = screen.getByText("質問の本文です。");
    expect(questionText.closest(".justify-end")).not.toBeNull();
    const answerText = screen.getByText("答弁の本文です。");
    expect(answerText.closest(".justify-end")).toBeNull();
  });
});
