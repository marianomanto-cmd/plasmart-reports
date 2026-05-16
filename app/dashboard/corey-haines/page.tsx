import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Redirect legacy: /dashboard/corey-haines → /dashboard/analysis.
 * Corey Haines vive ahora como uno de los modos del hub de análisis.
 */
export default async function CoreyRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const search = qs.toString();
  redirect(`/dashboard/analysis${search ? `?${search}` : ""}`);
}
