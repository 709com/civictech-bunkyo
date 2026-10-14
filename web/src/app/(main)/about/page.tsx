import type { Metadata } from "next";
import Link from "next/link";
import { ContactFormLink } from "@/components/contact/contact-form-link";
import {
  LegalPageLayout,
  LegalParagraph,
} from "@/components/layouts/legal-page-layout";
import { siteConfig } from "@/config/site.config";

export const metadata: Metadata = {
  title: `このサイトについて | ${siteConfig.siteName}`,
  description: `${siteConfig.siteName}の運営者と、運営についての情報です。`,
};

/**
 * 運営者情報ページ（設計書 付録B の文面）。
 * トップページには運営者の名前・写真を出さず、このページで明記する（設計書 9-2）。
 */
export default function AboutPage() {
  return (
    <LegalPageLayout title="このサイトについて" className="md:pt-12">
      <LegalParagraph>
        「{siteConfig.siteName}」は、{siteConfig.siteDescription}。
      </LegalParagraph>

      <dl className="space-y-2 text-base leading-relaxed">
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
          <dt className="shrink-0 font-bold text-slate-900">運営</dt>
          <dd>
            {siteConfig.operator.name}
            （文京区議会議員・ぶんきょう子育て.ネット）
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
          <dt className="shrink-0 font-bold text-slate-900">費用</dt>
          <dd>
            サーバー・ドメイン等の公開にかかる費用は運営者の私費で負担しています。
          </dd>
        </div>
      </dl>

      <LegalParagraph>
        本サイトは、{siteConfig.cityName}、{siteConfig.councilName}
        、および政党チームみらいのいずれとも関係のない、個人による非公式の取り組みです。掲載内容について区や区議会事務局へお問い合わせいただいてもお答えできません。お問い合わせは本サイトの
        <ContactFormLink>窓口</ContactFormLink>
        までお願いします。
      </LegalParagraph>

      <LegalParagraph>
        掲載データは、区議会の公式会議録および区公表の速報版に基づき、機械的に処理したものです。正確な表現・意図は必ず
        <Link
          href={siteConfig.councilMinutesUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          公式会議録
        </Link>
        をご確認ください。掲載順は登壇順で固定しており、支持や評価を示すものではありません。
      </LegalParagraph>

      <LegalParagraph>
        本サイトのソフトウェアは、政党チームみらいが公開したオープンソース（team-mirai/mirai-gikai、AGPL-3.0）を改変して利用しています。改変後のソースコードは以下で公開しています。
        <br />
        <Link
          href={siteConfig.software.sourceCodeUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 break-all"
        >
          {siteConfig.software.sourceCodeUrl}
        </Link>
      </LegalParagraph>

      <LegalParagraph>
        選挙期間中（告示日から投開票日まで）は、データ更新および一部機能を休止します。
      </LegalParagraph>
    </LegalPageLayout>
  );
}
