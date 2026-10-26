"use client";

import { MessageCircle, User } from "lucide-react";
import { useEffect } from "react";
import type { GeneralQuestionTopic } from "../../shared/types";

/**
 * URL に #topic-N が付いている場合、その区切り位置へスクロールする。
 * Next.js のクライアント遷移ではハッシュへ自動スクロールしないことがあるため、
 * マウント時（トピック描画済み）に明示的にスクロールして確実に区切り位置から表示する。
 */
function useScrollToHashTopic() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#topic-")) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    }
  }, []);
}

function ChatBubbleQuestion({ text }: { text: string }) {
  return (
    <div className="flex items-end justify-end gap-2">
      <div className="max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3">
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <User className="h-4 w-4" />
      </div>
    </div>
  );
}

function ChatBubbleAnswer({
  text,
  role,
  name,
}: {
  text: string;
  role: string;
  name: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mirai-surface-muted border border-border">
        <MessageCircle className="h-4 w-4 text-mirai-text-secondary" />
      </div>
      <div className="max-w-[75%]">
        <p className="mb-1 text-xs text-mirai-text-secondary">
          {role}
          {name ? `　${name}` : ""}
        </p>
        <div className="rounded-2xl rounded-bl-sm bg-card border border-border px-4 py-3">
          <p className="text-sm leading-relaxed text-mirai-text">{text}</p>
        </div>
      </div>
    </div>
  );
}

/** 空文字・空白だけ・未設定は「文が無い」とみなす */
function hasText(text: string | null | undefined): text is string {
  return typeof text === "string" && text.trim().length > 0;
}

interface QuestionChatViewProps {
  topics: GeneralQuestionTopic[];
}

export function QuestionChatView({ topics }: QuestionChatViewProps) {
  useScrollToHashTopic();
  return (
    <div className="flex flex-col gap-8">
      {topics.map((topic, i) => (
        <div
          key={`${topic.title}-${i}`}
          id={`topic-${i}`}
          className="flex flex-col gap-3 scroll-mt-20"
        >
          <p className="text-center text-xs font-medium text-mirai-text-secondary bg-mirai-surface-muted rounded-full px-3 py-1 mx-auto">
            {topic.title}
          </p>
          {/*
            質問側の文（question_summary）は、今のデータ（会議録からの抜き出し）では空。
            空の吹き出しは出さない。あとで要約などの文が入れば、そのまま表示される
          */}
          {hasText(topic.question_summary) && (
            <ChatBubbleQuestion text={topic.question_summary} />
          )}
          {hasText(topic.answer_summary) && (
            <ChatBubbleAnswer
              text={topic.answer_summary}
              role={topic.answerer_role}
              name={topic.answerer_name}
            />
          )}
        </div>
      ))}
    </div>
  );
}
