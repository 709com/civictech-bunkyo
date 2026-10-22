import { siteConfig } from "@/config/site.config";

/**
 * 公式サービスではないこと・運営者・費用の表示帯（設計書 9-1）。
 * 全ページのヘッダー直下に常に表示する（フッターにも同じ文言を表示している）。
 */
export function DisclaimerBand() {
  return (
    <div
      role="note"
      aria-label="このサイトについての注意"
      className="border-b border-mirai-border bg-mirai-surface-warm px-4 py-2 text-center text-xs leading-relaxed text-mirai-text-secondary"
    >
      {siteConfig.disclaimer}
    </div>
  );
}
