import { notFound } from "next/navigation";
import { SectionDetailView } from "@/features/general-question-search/server/components/section-detail-view";
import { loadSectionDetail } from "@/features/general-question-search/server/loaders/load-section-detail";
import {
  isUuid,
  parseSearchParams,
} from "@/features/general-question-search/shared/utils/parse-search-params";

interface GeneralQuestionSectionPageProps {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GeneralQuestionSectionPage({
  params,
  searchParams,
}: GeneralQuestionSectionPageProps) {
  const [{ sectionId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  // ID の形をしていない値は、データベースに問い合わせずに「見つからない」にする
  if (!isUuid(sectionId)) notFound();

  const detail = await loadSectionDetail(sectionId);
  if (!detail) notFound();

  return (
    <SectionDetailView
      detail={detail}
      filters={parseSearchParams(rawSearchParams)}
    />
  );
}
