import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CommitteeSearchResult, SearchFilters } from "../../shared/types";
import { buildSearchQuery } from "../../shared/utils/build-search-query";
import {
  itemTitleSourceLabel,
  itemTitleText,
} from "../../shared/utils/item-title-label";
import { withFullwidthTerms } from "../../shared/utils/to-fullwidth-alnum";
import { HighlightedText } from "./highlighted-text";

type CommitteeResultListProps = {
  filters: SearchFilters;
  result: CommitteeSearchResult;
};

/** 委員会の会議録の検索結果。1行が「該当した発言」1つ */
export function CommitteeResultList({
  filters,
  result,
}: CommitteeResultListProps) {
  const query = buildSearchQuery(filters);
  const terms = withFullwidthTerms(filters.terms);
  const shown = result.passages.length;

  return (
    <section className="mt-6 rounded-lg border bg-white p-6">
      <p className="text-sm text-gray-700" data-testid="search-result-count">
        <span className="text-lg font-semibold text-gray-900">
          {result.totalPassages.toLocaleString()}
        </span>{" "}
        発言が該当しました（委員会 {result.totalMeetings.toLocaleString()}{" "}
        回分）
        {result.totalPassages > shown && (
          <span className="ml-2 text-gray-500">
            ※ 新しい順に先頭の {shown.toLocaleString()}{" "}
            発言を表示しています。条件を足して絞り込んでください。
          </span>
        )}
      </p>

      {shown === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          該当する発言はありませんでした。キーワードを短くする、言い換えるなどを試してください。
        </p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">日付・委員会</TableHead>
              <TableHead className="w-56">区切り・一般質問の項目</TableHead>
              <TableHead>本文の該当箇所</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.passages.map((passage) => {
              const href = `/general-question-search/meetings/${passage.meetingId}${query}#speech-${passage.speechOrder}`;
              const speaker =
                passage.speakerKind === "member"
                  ? `${passage.speakerName}委員`
                  : passage.speakerRole
                    ? `${passage.speakerRole}（${passage.speakerName}）`
                    : passage.speakerName;
              return (
                <TableRow key={passage.speechId} className="align-top">
                  <TableCell className="whitespace-nowrap text-sm">
                    <div>{passage.meetingDate}</div>
                    <div className="text-xs text-gray-500">
                      {passage.bodyName ?? "（委員会名なし）"}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    <div className="text-xs text-gray-500">
                      {passage.sectionKind ?? "（区切りなし）"}
                    </div>
                    {passage.item && (
                      <div className="mt-1">
                        <div className="font-medium">
                          項目{passage.item.no}：
                          <HighlightedText
                            text={itemTitleText(passage.item.title)}
                            terms={terms}
                          />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                          {passage.item.titleSource === "言葉から推定" && (
                            <Badge variant="outline">推定</Badge>
                          )}
                          <span>
                            {itemTitleSourceLabel(passage.item.titleSource)}
                          </span>
                        </div>
                        {passage.item.questioner && (
                          <div className="text-xs text-gray-500">
                            質問者：{passage.item.questioner}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    <Link href={href} className="group block">
                      <div className="mb-1 text-xs text-gray-500">
                        {speaker}
                        {passage.speakerKind !== "member" &&
                          passage.speakerDetail &&
                          `・${passage.speakerDetail}`}
                      </div>
                      <p className="leading-relaxed text-gray-800 group-hover:underline">
                        {passage.snippetHasBefore && "…"}
                        <HighlightedText
                          text={passage.snippet.replace(/\n/g, " ")}
                          terms={terms}
                        />
                        {passage.snippetHasAfter && "…"}
                      </p>
                      <span className="mt-1 inline-block text-xs text-blue-600">
                        この会議の全文を読む →
                      </span>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
