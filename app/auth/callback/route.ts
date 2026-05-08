import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback de OAuth.
 *
 * Flujo:
 *  1. Usuario clickea "Login con Google" → redirige a accounts.google.com
 *  2. Google autentica y redirige a https://<supabase>/auth/v1/callback con un code
 *  3. Supabase Auth procesa el code y redirige acá con su propio code en la query
 *  4. Acá intercambiamos el code por una sesión y mandamos al usuario al destino final
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Si la app pasó un `next` específico (ej: querían volver a /dashboard/campaign/123),
  // lo respetamos. Si no, default al dashboard.
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Soporte para entornos con load balancer / hosting que setean
      // x-forwarded-host distinto al origin del request.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Si llegamos acá, hubo un problema con el code o el intercambio falló.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}