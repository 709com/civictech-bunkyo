import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { SessionWithQuestions } from "../../shared/types";
import { findSessionsWithPublishedQuestions } from "../repositories/general-questions-repository";

/** 公開中の一般質問がある定例会を、新しい順で返す */
export async function getSessionsWithQuestions(): Promise<
  SessionWithQuestions[]
> {
  return _getCached();
}

const _getCached = unstable_cache(
  async (): Promise<SessionWithQuestions[]> => {
    return findSessionsWithPublishedQuestions();
  },
  ["sessions-with-general-questions"],
  {
    revalidate: 600,
    tags: [CACHE_TAGS.GENERAL_QUESTIONS, CACHE_TAGS.COUNCIL_SESSIONS],
  }
);
