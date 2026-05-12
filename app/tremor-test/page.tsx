// Ruta temporal de Fase 0: prueba de compatibilidad Tremor Raw + Tailwind v4.
// No vinculada desde ninguna parte del producto. Se elimina al finalizar la migración.

import { Card } from "@/components/tremor/card";

export const metadata = {
  title: "Tremor compat test",
};

export default function TremorTestPage() {
  return (
    <main className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-light">
            Fase 0 · canary
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">
            Tremor Raw + Tailwind v4
          </h1>
          <p className="mt-1 text-sm text-steel">
            Verifica que un componente Tremor Raw (Card) compila y renderiza con
            Tailwind v4 y el theming actual del proyecto.
          </p>
        </header>

        {/* Card stock, sin overrides — debe mostrar bg blanco, border gris claro, radius lg, shadow xs */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">
            Card stock de Tremor
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Si ves un card con fondo blanco, borde gris suave y esquinas
            redondeadas (no cuadradas) — Tailwind v4 está aplicando las clases
            de Tremor correctamente.
          </p>
        </Card>

        {/* Card con clases del proyecto sobreescribiendo — verifica que cx/twMerge funciona */}
        <Card className="border-primary bg-cream rounded-none p-8">
          <h2 className="text-lg font-semibold text-primary">
            Card con overrides Plasmart
          </h2>
          <p className="mt-2 text-sm text-steel">
            Mismo componente, sobreescribiendo background, borde y radius con
            las variables de tema del proyecto. Verifica que `twMerge` resuelve
            conflictos sin duplicar clases.
          </p>
        </Card>

        <section className="border border-border-default bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-light">
            Checklist manual
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-steel">
            <li>Card 1: fondo blanco, borde gris claro, esquinas redondeadas.</li>
            <li>Card 2: fondo crema (#F5F5F0), borde negro, esquinas rectas.</li>
            <li>Sin errores en consola del navegador.</li>
            <li>Sin warnings en `npm run build`.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
