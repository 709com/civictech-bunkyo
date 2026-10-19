import Link from "next/link";
import type { SessionWithQuestions } from "../../shared/types";
import { sortSessionsNewestFirst } from "../../shared/utils/speaking-order";

interface SessionSwitcherProps {
  sessions: SessionWithQuestions[];
  /** いま表示している定例会の slug */
  currentSlug: string;
}

/** 一般質問のある定例会の一覧（新しい順）。いま見ている定例会には印を付ける */
export function SessionSwitcher({
  sessions,
  currentSlug,
}: SessionSwitcherProps) {
  if (sessions.length <= 1) return null;

  return (
    <nav
      aria-label="定例会を選ぶ"
      className="mt-10 border-t border-border pt-6"
    >
      <h2 className="mb-3 text-base font-bold text-mirai-text">
        ほかの定例会の一般質問（新しい順）
      </h2>
      <ul className="flex flex-wrap gap-2">
        {sortSessionsNewestFirst(sessions).map((s) => {
          const isCurrent = s.slug === currentSlug;
          return (
            <li key={s.id}>
              {isCurrent ? (
                <span
                  aria-current="page"
                  className="inline-block rounded-full border border-primary bg-primary px-3 py-1 text-sm text-primary-foreground"
                >
                  {s.name}
                </span>
              ) : (
                <Link
                  href={`/sessions/${s.slug}/questions`}
                  className="inline-block rounded-full border border-border bg-card px-3 py-1 text-sm text-mirai-text hover:border-primary"
                >
                  {s.name}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
