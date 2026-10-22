import { siteConfig } from "@/config/site.config";
import {
  SOKUHOU_BADGE_DESCRIPTION,
  SOKUHOU_BADGE_LABEL,
  shouldShowSokuhouBadge,
} from "../../shared/utils/source-type";

interface SourceTypeBadgeProps {
  /** general_questions.source_type（seishiki／sokuhou） */
  sourceType: string | null | undefined;
  /** 印の横に説明の文も出す（各質問のページ用）。一覧のカードでは title 属性だけ */
  withNote?: boolean;
  /** 切り替え。省略すると site.config.ts の features.showSourceTypeBadge に従う */
  enabled?: boolean;
}

/**
 * 速報版の会議録に基づく一般質問に付ける「速報」の印。
 * 切り替えが false のあいだ、または正式版のときは何も描かない（HTML にも出ない）。
 */
export function SourceTypeBadge({
  sourceType,
  withNote = false,
  enabled = siteConfig.features.showSourceTypeBadge,
}: SourceTypeBadgeProps) {
  if (!shouldShowSokuhouBadge(sourceType, enabled)) {
    return null;
  }

  const badge = (
    <span
      title={SOKUHOU_BADGE_DESCRIPTION}
      className="inline-flex items-center rounded border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-xs font-medium text-primary"
    >
      {SOKUHOU_BADGE_LABEL}
    </span>
  );

  if (!withNote) {
    return badge;
  }

  return (
    <span className="mt-2 flex flex-wrap items-center gap-2">
      {badge}
      <span className="text-xs text-mirai-text-muted">
        {SOKUHOU_BADGE_DESCRIPTION}
      </span>
    </span>
  );
}
