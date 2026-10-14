import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { ArchiveBanner } from "@/components/top/archive-banner";
import { BannerAccordion } from "@/components/top/banner-accordion";
import { BudgetOverviewBanner } from "@/components/top/budget-overview-banner";
import { CityFinanceBanner } from "@/components/top/city-finance-banner";
import { CommitteeBanner } from "@/components/top/committee-banner";
import { GeneralQuestionsBanner } from "@/components/top/general-questions-banner";
import { JimuJigyoArchiveSection } from "@/components/top/jimu-jigyo-archive-section";
import { JimuJigyoBanner } from "@/components/top/jimu-jigyo-banner";
import { Hero } from "@/components/top/hero";
import { NextUpdateNote } from "@/components/top/next-update-note";
import { siteConfig } from "@/config/site.config";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { BillsByTagSection } from "@/features/bills/server/components/bills-by-tag-section";
import { FeaturedBillSection } from "@/features/bills/server/components/featured-bill-section";
import { loadHomeData } from "@/features/bills/server/loaders/load-home-data";
import type { BillWithContent } from "@/features/bills/shared/types";
import { getLatestBudgetSession } from "@/features/budget-overview/server/loaders/get-latest-budget-session";
import { HomeChatClient } from "@/features/chat/client/components/home-chat-client";
import { CurrentCouncilSession } from "@/features/council-sessions/client/components/current-council-session";
import { getCurrentCouncilSession } from "@/features/council-sessions/server/loaders/get-current-council-session";
import { getLatestSessionWithQuestions } from "@/features/general-questions/server/loaders/get-latest-session-with-questions";
import { PressConferenceArchiveSection } from "@/features/press-conferences/client/components/press-conference-archive-section";
import { PressConferenceNoticeBanner } from "@/features/press-conferences/client/components/press-conference-notice-banner";
import { getLatestPressConference } from "@/features/press-conferences/server/loaders/get-latest-press-conference";
import { getPressConferences } from "@/features/press-conferences/server/loaders/get-press-conferences";
import { getJapanTime } from "@/lib/utils/date";

export default async function Home() {
  const { billsByTag, featuredBills } = await loadHomeData();

  // ゆくゆくタグ機能がマージされたらBFFに統合する
  const [
    currentSession,
    currentDifficulty,
    latestQuestionsSlug,
    latestPressConference,
    pressConferences,
    latestBudgetSession,
  ] = await Promise.all([
    getCurrentCouncilSession(getJapanTime()),
    getDifficultyLevel(),
    getLatestSessionWithQuestions(),
    getLatestPressConference(),
    getPressConferences(),
    getLatestBudgetSession(),
  ]);

  const toBillChatContext = (bill: BillWithContent) => {
    return {
      name: `${bill.bill_content?.title}（${bill.name}）`,
      summary: bill.bill_content?.summary,
      tags: bill.tags?.map((tag) => tag.label) || [],
      isFeatured: featuredBills.some((b) => b.id === bill.id),
    };
  };

  // 一般質問以外の機能（議案・記者会見・予算など）を出すか。設定1つで切り替える
  const showOther = siteConfig.features.showOtherSections;

  return (
    <>
      <Hero />

      {/* 次回更新予定（設定が空なら出さない） */}
      <NextUpdateNote />

      {/* 本日の定例会セクション */}
      {showOther && <CurrentCouncilSession session={currentSession} />}

      {/* 区長記者会見バナー */}
      {showOther && latestPressConference && (
        <Container className="pt-4">
          <PressConferenceNoticeBanner
            pressConference={latestPressConference}
          />
        </Container>
      )}

      {/* 一般質問バナー */}
      {latestQuestionsSlug && (
        <Container className="pt-6">
          <GeneralQuestionsBanner sessionSlug={latestQuestionsSlug} />
        </Container>
      )}

      {showOther && (
        <>
          {/* 委員会バナー */}
          <Container className="pt-3">
            <CommitteeBanner />
          </Container>

          {/* 予算・事務事業評価・お金の使い道（まとめてアコーディオン） */}
          <Container className="pt-3">
            <BannerAccordion
              title={`${siteConfig.cityName}の予算・評価・お金の使い道`}
              description="各部の重点施策、事務事業評価、財政の状況をまとめて見る"
            >
              {latestBudgetSession?.slug && (
                <BudgetOverviewBanner sessionSlug={latestBudgetSession.slug} />
              )}
              <JimuJigyoBanner />
              <CityFinanceBanner />
            </BannerAccordion>
          </Container>
        </>
      )}

      {/* 議案一覧セクション */}
      {showOther && (
        <Container className="">
          <div className="py-10">
            <main className="flex flex-col gap-16">
              {/* 注目の議案セクション */}
              <FeaturedBillSection bills={featuredBills} />

              {/* タグ別議案一覧セクション */}
              <BillsByTagSection billsByTag={billsByTag} />
            </main>
          </div>
        </Container>
      )}

      {/* Archive セクション（区長記者会見・事務事業評価のアーカイブ＋過去の資料への導線） */}
      {showOther && (
        <div className="bg-mirai-surface-muted py-10">
          <Container>
            <div className="flex flex-col gap-8">
              <ArchiveBanner />
              <PressConferenceArchiveSection
                pressConferences={pressConferences}
              />
              <JimuJigyoArchiveSection />
            </div>
          </Container>
        </div>
      )}

      <Container>
        {/* このサイトについて セクション */}
        <About />

        {/* 免責事項（議案の掲載内容についての注意） */}
        {showOther && <BillDisclaimer />}
      </Container>

      {/* チャット機能 */}
      {siteConfig.features.aiChat && (
        <HomeChatClient
          currentDifficulty={currentDifficulty}
          bills={billsByTag
            .flatMap((x) => x.bills)
            .concat(featuredBills)
            .map(toBillChatContext)}
        />
      )}
    </>
  );
}
