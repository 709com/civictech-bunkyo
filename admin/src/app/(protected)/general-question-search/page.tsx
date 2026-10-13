import { GeneralQuestionSearchView } from "@/features/general-question-search/server/components/general-question-search-view";
import { parseSearchParams } from "@/features/general-question-search/shared/utils/parse-search-params";

interface GeneralQuestionSearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GeneralQuestionSearchPage({
  searchParams,
}: GeneralQuestionSearchPageProps) {
  const filters = parseSearchParams(await searchParams);

  return <GeneralQuestionSearchView filters={filters} />;
}
