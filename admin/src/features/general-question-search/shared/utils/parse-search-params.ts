import type { SearchFilters, SearchScope } from "../types";

/** 一度に指定できるキーワードの最大数 */
export const MAX_SEARCH_TERMS = 5;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** データベースの ID（UUID）の形をしているか */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * 入力されたキーワードを、検索に使う語のリストにする。
 * - 全角英数字・全角スペースを半角にそろえる（会議録の本文も同じそろえ方で保存している）
 * - 空白で区切る。同じ語は1つにまとめる
 */
export function parseSearchTerms(input: string | null | undefined): string[] {
  if (!input) return [];
  const terms = input
    .normalize("NFKC")
    .split(/\s+/)
    .filter((term) => term.length > 0);
  return [...new Set(terms)].slice(0, MAX_SEARCH_TERMS);
}

function firstValue(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uuidOrNull(value: string | string[] | undefined): string | null {
  const v = firstValue(value);
  return v && isUuid(v) ? v : null;
}

/** 探す範囲。committee 以外はすべて本会議（今までどおり）として扱う */
function parseScope(value: string | string[] | undefined): SearchScope {
  return firstValue(value) === "committee" ? "committee" : "plenary";
}

/** URL のパラメータを検索条件に直す。形のおかしい値は「指定なし」として扱う */
export function parseSearchParams(
  params: Record<string, string | string[] | undefined>
): SearchFilters {
  return {
    terms: parseSearchTerms(firstValue(params.q)),
    scope: parseScope(params.scope),
    meetingBodyId: uuidOrNull(params.body),
    gqOnly: firstValue(params.gq) === "1",
    councilSessionId: uuidOrNull(params.session),
    memberId: uuidOrNull(params.member),
    factionName: firstValue(params.faction),
    answererRole: firstValue(params.answerer),
  };
}

/** 条件が1つでも指定されているか */
export function hasAnyCondition(filters: SearchFilters): boolean {
  return (
    filters.terms.length > 0 ||
    filters.councilSessionId !== null ||
    filters.meetingBodyId !== null ||
    filters.gqOnly ||
    filters.memberId !== null ||
    filters.factionName !== null ||
    filters.answererRole !== null
  );
}
