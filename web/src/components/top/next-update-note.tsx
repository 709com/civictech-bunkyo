import { CalendarClock } from "lucide-react";
import { Container } from "@/components/layouts/container";
import { siteConfig } from "@/config/site.config";

/** 次回更新予定（設計書 9-7）。site.config.ts の nextUpdateNote が空なら何も出さない */
export function NextUpdateNote() {
  if (!siteConfig.nextUpdateNote) return null;

  return (
    <Container className="pt-4">
      <p className="flex items-center gap-2 rounded-lg border border-mirai-border bg-white px-4 py-3 text-sm text-mirai-text">
        <CalendarClock
          className="h-4 w-4 shrink-0 text-primary-accent"
          aria-hidden="true"
        />
        次回更新予定：{siteConfig.nextUpdateNote}
      </p>
    </Container>
  );
}
