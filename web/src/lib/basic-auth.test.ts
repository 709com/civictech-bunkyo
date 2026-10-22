import { describe, expect, it } from "vitest";
import {
  type BasicAuthConfig,
  getBasicAuthPolicy,
  isAuthExemptPath,
  parseBasicAuth,
  validateBasicAuthHeader,
} from "./basic-auth";

describe("parseBasicAuth", () => {
  it("parses a valid Basic auth header", () => {
    const result = parseBasicAuth("Basic YWRtaW46cGFzc3dvcmQxMjM=");
    expect(result).toEqual({ username: "admin", password: "password123" });
  });

  it("keeps colons in the password (splits only at the first colon)", () => {
    const result = parseBasicAuth("Basic dXNlcjpwYXNzOndvcmQ=");
    expect(result).toEqual({ username: "user", password: "pass:word" });
  });

  it("returns null when auth value after 'Basic ' is missing", () => {
    expect(parseBasicAuth("Basic ")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseBasicAuth("")).toBeNull();
  });

  it("returns a result for non-Basic scheme with decodable value", () => {
    const result = parseBasicAuth("Bearer token123");
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("username");
  });

  it("returns null when header has only one segment with no space", () => {
    expect(parseBasicAuth("NoSpaceHere")).toBeNull();
  });

  it("returns undefined password when decoded value has no colon", () => {
    const result = parseBasicAuth("Basic bm9jb2xvbg==");
    expect(result).toEqual({ username: "nocolon", password: undefined });
  });

  it("returns null for invalid base64 input", () => {
    expect(parseBasicAuth("Basic !!!invalid-base64!!!")).toBeNull();
  });
});

