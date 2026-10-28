import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

/** キーワードと絞り込み条件に合う箇所を探す（検索の本体はデータベースの関数） */
export async function findSearchPassages(input: {
  terms: string[];
  councilSessionId: string | null;
  memberId: string | null;
  factionName: string | null;
  answererRole: string | null;
  limit: number;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "search_general_question_passages",
    {
      p_terms: input.terms,
      p_council_session_id: input.councilSessionId ?? undefined,
      p_member_id: input.memberId ?? undefined,
      p_faction_name: input.factionName ?? undefined,
      p_answerer_role: input.answererRole ?? undefined,
      p_limit: input.limit,
    }
  );

  if (error) {
    throw new Error(`一般質問の検索に失敗しました: ${error.message}`);
  }

  return data ?? [];
}

/** 絞り込みの選択肢（定例会・質問者・会派・答弁者） */
export async function findSearchOptions() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("general_question_search_options");

  if (error) {
    throw new Error(`絞り込みの選択肢の取得に失敗しました: ${error.message}`);
  }

  return data;
}

/** 区切り（質問者1人分）と、その会議の情報 */
export async function findSectionById(sectionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sections")
    .select(
      "id, title, kind, meetings(meeting_date, session_name, day_label, source_file, source_type)"
    )
    .eq("id", sectionId)
    .maybeSingle();

  if (error) {
    throw new Error(`区切りの取得に失敗しました: ${error.message}`);
  }

  return data;
}

/** 区切りの中の発言を、発言順に */
export async function findSpeechesBySectionId(sectionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("speeches")
    .select(
      "id, speech_order, speaker_kind, speaker_name_raw, speaker_role_raw, body"
    )
    .eq("section_id", sectionId)
    .order("speech_order", { ascending: true });

  if (error) {
    throw new Error(`発言の取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
}

/** 区切りの中の章と論点 */
export async function findTopicNodesBySectionId(sectionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topic_nodes")
    .select("id, parent_id, level, node_order, title")
    .eq("section_id", sectionId);

  if (error) {
    throw new Error(`章と論点の取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
}

/** 発言と論点の結び付け（本文のどこからどこまでか） */
export async function findTopicSpeechesBySpeechIds(speechIds: string[]) {
  if (speechIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topic_speeches")
    .select("topic_node_id, speech_id, char_start, char_end")
    .in("speech_id", speechIds);

  if (error) {
    throw new Error(
      `論点と発言の結び付けの取得に失敗しました: ${error.message}`
    );
  }

  return data ?? [];
}

/** 発言時点の会派（履歴に期間があればそれ、無ければ本人の名乗り） */
export async function findSpeechFactionBySpeechId(speechId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("speech_factions")
    .select("speech_id, faction_name, faction_source")
    .eq("speech_id", speechId)
    .maybeSingle();

  if (error) {
    throw new Error(`会派の取得に失敗しました: ${error.message}`);
  }

  return data;
}

/** 委員会の会議録を探す（検索の本体はデータベースの関数） */
export async function findCommitteePassages(input: {
  terms: string[];
  meetingBodyId: string | null;
  gqOnly: boolean;
  memberId: string | null;
  limit: number;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("search_committee_minutes", {
    p_terms: input.terms,
    p_meeting_body_id: input.meetingBodyId ?? undefined,
    p_gq_only: input.gqOnly,
    p_member_id: input.memberId ?? undefined,
    p_limit: input.limit,
  });

  if (error) {
    throw new Error(`委員会の会議録の検索に失敗しました: ${error.message}`);
  }

  return data ?? [];
}

/** 委員会の会議録の検索の選択肢（委員会名・発言した議員） */
export async function findCommitteeSearchOptions() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "committee_minutes_search_options"
  );

  if (error) {
    throw new Error(
      `委員会の検索の選択肢の取得に失敗しました: ${error.message}`
    );
  }

  return data;
}

/** 会議1回分の情報 */
export async function findMeetingById(meetingId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(
      "id, kind, committee_name, meeting_date, session_name, day_label, title_raw, source_file, source_type, meeting_bodies(name)"
    )
    .eq("id", meetingId)
    .maybeSingle();

  if (error) {
    throw new Error(`会議の取得に失敗しました: ${error.message}`);
  }

  return data;
}

/** 一度に読める行の上限（データベースの設定 max_rows と同じ） */
const PAGE_SIZE = 1000;

/** 会議の中の発言を、発言順に全部 */
export async function findSpeechesByMeetingId(meetingId: string) {
  const supabase = createAdminClient();
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("speeches")
      .select(
        "id, speech_order, speaker_kind, speaker_detail, speaker_name_raw, speaker_role_raw, speaker_label_raw, body, section_id"
      )
      .eq("meeting_id", meetingId)
      .order("speech_order", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`発言の取得に失敗しました: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

/** 会議の中の区切り（種類の細目） */
export async function findSectionsByMeetingId(meetingId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sections")
    .select("id, kind, kind_detail, title")
    .eq("meeting_id", meetingId)
    .limit(PAGE_SIZE);

  if (error) {
    throw new Error(`区切りの取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
}

/** 会議の一般質問の項目と、項目に結び付いた発言 */
export async function findGqItemsByMeetingId(meetingId: string) {
  const supabase = createAdminClient();
  const { data: range, error: rangeError } = await supabase
    .from("general_question_ranges")
    .select("id")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  if (rangeError) {
    throw new Error(
      `一般質問の範囲の取得に失敗しました: ${rangeError.message}`
    );
  }
  if (!range) return [];

  const { data, error } = await supabase
    .from("general_question_items")
    .select(
      "id, item_no, title, title_source, general_question_item_speeches(speech_id)"
    )
    .eq("range_id", range.id)
    .order("item_no", { ascending: true });

  if (error) {
    throw new Error(`一般質問の項目の取得に失敗しました: ${error.message}`);
  }

  return data ?? [];
}
