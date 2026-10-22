/**
 * 本公開かどうかの切り替え（環境変数 SITE_PUBLIC_RELEASE）。
 *
 * - "true" のときだけ本公開：パスワードを外し、検索エンジンに載せる。
 * - それ以外（未設定を含む）はプレビュー：パスワードをかけ（basic-auth.ts）、検索エンジンに載せない。
 *
 * 全議員プレビューのあいだは未設定のままにし、本公開の日に Vercel で "true" にして Redeploy する。
 */
export function isPublicRelease(
  env: { SITE_PUBLIC_RELEASE?: string } = {
    SITE_PUBLIC_RELEASE: process.env.SITE_PUBLIC_RELEASE,
  }
): boolean {
  return env.SITE_PUBLIC_RELEASE === "true";
}
