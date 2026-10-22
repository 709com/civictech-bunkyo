import { SpeedInsights } from "@vercel/speed-insights/next";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { DisclaimerBand } from "@/components/layouts/disclaimer-band";
import { ElectionBlackoutBanner } from "@/components/layouts/election-blackout-banner";
import { Footer } from "@/components/layouts/footer/footer";
import { MainLayout } from "@/components/layouts/main-layout";
import { RubyfulInitializer } from "@/lib/rubyful";
import { TextSizeInitializer } from "@/lib/text-size";

export default function MainGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <SpeedInsights />
      <TextSizeInitializer />
      <RubyfulInitializer />

      {/* スキップリンク: キーボード操作時のみ表示し、ヘッダーを読み飛ばせるようにする */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-base focus:font-bold focus:text-mirai-text focus:shadow-md"
      >
        本文へスキップ
      </a>

      <MainLayout>
        <Header />
        <main
          id="main-content"
          className="min-h-dvh md:min-h-[calc(100dvh-96px)] bg-mirai-surface"
        >
          <DisclaimerBand />
          <ElectionBlackoutBanner />
          {children}
        </main>
        <Footer />
      </MainLayout>
    </>
  );
}
