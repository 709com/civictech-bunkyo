import type { Metadata } from "next";
import Link from "next/link";
import { ContactFormLink } from "@/components/contact/contact-form-link";
import {
  LegalList,
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";
import { siteConfig } from "@/config/site.config";

export const metadata: Metadata = {
  title: `このサイトの作り方 | ${siteConfig.siteName}`,
  description: `${siteConfig.siteName}の掲載データの作り方、AIの使い方、照合の手順、費用の内訳、訂正の記録です。`,
};

/** まだ決まっていない欄（先生が記入する）。推測で埋めない。 */
const UNDECIDED = "［未定：先生が記入］";

/**
 * 政務活動費の内訳（2026-10-21 の方針転換の決定記録：「このサイトの作り方」で内訳を公開する）。
 * 金額・契約先・期間は、契約と支払いが済んでから先生が記入する。推測で埋めない。
 */
const costItems: {
  item: string;
  detail: string;
  vendor: string;
  amount: string;
}[] = [
  {
    item: "公開用サーバー",
    detail: "本サイトの画面を配信するサーバー",
    vendor: UNDECIDED,
    amount: UNDECIDED,
  },
  {
    item: "データベース",
    detail: "掲載データを保管するデータベース",
    vendor: UNDECIDED,
    amount: UNDECIDED,
  },
  {
    item: "ドメイン",
    detail: "civictech-bunkyo.org の登録・更新",
    vendor: UNDECIDED,
    amount: UNDECIDED,
  },
  {
    item: "AIの利用料",
    detail: "掲載データの処理・プログラムの作成に使うAIの利用料",
    vendor: UNDECIDED,
    amount: UNDECIDED,
  },
];

/**
 * 訂正の記録。新しいものを先頭に足す。
 * 例：{ date: "2026-11-30", page: "2025年9月定例議会 ○○議員の一般質問", before: "…", after: "…", reason: "見出しの抜き出しの誤り" }
 */
const corrections: {
  date: string;
  page: string;
  before: string;
  after: string;
  reason: string;
}[] = [];

/**
 * 「このサイトの作り方」ページ（引き継ぎ書 8章8。決定記録：AI の使い方・照合の手順・政務活動費の内訳・訂正の記録を1ページで公開する）。
 * 自己PRに見えないよう、実績の紹介や投票の呼びかけ、候補者の比較・評価は書かない。
 */
export default function HowWeBuildPage() {
  return (
    <LegalPageLayout
      title="このサイトの作り方"
      description={`${siteConfig.siteName}の掲載データをどのように作り、どのように確かめているかを説明します。`}
      className="md:pt-12"
    >
      <section className="space-y-4">
        <LegalSectionTitle>1. 運営と費用</LegalSectionTitle>
        <LegalParagraph>
          本サイトは、{siteConfig.councilName}の{siteConfig.operator.name}
          （代表 {siteConfig.operator.representative}
          ）が、{siteConfig.operator.funding}
          を使って運営する議会報告サイトです。{siteConfig.cityName}・
          {siteConfig.councilName}
          の公式サービスではなく、作成・運営に区および区議会事務局は関与していません。運営者の詳しい情報は
          <Link href="/about" className="underline underline-offset-2">
            運営者情報
          </Link>
          をご覧ください。
        </LegalParagraph>
      </section>

      <section className="space-y-4">
        <LegalSectionTitle>2. 掲載している内容</LegalSectionTitle>
        <LegalParagraph>
          現在は、{siteConfig.councilName}
          の本会議で行われた一般質問のうち、直近1期分（2023年6月から2026年2月までの12の定例会）を掲載しています。委員会での質疑や、議案・予算などは、現在は掲載していません。
        </LegalParagraph>
        <LegalParagraph>
          一般質問は、定例会ごとに日付順・登壇した順に並べています。掲載順・表示順は、支持や評価を示すものではありません。同じ議員の発言だけを集めた議員別のページは作っていません。
        </LegalParagraph>
      </section>

      <section className="space-y-4">
        <LegalSectionTitle>3. データの取得</LegalSectionTitle>
        <LegalParagraph>
          掲載データは、次の資料に基づいています。
        </LegalParagraph>
        <LegalList
          items={[
            "区議会の会議録の電子ファイル",
            "区のホームページで公表される会議録の速報版（本会議の終了後、おおむね4週間で公表されます）",
            "正式版の会議録（速報版に基づく掲載は、正式版が出たあと、正式版の内容で置き換えます。議長が取り消した発言は正式版から除かれるため、置き換えたあとは本サイトからも除かれます）",
          ]}
        />
        <LegalParagraph>
          区議会の
          <Link
            href={siteConfig.councilMinutesUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            会議録検索システム
          </Link>
          からの自動の読み取り（スクレイピング）は行っていません。会議録検索システムへは、原文を確かめていただくための案内としてリンクしています。
        </LegalParagraph>
        <LegalParagraph>
          公開の場で行われた議員の質問と区の答弁は、著作権法第40条第1項（政治上の演説等の利用）に基づいて掲載しています。
        </LegalParagraph>
      </section>

      <section className="space-y-4">
        <LegalSectionTitle>4. AIとプログラムの使い方</LegalSectionTitle>
        <LegalParagraph>
          一般質問の掲載データは、会議録の原文から、プログラムで機械的に抜き出したものです。
        </LegalParagraph>
        <LegalList
          items={[
            "質問の見出しは、原文の「次に、○○について伺います。」などの言い回しから抜き出しています。原文に見出しにあたる言い回しがない場合は、見出しを空欄のままにしています。",
            "区の答弁は、原文をそのまま掲載しています。AIによる言い換えや要約は行っていません。",
            "会派の名前は、その定例会の時点の所属（会派の届出による）を表示しています。",
          ]}
        />
        <LegalParagraph>
          今後、AIで作成した要約を掲載する場合は、要約から原文（会議録・録画）へ戻れるリンクを付け、照合の状態を「未照合」「速報版で照合」「正式版で確定」の3段階で表示します。
        </LegalParagraph>
        <LegalParagraph>
          本サイトのプログラムの作成と、掲載データの処理には、AI（Anthropic社のClaude）を使っています。AIへの質問に答える機能（AIチャット）は、本サイトでは使っていません。
        </LegalParagraph>
      </section>

      <section className="space-y-4">
        <LegalSectionTitle>5. 照合の手順</LegalSectionTitle>
        <LegalParagraph>
          掲載の前に、次の手順で原文と照らし合わせています。
        </LegalParagraph>
        <LegalList
          ordered
          items={[
            "件数の確認：質問者と答弁者の数を、会議録の登壇の記載（〔○○議員登壇〕など）と、会議録ごとに照らし合わせます。",
            "区切りの確認：質問の終わり・答弁の終わり・再質問の区切りを、性質の異なる例を選んで、原文と目で照らし合わせます。",
            "空欄の扱い：原文から確かめられない項目（見出し・会派など）は、推測で埋めず、空欄のまま掲載します。",
            "正式版での置き換え：速報版に基づく掲載は、正式版の会議録が出たあと、正式版の内容で置き換えます。",
          ]}
        />
        <LegalParagraph>
          掲載データは機械的に処理したものであり、誤りが含まれる可能性があります。正確な表現は、必ず公式の会議録でご確認ください。
        </LegalParagraph>
      </section>

      <section className="space-y-4">
        <LegalSectionTitle>6. 政務活動費の内訳</LegalSectionTitle>
        <LegalParagraph>
          本サイトの運営にかかる費用は、{siteConfig.operator.name}の
          {siteConfig.operator.funding}
          から支出しています。政務活動費は、選挙に係る費用には使用しません。
        </LegalParagraph>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm leading-relaxed sm:text-base">
            <thead>
              <tr className="border-b border-slate-300 text-slate-900">
                <th className="py-2 pr-3 font-bold">項目</th>
                <th className="py-2 pr-3 font-bold">内容</th>
                <th className="py-2 pr-3 font-bold">契約先</th>
                <th className="py-2 font-bold">金額</th>
              </tr>
            </thead>
            <tbody>
              {costItems.map((cost) => (
                <tr key={cost.item} className="border-b border-slate-200">
                  <td className="py-2 pr-3 align-top">{cost.item}</td>
                  <td className="py-2 pr-3 align-top">{cost.detail}</td>
                  <td className="py-2 pr-3 align-top">{cost.vendor}</td>
                  <td className="py-2 align-top">{cost.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <LegalParagraph>
          内訳の対象期間：{UNDECIDED}／最終更新日：{UNDECIDED}
        </LegalParagraph>
        <LegalParagraph>
          問い合わせフォーム（Googleフォーム）と、本サイトのソースコードの公開（GitHub）には、費用はかかっていません。
        </LegalParagraph>
      </section>

      <section className="space-y-4">
        <LegalSectionTitle>7. 訂正の記録</LegalSectionTitle>
        <LegalParagraph>
          掲載内容に誤りが見つかった場合は、訂正し、その内容をここに記録します。
        </LegalParagraph>
        {corrections.length === 0 ? (
          <LegalParagraph>現在、訂正の記録はありません。</LegalParagraph>
        ) : (
          <LegalList
            items={corrections.map((c) => ({
              id: `${c.date}-${c.page}`,
              content: (
                <>
                  {c.date}　{c.page}：「{c.before}」を「{c.after}
                  」に訂正しました（{c.reason}）。
                </>
              ),
            }))}
          />
        )}
        <LegalParagraph>
          誤りにお気づきの場合は、
          <ContactFormLink />
          からお知らせください。
        </LegalParagraph>
      </section>

      <section className="space-y-4">
        <LegalSectionTitle>8. ソースコード</LegalSectionTitle>
        <LegalParagraph>
          本サイトのソフトウェアは、{siteConfig.software.creditText}
          しています。改変後のソースコードは、次の場所で公開しています。
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
      </section>
    </LegalPageLayout>
  );
}
