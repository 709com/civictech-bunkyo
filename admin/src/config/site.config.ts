/**
 * サイト設定ファイル（Admin）
 * Fork して別の地方議会向けに使用する場合はこのファイルを変更してください。
 */
export const siteConfig = {
  siteName: "ぶんきょう議会ナビ",
  cityName: "文京区",
  councilName: "文京区議会",
  councilBaseUrl: "https://www.city.bunkyo.lg.jp/kugikai/index.html",
  /** 文京区版では議案の機能を公開していないため、議会のトップページを指しておく */
  councilBillsDetailUrl: "https://www.city.bunkyo.lg.jp/kugikai/index.html",
  councilFactionExamples:
    "自由民主党文京区議会、公明党文京区議団、日本共産党文京区議会議員団等",
} as const;
