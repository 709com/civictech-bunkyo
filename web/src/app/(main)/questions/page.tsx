import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { siteConfig } from "@/config/site.config";
import { getActiveCouncilSession } from "@/features/council-sessions/server/loaders/get-active-council-session";
import { GeneralQuestionList } from "@/features/general-questions/server/components/general-question-list";
import { getLatestSessionWithQuestions } from "@/features/general-questions/server/loaders/get-latest-session-with-questions";

export const metadata: Metadata = {
  title: `一般質問 | ${siteConfig.siteName}`,
  description: `${siteConfig.councilName}の本会議で行われた一般質問の一覧です。`,
};

/**
 * 一般質問の入口。
 * 1. 「開催中」に設定された定例会があれば、その一般質問の一覧へ
 * 2. なければ、公開中の一般質問がある最新の定例会の一覧へ
 * 3. どちらもなければ、準備中の案内を表示する（以前は「見つかりません」になっていた）
 */
export default async function QuestionsPage() {
  const session = await getActiveCouncilSession();
  if (session?.slug) {
    redirect(`/sessions/${session.slug}/questions`);
  }

  const latestSlug = await getLatestSessionWithQuestions();
  if (latestSlug) {
    redirect(`/sessions/${latestSlug}/questions`);
  }

  return (
    <Container className="py-8">
      <h1 className="mb-6 text-2xl font-bold text-mirai-text">一般質問</h1>
      <GeneralQuestionList questions={[]} />
    </Container>
  );
}
