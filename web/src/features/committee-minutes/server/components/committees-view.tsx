import "server-only";
import { CalendarDays, ChevronRight, Landmark } from "lucide-react";
import Link from "next/link";
import type {
  CommitteeArchive,
  CommitteeMeetingSummary,
} from "../../shared/types";
import {
  COMMITTEE_TYPE_ORDER,
  getCommitteeTypeLabel,
} from "../../shared/utils/committee-type";
import { formatJapaneseDate } from "../../shared/utils/format-japanese-date";
import { pickMajorTopics } from "../../shared/utils/pick-major-topics";
import { siteConfig } from "@/config/site.config";

/** 「最近の委員会」カードに載せる主要トピックの最大件数 */
const CARD_TOPIC_LIMIT = 5;

type Props = {
  archives: CommitteeArchive[];
  meetings: CommitteeMeetingSummary[];
};

export function CommitteesView({ archives, meetings }: Props) {
  const latestMeetings = meetings.slice(0, 4);
  const archivesByType = COMMITTEE_TYPE_ORDER.map((type) => ({
    type,
    archives: archives.filter((a) => getCommitteeTypeLabel(a.type) === type),
  })).filter((g) => g.archives.length > 0);

  return (
    <div className="flex flex-col gap-10">
      <header className="rounded-2xl bg-gradient-to-br from-mirai-gradient-start to-mirai-gradient-end px-6 py-6 flex flex-col gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-accent bg-white/70 rounded-full px-3 py-1 w-fit">
          <Landmark className="w-3.5 h-3.5" />
          委員会アーカイブ
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-mirai-text leading-snug">
          委員会で話し合われたこと
        </h1>
        <p className="text-sm text-mirai-text-secondary leading-relaxed">
          {siteConfig.councilName}
          には、テーマごとにくわしく議論する「委員会」があります。
          それぞれの委員会でどんな質疑や答弁があったのかを、会議ごとに記録して残していきます。
        </p>
      </header>

      {meetings.length === 0 ? (
        <p className="text-sm text-mirai-text-muted">
          委員会の記録は準備中です。
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-mirai-text">最近の委員会</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {latestMeetings.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/committees/${m.committeeSlug}/${m.sourceDocumentId}`}
                    className="flex h-full flex-col rounded-2xl border border-mirai-border bg-white p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-mirai-text-muted">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {formatJapaneseDate(m.meetingDate)}
                      <span className="text-xs text-primary-accent bg-mirai-gradient-end rounded-full px-2 py-0.5 font-medium">
                        {getCommitteeTypeLabel(m.committeeType)}
                      </span>
                    </div>
                    <div className="mt-2 font-bold text-mirai-text">
                      {m.committeeName}
                    </div>
                    {(() => {
                      const majorTopics = pickMajorTopics(
                        m.topics,
                        CARD_TOPIC_LIMIT
                      );
                      return majorTopics.length > 0 ? (
                        <ul className="mt-2 flex flex-col gap-1">
                          {majorTopics.map((t) => (
                            <li
                              key={t.id}
                              className="flex items-start gap-1.5 text-sm text-mirai-text-secondary leading-relaxed"
                            >
                              <span
                                aria-hidden
                                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary"
                              />
                              <span className="line-clamp-1">{t.title}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-mirai-text-secondary leading-relaxed line-clamp-2">
                          {m.summary ??
                            "委員から出された質疑・意見と、市の答弁を記録しています。"}
                        </p>
                      );
                    })()}
                    <span className="mt-auto pt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-accent">
                      くわしく見る
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {archivesByType.map((group) => (
            <section key={group.type} className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-mirai-text">
                {group.type}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {group.archives.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/committees/${a.slug}`}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-mirai-border bg-white p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200"
                    >
                      <div>
                        <div className="font-bold text-mirai-text">
                          {a.name}
                        </div>
                        <div className="mt-1 text-xs text-mirai-text-muted">
                          今年{a.meetingCount}回開催・最新{" "}
                          {formatJapaneseDate(a.latestMeetingDate)}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0 text-primary-accent" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
