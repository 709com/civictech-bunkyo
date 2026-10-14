"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewHeaderActions } from "@/features/interview-session/client/components/interview-header-actions";
import { isInterviewPage, isMainPage } from "@/lib/page-layout-utils";
import { siteConfig } from "@/config/site.config";
import { HamburgerMenu } from "./hamburger-menu";
import { SiteWordmark } from "@/components/layouts/site-wordmark";

interface HeaderClientProps {
  difficultyLevel: DifficultyLevelEnum;
}

export function HeaderClient({ difficultyLevel }: HeaderClientProps) {
  const pathname = usePathname();
  // 難易度の切り替えは議案の解説用。一般質問以外の機能を隠しているあいだは出さない
  const showDifficultySelector =
    siteConfig.features.showOtherSections && isMainPage(pathname);
  const showInterviewActions = isInterviewPage(pathname);

  return (
    <header className="px-3 fixed top-4 left-0 right-0 z-10 max-w-[1440px] mx-auto">
      <div className="rounded-2xl bg-white shadow-sm mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Site Title */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2"
              aria-label="ホーム"
            >
              {/* 文字だけの仮ロゴ。狭い画面でも右側のナビが折り返さない大きさにする */}
              <SiteWordmark className="text-base sm:text-lg" />
            </Link>
          </div>

          {/* Navigation */}
          <nav
            className="flex items-center space-x-2"
            aria-label="補助ナビゲーション"
          >
            {showDifficultySelector && (
              <DifficultySelector currentLevel={difficultyLevel} />
            )}
            {showInterviewActions && <InterviewHeaderActions />}
            <Link
              href="/search"
              aria-label="検索"
              className="p-2 text-mirai-text-muted hover:text-mirai-text transition-colors"
            >
              <Search className="size-5" />
            </Link>
            <HamburgerMenu />
          </nav>
        </div>
      </div>
    </header>
  );
}
