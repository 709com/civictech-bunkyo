import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { siteConfig } from "@/config/site.config";
import { RawTranscriptView } from "@/features/general-questions/server/components/raw-transcript-view";
import { SourceTypeBadge } from "@/features/general-questions/server/components/source-type-badge";
import { QuestionChatView } from "@/features/general-questions/client/components/question-chat-view";
import { QuestionViewToggle } from "@/features/general-questions/client/components/question-view-toggle";
import { getGeneralQuestionById } from "@/features/general-questions/server/loaders/get-general-question-by-id";
import { getCouncilSessionById } from "@/features/council-sessions/server/loaders/get-council-session-by-id";
import { getOfficialMinutesLink } from "@/features/general-questions/shared/utils/official-minutes-link";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const question = await getGeneralQuestionById(id);

  if (!question) {
    return { title: "質問が見つかりません" };
  }

  return {
    title: `${question.questioner_name} 議員の一般質問 | ${siteConfig.siteName}`,
    description: question.summary ?? undefined,
  };
}

const DAY_LABELS: Record<number, string> = {
  1: "第1日",
  2: "第2日",
  3: "第3日",
  4: "第4日",
  5: "第5日",
  6: "第6日",
};

export default async function GeneralQuestionDetailPage({ params }: Props) {
  const { id } = await params;
  const question = await getGeneralQuestionById(id);
  const session = question
    ? await getCouncilSessionById(question.council_session_id)
    : null;

  if (!question) {
    notFound();
  }

  const backHref = session
    ? `/sessions/${session.slug}/questions`
    : "/questions";

  const dayLabel =
    DAY_LABELS[question.session_day] ?? `第${question.session_day}日`;

  const minutesLink = getOfficialMinutesLink(
    question.source_url,
    siteConfig.councilMinutesUrl
  );

  return (
    <Container className="py-8 max-w-2xl">
      <div className="mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-mirai-text-secondary hover:text-mirai-text"
        >
          <ChevronLeft className="w-4 h-4" />
          一般質問の一覧に戻る
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mirai-text">
          {question.questioner_name} 議員
        </h1>
        <p className="mt-1 text-sm text-mirai-text-secondary">
          {question.questioner_party && (
            <span>{question.questioner_party}　｜　</span>
          )}
          {dayLabel}
        </p>
        {/* 速報版のものにだけ出す。切り替え（features.showSourceTypeBadge）が false のあいだは何も出ない */}
        <SourceTypeBadge sourceType={question.source_type} withNote />
      </div>

      {question.summary && (
        <p className="mb-6 text-mirai-text leading-relaxed">
          {question.summary}
        </p>
      )}

      {question.raw_text && question.topics.length > 0 ? (
        <QuestionViewToggle
          topics={question.topics}
          rawText={question.raw_text}
        />
      ) : question.raw_text ? (
        <RawTranscriptView rawText={question.raw_text} />
      ) : (
        <QuestionChatView topics={question.topics} />
      )}

      {/* 原典の URL が用意できるまでは、会議録検索システムのトップへの仮のリンクにする */}
      <div className="mt-8 pt-6 border-t border-border">
        <Link
          href={minutesLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary-accent hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          {minutesLink.label}
        </Link>
      </div>
    </Container>
  );
}
