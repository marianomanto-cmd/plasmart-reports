"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Botón de "Ingresar con Google".
 * Dispara el flow OAuth contra Supabase Auth, que a su vez redirige a Google,
 * y al volver pasa por /auth/callback para intercambiar el code por una sesión.
 *
 * Le pasamos `hd: "transfil.com.ar"` como query param para que Google sugiera
 * directamente cuentas del dominio (UX). El enforcement real está en el middleware.
 */
export function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: "transfil.com.ar",
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Error en login OAuth:", error.message);
      setLoading(false);
    }
    // Si no hay error, ya estamos navegando a Google — no reseteamos loading.
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="
        group flex w-full items-center justify-center gap-3 rounded-lg
        border border-border bg-surface-2 px-6 py-4
        text-sm font-medium uppercase tracking-wider text-foreground
        transition-colors duration-200
        hover:border-brand/50 hover:bg-secondary
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background
        disabled:cursor-not-allowed disabled:opacity-50
      "
    >
      {/* Logo Google inline (SVG) */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.997 10.997 0 0 0 12 23z"
          opacity=".75"
        />
        <path
          fill="currentColor"
          d="M5.84 14.1A6.59 6.59 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A10.997 10.997 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"
          opacity=".5"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
          opacity=".25"
        />
      </svg>
      <span>{loading ? "Redirigiendo…" : "Ingresar con Google"}</span>
    </button>
  );
}