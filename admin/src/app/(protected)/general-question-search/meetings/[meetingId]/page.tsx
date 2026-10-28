import { notFound } from "next/navigation";
import { MeetingDetailView } from "@/features/general-question-search/server/components/meeting-detail-view";
import { loadMeetingDetail } from "@/features/general-question-search/server/loaders/load-meeting-detail";
import {
  isUuid,
  parseSearchParams,
} from "@/features/general-question-search/shared/utils/parse-search-params";

interface MeetingPageProps {
  params: Promise<{ meetingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MeetingPage({
  params,
  searchParams,
}: MeetingPageProps) {
  const [{ meetingId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  // ID の形をしていない値は、データベースに問い合わせずに「見つからない」にする
  if (!isUuid(meetingId)) notFound();

  const detail = await loadMeetingDetail(meetingId);
  if (!detail) notFound();

  return (
    <MeetingDetailView
      detail={detail}
      filters={parseSearchParams(rawSearchParams)}
    />
  );
}
