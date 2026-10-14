import { siteConfig } from "@/config/site.config";

export type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type FooterPolicyLink = {
  label: string;
  href: string;
  external?: boolean;
};

export const primaryLinks: FooterLink[] = [
  {
    label: "TOP",
    href: "/",
  },
  ...(siteConfig.externalLinks.aboutNote
    ? [
        {
          label: `${siteConfig.siteName}とは`,
          href: siteConfig.externalLinks.aboutNote,
          external: true,
        },
      ]
    : []),
];

export const policyLinks: FooterPolicyLink[] = [
  {
    label: "運営者情報",
    href: "/about",
  },
  {
    label: "よくあるご質問",
    href: "/faq",
  },
  {
    label: "利用規約",
    href: "/terms",
  },
  {
    label: "プライバシーポリシー",
    href: "/privacy",
  },
  {
    label: "ソースコード（GitHub）",
    href: siteConfig.software.sourceCodeUrl,
    external: true,
  },
];
