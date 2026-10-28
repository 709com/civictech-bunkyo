import type { SearchFilters } from "../../shared/types";
import { hasAnyCondition } from "../../shared/utils/parse-search-params";
import { loadSearchOptions } from "../loaders/load-search-options";
import { searchCommitteeMinutes } from "../loaders/search-committee-minutes";
import { searchGeneralQuestions } from "../loaders/search-general-questions";
import { CommitteeResultList } from "./committee-result-list";
import { InternalToolNotice } from "./internal-tool-notice";
import { SearchForm } from "./search-form";
import { SearchResultList } from "./search-result-list";

type GeneralQuestionSearchViewProps = {
  filters: SearchFilters;
};

/** 「一般質問の検索」ページの中身 */
export async function GeneralQuestionSearchView({
  filters,
}: GeneralQuestionSearchViewProps) {
  const searched = hasAnyCondition(filters);
  const isCommittee = filters.scope === "committee";
  const [options, result, committeeResult] = await Promise.all([
    loadSearchOptions(),
    searched && !isCommittee
      ? searchGeneralQuestions(filters)
      : Promise.resolve(null),
    searched && isCommittee
      ? searchCommitteeMinutes(filters)
      : Promise.resolve(null),
  ]);

  return (
    <div>
      <InternalToolNotice />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">一般質問の検索</h1>
        <p className="mt-1 text-gray-600">
          本会議の一般質問（質問・答弁・再質問）と、委員会の会議録の全文を、キーワードと条件で探せます
        </p>
      </div>

      <SearchForm filters={filters} options={options} />

      {result ? (
        <SearchResultList filters={filters} result={result} />
      ) : committeeResult ? (
        <CommitteeResultList filters={filters} result={committeeResult} />
      ) : (
        <p className="mt-6 text-sm text-gray-500">
          キーワードを入れるか、絞り込みの条件を選んで「検索」を押してください。
        </p>
      )}
    </div>
  );
}
