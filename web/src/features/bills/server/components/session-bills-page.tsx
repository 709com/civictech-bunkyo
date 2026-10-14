import Image from "next/image";
import { ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import { BillListWithStatusFilter } from "@/features/council-sessions/client/components/bill-list-with-status-filter";
import { groupBillsByTag } from "../../shared/utils/group-bills-by-tag";
import type { BillWithContent } from "../../shared/types";
import { FeaturedBillSection } from "./featured-bill-section";
import { BillsByTagSection } from "./bills-by-tag-section";
import { siteConfig } from "@/config/site.config";

interface SessionBillsPageProps {
  session: CouncilSession;
  bills: BillWithContent[];
  /** 指定管理者の指定・契約等、解説なしで一覧のみ表示する議案の件数 */
  proceduralBillCount?: number;
}

export function SessionBillsPage({
  session,
  bills,
  proceduralBillCount = 0,
}: SessionBillsPageProps) {
  const startDate = new Date(session.start_date);
  const endDate = new Date(session.end_date ?? session.start_date);
  const sessionDescription = `${startDate.getFullYear()}.${startDate.getMonth() + 1}月〜${endDate.getMonth() + 1}月に実施された${session.name}`;

  const featuredBills = bills.filter((b) => b.is_featured);
  const billsByTag = groupBillsByTag(bills);

  return (
    <div className="flex flex-col gap-16">
      {/* アーカイブヘッダー */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1>
            <Image
              src="/icons/archive-typography.svg"
              alt="Archive"
              width={156}
              height={36}
              priority
            />
          </h1>
          <p className="text-sm font-bold text-primary-accent">
            {session.name}に上程された議案
          </p>
        </div>

        <div className="flex flex-col gap-0.5">
          <h2 className="text-[22px] font-bold text-black leading-[1.48] flex items-center gap-4">
            {startDate.getFullYear()}年 {session.name}の提出議案
            <span>{bills.length}件</span>
          </h2>
          <p className="text-xs font-medium text-mirai-text">
            {sessionDescription}
          </p>
        </div>
      </div>

      {/* 注目の議案 */}
      <FeaturedBillSection bills={featuredBills} />

      {/* カテゴリ別議案 */}
      {billsByTag.length > 0 && <BillsByTagSection billsByTag={billsByTag} />}

      {/* 全議案リスト（ステータスフィルター付き） */}
      {bills.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          わかりやすい解説つきの議案は準備中です
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-[22px] font-bold text-black leading-[1.48]">
            全議案一覧
          </h2>
          <BillListWithStatusFilter bills={bills} />
        </section>
      )}

      {/* その他の議案（事務手続き議案）への導線 */}
      {proceduralBillCount > 0 && (
        <Link
          href={`/sessions/${session.slug}/other-bills`}
          className="flex items-center justify-between gap-2 rounded-2xl border border-mirai-border bg-white px-5 py-4 hover:border-primary/50 hover:shadow-md transition-all duration-200"
        >
          <div>
            <p className="font-bold text-mirai-text">
              その他の議案（{proceduralBillCount}件）
            </p>
            <p className="mt-0.5 text-sm text-mirai-text-secondary">
              指定管理者の指定・契約・購入など、事務手続き的な議案を一覧で確認できます
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-mirai-text-muted shrink-0" />
        </Link>
      )}

      {/* 区議会リンク */}
      {session.council_url && (
        <div className="flex items-center gap-1 text-[13px] font-medium text-mirai-text">
          {startDate.getFullYear()}年{session.name}に上程された全ての議案は
          <a
            href={session.council_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            {siteConfig.councilName}情報へ
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
