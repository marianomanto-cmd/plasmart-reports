import { createServerClient } from "@supabase/ssr";
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