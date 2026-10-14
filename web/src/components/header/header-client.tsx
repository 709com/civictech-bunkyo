"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewHeaderActions } from "@/features/interview-session/client/components/interview-header-actions";
import { isInterviewPage, isMainPage } from "@/lib/page-layout-utils";
import { siteConfig } from "@/config/site.config";
import { HamburgerMenu } from "./hamburger-menu";

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
              {/*
                ロゴは横長（約9.3:1）でヘッダーの幅を大きく使うため、
                狭い画面では高さ固定ではなく画面幅に追従させ、
                右側のナビ（詳しく・検索・メニュー）が折り返さないようにする。
              */}
              <Image
                src="/img/brand-logo.png"
                alt={siteConfig.siteName}
                width={800}
                height={86}
                priority
                className="h-auto w-[30vw] min-[420px]:w-[28vw] sm:h-5 sm:w-auto"
              />
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
