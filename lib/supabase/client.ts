import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para Client Components ("use client").
 * Vive en el browser y maneja la sesión vía cookies del navegador.
 *
 * Uso típico: handlers de eventos (login, logout) y suscripciones a
 * cambios de auth en el cliente.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}