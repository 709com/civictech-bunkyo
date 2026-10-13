import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  GeneralQuestion,
  SessionQuestionOverview,
} from "../../shared/types";

/**
 * 公開サイトで使う列だけを取り出す（GeneralQuestion 型と同じ並び）。
 * review_status など内部管理用の列は、公開側には持ち出さない。
 */
const GENERAL_QUESTION_COLUMNS =
  "id, council_session_id, questioner_name, questioner_party, questioner_number, session_day, question_order, summary, topics, raw_text, source_url, publish_status, created_at, updated_at";

/** theme_lines(JSON) を Record<string, string[]> に正規化する */
function parseThemeLines(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      const lines = value.filter((v): v is string => typeof v === "string");
      if (lines.length > 0) out[key] = lines;
    }
  }
  return out;
}

export async function findPublishedGeneralQuestionsBySession(
  sessionId: string
): Promise<GeneralQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_questions")
    .select(GENERAL_QUESTION_COLUMNS)
    .eq("council_session_id", sessionId)
    .eq("publish_status", "published")
    .order("session_day", { ascending: true })
    .order("question_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch general questions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    ...row,
    topics: Array.isArray(row.topics) ? row.topics : [],
  })) as GeneralQuestion[];
}

/**
 * セッション単位のオーバービュー（全体3行＋テーマ別3行）を取得する。
 * 行が未生成の場合は lines=null / themeLines={} を返す。
 */
export async function findGeneralQuestionOverviewBySession(
  sessionId: string
): Promise<SessionQuestionOverview> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_question_overviews")
    .select("lines, theme_lines")
    .eq("council_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch general question overview: ${error.message}`
    );
  }

  const rawLines = data?.lines;
  const lines =
    Array.isArray(rawLines) && rawLines.length > 0 ? rawLines : null;
  return { lines, themeLines: parseThemeLines(data?.theme_lines) };
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
