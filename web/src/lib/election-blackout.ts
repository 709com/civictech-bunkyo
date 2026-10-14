/** 選挙期間中の休止の期間（告示日〜投開票日。両端を含む。"YYYY-MM-DD"） */
export type ElectionBlackoutPeriod = {
  start: string;
  end: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 日本時間での日付を "YYYY-MM-DD" で返す */
export function toJapanDateString(date: Date): string {
  // sv-SE の書式は "YYYY-MM-DD" になる
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    date
  );
}

/** 期間の設定が正しく入っているか（どちらかが空・形がおかしい・前後が逆なら false） */
export function isValidBlackoutPeriod(period: ElectionBlackoutPeriod): boolean {
  return (
    DATE_PATTERN.test(period.start) &&
    DATE_PATTERN.test(period.end) &&
    period.start <= period.end
  );
}

/** その日が休止の期間に入っているか（today は "YYYY-MM-DD"） */
export function isInElectionBlackout(
  period: ElectionBlackoutPeriod,
  today: string
): boolean {
  if (!isValidBlackoutPeriod(period)) return false;
  return period.start <= today && today <= period.end;
}

/** "2027-04-18" → "4月18日" */
export function formatMonthDay(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日`;
}

/** 休止のお知らせの文言（設計書 9-6） */
export function buildElectionBlackoutMessage(
  period: ElectionBlackoutPeriod
): string {
  return `公職選挙法および政治的公平性に配慮し、${formatMonthDay(period.start)}から${formatMonthDay(period.end)}（投開票日）まで、本サイトのデータ更新および一部機能を休止します。`;
}
