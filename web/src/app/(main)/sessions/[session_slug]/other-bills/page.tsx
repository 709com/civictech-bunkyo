import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/layouts/container";
import { getSessionProceduralBills } from "@/features/bills/server/loaders/get-session-procedural-bills";
import {
  getCardStatusLabel,
  getStatusVariant,
} from "@/features/bills/shared/utils/bill-status";
import { getCouncilSessionBySlug } from "@/features/council-sessions/server/loaders/get-council-session-by-slug";
import { formatDateJST } from "@/lib/utils/date";
import { siteConfig } from "@/config/site.config";

interface OtherBillsRouteProps {
  params: Promise<{
    session_slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: OtherBillsRouteProps): Promise<Metadata> {
  const { session_slug } = await params;
  const session = await getCouncilSessionBySlug(session_slug);

  if (!session) {
    return { title: "会期が見つかりません" };
  }

  return {
    title: `${session.name} その他の議案`,
    description: `${session.name}に上程された、指定管理者の指定・契約・購入等の事務手続き議案の一覧です。`,
  };
}

export default async function OtherBillsRoute({
  params,
}: OtherBillsRouteProps) {
  const { session_slug } = await params;
  const session = await getCouncilSessionBySlug(session_slug);

  if (!session) {
    notFound();
  }

  const bills = await getSessionProceduralBills(session.id);

  return (
    <Container className="py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Link
            href={`/sessions/${session_slug}/bills`}
            className="text-sm text-mirai-text-muted hover:text-primary-accent"
          >
            ← {session.name}の議案一覧に戻る
          </Link>
          <h1 className="text-2xl font-bold text-mirai-text">その他の議案</h1>
          <p className="mt-1 text-sm text-mirai-text-secondary">
            指定管理者の指定・工事請負契約・物品購入など、事務手続き的な議案です。わかりやすい解説はありませんが、議案名・議決結果を一覧でご確認いただけます。
          </p>
        </div>

        {bills.length === 0 ? (
          <p className="py-12 text-center text-sm text-mirai-text-muted">
            この定例会にその他の議案はありません。
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-mirai-border rounded-2xl border border-mirai-border bg-white">
            {bills.map((bill) => (
              <li
                key={bill.id}
                className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-mirai-text-muted">
                    {bill.bill_number}
                  </span>
                  <span className="font-medium text-mirai-text">
                    {bill.name}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-mirai-text-muted">
                  {bill.published_at && (
                    <time>{formatDateJST(bill.published_at)}</time>
                  )}
                  <Badge variant={getStatusVariant(bill.status)}>
                    {bill.status_note ?? getCardStatusLabel(bill.status)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}

        {session.council_url && (
          <a
            href={session.council_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary-accent"
          >
            {session.name}のすべての議案を{siteConfig.councilName}サイトで見る
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </Container>
  );
}
