/**
 * 一般質問以外の機能のページ。
 * site.config.ts の features.showOtherSections が false のあいだは開けない
 * （存在しないページと同じ扱いになり、トップページへ移動する）。
 */
const OTHER_SECTION_PATH_PREFIXES = [
  "/bills", // 議案（AIインタビューを含む）
  "/preview", // 議案のプレビュー
  "/report", // AIインタビューのレポート
  "/budget", // 予算
  "/committees", // 委員会
  "/jimu-jigyo", // 事務事業評価
  "/press-conferences", // 区長記者会見
  "/members", // 議員一覧
  "/learn", // 学ぶ
  "/archive", // 過去の資料
  "/assembly", // 議会（定例会・議案の案内）
] as const;

/** 一般質問の一覧（/sessions/[会期]/questions）だけは公開する */
const SESSION_QUESTIONS_PATH = /^\/sessions\/[^/]+\/questions\/?$/;

/** そのページが「一般質問以外の機能」のページか */
export function isOtherSectionPath(pathname: string): boolean {
  if (pathname === "/sessions" || pathname.startsWith("/sessions/")) {
    return !SESSION_QUESTIONS_PATH.test(pathname);
  }
  return OTHER_SECTION_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
