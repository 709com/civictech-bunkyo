import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SearchFilters, SearchResult } from "../../shared/types";
import { buildSearchQuery } from "../../shared/utils/build-search-query";
import { HighlightedText } from "./highlighted-text";

type SearchResultListProps = {
  filters: SearchFilters;
  result: SearchResult;
};

/** 検索結果の一覧。1行が「該当した箇所」1つ */
export function SearchResultList({ filters, result }: SearchResultListProps) {
  const query = buildSearchQuery(filters);
  const shown = result.passages.length;

  return (
    <section className="mt-6 rounded-lg border bg-white p-6">
      <p className="text-sm text-gray-700" data-testid="search-result-count">
        <span className="text-lg font-semibold text-gray-900">
          {result.totalPassages.toLocaleString()}
        </span>{" "}
        箇所が該当しました（質問 {result.totalSections.toLocaleString()} 件分）
        {result.totalPassages > shown && (
          <span className="ml-2 text-gray-500">
            ※ 新しい順に先頭の {shown.toLocaleString()}{" "}
            箇所を表示しています。条件を足して絞り込んでください。
          </span>
        )}
      </p>

      {shown === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          該当する箇所はありませんでした。キーワードを短くする、言い換える（例：「保育所」と「保育園」）などを試してください。
        </p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">日付</TableHead>
              <TableHead className="w-44">質問者・会派</TableHead>
              <TableHead className="w-56">章・論点</TableHead>
              <TableHead>本文の該当箇所</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.passages.map((passage) => {
              const href = `/general-question-search/${passage.sectionId}${query}#speech-${passage.speechOrder}`;
              const speaker =
                passage.speakerKind === "member"
                  ? `${passage.speakerName}議員`
                  : `${passage.speakerRole ?? ""}（${passage.speakerName}）`;
              return (
                <TableRow
                  key={`${passage.speechId}:${passage.chapterTitle ?? ""}:${passage.topicTitle ?? ""}:${passage.snippet.slice(0, 24)}`}
                  className="align-top"
                >
                  <TableCell className="whitespace-nowrap text-sm">
                    <div>{passage.meetingDate}</div>
                    <div className="text-xs text-gray-500">
                      {passage.sessionName}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    <div className="font-medium">{passage.questionerName}</div>
                    <div className="text-xs text-gray-500">
                      {passage.questionerFaction ?? "（会派不明）"}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    {passage.passageKind === "topic" ? (
                      <>
                        {passage.chapterTitle && (
                          <div className="text-xs text-gray-500">
                            <HighlightedText
                              text={passage.chapterTitle}
                              terms={filters.terms}
                            />
                          </div>
                        )}
                        <div className="font-medium">
                          <HighlightedText
                            text={passage.topicTitle ?? ""}
                            terms={filters.terms}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500">
                        {passage.speakerKind === "member"
                          ? "（質問・再質問の本文）"
                          : "（論点に分かれていない答弁）"}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    <Link href={href} className="group block">
                      <div className="mb-1 text-xs text-gray-500">
                        {speaker}
                      </div>
                      <p className="leading-relaxed text-gray-800 group-hover:underline">
                        {passage.snippetHasBefore && "…"}
                        <HighlightedText
                          text={passage.snippet.replace(/\n/g, " ")}
                          terms={filters.terms}
                        />
                        {passage.snippetHasAfter && "…"}
                      </p>
                      <span className="mt-1 inline-block text-xs text-blue-600">
                        全文を読む →
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
