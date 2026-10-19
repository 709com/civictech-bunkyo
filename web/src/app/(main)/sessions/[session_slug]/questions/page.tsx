import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { siteConfig } from "@/config/site.config";
import { getCouncilSessionBySlug } from "@/features/council-sessions/server/loaders/get-council-session-by-slug";
import { ListOrderNotice } from "@/features/general-questions/server/components/list-order-notice";
import { SessionQuestionList } from "@/features/general-questions/server/components/session-question-list";
import { SessionSwitcher } from "@/features/general-questions/server/components/session-switcher";
import { getGeneralQuestionsBySession } from "@/features/general-questions/server/loaders/get-general-questions-by-session";
import { getSessionsWithQuestions } from "@/features/general-questions/server/loaders/get-sessions-with-questions";

type Props = {
  params: Promise<{ session_slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { session_slug } = await params;
  const session = await getCouncilSessionBySlug(session_slug);

  if (!session) {
    return { title: "定例会が見つかりません" };
  }

  return {
    title: `${session.name}の一般質問 | ${siteConfig.siteName}`,
    description: `${session.name}の本会議で行われた一般質問の一覧です（登壇順）。掲載内容は会議録から機械的に抜き出したものです。`,
  };
}

export default async function SessionQuestionsPage({ params }: Props) {
  const { session_slug } = await params;
  const session = await getCouncilSessionBySlug(session_slug);

  if (!session) {
    notFound();
  }

  const [questions, sessions] = await Promise.all([
    getGeneralQuestionsBySession(session.id),
    getSessionsWithQuestions(),
  ]);

  return (
    <Container className="py-8">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-mirai-text-secondary hover:text-mirai-text"
        >
          <ChevronLeft className="w-4 h-4" />
          トップに戻る
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mirai-text">
          {session.name}の一般質問
        </h1>
        <p className="mt-2 text-sm text-mirai-text-secondary">
          本会議で行われた一般質問を、日付順・登壇した順に掲載しています。見出しや本文は会議録から機械的に抜き出したものです。
        </p>
        <ListOrderNotice />
      </div>
      <SessionQuestionList questions={questions} />
      <SessionSwitcher
        sessions={sessions}
        currentSlug={session.slug ?? session_slug}
      />
    </Container>
  );
}
