import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JimuJigyoListPage } from "@/features/jimu-jigyo/server/components/jimu-jigyo-list-page";
import {
  YEAR_METADATA,
  getYearLabel,
  isValidYear,
} from "@/features/jimu-jigyo/server/loaders/load-jimu-jigyo-list";
import { siteConfig } from "@/config/site.config";

type Props = {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ kyoku?: string }>;
};

export function generateStaticParams() {
  return YEAR_METADATA.map((m) => ({ year: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  if (!isValidYear(year)) return { title: "事務事業評価" };
  return {
    title: `事務事業分析（${getYearLabel(year)}）`,
    description: `${siteConfig.cityName}の事務事業マネジメントシートをもとに、KPI・予算・効率の動向を分析したページです。`,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { year } = await params;
  if (!isValidYear(year)) notFound();

  const sp = await searchParams;
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-mirai-text-muted">
          読み込み中...
        </div>
      }
    >
      <JimuJigyoListPage
        year={year}
        basePath={`/jimu-jigyo/${year}`}
        searchParams={sp}
      />
    </Suspense>
  );
}
