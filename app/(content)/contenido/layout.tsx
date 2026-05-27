import Link from "next/link";
import { RiArrowLeftLine } from "@remixicon/react";
import { PlasmartMark } from "@/components/plasmart-mark";

// Layout propio de /contenido — NO usa el AppShell del dashboard (sidebar),
// para mantener el feature aislado. Auth ya está cubierta por el middleware.
export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-default bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <PlasmartMark size={28} />
            <div>
              <p className="eyebrow-xs text-light">Plasmart</p>
              <h1 className="text-base font-bold leading-tight text-primary">
                Motor de contenido
              </h1>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-steel transition-colors hover:text-primary"
          >
            <RiArrowLeftLine className="size-4" />
            <span className="hidden sm:inline">Volver al dashboard</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
