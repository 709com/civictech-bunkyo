import { Container } from "@/components/layouts/container";
import { CommitteesView } from "@/features/committee-minutes/server/components/committees-view";
import { getCommitteeArchives } from "@/features/committee-minutes/server/loaders/get-committee-archives";
import { siteConfig } from "@/config/site.config";

export const metadata = {
  title: `委員会で話し合われたこと | ${siteConfig.councilName}`,
};

export default async function CommitteesPage() {
  const { archives, meetings } = await getCommitteeArchives();

  return (
    <Container className="py-8">
      <CommitteesView archives={archives} meetings={meetings} />
    </Container>
  );
}
