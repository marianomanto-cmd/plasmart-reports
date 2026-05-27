import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * Cliente de Supabase con SERVICE ROLE para mutaciones server-side del motor
 * de contenido (insertar content_post / render_job, actualizar content_image).
 *
 * Bypassea RLS, así que SÓLO se usa en API routes que ya hicieron su propio
 * auth check (@transfil.com.ar). NUNCA se expone al cliente: la service role
 * key vive sólo en el server (ver reglas de seguridad del proyecto).
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