describe("validateBasicAuthHeader", () => {
  const config: BasicAuthConfig = {
    username: "admin",
    password: "secret",
  };

  it("should return true for valid credentials", () => {
    const encoded = btoa("admin:secret");
    expect(validateBasicAuthHeader(`Basic ${encoded}`, config)).toBe(true);
  });

  it("should return false for wrong username", () => {
    const encoded = btoa("wrong:secret");
    expect(validateBasicAuthHeader(`Basic ${encoded}`, config)).toBe(false);
  });

  it("should return false for wrong password", () => {
    const encoded = btoa("admin:wrong");
    expect(validateBasicAuthHeader(`Basic ${encoded}`, config)).toBe(false);
  });

  it("should return false when extra text follows the password", () => {
    const encoded = btoa("admin:secret:extra");
    expect(validateBasicAuthHeader(`Basic ${encoded}`, config)).toBe(false);
  });

  it("should return false for null header", () => {
    expect(validateBasicAuthHeader(null, config)).toBe(false);
  });

  it("should return false for non-Basic scheme", () => {
    expect(validateBasicAuthHeader("Bearer token123", config)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(validateBasicAuthHeader("", config)).toBe(false);
  });

  it("パスワードの前半だけ・後ろに足したものでは入れない", () => {
    expect(
      validateBasicAuthHeader(`Basic ${btoa("admin:secre")}`, config)
    ).toBe(false);
    expect(
      validateBasicAuthHeader(`Basic ${btoa("admin:secrets")}`, config)
    ).toBe(false);
    expect(validateBasicAuthHeader(`Basic ${btoa("admin:")}`, config)).toBe(
      false
    );
  });

  it("「:」が無い（パスワードが無い）ときは、設定のパスワードが空でも入れない", () => {
    const emptyPasswordConfig: BasicAuthConfig = {
      username: "admin",
      password: "",
    };
    expect(
      validateBasicAuthHeader(`Basic ${btoa("admin")}`, emptyPasswordConfig)
    ).toBe(false);
  });

  it("日本語など英数字以外のパスワードは、正しく打っても一致しない（閉じる側）", () => {
    // ブラウザは UTF-8 で送る。atob は1バイトを1文字にするので、設定の文字列と一致しない。
    const utf8Base64 = (value: string) =>
      btoa(String.fromCharCode(...new TextEncoder().encode(value)));
    const japaneseConfig: BasicAuthConfig = {
      username: "bunkyo",
      password: "ぶんきょう",
    };
    expect(
      validateBasicAuthHeader(
        `Basic ${utf8Base64("bunkyo:ぶんきょう")}`,
        japaneseConfig
      )
    ).toBe(false);
  });
});

describe("getBasicAuthPolicy", () => {
  const credentials = { BASIC_AUTH_USER: "u", BASIC_AUTH_PASSWORD: "p" };

  it("本公開（SITE_PUBLIC_RELEASE=true）ならパスワードをかけない", () => {
    expect(
      getBasicAuthPolicy({
        ...credentials,
        SITE_PUBLIC_RELEASE: "true",
        NODE_ENV: "production",
      })
    ).toEqual({ required: false });
  });

  it("プレビューでユーザー名とパスワードがあれば、その組でかける", () => {
    expect(
      getBasicAuthPolicy({ ...credentials, NODE_ENV: "production" })
    ).toEqual({ required: true, config: { username: "u", password: "p" } });
  });

  it("開発中でもユーザー名とパスワードがあればかける", () => {
    expect(
      getBasicAuthPolicy({ ...credentials, NODE_ENV: "development" })
    ).toEqual({ required: true, config: { username: "u", password: "p" } });
  });

  it("本番の動きでパスワードの設定が無ければ、だれも入れない", () => {
    expect(getBasicAuthPolicy({ NODE_ENV: "production" })).toEqual({
      required: true,
      config: null,
    });
  });

  it("NODE_ENV が無いときも閉じる側に倒す", () => {
    expect(getBasicAuthPolicy({})).toEqual({ required: true, config: null });
  });

  it("片方だけの設定は、設定が無いのと同じ（本番なら閉じる）", () => {
    expect(
      getBasicAuthPolicy({ BASIC_AUTH_USER: "u", NODE_ENV: "production" })
    ).toEqual({ required: true, config: null });
  });

  it("開発中でパスワードの設定が無ければかけない", () => {
    expect(getBasicAuthPolicy({ NODE_ENV: "development" })).toEqual({
      required: false,
    });
  });

  it("SITE_PUBLIC_RELEASE は true 以外の値では本公開にならない", () => {
    for (const value of ["1", "TRUE", "yes", ""]) {
      expect(
        getBasicAuthPolicy({
          SITE_PUBLIC_RELEASE: value,
          NODE_ENV: "production",
        })
      ).toEqual({ required: true, config: null });
    }
  });
});

describe("isAuthExemptPath", () => {
  it.each([
    "/_next/static/chunks/main.js",
    "/_next/static/chunks/app/(main)/questions/%5Bid%5D/page-abc.js",
    "/_next/static/media/font.woff2",
    "/icons/pwa/icon_bunkyo_192.png",
    "/img/ogp.png",
    "/images/readingbook_woman_green.png",
    "/illustrations/interview-complete.svg",
    "/robots.txt",
    "/favicon.ico",
    "/manifest.json",
  ])("データを含まない静的ファイル %s は通す", (path) => {
    expect(isAuthExemptPath(path)).toBe(true);
  });

  it.each([
    "/",
    "/questions",
    "/questions/abc",
    "/sessions/r8-1/questions",
    "/about",
    "/api/revalidate",
    "/api/chat",
    "/sitemap.xml",
    "/_next/image",
    "/_next/data/build/index.json",
    "/_next/static",
    "/img",
    "/robots.txt/x",
    "/manifest.json.bak",
    "/_next/static/../questions",
    "/_next/static/%2e%2e/questions",
    "/img/..%2Fquestions",
    "/icons/%5c..%5cquestions",
  ])("それ以外の %s はパスワードの内側", (path) => {
    expect(isAuthExemptPath(path)).toBe(false);
  });
});
