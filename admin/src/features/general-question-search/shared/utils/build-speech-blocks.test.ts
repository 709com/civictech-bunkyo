import { describe, expect, it } from "vitest";
import type { SpeechBlock, TopicRange } from "../types";
import { buildSpeechBlocks } from "./build-speech-blocks";

/** 本文の中から段落を探して、その範囲（開始・終了の位置）を返す */
function rangeOf(body: string, first: string, last = first) {
  const charStart = body.indexOf(first);
  const charEnd = body.indexOf(last) + last.length;
  return { charStart, charEnd };
}

const textOf = (blocks: SpeechBlock[]) =>
  blocks
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

describe("buildSpeechBlocks", () => {
  it("論点が無い発言は、本文1つだけを返す", () => {
    expect(buildSpeechBlocks("質問します。\n以上です。", [])).toEqual([
      { type: "text", text: "質問します。\n以上です。" },
    ]);
  });

  it("章の見出しを宣言の行の前に、論点の見出しを論点の前に置く", () => {
    const body = [
      "議員の御質問にお答えします。",
      "最初に、災害対策に関する御質問にお答えします。",
      "まず、避難所についてのお尋ねですが、整備を進めます。",
      "引き続き取り組みます。",
      "次に、備蓄についてのお尋ねですが、拡充します。",
    ].join("\n");
    const ranges: TopicRange[] = [
      {
        chapterId: "c1",
        chapterTitle: "災害対策",
        topicTitle: "避難所",
        ...rangeOf(body, "まず、避難所", "引き続き取り組みます。"),
      },
      {
        chapterId: "c1",
        chapterTitle: "災害対策",
        topicTitle: "備蓄",
        ...rangeOf(body, "次に、備蓄についてのお尋ねですが、拡充します。"),
      },
    ];

    expect(buildSpeechBlocks(body, ranges)).toEqual([
      { type: "text", text: "議員の御質問にお答えします。" },
      { type: "chapter", title: "災害対策" },
      {
        type: "text",
        text: "最初に、災害対策に関する御質問にお答えします。",
      },
      { type: "topic", title: "避難所" },
      {
        type: "text",
        text: "まず、避難所についてのお尋ねですが、整備を進めます。\n引き続き取り組みます。",
      },
      { type: "topic", title: "備蓄" },
      { type: "text", text: "次に、備蓄についてのお尋ねですが、拡充します。" },
    ]);
  });

  it("章そのものが論点の場合、論点の見出しを重ねて出さない", () => {
    const body = [
      "次に、ふるさと納税についての御質問にお答えします。",
      "透明性の確保に努めます。",
    ].join("\n");
    const ranges: TopicRange[] = [
      {
        chapterId: "c1",
        chapterTitle: "ふるさと納税",
        topicTitle: "ふるさと納税",
        ...rangeOf(body, "透明性の確保に努めます。"),
      },
    ];

    expect(buildSpeechBlocks(body, ranges)).toEqual([
      { type: "chapter", title: "ふるさと納税" },
      {
        type: "text",
        text: "次に、ふるさと納税についての御質問にお答えします。",
      },
      { type: "text", text: "透明性の確保に努めます。" },
    ]);
  });

  it("章が変わるたびに章の見出しを出す", () => {
    const body = [
      "最初に、防災に関する御質問にお答えします。",
      "防災の中身です。",
      "次に、教育に関する御質問にお答えします。",
      "教育の中身です。",
      "なお、教育に関する御質問には、教育長より御答弁申し上げます。",
    ].join("\n");
    const ranges: TopicRange[] = [
      {
        chapterId: "c1",
        chapterTitle: "防災",
        topicTitle: "防災",
        ...rangeOf(body, "防災の中身です。"),
      },
      {
        chapterId: "c2",
        chapterTitle: "教育",
        topicTitle: "教育",
        ...rangeOf(body, "教育の中身です。"),
      },
    ];

    const blocks = buildSpeechBlocks(body, ranges);
    expect(blocks.filter((b) => b.type === "chapter")).toEqual([
      { type: "chapter", title: "防災" },
      { type: "chapter", title: "教育" },
    ]);
    // 最後の引き継ぎの行も、本文として残る
    expect(blocks[blocks.length - 1]).toEqual({
      type: "text",
      text: "なお、教育に関する御質問には、教育長より御答弁申し上げます。",
    });
  });

  it("章のない論点は、論点の見出しだけを出す", () => {
    const body = "まず、基金についてのお尋ねですが、適切に管理します。";
    const ranges: TopicRange[] = [
      {
        chapterId: null,
        chapterTitle: null,
        topicTitle: "基金",
        charStart: 0,
        charEnd: body.length,
      },
    ];
    expect(buildSpeechBlocks(body, ranges)).toEqual([
      { type: "topic", title: "基金" },
      { type: "text", text: body },
    ]);
  });

  it("範囲が指定されていない論点は、発言全体をその論点として扱う", () => {
    const body = "全体が1つの論点です。";
    const ranges: TopicRange[] = [
      {
        chapterId: null,
        chapterTitle: null,
        topicTitle: "全体",
        charStart: null,
        charEnd: null,
      },
    ];
    expect(buildSpeechBlocks(body, ranges)).toEqual([
      { type: "topic", title: "全体" },
      { type: "text", text: body },
    ]);
  });

  it("範囲の順番がばらばらでも、本文の順に並べる", () => {
    const body = "一つ目の中身。\n二つ目の中身。";
    const ranges: TopicRange[] = [
      {
        chapterId: null,
        chapterTitle: null,
        topicTitle: "二つ目",
        ...rangeOf(body, "二つ目の中身。"),
      },
      {
        chapterId: null,
        chapterTitle: null,
        topicTitle: "一つ目",
        ...rangeOf(body, "一つ目の中身。"),
      },
    ];
    expect(
      buildSpeechBlocks(body, ranges)
        .filter((b) => b.type === "topic")
        .map((b) => (b.type === "topic" ? b.title : ""))
    ).toEqual(["一つ目", "二つ目"]);
  });

  it("見出しを差し込んでも、本文の段落は1つも失われない", () => {
    const body = [
      "議員の御質問にお答えします。",
      "最初に、災害対策に関する御質問にお答えします。",
      "まず、避難所についてのお尋ねですが、整備を進めます。",
      "次に、備蓄についてのお尋ねですが、拡充します。",
      "なお、教育に関する御質問には、教育長より御答弁申し上げます。",
    ].join("\n");
    const ranges: TopicRange[] = [
      {
        chapterId: "c1",
        chapterTitle: "災害対策",
        topicTitle: "避難所",
        ...rangeOf(
          body,
          "まず、避難所についてのお尋ねですが、整備を進めます。"
        ),
      },
      {
        chapterId: "c1",
        chapterTitle: "災害対策",
        topicTitle: "備蓄",
        ...rangeOf(body, "次に、備蓄についてのお尋ねですが、拡充します。"),
      },
    ];
    expect(textOf(buildSpeechBlocks(body, ranges))).toBe(body);
  });
});
