import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierra la sesión del usuario y redirige a /login.
 * Se invoca con POST desde el formulario de logout en el header.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, {
    // 303 fuerza al browser a hacer GET en el redirect (lo correcto post-form)
    status: 303,
  });
}