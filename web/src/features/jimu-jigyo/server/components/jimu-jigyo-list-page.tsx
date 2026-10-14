import "server-only";
import Link from "next/link";
import { JimuJigyoCard } from "../../client/components/jimu-jigyo-card";
import {
  type JimuJigyoYear,
  getDirectionSummary,
  getYearLabel,
  loadJimuJigyoList,
} from "../loaders/load-jimu-jigyo-list";
import { siteConfig } from "@/config/site.config";

type Props = {
  year: JimuJigyoYear;
  basePath: string;
  searchParams: {
    kyoku?: string;
  };
};

export async function JimuJigyoListPage({
  year,
  basePath,
  searchParams,
}: Props) {
  const allRecords = await loadJimuJigyoList(year);
  const summary = await getDirectionSummary(allRecords, year);

  // 局フィルター（絞り込みのみ、ソートなし）
  const kyokuList = [
    ...new Set(
      allRecords.map((r) => r.所管局).filter((v): v is string => v != null)
    ),
  ].sort((a, b) => a.localeCompare(b, "ja"));
  const filtered = searchParams.kyoku
    ? allRecords.filter((r) => r.所管局 === searchParams.kyoku)
    : allRecords;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-mirai-text">
          事務事業 分析（{getYearLabel(year)}）
        </h1>
        <p className="text-sm text-mirai-text-secondary mt-1">
          {siteConfig.cityName} {summary.total}
          事業のKPI・予算・効率の動向を分析します。
        </p>
        <div className="mt-2">
          <Link
            href="/jimu-jigyo/about-score"
            className="text-sm text-grade-b underline"
          >
            この分析の見方について →
          </Link>
        </div>
        <div className="mt-4 p-3 bg-mirai-surface-warm border border-mirai-border rounded-lg text-xs text-mirai-text-secondary">
          ⚠️
          このページは公開データをもとにした参考分析です。事業の優劣を断定するものではありません。
        </div>
      </div>

      {/* サマリー */}
      <div className="bg-white border border-mirai-border rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-mirai-text">{summary.total}</p>
          <p className="text-xs text-mirai-text-muted">総事業数</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-grade-a">{summary.kpiUp}</p>
          <p className="text-xs text-mirai-text-muted">KPI改善</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-grade-d">{summary.kpiDown}</p>
          <p className="text-xs text-mirai-text-muted">KPI悪化</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-mirai-text">
            {summary.totalBudgetManYen.toLocaleString()}
          </p>
          <p className="text-xs text-mirai-text-muted">総事業費（万円）</p>
        </div>
      </div>

      {/* 局フィルター */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-mirai-text-muted">所管局:</span>
        <Link
          href={`${basePath}`}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            !searchParams.kyoku
              ? "bg-mirai-text text-white border-mirai-text"
              : "bg-white border-mirai-border text-mirai-text-secondary hover:border-mirai-text"
          }`}
        >
          全て
        </Link>
        {kyokuList.map((k) => (
          <Link
            key={k}
            href={`${basePath}?kyoku=${encodeURIComponent(k)}`}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              searchParams.kyoku === k
                ? "bg-mirai-text text-white border-mirai-text"
                : "bg-white border-mirai-border text-mirai-text-secondary hover:border-mirai-text"
            }`}
          >
            {k}
          </Link>
        ))}
      </div>

      {/* 件数 */}
      <p className="text-sm text-mirai-text-secondary">
        {filtered.length}件
        {filtered.length !== allRecords.length &&
          `（全${allRecords.length}件中）`}
      </p>

      {/* カードグリッド */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 pc:grid-cols-3 gap-4">
          {filtered.map((record) => (
            <JimuJigyoCard
              key={record.id}
              record={record}
              basePath={basePath}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-mirai-text-muted">
          該当する事業が見つかりませんでした。
        </div>
      )}
    </div>
  );
}
