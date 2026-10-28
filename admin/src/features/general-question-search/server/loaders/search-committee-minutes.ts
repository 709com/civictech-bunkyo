import "server-only";

import type {
  CommitteeSearchResult,
  ItemTitleSource,
  SearchFilters,
} from "../../shared/types";
import { findCommitteePassages } from "../repositories/general-question-search-repository";
import { SEARCH_RESULT_LIMIT } from "./search-general-questions";

export function toItemTitleSource(
  value: string | null | undefined
): ItemTitleSource {
  return value === "質問" || value === "答弁" || value === "言葉から推定"
    ? value
    : null;
}

/** 委員会の会議録を探す（発言1つが1件） */
export async function searchCommitteeMinutes(
  filters: SearchFilters
): Promise<CommitteeSearchResult> {
  const rows = await findCommitteePassages({
    terms: filters.terms,
    meetingBodyId: filters.meetingBodyId,
    gqOnly: filters.gqOnly,
    memberId: filters.memberId,
    limit: SEARCH_RESULT_LIMIT,
  });

  return {
    passages: rows.map((row) => ({
      speechId: row.speech_id,
      meetingId: row.meeting_id,
      meetingDate: row.meeting_date,
      bodyName: row.body_name,
      sectionKind: row.section_kind,
      speechOrder: row.speech_order,
      speakerKind: row.speaker_kind,
      speakerDetail: row.speaker_detail,
      speakerName: row.speaker_name,
      speakerRole: row.speaker_role,
      item:
        row.item_no === null
          ? null
          : {
              no: row.item_no,
              title: row.item_title,
              titleSource: toItemTitleSource(row.item_title_source),
              questioner: row.item_questioner,
            },
      snippet: row.snippet,
      snippetHasBefore: row.snippet_has_before,
      snippetHasAfter: row.snippet_has_after,
    })),
    totalPassages: rows[0]?.total_passages ?? 0,
    totalMeetings: rows[0]?.total_meetings ?? 0,
  };
}
