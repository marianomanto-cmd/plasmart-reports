import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Config de Vitest para los tests de la capa de lógica pura
 * (lib/dates, lib/filters, lib/format, lib/insights, lib/ai/hash).
 *
 * Entorno `node`: estos módulos no tocan el DOM ni React. Los tests
 * viven en tests/** para no mezclarse con el código de producción ni
 * entrar al bundle de Next.
 *
 * El alias `@/` replica el de tsconfig.json (`@/* → ./*`).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.d.ts", "lib/supabase/**", "lib/tremor/**"],
    },
  },
});
