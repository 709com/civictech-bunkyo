"use client";

import { ExternalLink, Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site.config";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RubyToggle } from "@/lib/rubyful";
import { TextSizeToggle } from "@/lib/text-size";

const NAV_LINKS = [
  { href: "/", label: "トップページ" },
  { href: "/assembly", label: "議会" },
  { href: "/budget", label: "予算" },
  { href: "/members", label: "議員" },
  { href: "/learn", label: "学ぶ" },
  { href: "/archive", label: "過去の資料" },
  { href: "/about", label: "運営者情報" },
] as const;

export function HamburgerMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          aria-label="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52" align="end">
        <nav className="flex flex-col">
          <ul className="flex flex-col divide-y divide-mirai-border">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block px-2 py-2.5 text-sm font-medium text-mirai-text hover:text-primary-accent transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="pt-3 mt-3 border-t border-mirai-border flex flex-col gap-3">
            <RubyToggle />
            <TextSizeToggle />
          </div>
          <div className="pt-3 mt-3 border-t border-mirai-border flex flex-col">
            <a
              href={siteConfig.councilBaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-2 text-sm text-mirai-text-secondary hover:text-primary-accent transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              {siteConfig.councilName}（外部サイト）
            </a>
            {siteConfig.externalLinks.taxMap && (
              <a
                href={siteConfig.externalLinks.taxMap}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-2 text-sm text-mirai-text-secondary hover:text-primary-accent transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                税金の使い道マップ（外部サイト）
              </a>
            )}
          </div>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
