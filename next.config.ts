import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Incluye los SKILL.md de las marketing skills en el bundle del serverless
  // function de /api/corey-haines. Sin esto, fs.readFile falla en Vercel
  // porque .claude/skills/ vive fuera de los paths que Next.js traza.
  outputFileTracingIncludes: {
    "/api/corey-haines": [".claude/skills/**/SKILL.md"],
  },
};

export default nextConfig;
