export type OfficialMinutesLink = {
  href: string;
  label: string;
};

/**
 * 原典の URL が、会議録検索システムの「会議録一覧」（期間で絞った一覧）かどうかを見て、
 * 何の一覧かを返す。一覧でなければ null。
 *   期間が複数日 → 定例会ごとの一覧
 *   期間が1日だけ → その日の一覧
 */
function describeMinutesList(url: string): "session" | "day" | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const params = parsed.searchParams;
  if (params.get("Template") !== "list") return null;
  const start = params.get("TermStart");
  const end = params.get("TermEnd");
  if (!start || !end) return null;
  return start === end ? "day" : "session";
}

/**
 * 各質問から公式会議録へのリンク。
 * - 原典の URL（source_url）があれば、そこへ「公式会議録を見る」
 *   （定例会ごとの一覧なら「（この定例会の会議録一覧）」、日ごとの一覧なら「（この日の会議録一覧）」を添える）
 * - まだ無ければ（準備中）、会議録検索システムのトップへ「公式会議録を検索する」
 */
export function getOfficialMinutesLink(
  sourceUrl: string | null | undefined,
  minutesSearchUrl: string
): OfficialMinutesLink {
  const url = sourceUrl?.trim();
  if (!url) {
    return { href: minutesSearchUrl, label: "公式会議録を検索する" };
  }
  const kind = describeMinutesList(url);
  if (kind === "session") {
    return { href: url, label: "公式会議録を見る（この定例会の会議録一覧）" };
  }
  if (kind === "day") {
    return { href: url, label: "公式会議録を見る（この日の会議録一覧）" };
  }
  return { href: url, label: "公式会議録を見る" };
}
