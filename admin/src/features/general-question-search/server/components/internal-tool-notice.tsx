import { TriangleAlert } from "lucide-react";

/** 内部ツールであること・未チェックのデータであることの注意書き。検索の全ページの上に出す */
export function InternalToolNotice() {
  return (
    <div
      role="note"
      className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        会派の調査研究用の内部ツールです。データはAIによる機械処理で、未チェックです。
        正確な表現は、必ず公式会議録を確認してください。
      </p>
    </div>
  );
}
