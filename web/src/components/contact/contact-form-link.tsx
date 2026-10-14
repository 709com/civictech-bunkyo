import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site.config";

type ContactFormLinkProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * お問い合わせ・誤りの報告フォームへのリンク。
 * フォームの URL がまだ設定されていない間は、リンクにせず「準備中」と表示する。
 */
export function ContactFormLink({
  children = "お問い合わせフォーム",
  className = "underline underline-offset-2",
}: ContactFormLinkProps) {
  const url = siteConfig.externalLinks.contactForm;
  if (!url) {
    return <span>{children}（準備中）</span>;
  }
  return (
    <Link href={url} target="_blank" rel="noreferrer" className={className}>
      {children}
    </Link>
  );
}
