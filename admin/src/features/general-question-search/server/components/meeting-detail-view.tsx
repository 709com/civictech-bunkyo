import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MeetingDetail, SearchFilters } from "../../shared/types";
import { buildSearchQuery } from "../../shared/utils/build-search-query";
import {
  itemTitleSourceLabel,
  itemTitleText,
} from "../../shared/utils/item-title-label";
import { withFullwidthTerms } from "../../shared/utils/to-fullwidth-alnum";
import { HighlightedText } from "./highlighted-text";
import { InternalToolNotice } from "./internal-tool-notice";

type MeetingDetailViewProps = {
  detail: MeetingDetail;
  /** 一覧に戻るときと、キーワードの色付けに使う検索条件 */
  filters: SearchFilters;
};

function meetingHeading(detail: MeetingDetail): string {
  if (detail.kind === "committee") {
    return `${detail.bodyName ?? "委員会"}の会議録`;
  }
  if (!detail.sessionName) return "本会議の会議録";
  const day = detail.dayLabel ? `・${detail.dayLabel}` : "";
  return `本会議の会議録（${detail.sessionName}${day}）`;
}

/**
 * 会議1回分の全文。発言の番号の順に並べる（区切りの順ではない。区切りの範囲は重なることがあるため）。
 * 区切りが変わる所と、一般質問の項目が変わる所に見出しを出す。
 * 非公開にした部分は「［非公開：…］」のまま表示する。
 */
export function MeetingDetailView({ detail, filters }: MeetingDetailViewProps) {
  const terms = withFullwidthTerms(filters.terms);
  let prevSection: string | null = null;
  let prevItem: number | null = null;

  return (
    <div>
      <InternalToolNotice />

      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href={`/general-question-search${buildSearchQuery(filters)}`}>
          <ArrowLeft aria-hidden="true" />
          検索結果に戻る
        </Link>
      </Button>

      <header className="mb-6 rounded-lg border bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {meetingHeading(detail)}
        </h1>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-gray-700 sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-gray-500">日付</dt>
            <dd>{detail.meetingDate}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500">題名（原文）</dt>
            <dd>{detail.titleRaw ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500">元の会議録</dt>
            <dd>{detail.sourceFile}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500">版</dt>
            <dd>{detail.sourceType === "seishiki" ? "正式版" : "速報版"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500">発言の数</dt>
            <dd>{detail.speeches.length.toLocaleString()}</dd>
          </div>
        </dl>
      </header>

      <div className="flex flex-col gap-3">
        {detail.speeches.map((speech) => {
          const sectionChanged = speech.sectionId !== prevSection;
          const itemChanged =
            speech.item !== null && speech.item.no !== prevItem;
          prevSection = speech.sectionId;
          if (speech.item) prevItem = speech.item.no;
          return (
            <div key={speech.id} className="flex flex-col gap-3">
              {sectionChanged && (
                <h2 className="mt-4 border-l-4 border-blue-600 pl-3 text-base font-bold text-gray-900">
                  {speech.sectionKind ?? "（区切りなし）"}
                </h2>
              )}
              {itemChanged && speech.item && (
                <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-blue-700">
                  <span>
                    一般質問の項目{speech.item.no}：
                    <HighlightedText
                      text={itemTitleText(speech.item.title)}
                      terms={terms}
                    />
                  </span>
                  {speech.item.titleSource === "言葉から推定" && (
                    <Badge variant="outline">推定</Badge>
                  )}
                  <span className="text-xs font-normal text-gray-500">
                    {itemTitleSourceLabel(speech.item.titleSource)}
                  </span>
                </h3>
              )}
              <article
                id={`speech-${speech.speechOrder}`}
                className="scroll-mt-4 rounded-lg border bg-white p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge
                    variant={
                      speech.speakerKind === "member" ? "default" : "secondary"
                    }
                  >
                    {speech.speakerDetail ?? speech.speakerKind}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-900">
                    {speech.speakerLabel}
                  </span>
                  <span className="text-xs text-gray-400">
                    {speech.speechOrder}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  <HighlightedText text={speech.body} terms={terms} />
                </p>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}
