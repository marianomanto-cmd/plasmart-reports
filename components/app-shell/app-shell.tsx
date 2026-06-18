import { Topbar } from "./topbar";
import { RailNav } from "./rail-nav";
import { BottomNav } from "./bottom-nav";

interface Props {
  userEmail: string | null | undefined;
  children: React.ReactNode;
}

/**
 * Layout principal (Reactor Neon): rail vidriado a la izquierda en
 * desktop, bottom-nav vidriada en mobile, y una columna con topbar +
 * barra de filtros + contenido. El fondo aurora lo pone el root layout.
 */
export function AppShell({ userEmail, children }: Props) {
  return (
    <div className="flex min-h-dvh gap-4 p-3 sm:p-4 md:p-5">
      <RailNav />

      <div className="flex min-w-0 max-w-[1480px] flex-1 flex-col gap-3 pb-24 md:pb-2">
        <Topbar userEmail={userEmail} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
