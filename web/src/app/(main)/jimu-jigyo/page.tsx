import type { Metadata } from "next";
import { JimuJigyoArchivePage } from "@/features/jimu-jigyo/server/components/jimu-jigyo-archive-page";
import { siteConfig } from "@/config/site.config";

export const metadata: Metadata = {
  title: "事務事業評価",
  description: `${siteConfig.cityName}の事務事業マネジメントシートをもとに、区民の視点で客観的に評価・可視化したアーカイブです。`,
};

export default function Page() {
  return <JimuJigyoArchivePage />;
}
