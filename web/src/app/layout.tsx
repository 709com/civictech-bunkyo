import "./globals.css";
import type { Metadata, Viewport } from "next";
import { BIZ_UDPGothic, Lexend_Giga } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { siteConfig } from "@/config/site.config";
import type { ReactNode } from "react";
import { env } from "@/lib/env";
import { isPublicRelease } from "@/lib/site-release";

/**
 * 本文フォント。モリサワのユニバーサルデザイン書体 BIZ UDPGothic を使用する。
 * 字面が大きく字形の判別がしやすいため、弱視・ディスレクシアの方にも読みやすい。
 * ウェイトは 400 / 700 の2種のみ提供されている点に注意。
 */
const bizUDPGothic = BIZ_UDPGothic({
  variable: "--font-ud-gothic",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const lexendGiga = Lexend_Giga({
  variable: "--font-lexend-giga",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
});

const ogImage = {
  url: "/img/ogp.png",
  width: 1200,
  height: 630,
  alt: `${siteConfig.siteName}のOGPイメージ`,
};

export const metadata: Metadata = {
  metadataBase: new URL(env.webUrl),
  title: siteConfig.siteName,
  description: siteConfig.siteDescription,
  keywords: [...siteConfig.keywords],
  icons: {
    icon: [
      {
        url: "/icons/pwa/icon_bunkyo_192.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    // iOS は apple-touch-icon の SVG に非対応のため PNG を指定する
    apple: [{ url: "/icons/pwa/icon_bunkyo_apple_180.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: siteConfig.siteName,
    description: siteConfig.siteDescription,
    images: [ogImage],
    siteName: siteConfig.siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.siteName,
    description: siteConfig.siteDescription,
    images: [ogImage.url],
  },
  // 本公開（SITE_PUBLIC_RELEASE=true）までは、検索エンジンに載せない（noindex）
  robots: isPublicRelease()
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      }
    : {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false, noimageindex: true },
      },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4a5d6e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${bizUDPGothic.variable} ${lexendGiga.variable} font-sans antialiased bg-mirai-surface-light`}
      >
        <NextTopLoader showSpinner={false} color="#4a5d6e" />
        {children}
      </body>
    </html>
  );
}
