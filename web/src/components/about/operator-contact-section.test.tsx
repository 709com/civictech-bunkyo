// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site.config";
import {
  OperatorContactSection,
  pickOperatorContacts,
} from "./operator-contact-section";

const empty = { address: "", phone: "", email: "" };

describe("pickOperatorContacts", () => {
  it("値が入っている欄だけを残す", () => {
    expect(
      pickOperatorContacts({ address: "住所", phone: "", email: "" })
    ).toEqual([{ label: "所在地", value: "住所" }]);
  });

  it("空白だけの欄も出さない", () => {
    expect(pickOperatorContacts({ ...empty, email: "  " })).toEqual([]);
  });
});

describe("OperatorContactSection", () => {
  it("値が1つもないときは、見出しごと表示しない", () => {
    const { container } = render(
      <OperatorContactSection operatorName="会派" contact={empty} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("値が入ると、見出し・説明・値が表示される", () => {
    render(
      <OperatorContactSection
        operatorName="会派「テスト」"
        contact={{ address: "テスト住所", phone: "000-0000", email: "" }}
      />
    );
    expect(
      screen.getByRole("heading", { name: "会派の連絡先" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/の連絡先は、次のとおりです。/, { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText("所在地")).toBeInTheDocument();
    expect(screen.getByText("テスト住所")).toBeInTheDocument();
    expect(screen.getByText("電話")).toBeInTheDocument();
    expect(screen.getByText("000-0000")).toBeInTheDocument();
    expect(screen.queryByText("メール")).not.toBeInTheDocument();
  });

  it("サイトの設定の住所・メール（2026-10-28 先生の指示どおり）が表示され、電話は出ない", () => {
    expect(siteConfig.operator.contact.address).toBe(
      "東京都文京区春日1-16-21 文京区役所21階"
    );
    expect(siteConfig.operator.contact.phone).toBe("");
    expect(siteConfig.operator.contact.email).toBe("info@takahamanaoki.com");

    const { container } = render(
      <OperatorContactSection
        operatorName={siteConfig.operator.name}
        contact={siteConfig.operator.contact}
      />
    );
    const values = Array.from(container.querySelectorAll("dd")).map(
      (dd) => dd.textContent
    );
    expect(values).toEqual([
      "東京都文京区春日1-16-21 文京区役所21階",
      "info@takahamanaoki.com",
    ]);
  });
});
