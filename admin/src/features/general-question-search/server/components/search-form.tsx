import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SearchFilters, SearchOptions } from "../../shared/types";

type SearchFormProps = {
  filters: SearchFilters;
  options: SearchOptions;
};

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/**
 * 検索条件の入力欄。
 * 「検索」を押すと、条件を URL に付けて同じページを開き直す（JavaScript に頼らない）。
 */
export function SearchForm({ filters, options }: SearchFormProps) {
  return (
    <form
      method="get"
      action="/general-question-search"
      className="rounded-lg border bg-white p-6"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="search-q">キーワード</Label>
        <div className="flex gap-2">
          <Input
            id="search-q"
            name="q"
            type="search"
            defaultValue={filters.terms.join(" ")}
            placeholder="例）保育園　　例）防災 避難所（空白で区切ると、すべて含むものを探します）"
          />
          <Button type="submit">
            <Search aria-hidden="true" />
            検索
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          発言の本文と、章・論点の見出しから探します。
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-session">定例会</Label>
          <select
            id="search-session"
            name="session"
            defaultValue={filters.councilSessionId ?? ""}
            className={selectClassName}
          >
            <option value="">すべて</option>
            {options.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="search-member">質問者（議員）</Label>
          <select
            id="search-member"
            name="member"
            defaultValue={filters.memberId ?? ""}
            className={selectClassName}
          >
            <option value="">すべて</option>
            {options.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="search-faction">会派（発言時点）</Label>
          <select
            id="search-faction"
            name="faction"
            defaultValue={filters.factionName ?? ""}
            className={selectClassName}
          >
            <option value="">すべて</option>
            {options.factions.map((faction) => (
              <option key={faction} value={faction}>
                {faction}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="search-answerer">答弁者</Label>
          <select
            id="search-answerer"
            name="answerer"
            defaultValue={filters.answererRole ?? ""}
            className={selectClassName}
          >
            <option value="">すべて</option>
            {options.answererRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button asChild variant="ghost" size="sm">
          <Link href="/general-question-search">条件をクリア</Link>
        </Button>
      </div>
    </form>
  );
}
