export type GeneralQuestionTopic = {
  title: string;
  question_summary: string;
  answer_summary: string;
  answerer_role: string;
  answerer_name: string;
  block_summary?: string | null;
};

export type GeneralQuestion = {
  id: string;
  council_session_id: string;
  questioner_name: string;
  questioner_party: string | null;
  questioner_number: number | null;
  session_day: number;
  question_order: number;
  /** 会議の日付（YYYY-MM-DD）。データベースからは必ず入る（開発用の見本データには無い） */
  meeting_date?: string | null;
  summary: string | null;
  topics: GeneralQuestionTopic[];
  raw_text: string | null;
  source_url: string | null;
  /**
   * 会議録の種類（seishiki＝正式版／sokuhou＝速報版）。データベースからは必ず入る（開発用の見本データには無い）。
   * 「速報」の印（site.config.ts の features.showSourceTypeBadge）に使う
   */
  source_type?: string | null;
  publish_status: string;
  created_at: string;
  updated_at: string;
};

/** 一般質問のある定例会（定例会どうしの切り替えに使う） */
export type SessionWithQuestions = {
  id: string;
  name: string;
  slug: string;
  start_date: string;
};
