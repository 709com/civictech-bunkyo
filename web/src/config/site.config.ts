/**
 * サイト設定ファイル
 * Fork して別の地方議会向けに使用する場合はこのファイルを変更してください。
 * @see docs/kawasaki/20260304_1000_別地域向けfork手順.md
 */
export const siteConfig = {
  siteName: "ぶんきょう議会ナビ",
  siteDescription: "文京区議会の本会議一般質問を検索できる非公式サイトです",
  cityName: "文京区",
  councilName: "文京区議会",
  keywords: [
    "ぶんきょう議会ナビ",
    "文京区議会",
    "文京区",
    "一般質問",
    "区議会",
    "会議録",
  ],
  /** 文京区議会のトップページ */
  councilBaseUrl: "https://www.city.bunkyo.lg.jp/kugikai/index.html",
  /**
   * 議案・議決結果の一覧ページ。
   * 文京区版では議案の機能を公開していないため、議会のトップページを指しておく。
   */
  councilBillsDetailUrl: "https://www.city.bunkyo.lg.jp/kugikai/index.html",
  /** 会議録検索システム（掲載内容の原典） */
  councilMinutesUrl: "https://www.city.bunkyo.tokyo.dbsr.jp/",
  twitterHashtag: "ぶんきょう議会ナビ", // # なし
  externalLinks: {
    /**
     * お問い合わせ・誤りの報告の窓口（Googleフォーム1本）。
     * 空のあいだは、画面に「準備中」と表示する。
     */
    contactForm:
      "https://docs.google.com/forms/d/e/1FAIpQLScM_PEshV6o6yq02lMlFljpgjg3DX0sFC0SP4kOidLYXwxi2g/viewform" as string,
    aboutNote: "",
    /**
     * 税金の使い道マップ（外部サイト）。
     * 文京区版では未設定（空のあいだは表示しない）。
     */
    taxMap: "" as string,
  },
  /**
   * 選挙期間中の休止（設計書 9-6）。告示日から投開票日まで（両端を含む。"YYYY-MM-DD"）。
   * 期間中は、全ページのヘッダー直下に休止のお知らせを出し、
   * 会議録の取り込み（load_minutes.py --apply）も止まる。空のあいだは何もしない。
   */
  electionBlackout: {
    start: "" as string,
    end: "" as string,
  },
  /**
   * 次回更新予定（設計書 9-7）。トップページに表示する。空なら表示しない。
   * 例: "2026年11月定例会 閉会後10日頃"
   */
  nextUpdateNote: "" as string,
  /**
   * 非公式であることの表示（設計書 9-1）。
   * ヘッダー直下の帯と、フッターの両方に表示する。
   */
  disclaimer:
    "本サイトは文京区および文京区議会の公式サービスではありません。区議会議員 高浜直樹が私費で運営する非公式サイトです。政党チームみらいとも関係ありません。",
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
    /** 運営者（利用規約・プライバシーポリシー・フッターの表記に使用）。私費による非公式運営 */
    name: "高浜直樹" as string,
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
    /**
     * 一般質問以外の機能を公開するか（設計書 第6章：第1段階は本会議の一般質問だけ）。
     * 議案・区長記者会見・事務事業評価・予算・委員会・お金の使い道・議員一覧・学ぶ・過去の資料。
     * false のあいだは、メニュー・トップ・検索から消え、ページを直接開いても、
     * 存在しないページと同じ扱い（このサイトではトップページへ移動。web/src/app/not-found.tsx）になる。
     * 対象のページは web/src/lib/other-sections.ts にまとめてある。
     */
    showOtherSections: false as boolean,
  },
} as const;
