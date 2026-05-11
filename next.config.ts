import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Incluye los SKILL.md de las marketing skills en el bundle del serverless
  // function de /api/corey-haines. Sin esto, fs.readFile falla en Vercel
  // porque .claude/skills/ vive fuera de los paths que Next.js traza.
  outputFileTracingIncludes: {
    "/api/corey-haines": [".claude/skills/**/SKILL.md"],
  },
  // @react-pdf/renderer trae binarios y módulos node que Next.js no sabe
  // bundlear correctamente. Lo marcamos como external para que el runtime
  // serverless lo cargue desde node_modules en lugar de intentar trazarlo.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
