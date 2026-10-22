/**
 * 会議録の種類（general_questions.source_type）。
 * データベースの決まり（check 制約）は seishiki（正式版）と sokuhou（速報版）の2つ。
 */
export const SOURCE_TYPE_SOKUHOU = "sokuhou";

/** 「速報」の印の文言 */
export const SOKUHOU_BADGE_LABEL = "速報";

/** 「速報」の印の説明（title 属性と、各質問のページの注記に使う） */
export const SOKUHOU_BADGE_DESCRIPTION =
  "速報版の会議録に基づく内容です。正式版の公開後に差し替えます。";

/**
 * 「速報」の印を出すかどうか。
 * 切り替え（site.config.ts の features.showSourceTypeBadge）が true で、
 * かつ速報版（sokuhou）のときだけ true。正式版・不明（空）のときは出さない。
 */
export function shouldShowSokuhouBadge(
  sourceType: string | null | undefined,
  enabled: boolean
): boolean {
  return enabled && sourceType === SOURCE_TYPE_SOKUHOU;
}
