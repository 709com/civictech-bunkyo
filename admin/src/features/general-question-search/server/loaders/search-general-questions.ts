import "server-only";

import type { SearchFilters, SearchResult } from "../../shared/types";
import { findSearchPassages } from "../repositories/general-question-search-repository";

/** 一覧に出す箇所の上限。これを超える分は件数だけ知らせる */
export const SEARCH_RESULT_LIMIT = 200;

export async function searchGeneralQuestions(
  filters: SearchFilters
): Promise<SearchResult> {
  const rows = await findSearchPassages({
    terms: filters.terms,
    councilSessionId: filters.councilSessionId,
    memberId: filters.memberId,
    factionName: filters.factionName,
    answererRole: filters.answererRole,
    limit: SEARCH_RESULT_LIMIT,
  });

  return {
    passages: rows.map((row) => ({
      passageKind: row.passage_kind === "topic" ? "topic" : "speech",
      sectionId: row.section_id,
      meetingDate: row.meeting_date,
      sessionName: row.session_name,
      questionerName: row.questioner_name,
      questionerFaction: row.questioner_faction,
      speechId: row.speech_id,
      speechOrder: row.speech_order,
      speakerKind: row.speaker_kind,
      speakerName: row.speaker_name,
      speakerRole: row.speaker_role,
      chapterTitle: row.chapter_title,
      topicTitle: row.topic_title,
      snippet: row.snippet,
      snippetHasBefore: row.snippet_has_before,
      snippetHasAfter: row.snippet_has_after,
    })),
    totalPassages: rows[0]?.total_passages ?? 0,
    totalSections: rows[0]?.total_sections ?? 0,
  };
}
