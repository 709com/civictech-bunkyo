import "server-only";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ChatTranscript } from "../../client/components/chat-transcript";
import type { CommitteeMeetingDetail } from "../../shared/types";
import { buildTranscriptSections } from "../../shared/utils/build-transcript-sections";
import { formatJapaneseDate } from "../../shared/utils/format-japanese-date";
import { siteConfig } from "@/config/site.config";

type Props = {
  meeting: CommitteeMeetingDetail;
};

export function TranscriptView({ meeting }: Props) {
  const sections = buildTranscriptSections(meeting.speeches, meeting.topics);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/committees/${meeting.committeeSlug}/${meeting.sourceDocumentId}`}
          className="inline-flex items-center gap-1 text-sm text-mirai-text-muted hover:text-mirai-text"
        >
          <ArrowLeft className="size-3.5" />
          会議のまとめへ戻る
        </Link>
        <h1 className="mt-3 text-xl sm:text-2xl font-bold text-mirai-text">
          発言のやり取り
        </h1>
        <p className="mt-1 text-sm text-mirai-text-secondary">
          {meeting.committeeName}・{formatJapaneseDate(meeting.meetingDate)}{" "}
          開催
        </p>
      </div>

      <ChatTranscript sections={sections} />

      <p className="text-xs text-mirai-text-muted">
        出典:{" "}
        <a
          href={meeting.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-accent hover:underline"
        >
          {siteConfig.councilName} 会議録検索システム
          <ExternalLink className="size-3" />
        </a>
      </p>
    </div>
  );
}
