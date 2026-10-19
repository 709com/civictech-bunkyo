// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionSwitcher } from "./session-switcher";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const sessions = [
  {
    id: "1",
    name: "令和7年11月定例議会",
    slug: "r7-11",
    start_date: "2025-11-20",
  },
  {
    id: "2",
    name: "令和8年2月定例議会",
    slug: "r8-02",
    start_date: "2026-02-09",
  },
  {
    id: "3",
    name: "令和5年6月定例議会",
    slug: "r5-06",
    start_date: "2023-06-05",
  },
];

describe("SessionSwitcher", () => {
  it("定例会を新しい順に並べ、いま見ている定例会に印を付ける", () => {
    render(<SessionSwitcher sessions={sessions} currentSlug="r7-11" />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "令和8年2月定例議会",
      "令和7年11月定例議会",
      "令和5年6月定例議会",
    ]);
    expect(screen.getByText("令和7年11月定例議会")).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("link", { name: "令和8年2月定例議会" })
    ).toHaveAttribute("href", "/sessions/r8-02/questions");
  });

  it("定例会が1つ以下なら何も出さない", () => {
    const { container } = render(
      <SessionSwitcher sessions={sessions.slice(0, 1)} currentSlug="r7-11" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
