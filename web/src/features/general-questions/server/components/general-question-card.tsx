import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { GeneralQuestion } from "../../shared/types";
import { SourceTypeBadge } from "./source-type-badge";

interface GeneralQuestionCardProps {
  question: GeneralQuestion;
}

const DAY_LABELS: Record<number, string> = {
  1: "第1日",
  2: "第2日",
  3: "第3日",
  4: "第4日",
  5: "第5日",
  6: "第6日",
};

export function GeneralQuestionCard({ question }: GeneralQuestionCardProps) {
  const dayLabel =
    DAY_LABELS[question.session_day] ?? `第${question.session_day}日`;
  const topicTitles = question.topics.map((t) => t.title).join(" / ");

  return (
    <Link
      href={`/questions/${question.id}`}
      className="block bg-card border border-border rounded-lg px-5 py-4 hover:border-primary transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {topicTitles && (
            <p className="text-xs text-mirai-text-secondary mb-1 truncate">
              {topicTitles}
            </p>
          )}
          <p className="flex flex-wrap items-center gap-2 font-bold text-mirai-text">
            {question.questioner_name}
            <SourceTypeBadge sourceType={question.source_type} />
          </p>
          {question.questioner_party && (
            <p className="text-sm text-mirai-text-secondary">
              {question.questioner_party}
            </p>
          )}
          <p className="text-xs text-mirai-text-muted mt-1">
            {dayLabel}・{question.question_order}番目
          </p>
          {question.summary && (
            <p className="mt-2 text-sm text-mirai-text line-clamp-2">
              {question.summary}
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-mirai-text-muted shrink-0 mt-1" />
      </div>
    </Link>
  );
}
