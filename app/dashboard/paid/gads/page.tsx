import { PaidView } from "../page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PaidGadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <PaidView
      searchParams={searchParams}
      forcePublisher="gads"
      eyebrow="Google Ads"
    />
  );
}
