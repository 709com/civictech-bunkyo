import type { SearchFilters } from "../types";

/**
 * 検索条件を URL のパラメータ（?q=...&session=...）に直す。
 * 指定のない条件は付けない。条件が1つもなければ空文字を返す。
 */
export function buildSearchQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.terms.length > 0) params.set("q", filters.terms.join(" "));
  if (filters.councilSessionId) params.set("session", filters.councilSessionId);
  if (filters.memberId) params.set("member", filters.memberId);
  if (filters.factionName) params.set("faction", filters.factionName);
  if (filters.answererRole) params.set("answerer", filters.answererRole);
  const query = params.toString();
  return query ? `?${query}` : "";
}
