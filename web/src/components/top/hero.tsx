import { siteConfig } from "@/config/site.config";

/**
 * トップページのヒーロー（仮）。
 * 正式なトップ画像が決まるまで、画像を使わず文字だけで表示する。
 */
export function Hero() {
  return (
    <div className="w-full bg-mirai-hero-bg px-6 py-12 md:px-10 md:py-16">
      <h1 className="text-3xl font-bold tracking-wide text-primary-accent md:text-4xl">
        {siteConfig.siteName}
      </h1>
      <p className="mt-4 text-base font-bold leading-relaxed text-mirai-text md:text-lg">
        {siteConfig.councilName}の本会議の一般質問を、
        <br />
        会議録をもとに探せるようにしています。
      </p>
    </div>
  );
}
