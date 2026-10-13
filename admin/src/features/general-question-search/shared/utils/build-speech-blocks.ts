import type { SpeechBlock, TopicRange } from "../types";

function pushText(blocks: SpeechBlock[], text: string) {
  const trimmed = text.replace(/^\n+|\n+$/g, "");
  if (trimmed.length > 0) blocks.push({ type: "text", text: trimmed });
}

/**
 * 発言の本文に、章と論点の見出しを差し込んで、表示用の部品の並びにする。
 *
 * - 本文は1文字も捨てない（あいさつや章の宣言の行も、そのまま本文として残す）。
 * - 章の見出しは、その章の宣言の行（論点の直前の段落）の前に置く。
 * - 章そのものが論点になっている場合（見出しが同じ場合）は、論点の見出しを重ねて出さない。
 */
export function buildSpeechBlocks(
  body: string,
  ranges: TopicRange[]
): SpeechBlock[] {
  const blocks: SpeechBlock[] = [];
  if (ranges.length === 0) {
    pushText(blocks, body);
    return blocks;
  }

  const sorted = [...ranges].sort(
    (a, b) => (a.charStart ?? 0) - (b.charStart ?? 0)
  );

  let cursor = 0;
  let currentChapterId: string | null | undefined;
  for (const range of sorted) {
    const start = Math.min(Math.max(range.charStart ?? 0, cursor), body.length);
    const end = Math.min(
      Math.max(range.charEnd ?? body.length, start),
      body.length
    );
    const gap = body.slice(cursor, start);
    const chapterChanged =
      range.chapterTitle !== null && range.chapterId !== currentChapterId;

    if (chapterChanged && range.chapterTitle !== null) {
      // 論点の直前の段落が、章の宣言。その前に章の見出しを置く。
      const paragraphs = gap.replace(/\n+$/, "").split("\n");
      const declaration = paragraphs.pop() ?? "";
      pushText(blocks, paragraphs.join("\n"));
      blocks.push({ type: "chapter", title: range.chapterTitle });
      pushText(blocks, declaration);
    } else {
      pushText(blocks, gap);
    }
    currentChapterId = range.chapterId;

    if (range.topicTitle !== range.chapterTitle) {
      blocks.push({ type: "topic", title: range.topicTitle });
    }
    pushText(blocks, body.slice(start, end));
    cursor = end;
  }
  pushText(blocks, body.slice(cursor));
  return blocks;
}
