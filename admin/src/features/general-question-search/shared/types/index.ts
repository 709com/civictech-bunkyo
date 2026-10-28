/**
 * 探す範囲。
 * - plenary: 本会議の一般質問（今までどおり）
 * - committee: 委員会の会議録の全文
 */
export type SearchScope = "plenary" | "committee";

/** 検索条件（URL のパラメータを解釈したもの） */
export type SearchFilters = {
  /** キーワード。すべて含む箇所を探す */
  terms: string[];
  scope: SearchScope;
  /** 委員会名（meeting_bodies の ID）。委員会を探すときだけ */
  meetingBodyId: string | null;
  /** 委員会の一般質問の部分だけを探すか。委員会を探すときだけ */
  gqOnly: boolean;
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
  /** 委員会名（委員会の会議録がある会議体だけ） */
  bodies: { id: string; name: string }[];
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

/** 委員会の一般質問の項目名の出どころ（null は空欄） */
export type ItemTitleSource = "質問" | "答弁" | "言葉から推定" | null;

/** 委員会の会議録の検索結果の1件（発言1つ） */
export type CommitteeSearchPassage = {
  speechId: string;
  meetingId: string;
  meetingDate: string;
  bodyName: string | null;
  /** 区切りの種類（一般質問・理事者報告など） */
  sectionKind: string | null;
  speechOrder: number;
  speakerKind: string;
  /** 分解の道具の話し手の区分（委員長・議員・理事者 など） */
  speakerDetail: string | null;
  speakerName: string;
  speakerRole: string | null;
  /** 委員会の一般質問の項目（結び付いている発言だけ） */
  item: {
    no: number;
    title: string | null;
    titleSource: ItemTitleSource;
    questioner: string | null;
  } | null;
  snippet: string;
  snippetHasBefore: boolean;
  snippetHasAfter: boolean;
};

export type CommitteeSearchResult = {
  passages: CommitteeSearchPassage[];
  /** 条件に合った発言の総数（一覧に出していない分も含む） */
  totalPassages: number;
  /** 条件に合った発言を含む会議の数 */
  totalMeetings: number;
};

/** 会議1回分の全文の、発言1つ */
export type MeetingSpeech = {
  id: string;
  speechOrder: number;
  speakerKind: string;
  speakerDetail: string | null;
  speakerLabel: string;
  body: string;
  /** その発言の入る区切りの種類（前の発言と変わったところで見出しを出す） */
  sectionId: string | null;
  sectionKind: string | null;
  /** 委員会の一般質問の項目（結び付いている発言だけ。いちばん番号の小さい項目） */
  item: {
    no: number;
    title: string | null;
    titleSource: ItemTitleSource;
  } | null;
};

/** 会議1回分の全文（委員会・本会議） */
export type MeetingDetail = {
  meetingId: string;
  kind: string;
  meetingDate: string;
  bodyName: string | null;
  sessionName: string | null;
  dayLabel: string | null;
  titleRaw: string | null;
  sourceFile: string;
  sourceType: string;
  speeches: MeetingSpeech[];
};
