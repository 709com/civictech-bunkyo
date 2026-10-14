"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site.config";
import {
  buildElectionBlackoutMessage,
  isInElectionBlackout,
  toJapanDateString,
} from "@/lib/election-blackout";

/**
 * 選挙期間中の休止のお知らせ（設計書 9-6）。
 * site.config.ts の electionBlackout の期間中だけ、ヘッダー直下に表示する。
 * ページは事前に作り置きされることがあるため、今日の日付はブラウザ側で判定する。
 */
export function ElectionBlackoutBanner() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(
      isInElectionBlackout(
        siteConfig.electionBlackout,
        toJapanDateString(new Date())
      )
    );
  }, []);

  if (!isActive) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-bold leading-relaxed text-amber-900"
    >
      {buildElectionBlackoutMessage(siteConfig.electionBlackout)}
    </div>
  );
}
