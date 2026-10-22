import type { NextRequest } from "next/server";
import { constantTimeStringEqual } from "./security/constant-time-equal";
import { isPublicRelease } from "./site-release";

export interface BasicAuthConfig {
  username: string;
  password: string;
}

/** 環境変数のうち、パスワード（Basic認証）の判定に使うもの */
export interface BasicAuthEnv {
  SITE_PUBLIC_RELEASE?: string;
  BASIC_AUTH_USER?: string;
  BASIC_AUTH_PASSWORD?: string;
  NODE_ENV?: string;
}

/**
 * パスワードをかけるかどうか。
 * - required: false … パスワードなしで見られる
 * - required: true, config あり … その組で入れる
 * - required: true, config なし … だれも入れない（閉じる側に倒す）
 */
export type BasicAuthPolicy =
  | { required: false }
  | { required: true; config: BasicAuthConfig | null };

/**
 * 環境変数を1つずつ名前で読む。
 * （ミドルウェアは Edge で動くため、process.env をまるごと渡さず、名前を書いて読む）
 */
export function readBasicAuthEnv(): BasicAuthEnv {
  return {
    SITE_PUBLIC_RELEASE: process.env.SITE_PUBLIC_RELEASE,
    BASIC_AUTH_USER: process.env.BASIC_AUTH_USER,
    BASIC_AUTH_PASSWORD: process.env.BASIC_AUTH_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  };
}

export function getBasicAuthConfig(
  env: BasicAuthEnv = readBasicAuthEnv()
): BasicAuthConfig | null {
  const username = env.BASIC_AUTH_USER;
  const password = env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

/**
 * パスワードをかけるかどうかを決める。
 *
 * - SITE_PUBLIC_RELEASE=true（本公開）… かけない
 * - それ以外（プレビュー）で、BASIC_AUTH_USER と BASIC_AUTH_PASSWORD がある … かける
 * - それ以外で、開発中（pnpm dev。NODE_ENV=development）… かけない
 * - それ以外（本番の動き。Vercel を含む）… だれも入れない
 *   （パスワードの設定を忘れたまま公開されても、中身が漏れないようにするため）
 */
export function getBasicAuthPolicy(
  env: BasicAuthEnv = readBasicAuthEnv()
): BasicAuthPolicy {
  if (isPublicRelease(env)) {
    return { required: false };
  }

  const config = getBasicAuthConfig(env);
  if (config) {
    return { required: true, config };
  }

  if (env.NODE_ENV === "development") {
    return { required: false };
  }

  return { required: true, config: null };
}

/**
 * パスワードなしで返してよい道（許可リスト）。
 * データ（本文・議員名など）を含まない静的ファイルだけを並べる。
 * ここに無いものは、すべてパスワードの内側に置く（迷うものはかける側に倒す）。
 */
const AUTH_EXEMPT_PATH_PREFIXES = [
  "/_next/static/", // ビルドで作られた JS・CSS・フォント
  "/icons/", // public/icons（アイコン）
  "/illustrations/", // public/illustrations（挿絵）
  "/images/", // public/images
  "/img/", // public/img（OGP画像など）
] as const;

const AUTH_EXEMPT_PATHS = new Set<string>([
  "/robots.txt", // 検索エンジン向けの案内（データを含まない）
  "/favicon.ico",
  "/manifest.json", // PWA の設定（サイト名とアイコンだけ）
]);

/**
 * 道のすり替え（"..", "%2e", "%2f", "%5c", "\"）を含むものは、許可リストに当てはめない。
 */
const SUSPICIOUS_PATH_PATTERN = /\.\.|%2e|%2f|%5c|\\/i;

/** そのパスが、パスワードなしで返してよい静的ファイルか */
export function isAuthExemptPath(pathname: string): boolean {
  if (SUSPICIOUS_PATH_PATTERN.test(pathname)) {
    return false;
  }
  if (AUTH_EXEMPT_PATHS.has(pathname)) {
    return true;
  }
  return AUTH_EXEMPT_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
}

export function parseBasicAuth(
  authHeader: string
): { username: string; password: string | undefined } | null {
  try {
    const authValue = authHeader.split(" ")[1];
    if (!authValue) return null;

    // パスワードに「:」が入っていてもよいように、最初の「:」でだけ分ける
    const decoded = atob(authValue);
    const separator = decoded.indexOf(":");
    if (separator < 0) {
      return { username: decoded, password: undefined };
    }
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function validateBasicAuthHeader(
  header: string | null,
  config: BasicAuthConfig
): boolean {
  if (!header?.startsWith("Basic ")) {
    return false;
  }

  const credentials = parseBasicAuth(header);
  if (!credentials) {
    return false;
  }

  // 時間が一定になる比べ方で、ユーザー名とパスワードの両方を必ず最後まで比べる
  // （片方が違っても途中で止めない）。
  // 注意：atob は1バイトを1文字にするので、英数字以外（日本語など）のパスワードは
  // 設定と一致することがない（だれも入れない＝閉じる側）。パスワードは英数字にする。
  const usernameMatches = constantTimeStringEqual(
    credentials.username,
    config.username
  );
  const passwordMatches = constantTimeStringEqual(
    credentials.password ?? "",
    config.password
  );

  return (
    usernameMatches && passwordMatches && credentials.password !== undefined
  );
}

export function validateBasicAuth(
  request: NextRequest,
  config: BasicAuthConfig
): boolean {
  const authHeader = request.headers.get("authorization");
  return validateBasicAuthHeader(authHeader, config);
}

export function createUnauthorizedResponse(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="Secure Area", charset="UTF-8"`,
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
