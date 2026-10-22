import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { isPublicRelease } from "@/lib/site-release";

/**
 * 検索エンジン向けの案内（robots.txt）。データを含まないので、パスワードなしで返す。
 * 本公開（SITE_PUBLIC_RELEASE=true）までは、すべての読み取りを断る。
 */
export default function robots(): MetadataRoute.Robots {
  if (!isPublicRelease()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${env.webUrl}/sitemap.xml`,
  };
}
