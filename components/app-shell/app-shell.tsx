import { Topbar } from "./topbar";
import { FilterToolbar } from "./filter-toolbar";

interface Props {
  userEmail: string | null | undefined;
  children: React.ReactNode;
}

/**
 * Layout principal del dashboard: topbar persistente con la marca + nav
 * horizontal + usuario, barra de filtros siempre visible debajo, y el
 * contenido full-width debajo.
 * (Control Room: sin sidebar — la navegación vive en el header.)
 */
export function AppShell({ userEmail, children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar userEmail={userEmail} />
      <FilterToolbar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
