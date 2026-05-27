import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Auth guard reutilizable para las API routes del motor de contenido.
 * El middleware ya hace el guard de dominio, pero re-validamos por si
 * llamaran a la API desde afuera. Devuelve el user o null (→ 401).
 */
export async function requireTransfilUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email?.endsWith("@transfil.com.ar")) return null;
  return user;
}
