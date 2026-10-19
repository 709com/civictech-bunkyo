import type { GeneralQuestion } from "../../shared/types";
import {
  formatMeetingDate,
  groupBySpeakingDay,
} from "../../shared/utils/speaking-order";
import { GeneralQuestionCard } from "./general-question-card";

interface SessionQuestionListProps {
  questions: GeneralQuestion[];
}

/**
 * 定例会の一般質問を、登壇順（日付順 → その日の登壇順）で並べる。
 * テーマなどでまとめ直さない（掲載順は登壇順で固定。設計書 9-3）。
 */
export function SessionQuestionList({ questions }: SessionQuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-16 text-mirai-text-secondary">
        <p>現在、一般質問のデータを準備中です。</p>
        <p className="text-sm mt-2">しばらくお待ちください。</p>
      </div>
    );
  }

  const days = groupBySpeakingDay(questions);

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => (
        <section
          key={`${day.sessionDay}-${day.meetingDate ?? ""}`}
          aria-label={`第${day.sessionDay}日`}
        >
          <h2 className="mb-3 text-base font-bold text-mirai-text">
            第{day.sessionDay}日
            {day.meetingDate && (
              <span className="ml-2 text-sm font-normal text-mirai-text-secondary">
                {formatMeetingDate(day.meetingDate)}
              </span>
            )}
          </h2>
          <ol className="flex flex-col gap-3">
            {day.questions.map((question) => (
              <li key={question.id}>
                <GeneralQuestionCard question={question} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
