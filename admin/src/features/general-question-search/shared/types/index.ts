/** 検索条件（URL のパラメータを解釈したもの） */
export type SearchFilters = {
  /** キーワード。すべて含む箇所を探す */
  terms: string[];
  councilSessionId: string | null;
  memberId: string | null;
  /** その発言時点の会派名 */
  factionName: string | null;
  /** 答弁者の役職（区長・教育長など） */
  answererRole: string | null;
};

/** 絞り込みの選択肢 */
export type SearchOptions = {
  sessions: { id: string; name: string }[];
  members: { id: string; name: string }[];
  factions: string[];
  answererRoles: string[];
};

/**
 * 検索結果の1件（箇所）。
 * - topic: 答弁の中の論点1つ分
 * - speech: 論点に結び付いていない発言まるごと（質問・再質問など）
 */
export type SearchPassage = {
  passageKind: "topic" | "speech";
  sectionId: string;
  meetingDate: string;
  sessionName: string | null;
  questionerName: string;
  questionerFaction: string | null;
  speechId: string;
  speechOrder: number;
  speakerKind: string;
  speakerName: string;
  speakerRole: string | null;
  chapterTitle: string | null;
  topicTitle: string | null;
  /** 本文の該当箇所の前後 */
  snippet: string;
  snippetHasBefore: boolean;
  snippetHasAfter: boolean;
};

export type SearchResult = {
  passages: SearchPassage[];
  /** 条件に合った箇所の総数（一覧に出していない分も含む） */
  totalPassages: number;
  /** 条件に合った箇所を含む質問（質問者1人分）の数 */
  totalSections: number;
};

/** 発言の本文のうち、ある論点に当たる範囲 */
export type TopicRange = {
  chapterId: string | null;
  chapterTitle: string | null;
  topicTitle: string;
  /** 本文の何文字目から（先頭が0）。null は発言全体 */
  charStart: number | null;
  /** 本文の何文字目の手前まで。null は発言全体 */
  charEnd: number | null;
};

/** 全文表示の部品。見出し（章・論点）か、本文のひとかたまり */
export type SpeechBlock =
  | { type: "chapter"; title: string }
  | { type: "topic"; title: string }
  | { type: "text"; text: string };

export type SpeechDetail = {
  id: string;
  speechOrder: number;
  speakerKind: string;
  speakerName: string;
  speakerRole: string | null;
  blocks: SpeechBlock[];
};

/** 質問者1人分（質問・答弁・再質問）の全文 */
export type SectionDetail = {
  sectionId: string;
  title: string | null;
  meetingDate: string;
  sessionName: string | null;
  dayLabel: string | null;
  sourceFile: string;
  sourceType: string;
  questionerName: string | null;
  questionerFaction: string | null;
  speeches: SpeechDetail[];
};
