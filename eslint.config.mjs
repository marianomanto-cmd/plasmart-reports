import next from "eslint-config-next";

/**
 * Flat config de ESLint 9.
 *
 * Next 16 removió el comando `next lint`, así que corremos ESLint directo.
 * `eslint-config-next@16` ya exporta un flat config nativo (core-web-vitals
 * + typescript + react-hooks + jsx-a11y + import), así que lo spreadeamos
 * tal cual — sin FlatCompat (que con ESLint 9 crashea por referencias
 * circulares en los plugins).
 */
const eslintConfig = [
  {
    // Sólo el código de la app. Excluimos:
    //  - build artifacts / deps / coverage
    //  - .claude/** (skills de marketing vendoreadas)
    //  - supabase/functions/** (Deno runtime, lint propio)
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      ".claude/**",
      "supabase/functions/**",
      "next-env.d.ts",
    ],
  },
  ...next,
  {
    // Componentes vendoreados de Tremor (copiados de los blocks oficiales).
    // No los reescribimos por estilo; relajamos reglas que solo aplican a
    // código propio (la interacción de tooltips usa setState en effects a
    // propósito, y los genéricos de Recharts usan `any`).
    files: ["components/tremor/**", "lib/tremor/**"],
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
