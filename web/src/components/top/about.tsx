import Image from "next/image";
import { siteConfig } from "@/config/site.config";
import { LinkButton } from "./link-button";

export function About() {
  return (
    <div className="py-10">
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2>
            <Image
              src="/icons/about-typography.svg"
              alt="このサイトについて"
              width={143}
              height={36}
              priority
            />
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            {siteConfig.siteName}とは
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-bold leading-[43.2px]">
              区議会での議論を
              <br />
              できる限りわかりやすく
            </h3>
            <p className="text-[15px] leading-[28px] text-black">
              {siteConfig.siteName}は、{siteConfig.siteDescription}
              。区民の意見を政治に届けることを目指して、継続的にアップデートしていきます。
            </p>
          </div>

          {/* もっと詳しく知るボタン */}
          {siteConfig.externalLinks.aboutNote && (
            <LinkButton
              href={siteConfig.externalLinks.aboutNote}
              icon={{
                src: "/icons/note-icon.png",
                alt: "note",
                width: 25,
                height: 25,
              }}
            >
              {siteConfig.siteName}とは
            </LinkButton>
          )}

          {/* ソフトウェアの表記（AGPL-3.0）。党の公式サイトへのリンクや党のマークは置かない */}
          <p className="pt-4 border-t border-gray-200 text-[13px] leading-relaxed text-mirai-text-secondary">
            {siteConfig.software.creditText}
          </p>
        </div>
      </div>
    </div>
  );
}
