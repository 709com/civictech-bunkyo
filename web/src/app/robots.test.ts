import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { webUrl: "https://example.org" } }));

import robots from "./robots";

describe("robots.txt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("本公開までは、すべて拒否し、sitemap も示さない", () => {
    vi.stubEnv("SITE_PUBLIC_RELEASE", "");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("本公開（SITE_PUBLIC_RELEASE=true）では許可し、sitemap を示す", () => {
    vi.stubEnv("SITE_PUBLIC_RELEASE", "true");
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://example.org/sitemap.xml",
    });
  });
});
