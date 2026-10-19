// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { siteConfig } from "@/config/site.config";
import { Footer } from "./footer";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe("Footer", () => {
  it("機械的な処理であることの注意書きを出す", () => {
    render(<Footer />);
    expect(
      screen.getByText(
        "掲載内容はAIなどで機械的に処理したものです。正確な表現は公式の会議録をご確認ください。",
        { exact: false }
      )
    ).toBeInTheDocument();
  });

  it("公式会議録（会議録検索システムのトップ）へのリンクを出す", () => {
    render(<Footer />);
    const link = screen.getByRole("link", {
      name: "文京区議会 会議録検索システム",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.city.bunkyo.tokyo.dbsr.jp/"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("非公式の表示も残っている", () => {
    render(<Footer />);
    expect(screen.getByText(siteConfig.disclaimer)).toBeInTheDocument();
  });
});
