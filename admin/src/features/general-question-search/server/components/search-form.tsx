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
          本会議は、発言の本文と章・論点の見出しから探します。委員会は、発言の本文から探します（半角・全角の英数字はどちらでも当たります）。
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-scope">探す範囲</Label>
          <select
            id="search-scope"
            name="scope"
            defaultValue={filters.scope}
            className={selectClassName}
          >
            <option value="plenary">本会議の一般質問</option>
            <option value="committee">委員会の会議録（全文）</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="search-body">委員会名（委員会のとき）</Label>
          <select
            id="search-body"
            name="body"
            defaultValue={filters.meetingBodyId ?? ""}
            className={selectClassName}
          >
            <option value="">すべての委員会</option>
            {options.bodies.map((body) => (
              <option key={body.id} value={body.id}>
                {body.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 pb-2 lg:col-span-2">
          <input
            id="search-gq"
            name="gq"
            type="checkbox"
            value="1"
            defaultChecked={filters.gqOnly}
            className="size-4"
          />
          <Label htmlFor="search-gq">
            委員会の一般質問の部分だけを探す（委員会のとき）
          </Label>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="search-session">定例会（本会議のとき）</Label>
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
          <Label htmlFor="search-member">
            議員（本会議は質問者・委員会は発言者）
          </Label>
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
          <Label htmlFor="search-faction">会派（本会議のとき・発言時点）</Label>
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
          <Label htmlFor="search-answerer">答弁者（本会議のとき）</Label>
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
