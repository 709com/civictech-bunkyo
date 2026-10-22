import { isPublicRelease } from "./site-release";

/** 検索エンジンに載せないための応答ヘッダー（本公開までの間、すべての応答に付ける） */
export const NOINDEX_HEADER_NAME = "X-Robots-Tag";
export const NOINDEX_HEADER_VALUE = "noindex, nofollow, noarchive";

/** 本公開までは、応答に noindex のヘッダーを付ける */
export function applyNoindexHeader<T extends Response>(response: T): T {
  if (!isPublicRelease()) {
    response.headers.set(NOINDEX_HEADER_NAME, NOINDEX_HEADER_VALUE);
  }
  return response;
}
