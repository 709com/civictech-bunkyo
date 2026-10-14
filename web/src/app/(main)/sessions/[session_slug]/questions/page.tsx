import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { siteConfig } from "@/config/site.config";
import { getCouncilSessionBySlug } from "@/features/council-sessions/server/loaders/get-council-session-by-slug";
import { ListOrderNotice } from "@/features/general-questions/server/components/list-order-notice";
import { SessionTopicsView } from "@/features/general-questions/server/components/session-topics-view";
import { getGeneralQuestionOverviewBySession } from "@/features/general-questions/server/loaders/get-general-question-overview-by-session";
import { getGeneralQuestionsBySession } from "@/features/general-questions/server/loaders/get-general-questions-by-session";

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
    description: `${session.name}で行われた一般質問の一覧です。議員が区長・部長に直接質問した内容をわかりやすく解説します。`,
  };
}

export default async function SessionQuestionsPage({ params }: Props) {
  const { session_slug } = await params;
  const session = await getCouncilSessionBySlug(session_slug);

  if (!session) {
    notFound();
  }

  const [questions, overview] = await Promise.all([
    getGeneralQuestionsBySession(session.id),
    getGeneralQuestionOverviewBySession(session.id),
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
          議員が問い、区が答えた。あなたの暮らしに関わる取り組みをテーマ別にまとめました。
        </p>
        <ListOrderNotice />
      </div>
      <SessionTopicsView questions={questions} overview={overview} />
    </Container>
  );
}
