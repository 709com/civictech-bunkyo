import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { GeneralQuestion } from "../../shared/types";
import { findPublishedGeneralQuestionsBySession } from "../repositories/general-questions-repository";

export async function getGeneralQuestionsBySession(
  sessionId: string
): Promise<GeneralQuestion[]> {
  return _getCached(sessionId);
}

const _getCached = unstable_cache(
  async (sessionId: string): Promise<GeneralQuestion[]> => {
    return findPublishedGeneralQuestionsBySession(sessionId);
  },
  // 取り出す列に meeting_date を足したため、古い形のキャッシュを使わないよう v2 にする
  ["general-questions-by-session-v2"],
  {
    revalidate: 600,
    tags: [CACHE_TAGS.GENERAL_QUESTIONS],
  }
);
