// Cliente de Supabase con Service Role Key. Solo se usa server-side dentro de
// la Edge Function: NUNCA exponer este cliente al browser.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) throw new Error("Falta la env var SUPABASE_URL");
  if (!key) throw new Error("Falta la env var SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
