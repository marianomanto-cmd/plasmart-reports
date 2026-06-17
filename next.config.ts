import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad aplicadas a todas las rutas.
 *
 * No agregamos un CSP estricto a propósito: Next inyecta scripts inline
 * y se cargan fonts de Google + assets de Supabase, así que un CSP mal
 * calibrado rompería la app. El resto del set es seguro y sin efectos
 * secundarios para un dashboard interno detrás de auth.
 */
const securityHeaders = [
  // Nunca interpretar un archivo con un MIME distinto al declarado.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Dashboard interno: jamás debe embeberse en un iframe (anti-clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // No filtrar la URL completa como referrer a destinos externos.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Forzar HTTPS por 2 años (Vercel ya sirve TLS).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Desactivar APIs del navegador que la app no usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // No revelar que el server corre Next.js.
  poweredByHeader: false,
  reactStrictMode: true,

  // Incluye los SKILL.md de las marketing skills en el bundle del serverless
  // function de /api/corey-haines. Sin esto, fs.readFile falla en Vercel
  // porque .claude/skills/ vive fuera de los paths que Next.js traza.
  outputFileTracingIncludes: {
    "/api/corey-haines": [".claude/skills/**/SKILL.md"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
