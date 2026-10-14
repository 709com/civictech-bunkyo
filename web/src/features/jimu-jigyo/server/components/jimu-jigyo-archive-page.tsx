import "server-only";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { YEAR_METADATA } from "../loaders/load-jimu-jigyo-list";
import { siteConfig } from "@/config/site.config";

export function JimuJigyoArchivePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-mirai-text-secondary hover:text-mirai-text"
        >
          <ChevronLeft className="h-4 w-4" />
          トップに戻る
        </Link>
        <h1 className="text-2xl font-bold text-mirai-text">事務事業評価</h1>
        <p className="text-sm text-mirai-text-secondary mt-1">
          {siteConfig.cityName}
          が公開する事務事業マネジメントシートをもとに、区民の視点で評価・可視化しています。
        </p>
        <div className="mt-2">
          <Link
            href="/jimu-jigyo/about-score"
            className="text-sm text-grade-b underline"
          >
            このスコアの計算方法について →
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold text-mirai-text">年度一覧</h2>
        {YEAR_METADATA.map((year) => (
          <Link
            key={year.slug}
            href={`/jimu-jigyo/${year.slug}`}
            className="block bg-white border border-mirai-border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-mirai-text">{year.label}</p>
                <p className="text-sm text-mirai-text-secondary mt-0.5">
                  {year.description}
                </p>
              </div>
              <span className="text-grade-b font-medium text-sm">見る →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
