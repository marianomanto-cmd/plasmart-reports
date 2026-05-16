import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Redirect legacy: /dashboard/comparativa → /dashboard/paid.
 * La comparativa GAds vs Meta vive ahora como card dentro de paid.
 * GA4 se separó a /dashboard/traffic.
 */
export default async function ComparativaRedirect({
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
  redirect(`/dashboard/paid${search ? `?${search}` : ""}`);
}
