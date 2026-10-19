import type { GeneralQuestion } from "../types";

/**
 * 一般質問の並べ方（登壇順）。
 *
 * 掲載順は登壇順で固定し、テーマなどでまとめ直さない（設計書 9-3）。
 * - 定例会の中：日付順 → その日の登壇順
 * - 定例会どうし：新しい順
 *
 * 登壇順の情報源は general_questions の列。
 * - session_day：会議録ファイル名の「◯日目」（定例会の何日目か）
 * - question_order：その日の会議録に質問者が登場した順番（1から）。
 *   区切り（sections.section_order）と同じ値で入っている。
 * - meeting_date：会議の日付（会議録ファイル名から）
 */

type SpeakingOrderFields = Pick<
  GeneralQuestion,
  "session_day" | "question_order" | "meeting_date"
>;

/** 2件の一般質問を登壇順で比べる（日付 → 定例会の何日目か → その日の登壇順） */
export function compareBySpeakingOrder(
  a: SpeakingOrderFields,
  b: SpeakingOrderFields
): number {
  if (a.meeting_date && b.meeting_date && a.meeting_date !== b.meeting_date) {
    return a.meeting_date < b.meeting_date ? -1 : 1;
  }
  if (a.session_day !== b.session_day) {
    return a.session_day - b.session_day;
  }
  return a.question_order - b.question_order;
}

/** 一般質問を登壇順に並べた新しい配列を返す（元の配列は変えない） */
export function sortBySpeakingOrder<T extends SpeakingOrderFields>(
  questions: readonly T[]
): T[] {
  return [...questions].sort(compareBySpeakingOrder);
}

export type SpeakingDayGroup<T> = {
  /** 定例会の何日目か */
  sessionDay: number;
  /** 会議の日付（YYYY-MM-DD）。分からなければ null */
  meetingDate: string | null;
  /** その日の一般質問（登壇順） */
  questions: T[];
};

/** 登壇順に並べたうえで、会議の日ごとにまとめる（日の並びも日付順） */
export function groupBySpeakingDay<T extends SpeakingOrderFields>(
  questions: readonly T[]
): SpeakingDayGroup<T>[] {
  const groups: SpeakingDayGroup<T>[] = [];
  for (const q of sortBySpeakingOrder(questions)) {
    const last = groups.at(-1);
    if (
      last &&
      last.sessionDay === q.session_day &&
      last.meetingDate === (q.meeting_date ?? null)
    ) {
      last.questions.push(q);
    } else {
      groups.push({
        sessionDay: q.session_day,
        meetingDate: q.meeting_date ?? null,
        questions: [q],
      });
    }
  }
  return groups;
}

/** 定例会を新しい順に並べた新しい配列を返す（開会日 start_date の降順） */
export function sortSessionsNewestFirst<T extends { start_date: string }>(
  sessions: readonly T[]
): T[] {
  return [...sessions].sort((a, b) =>
    a.start_date === b.start_date ? 0 : a.start_date < b.start_date ? 1 : -1
  );
}

/** "2026-02-10" → "2026年2月10日"（時差の影響を受けないよう文字列から作る） */
export function formatMeetingDate(meetingDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(meetingDate);
  if (!m) return meetingDate;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}
