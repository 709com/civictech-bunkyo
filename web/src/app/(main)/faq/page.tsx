import type { Metadata } from "next";
import Link from "next/link";
import { ContactFormLink } from "@/components/contact/contact-form-link";
import { Container } from "@/components/layouts/container";
import {
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";
import { siteConfig } from "@/config/site.config";

export const metadata: Metadata = {
  title: `よくあるご質問 | ${siteConfig.siteName}`,
  description: `${siteConfig.siteName}に関するよくあるご質問`,
};

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

const faqs: FaqItem[] = [
  {
    question: `${siteConfig.siteName}とは何ですか？`,
    answer: (
      <>
        {siteConfig.siteDescription}。{siteConfig.councilName}
        の本会議で行われた一般質問を、公式会議録をもとに機械的に整理して掲載しています。
      </>
    ),
  },
  {
    question: "公式のサービスですか？",
    answer: (
      <>
        いいえ。{siteConfig.disclaimer}
        <br />
        運営者や費用については
        <Link href="/about" className="underline underline-offset-2">
          運営者情報
        </Link>
        をご覧ください。
      </>
    ),
  },
  {
    question: "掲載している情報はどこから取得していますか？",
    answer: (
      <>
        {siteConfig.councilName}の公式会議録（
        <Link
          href={siteConfig.councilMinutesUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          会議録検索システム
        </Link>
        ）および区が公表する速報版に基づいています。正確な表現・意図は、必ず公式会議録をご確認ください。
      </>
    ),
  },
  {
    question: "掲載内容は正確ですか？",
    answer:
      "掲載データは、会議録を機械的に処理したものです。正確性・完全性・最新性を保証するものではありません。重要な判断の際は、必ず公式会議録をご確認ください。",
  },
  {
    question: "個人情報はどのように扱われますか？",
    answer: (
      <>
        詳細は
        <Link href="/privacy" className="underline underline-offset-2">
          プライバシーポリシー
        </Link>
        をご確認ください。
        {/* AIチャット・インタビュー機能は現在無効（site.config.ts の features.aiChat / aiInterview = false）のため非表示。
            有効化する際は次の一文を戻すこと:
            AIチャット・インタビュー機能への入力内容には個人情報を含めないようお願いします。 */}
      </>
    ),
  },
  {
    question: "誤りの報告や意見はどこに連絡すればいいですか？",
    answer: (
      <>
        本サイトの
        <ContactFormLink />
        までお寄せください。掲載内容について、区や区議会事務局へお問い合わせいただいてもお答えできませんので、ご注意ください。
      </>
    ),
  },
  {
    question: "ふりがな（ルビ）はどのようにふっているのですか？",
    answer: (
      <>
        ふりがな（ルビ）は、一般財団法人ルビ財団の「ルビフルボタン」というサービスを使用して、自動で表示しています。
        固有名詞などふりがなが不正確な箇所については、今後手動で正しいふりがなに変更していく予定です。
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <LegalPageLayout
      title="よくあるご質問"
      description={`${siteConfig.siteName}に関するよくあるご質問をまとめています。`}
      className="md:pt-12"
    >
      <Container className="space-y-10">
        {faqs.map((faq) => (
          <section key={faq.question} className="space-y-3">
            <LegalSectionTitle>{faq.question}</LegalSectionTitle>
            <LegalParagraph>{faq.answer}</LegalParagraph>
          </section>
        ))}
      </Container>
    </LegalPageLayout>
  );
}
