/** 委員会の区分 */
export type CommitteeType =
  | "standing"
  | "special"
  | "budget"
  | "audit"
  | "management";

/** 発言セグメントの種別（発言者名が無い匿名・要約形式の議事録にも対応する） */
export type SpeakerType =
  | "member" // 委員の質疑・意見
  | "executive" // 執行部の答弁
  | "note"; // 開会時刻・傍聴・調査事項などの記録・進行

/** 会議録の1発言セグメント */
export type CommitteeSpeech = {
  /** 文書内で一意の連番（会議全体の発言順） */
  seq: number;
  /** 元の発言ブロック番号（VoiceNoN） */
  voiceNo: number;
  speakerType: SpeakerType;
  text: string;
  /** 中学生でも伝わる表現に直した本文（AI生成・確認後に格納） */
  simpleText?: string;
};

/** 会議内の1議題（市の議事録では通常空。将来の手動議題用） */
export type CommitteeMeetingTopic = {
  id: string;
  topicOrder: number;
  title: string;
  summary: string | null;
  discussionSummary: string | null;
  startVoiceNo: number | null;
  endVoiceNo: number | null;
};

/** 委員会の開催1回分（一覧用・発言なし） */
export type CommitteeMeetingSummary = {
  id: string;
  committeeName: string;
  committeeSlug: string;
  committeeType: CommitteeType;
  meetingDate: string;
  title: string;
  sourceDocumentId: number;
  sourceUrl: string;
  /** 会議全体の要約（AI生成・確認後に格納） */
  summary: string | null;
  topics: CommitteeMeetingTopic[];
};

/** 委員会の開催1回分（詳細用・発言つき） */
export type CommitteeMeetingDetail = CommitteeMeetingSummary & {
  speeches: CommitteeSpeech[];
};

/** 委員会（アーカイブの単位） */
export type CommitteeArchive = {
  slug: string;
  /** 委員会名（最新の会議の名称） */
  name: string;
  type: CommitteeType;
  meetingCount: number;
  latestMeetingDate: string;
};
