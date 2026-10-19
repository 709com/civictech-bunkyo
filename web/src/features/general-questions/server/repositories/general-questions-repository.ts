import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { GeneralQuestion, SessionWithQuestions } from "../../shared/types";
import { sortSessionsNewestFirst } from "../../shared/utils/speaking-order";

/**
 * 公開サイトで使う列だけを取り出す（GeneralQuestion 型と同じ並び）。
 * review_status など内部管理用の列は、公開側には持ち出さない。
 */
const GENERAL_QUESTION_COLUMNS =
  "id, council_session_id, questioner_name, questioner_party, questioner_number, session_day, question_order, meeting_date, summary, topics, raw_text, source_url, publish_status, created_at, updated_at";

export async function findPublishedGeneralQuestionsBySession(
  sessionId: string
): Promise<GeneralQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_questions")
    .select(GENERAL_QUESTION_COLUMNS)
    .eq("council_session_id", sessionId)
    .eq("publish_status", "published")
    .order("meeting_date", { ascending: true })
    .order("session_day", { ascending: true })
    .order("question_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch general questions: ${error.message}`);
  }

  // 並びは登壇順（日付 → 定例会の何日目か → その日の登壇順）。
  // 上の order は念のため。画面側でも sortBySpeakingOrder で並べ直す。
  return (data ?? []).map((row) => ({
    ...row,
    topics: Array.isArray(row.topics) ? row.topics : [],
  })) as GeneralQuestion[];
}

/**
 * 公開中の一般質問がある定例会を、新しい順（開会日の降順）で返す。
 * 定例会どうしの切り替えの一覧に使う。
 */
export async function findSessionsWithPublishedQuestions(): Promise<
  SessionWithQuestions[]
> {
  const supabase = createAdminClient();

  const { data: rows, error: qErr } = await supabase
    .from("general_questions")
    .select("council_session_id")
    .eq("publish_status", "published");

  if (qErr) {
    throw new Error(
      `Failed to fetch sessions with general questions: ${qErr.message}`
    );
  }
  if (!rows?.length) return [];

  const ids = [...new Set(rows.map((r) => r.council_session_id))];

  const { data: sessions, error: sErr } = await supabase
    .from("council_sessions")
    .select("id, name, slug, start_date")
    .in("id", ids)
    .order("start_date", { ascending: false });

  if (sErr) {
    throw new Error(`Failed to fetch council sessions: ${sErr.message}`);
  }

  const withSlug = (sessions ?? []).filter(
    (s): s is SessionWithQuestions =>
      typeof s.slug === "string" && s.slug !== ""
  );
  return sortSessionsNewestFirst(withSlug);
}

export async function findLatestSessionSlugWithPublishedQuestions(): Promise<
  string | null
> {
  const supabase = createAdminClient();

  const { data: rows, error: qErr } = await supabase
    .from("general_questions")
    .select("council_session_id")
    .eq("publish_status", "published");

  if (qErr || !rows?.length) return null;

  const ids = [
    ...new Set(
      rows.map((r: { council_session_id: string }) => r.council_session_id)
    ),
  ];

  const { data: session, error: sErr } = await supabase
    .from("council_sessions")
    .select("slug")
    .in("id", ids)
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (sErr) return null;
  return session?.slug ?? null;
}

export async function findPublishedGeneralQuestionById(
  id: string
): Promise<GeneralQuestion | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_questions")
    .select(GENERAL_QUESTION_COLUMNS)
    .eq("id", id)
    .eq("publish_status", "published")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch general question: ${error.message}`);
  }

  return {
    ...data,
    topics: Array.isArray(data.topics) ? data.topics : [],
  } as GeneralQuestion;
}
