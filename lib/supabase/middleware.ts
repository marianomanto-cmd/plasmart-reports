import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Helper para usar dentro del middleware de Next.js.
 * Refresca la sesión de Supabase en cada request y propaga las cookies
 * actualizadas tanto al request siguiente como a la response final.
 *
 * También implementa el guard de autenticación:
 * - Si la ruta NO es pública y el usuario no está logueado → redirige a /login.
 * - Si está logueado pero su email no es @transfil.com.ar → cierra sesión y rebota a /login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() entre createServerClient y la lógica de redirect.
  // No usar getSession() acá: lee directo de la cookie sin validar contra
  // Supabase, lo que abre la puerta a sesiones falseadas.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rutas públicas: login y la callback de OAuth.
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback");

  // No autenticado y la ruta no es pública → /login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Autenticado pero el email no es del dominio permitido → cerrar sesión y rebote
  if (user && user.email && !user.email.endsWith("@transfil.com.ar")) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "domain_not_allowed");
    return NextResponse.redirect(url);
  }

  // Autenticado y en /login → mandalo al dashboard
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}