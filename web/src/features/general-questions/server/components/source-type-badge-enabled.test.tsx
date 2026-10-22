// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GeneralQuestion } from "../../shared/types";
import { SOKUHOU_BADGE_DESCRIPTION } from "../../shared/utils/source-type";
import { GeneralQuestionCard } from "./general-question-card";

// 先生が将来、site.config.ts の features.showSourceTypeBadge を true にしたときの動き
vi.mock("@/config/site.config", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/config/site.config")>();
  return {
    siteConfig: {
      ...original.siteConfig,
      features: { ...original.siteConfig.features, showSourceTypeBadge: true },
    },
  };
});

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

describe("切り替え（features.showSourceTypeBadge）が true のとき", () => {
  it("速報版のカードにだけ「速報」の印が付く", () => {
    render(<GeneralQuestionCard question={makeQuestion("sokuhou")} />);
    expect(screen.getByText("速報")).toHaveAttribute(
      "title",
      SOKUHOU_BADGE_DESCRIPTION
    );
  });

  it("正式版のカードには付かない", () => {
    const { container } = render(
      <GeneralQuestionCard question={makeQuestion("seishiki")} />
    );
    expect(container.textContent).not.toContain("速報");
  });
});
