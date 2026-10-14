import Link from "next/link";
import { SiteWordmark } from "@/components/layouts/site-wordmark";

/**
 * デスクトップメニュー: ロゴ (画面左上)
 */
export function DesktopMenuLogo() {
  return (
    <Link
      href="/"
      className="fixed top-6 left-6 z-50 flex flex-col gap-2 hover:opacity-90 transition-opacity"
    >
      {/* 文字だけの仮ロゴ */}
      <SiteWordmark className="text-2xl" />

      {/* キャッチコピー */}
      <p
        className="font-bold text-black"
        style={{
          fontSize: "16px",
          lineHeight: "1.6em",
        }}
      >
        区議会の議論をわかりやすく
      </p>
    </Link>
  );
}
