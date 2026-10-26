"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GeneralQuestionTopic } from "../../shared/types";
import { QuestionChatView } from "./question-chat-view";

type SpeakerTurn = { speaker: string; text: string };

function parseSpeakerTurns(rawText: string): SpeakerTurn[] {
  const turns: SpeakerTurn[] = [];
  const segments = rawText.split("◯").filter((s) => s.trim().length > 0);
  for (const seg of segments) {
    const newlineIdx = seg.search(/[\s　]/);
    if (newlineIdx === -1) {
      turns.push({ speaker: seg.trim(), text: "" });
      continue;
    }
    const speaker = seg.slice(0, newlineIdx).trim();
    const text = seg.slice(newlineIdx).trim();
    if (speaker.includes("議長")) continue;
    turns.push({ speaker, text });
  }
  return turns;
}

// 質問者（議員）の発言かどうか。文京区の会議録は「○○議員」、ほかの議会の見本は「◯番」の形
function isQuestioner(speaker: string): boolean {
  return /^\d+番/.test(speaker) || /議員$/.test(speaker);
}

// 「全文」：発言を会議録の順に並べるだけ。論点の見出しの帯は出さない
// （以前は帯を「発言の数×i÷論点の数」のおおよその位置に置いており、別の答弁者の発言の上に出ることがあったため。2026-10-26）
function RawTranscriptContent({ rawText }: { rawText: string }) {
  const turns = parseSpeakerTurns(rawText);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-mirai-text-secondary">
        会議録の順に発言を並べています。論点ごとの見出しは「論点ごと」でご覧ください。
      </p>
      {turns.map((turn, i) => {
        const isQ = isQuestioner(turn.speaker);
        return (
          <Fragment key={`${i}-${turn.speaker}`}>
            <div className={isQ ? "flex justify-end" : "flex"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  isQ
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-mirai-text rounded-bl-sm"
                }`}
              >
                <p
                  className={`mb-1 text-xs font-medium ${
                    isQ
                      ? "text-primary-foreground/70"
                      : "text-mirai-text-secondary"
                  }`}
                >
                  {turn.speaker}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {turn.text}
                </p>
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

interface QuestionViewToggleProps {
  topics: GeneralQuestionTopic[];
  rawText: string;
}

export function QuestionViewToggle({
  topics,
  rawText,
}: QuestionViewToggleProps) {
  // 「論点ごと」＝論点の見出しと、答弁の該当部分（今は会議録の原文の抜き出し）。
  // 「全文」＝この一般質問の発言を、会議録の順にすべて並べたもの
  const [mode, setMode] = useState<"topics" | "raw">("topics");
  // 質問側の文が1つも無い（今のデータ）ときは、論点ごとの表示に質問が出ないことを書き添える
  const hasQuestionText = topics.some(
    (t) => (t.question_summary ?? "").trim().length > 0
  );

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === "topics" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("topics")}
        >
          論点ごと
        </Button>
        <Button
          variant={mode === "raw" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("raw")}
        >
          全文
        </Button>
      </div>
      {mode === "topics" ? (
        <>
          {!hasQuestionText && (
            <p className="mb-4 text-xs leading-relaxed text-mirai-text-secondary">
              論点ごとに、答弁の該当部分を会議録から抜き出して載せています。質問の内容は「全文」でご覧ください。
            </p>
          )}
          <QuestionChatView topics={topics} />
        </>
      ) : (
        <RawTranscriptContent rawText={rawText} />
      )}
    </div>
  );
}
