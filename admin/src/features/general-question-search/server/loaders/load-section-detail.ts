import "server-only";

import type { SectionDetail, TopicRange } from "../../shared/types";
import { buildSpeechBlocks } from "../../shared/utils/build-speech-blocks";
import {
  findSectionById,
  findSpeechesBySectionId,
  findSpeechFactionBySpeechId,
  findTopicNodesBySectionId,
  findTopicSpeechesBySpeechIds,
} from "../repositories/general-question-search-repository";

/** 質問者1人分（質問・答弁・再質問）の全文を、章と論点の見出し付きで組み立てる */
export async function loadSectionDetail(
  sectionId: string
): Promise<SectionDetail | null> {
  const section = await findSectionById(sectionId);
  if (!section?.meetings) return null;

  const [speeches, nodes] = await Promise.all([
    findSpeechesBySectionId(sectionId),
    findTopicNodesBySectionId(sectionId),
  ]);
  const links = await findTopicSpeechesBySpeechIds(speeches.map((s) => s.id));

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const rangesBySpeech = new Map<string, TopicRange[]>();
  for (const link of links) {
    const topic = nodeById.get(link.topic_node_id);
    if (!topic) continue;
    const chapter = topic.parent_id ? nodeById.get(topic.parent_id) : undefined;
    const ranges = rangesBySpeech.get(link.speech_id) ?? [];
    ranges.push({
      chapterId: chapter?.id ?? null,
      chapterTitle: chapter?.title ?? null,
      topicTitle: topic.title,
      charStart: link.char_start,
      charEnd: link.char_end,
    });
    rangesBySpeech.set(link.speech_id, ranges);
  }

  const questioner = speeches.find((s) => s.speaker_kind === "member");
  const faction = questioner
    ? await findSpeechFactionBySpeechId(questioner.id)
    : null;

  return {
    sectionId: section.id,
    title: section.title,
    meetingDate: section.meetings.meeting_date,
    sessionName: section.meetings.session_name,
    dayLabel: section.meetings.day_label,
    sourceFile: section.meetings.source_file,
    sourceType: section.meetings.source_type,
    questionerName: questioner?.speaker_name_raw ?? null,
    questionerFaction: faction?.faction_name ?? null,
    speeches: speeches.map((speech) => ({
      id: speech.id,
      speechOrder: speech.speech_order,
      speakerKind: speech.speaker_kind,
      speakerName: speech.speaker_name_raw,
      speakerRole: speech.speaker_role_raw,
      blocks: buildSpeechBlocks(
        speech.body,
        rangesBySpeech.get(speech.id) ?? []
      ),
    })),
  };
}
