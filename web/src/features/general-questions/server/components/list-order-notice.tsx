import { Info } from "lucide-react";

/** 一般質問の一覧に常に出す注記（設計書 9-3） */
export function ListOrderNotice() {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-mirai-text-secondary">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      掲載順・表示順は支持や評価を示すものではありません
    </p>
  );
}
