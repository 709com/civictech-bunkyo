import { type NextRequest, NextResponse } from "next/server";
import { siteConfig } from "./config/site.config";
import { isOtherSectionPath } from "./lib/other-sections";
import {
  DIFFICULTY_COOKIE_NAME,
  DIFFICULTY_COOKIE_OPTIONS,
  type DifficultyLevelEnum,
  VALID_DIFFICULTY_LEVELS,
} from "./features/bill-difficulty/shared/types";
import {
  createUnauthorizedResponse,
  getBasicAuthPolicy,
  isAuthExemptPath,
  validateBasicAuth,
} from "./lib/basic-auth";

export function middleware(request: NextRequest) {
  // パスワード（Basic認証）は、ほかのどの処理よりも先に確かめる。
  // ページ本体だけでなく、画面切り替えの裏側の通信（RSC）、サーバーアクション、
  // /api、画像の変換（/_next/image）、sitemap など、すべての読み込みが対象。
  // 例外は、データを含まない静的ファイル（isAuthExemptPath の許可リスト）だけ。
  const denied = _denyIfUnauthorized(request);
  if (denied) {
    return denied;
  }

  // /dev routes: 本番では404、開発では開く
  if (request.nextUrl.pathname.startsWith("/dev")) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
    return NextResponse.next();
  }

  // 一般質問以外の機能を隠しているあいだは、そのページを存在しないページと同じ扱いにする
  // （not-found.tsx により、トップページへ移動する）
  if (
    !siteConfig.features.showOtherSections &&
    isOtherSectionPath(request.nextUrl.pathname)
  ) {
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  return _handleDifficultyCookie(request);
}

/**
 * パスワードが要るのに正しく送られていなければ、401 を返す。
 * 通してよいときは null を返す。
 */
function _denyIfUnauthorized(request: NextRequest): Response | null {
  const policy = getBasicAuthPolicy();
  if (!policy.required) {
    return null;
  }

  if (isAuthExemptPath(request.nextUrl.pathname)) {
    return null;
  }

  if (policy.config && validateBasicAuth(request, policy.config)) {
    return null;
  }

  return createUnauthorizedResponse();
}

/**
 * 有効な難易度レベルかチェック
 */
export function isValidDifficultyLevel(
  value: string | null
): value is DifficultyLevelEnum {
  if (!value) return false;
  return VALID_DIFFICULTY_LEVELS.includes(value as DifficultyLevelEnum);
}

/**
 * URLパラメータからdifficultyを取得し、Cookieにセット
 */
function _handleDifficultyCookie(request: NextRequest): NextResponse {
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get("difficulty");

  const response = NextResponse.next();

  // 有効なdifficulty値の場合、Cookieにセット
  if (isValidDifficultyLevel(difficulty)) {
    response.cookies.set(
      DIFFICULTY_COOKIE_NAME,
      difficulty,
      DIFFICULTY_COOKIE_OPTIONS
    );
  }

  return response;
}
