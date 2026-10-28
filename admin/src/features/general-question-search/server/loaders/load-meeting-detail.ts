import "server-only";

import type { MeetingDetail } from "../../shared/types";
import {
  findGqItemsByMeetingId,
  findMeetingById,
  findSectionsByMeetingId,
  findSpeechesByMeetingId,
} from "../repositories/general-question-search-repository";
import { toItemTitleSource } from "./search-committee-minutes";

/** 会議1回分の全文を、発言の番号の順に組み立てる（区切りの種類と、一般質問の項目名つき） */
export async function loadMeetingDetail(
  meetingId: string
): Promise<MeetingDetail | null> {
  const meeting = await findMeetingById(meetingId);
  if (!meeting) return null;

  const [speeches, sections, items] = await Promise.all([
    findSpeechesByMeetingId(meetingId),
    findSectionsByMeetingId(meetingId),
    findGqItemsByMeetingId(meetingId),
  ]);

  const sectionById = new Map(sections.map((s) => [s.id, s]));
  // 発言 → 項目（いちばん番号の小さい項目）
  const itemBySpeech = new Map<
    string,
    {
      no: number;
      title: string | null;
      titleSource: ReturnType<typeof toItemTitleSource>;
    }
  >();
  for (const item of items) {
    for (const link of item.general_question_item_speeches ?? []) {
      if (!itemBySpeech.has(link.speech_id)) {
        itemBySpeech.set(link.speech_id, {
          no: item.item_no,
          title: item.title,
          titleSource: toItemTitleSource(item.title_source),
        });
      }
    }
  }

  return {
    meetingId: meeting.id,
    kind: meeting.kind,
    meetingDate: meeting.meeting_date,
    bodyName: meeting.meeting_bodies?.name ?? meeting.committee_name,
    sessionName: meeting.session_name,
    dayLabel: meeting.day_label,
    titleRaw: meeting.title_raw,
    sourceFile: meeting.source_file,
    sourceType: meeting.source_type,
    speeches: speeches.map((speech) => {
      const section = speech.section_id
        ? sectionById.get(speech.section_id)
        : undefined;
      return {
        id: speech.id,
        speechOrder: speech.speech_order,
        speakerKind: speech.speaker_kind,
        speakerDetail: speech.speaker_detail,
        speakerLabel:
          speech.speaker_label_raw ??
          (speech.speaker_role_raw
            ? `${speech.speaker_role_raw}（${speech.speaker_name_raw}）`
            : speech.speaker_name_raw),
        body: speech.body,
        sectionId: speech.section_id,
        sectionKind: section?.kind_detail ?? section?.kind ?? null,
        item: itemBySpeech.get(speech.id) ?? null,
      };
    }),
  };
}
