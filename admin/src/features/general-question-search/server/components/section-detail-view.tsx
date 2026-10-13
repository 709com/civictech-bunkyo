import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SearchFilters, SectionDetail } from "../../shared/types";
import { buildSearchQuery } from "../../shared/utils/build-search-query";
import { HighlightedText } from "./highlighted-text";
import { InternalToolNotice } from "./internal-tool-notice";

type SectionDetailViewProps = {
  detail: SectionDetail;
  /** 一覧に戻るときと、キーワードの色付けに使う検索条件 */
  filters: SearchFilters;
};

/** 質問者1人分の質問・答弁・再質問の全文。章と論点の見出し付き */
export function SectionDetailView({ detail, filters }: SectionDetailViewProps) {
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
          {detail.questionerName
            ? `${detail.questionerName}議員の一般質問`
            : (detail.title ?? "一般質問")}
        </h1>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-gray-700 sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-gray-500">日付</dt>
            <dd>
              {detail.meetingDate}
              {detail.sessionName && `（${detail.sessionName}`}
              {detail.sessionName && detail.dayLabel && `・${detail.dayLabel}`}
              {detail.sessionName && "）"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500">会派（発言時点）</dt>
            <dd>{detail.questionerFaction ?? "（会派不明）"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500">元の会議録</dt>
            <dd>{detail.sourceFile}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500">版</dt>
            <dd>{detail.sourceType === "seishiki" ? "正式版" : "速報版"}</dd>
          </div>
        </dl>
      </header>

      <div className="flex flex-col gap-6">
        {detail.speeches.map((speech) => {
          const isMember = speech.speakerKind === "member";
          let offset = 0;
          return (
            <article
              key={speech.id}
              id={`speech-${speech.speechOrder}`}
              className="scroll-mt-4 rounded-lg border bg-white p-6"
            >
              <div className="mb-4 flex items-center gap-2 border-b pb-3">
                <Badge variant={isMember ? "default" : "secondary"}>
                  {isMember ? "議員" : "答弁"}
                </Badge>
                <h2 className="text-base font-semibold text-gray-900">
                  {isMember
                    ? `${speech.speakerName}議員`
                    : `${speech.speakerRole ?? ""}（${speech.speakerName}）`}
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                {speech.blocks.map((block) => {
                  const key = `${block.type}-${offset}`;
                  offset += block.type === "text" ? block.text.length : 1;
                  if (block.type === "chapter") {
                    return (
                      <h3
                        key={key}
                        className="mt-4 border-l-4 border-blue-600 pl-3 text-lg font-bold text-gray-900"
                      >
                        <HighlightedText
                          text={block.title}
                          terms={filters.terms}
                        />
                      </h3>
                    );
                  }
                  if (block.type === "topic") {
                    return (
                      <h4
                        key={key}
                        className="mt-2 text-sm font-semibold text-blue-700"
                      >
                        <HighlightedText
                          text={block.title}
                          terms={filters.terms}
                        />
                      </h4>
                    );
                  }
                  return (
                    <p
                      key={key}
                      className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
                    >
                      <HighlightedText
                        text={block.text}
                        terms={filters.terms}
                      />
                    </p>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
