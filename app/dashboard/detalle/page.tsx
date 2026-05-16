import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Redirect legacy: /dashboard/detalle → /dashboard/paid.
 * La vista detalle se consolidó dentro de paid (con granularity selector).
 */
export default async function DetalleRedirect({
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
