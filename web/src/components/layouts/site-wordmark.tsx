import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/utils";

type SiteWordmarkProps = {
  className?: string;
};

/**
 * サイト名の文字だけのロゴ（仮）。
 * 正式なロゴが決まるまで、画像ではなく文字で表示する。
 */
export function SiteWordmark({ className }: SiteWordmarkProps) {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-bold tracking-wide text-primary-accent",
        className
      )}
    >
      {siteConfig.siteName}
    </span>
  );
}
