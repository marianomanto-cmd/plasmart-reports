import { PaidView } from "../page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PaidMetaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <PaidView
      searchParams={searchParams}
      forcePublisher="meta"
      eyebrow="Meta Ads"
    />
  );
}
