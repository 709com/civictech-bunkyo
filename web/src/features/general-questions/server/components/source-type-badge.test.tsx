// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { siteConfig } from "@/config/site.config";
import type { GeneralQuestion } from "../../shared/types";
import {
  SOKUHOU_BADGE_DESCRIPTION,
  shouldShowSokuhouBadge,
} from "../../shared/utils/source-type";
import { GeneralQuestionCard } from "./general-question-card";
import { SourceTypeBadge } from "./source-type-badge";

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

function makeQuestion(source_type: string | null): GeneralQuestion {
  return {
    id: "q1",
    council_session_id: "s1",
    questioner_name: "議員A",
    questioner_party: null,
    questioner_number: null,
    session_day: 1,
    question_order: 1,
    meeting_date: "2026-02-10",
    summary: null,
    topics: [],
    raw_text: null,
    source_url: null,
    source_type,
    publish_status: "published",
    created_at: "",
    updated_at: "",
  };
}

describe("shouldShowSokuhouBadge", () => {
  it("切り替えが true で速報版（sokuhou）のときだけ true", () => {
    expect(shouldShowSokuhouBadge("sokuhou", true)).toBe(true);
    expect(shouldShowSokuhouBadge("seishiki", true)).toBe(false);
    expect(shouldShowSokuhouBadge(null, true)).toBe(false);
    expect(shouldShowSokuhouBadge(undefined, true)).toBe(false);
    expect(shouldShowSokuhouBadge("sokuhou", false)).toBe(false);
  });
});

describe("SourceTypeBadge", () => {
  it("今の設定（features.showSourceTypeBadge）は false", () => {
    expect(siteConfig.features.showSourceTypeBadge).toBe(false);
  });

  it("切り替えが false のときは、速報版でも何も描かない（HTML にも出ない）", () => {
    const { container } = render(
      <SourceTypeBadge sourceType="sokuhou" withNote enabled={false} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("切り替えを省略すると設定に従い、今は速報版でも何も描かない", () => {
    const { container } = render(<SourceTypeBadge sourceType="sokuhou" />);
    expect(container.innerHTML).toBe("");
  });

  it("切り替えが true で速報版のときは「速報」の印と説明を出す", () => {
    render(<SourceTypeBadge sourceType="sokuhou" enabled />);
    const badge = screen.getByText("速報");
    expect(badge).toHaveAttribute("title", SOKUHOU_BADGE_DESCRIPTION);
    // 説明の文は withNote のときだけ
    expect(
      screen.queryByText(SOKUHOU_BADGE_DESCRIPTION)
    ).not.toBeInTheDocument();
  });

  it("withNote のときは説明の文も出す", () => {
    render(<SourceTypeBadge sourceType="sokuhou" withNote enabled />);
    expect(screen.getByText("速報")).toBeInTheDocument();
    expect(screen.getByText(SOKUHOU_BADGE_DESCRIPTION)).toBeInTheDocument();
  });

  it("切り替えが true でも、正式版（seishiki）・不明のときは何も描かない", () => {
    for (const sourceType of ["seishiki", null, undefined]) {
      const { container, unmount } = render(
        <SourceTypeBadge sourceType={sourceType} withNote enabled />
      );
      expect(container.innerHTML).toBe("");
      unmount();
    }
  });
});

describe("GeneralQuestionCard と「速報」の印", () => {
  it("今の設定では、速報版のカードにも「速報」は出ない", () => {
    const { container } = render(
      <GeneralQuestionCard question={makeQuestion("sokuhou")} />
    );
    expect(container.textContent).not.toContain("速報");
    expect(container.innerHTML).not.toContain(SOKUHOU_BADGE_DESCRIPTION);
  });

  it("正式版のカードにも「速報」は出ない", () => {
    const { container } = render(
      <GeneralQuestionCard question={makeQuestion("seishiki")} />
    );
    expect(container.textContent).not.toContain("速報");
  });
});
