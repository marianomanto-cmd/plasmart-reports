import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para uso server-side: Server Components,
 * Server Actions y Route Handlers.
 *
 * Lee/escribe cookies vía la API `cookies()` de Next. Los Server
 * Components no pueden setear cookies, por eso el `try/catch` silencioso
 * en el setter: si estamos dentro de un Server Component, fallaría;
 * el middleware ya se encarga de refrescar la sesión, así que no pasa nada.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components no pueden setear cookies.
            // El middleware se encarga de refrescar la sesión, así que
            // este catch silencioso es seguro.
          }
        },
      },
    },
  );
}

/**
 * Cliente Supabase con service role key. Bypasea RLS — usar solo en
 * contextos sin usuario autenticado (jobs cron, edge functions internas).
 * NUNCA exponer al cliente.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "createServiceRoleClient: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}