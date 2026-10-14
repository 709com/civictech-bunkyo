export type OfficialMinutesLink = {
  href: string;
  label: string;
};

/**
 * 各質問から公式会議録へのリンク。
 * - 原典の URL（source_url）があれば、その会議のページへ「公式会議録を見る」
 * - まだ無ければ（準備中）、会議録検索システムのトップへ「公式会議録を検索する」
 */
export function getOfficialMinutesLink(
  sourceUrl: string | null | undefined,
  minutesSearchUrl: string
): OfficialMinutesLink {
  const url = sourceUrl?.trim();
  if (url) {
    return { href: url, label: "公式会議録を見る" };
  }
  return { href: minutesSearchUrl, label: "公式会議録を検索する" };
}
