import type { CommitteeMeetingTopic, CommitteeSpeech } from "../types";

/** 原文ページの1セクション（議題見出し＋その範囲の発言） */
export type TranscriptSection = {
  /** 対応する議題。冒頭の記録や議題が無い会議はnull */
  topic: CommitteeMeetingTopic | null;
  speeches: CommitteeSpeech[];
};

/**
 * 発言セグメント一覧を議題の範囲（startVoiceNo〜endVoiceNo は seq を指す）で分割する。
 * 議題を持たない議事録の場合は、全体を1セクションにまとめる。
 */
export function buildTranscriptSections(
  speeches: CommitteeSpeech[],
  topics: CommitteeMeetingTopic[]
): TranscriptSection[] {
  const ranged = topics
    .filter((t) => t.startVoiceNo != null)
    .sort((a, b) => a.topicOrder - b.topicOrder);

  if (ranged.length === 0) {
    return speeches.length > 0 ? [{ topic: null, speeches }] : [];
  }

  const sections: TranscriptSection[] = [];
  const firstStart = ranged[0].startVoiceNo as number;
  const opening = speeches.filter((s) => s.seq < firstStart);
  if (opening.length > 0) {
    sections.push({ topic: null, speeches: opening });
  }

  ranged.forEach((topic, i) => {
    const start = topic.startVoiceNo as number;
    const nextStart =
      i + 1 < ranged.length
        ? (ranged[i + 1].startVoiceNo as number)
        : Number.POSITIVE_INFINITY;
    // 議題自身の endVoiceNo（inclusive）を優先し、無ければ次の議題の開始直前まで。
    // これにより endVoiceNo が次の議題より前にある議題が、無関係な発言を
    // 取り込むのを防ぐ。
    sections.push({
      topic,
      speeches: speeches.filter((s) => {
        if (s.seq < start) return false;
        return topic.endVoiceNo != null
          ? s.seq <= topic.endVoiceNo
          : s.seq < nextStart;
      }),
    });
  });

  return sections;
}
