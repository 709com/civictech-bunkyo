import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "./middleware";

const USER = "preview-user";
const PASSWORD = "preview-pass";

function makeRequest(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost:3002"), { headers });
}

function withAuth(headers: Record<string, string> = {}) {
  return {
    ...headers,
    authorization: `Basic ${btoa(`${USER}:${PASSWORD}`)}`,
  };
}

describe("middleware のパスワード（プレビュー中）", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_PUBLIC_RELEASE", "");
    vi.stubEnv("BASIC_AUTH_USER", USER);
    vi.stubEnv("BASIC_AUTH_PASSWORD", PASSWORD);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["ページ本体", "/", { accept: "text/html" }],
    ["一般質問のページ", "/questions/abc", { accept: "text/html" }],
    ["画面切り替えの裏側の通信（RSC）", "/questions/abc", { rsc: "1" }],
    ["_rsc 付き", "/questions/abc?_rsc=xyz", { accept: "*/*" }],
    ["サーバーアクション", "/", { "next-action": "abc" }],
    ["API", "/api/revalidate", { accept: "application/json" }],
    ["画像の変換", "/_next/image?url=%2Fimg%2Fogp.png&w=64&q=75", {}],
    ["sitemap", "/sitemap.xml", {}],
    ["PageSpeed のふり", "/", { "user-agent": "Chrome-Lighthouse" }],
    [
      "middleware 飛ばしのヘッダー",
      "/",
      { "x-middleware-subrequest": "middleware" },
    ],
    ["開発用ページ", "/dev", {}],
    ["隠した機能", "/bills", {}],
  ])("%s はパスワードなしで 401", (_label, path, headers) => {
    const response = middleware(makeRequest(path, headers));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
  });

  it("間違ったパスワードでは 401", () => {
    const response = middleware(
      makeRequest("/", { authorization: `Basic ${btoa(`${USER}:wrong`)}` })
    );
    expect(response.status).toBe(401);
  });

  it("正しいパスワードなら通す", () => {
    const response = middleware(makeRequest("/questions/abc", withAuth()));
    expect(response.status).toBe(200);
  });

  it.each([
    "/_next/static/chunks/main.js",
    "/robots.txt",
    "/img/ogp.png",
  ])("データを含まない静的ファイル %s はパスワードなしで通す", (path) => {
    const response = middleware(makeRequest(path));
    expect(response.status).toBe(200);
  });
});

describe("middleware のパスワード（設定が無いとき）", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("本番の動きでパスワードの設定が無ければ、だれも入れない", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_PUBLIC_RELEASE", "");
    vi.stubEnv("BASIC_AUTH_USER", "");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "");
    expect(middleware(makeRequest("/")).status).toBe(401);
  });

  it("本公開（SITE_PUBLIC_RELEASE=true）ならパスワードなしで通す", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_PUBLIC_RELEASE", "true");
    vi.stubEnv("BASIC_AUTH_USER", USER);
    vi.stubEnv("BASIC_AUTH_PASSWORD", PASSWORD);
    expect(middleware(makeRequest("/")).status).toBe(200);
  });
});
