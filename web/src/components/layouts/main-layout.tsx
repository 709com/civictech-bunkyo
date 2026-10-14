"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site.config";
import { isInterviewSection, isMainPage } from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const useSidebarLayout = isMainPage(pathname) && siteConfig.features.aiChat;
  const isInterview = isInterviewSection(pathname);
  // 固定ヘッダー分の余白が無いと、ヘッダー直下の「非公式の表示帯」や
  // 見出し・本文が隠れてしまうため、TOPページを含む全ページで mt-24 を適用する。

  return (
    <div
      className={cn(
        "relative max-w-[700px] mx-auto",
        "mt-24",
        // インタビューページ以外ではshadowを表示
        !isInterview && "sm:shadow-lg",
        // TOPページと法案詳細ページのみ、チャットサイドバー用のオフセット
        useSidebarLayout && "pc:mr-[500px] xl:ml-[calc(calc(100vw-1180px)/2)]"
      )}
    >
      {children}
    </div>
  );
}
