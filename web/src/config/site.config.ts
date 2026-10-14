/**
 * サイト設定ファイル
 * Fork して別の地方議会向けに使用する場合はこのファイルを変更してください。
 * @see docs/kawasaki/20260304_1000_別地域向けfork手順.md
 */
export const siteConfig = {
  siteName: "みらい議会＠足立区",
  siteDescription:
    "足立区議会で今どんな議案が検討されているか、わかりやすく伝えるプラットフォームです",
  cityName: "足立区",
  councilName: "足立区議会",
  keywords: [
    "みらい議会ー足立区版",
    "議案",
    "足立区",
    "区議会",
    "地方政治",
    "政策",
    "解説",
  ],
  councilBaseUrl: "https://www.gikai-adachi.jp/",
  /** 議案・議決結果の一覧ページ（平成14年第4回定例会以降の議決結果） */
  councilBillsDetailUrl: "https://www.gikai-adachi.jp/g07_giketsu.asp?Sflg=2",
  twitterHashtag: "みらい議会足立区版", // # なし
  externalLinks: {
    report: "https://forms.gle/ipRL17jxKVc7z4nL9",
    aboutNote: "",
    /**
     * 税金の使い道マップ（外部サイト）。
     * pref=13 は東京都、entity=131211 は足立区の全国地方公共団体コード。
     * トップのバナーとハンバーガーメニューの両方から参照するため、
     * URLはここに集約する（別地域向けにForkする場合はここだけ変更する）。
     */
    taxMap:
      "https://inshatancountry-jpn-tax-map.com/local-tax/?pref=13&entity=131211",
  },
  /**
   * ページを管理する政党名（空文字列の場合は政党名を省略した汎用表現を使用）
   * 例: "チームみらい"
   */
  managingParty: "" as string,
  /**
   * サービス運営者情報
   * 利用規約・プライバシーポリシー・著作権表示に使用します。
   */
  operator: {
    /** 運営者（＝当団体。利用規約・プライバシーポリシー・コピーライト表記に使用） */
    name: "ワクワクみらい政策ラボ" as string,
    /** 開発者（トップ・FAQの「開発者（◯◯）にご連絡」表記に使用） */
    developerName: "みる" as string,
    /** 問い合わせ先（開発者のXアカウント） */
    contactUrl: "https://x.com/miyuki_miru0707" as string,
    /** 利用規約の準拠法・管轄裁判所（第一審の専属的合意管轄） */
    jurisdiction: "東京地方裁判所" as string,
  },
  /**
   * ソフトウェアの表記（AGPL-3.0）
   * 元にしたオープンソースと、改変後のソースコードの公開場所。
   * 党の公式サイトへのリンクや党のマークは置かず、この表記だけにする。
   */
  software: {
    creditText: "team-mirai/mirai-gikai（AGPL-3.0）を改変して利用",
    sourceCodeUrl: "https://github.com/709com/civictech-bunkyo",
  },
  /**
   * AI機能の有効/無効設定
   * 本番環境のコスト管理のため、機能ごとにオン/オフを切り替えられます。
   */
  features: {
    /** AIチャット機能（議案への質問・テキスト選択からの質問）*/
    aiChat: false,
    /** AIインタビュー機能（議案当事者へのヒアリング）*/
    aiInterview: false,
  },
} as const;
