import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/app-shell";

/**
 * Layout principal del dashboard.
 * Renderiza el AppShell (sidebar fija en desktop, hamburger en mobile +
 * topbar). Las pages hijas sólo renderizan su contenido — sin headers
 * ni tabs propios.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AppShell userEmail={user?.email}>{children}</AppShell>;
}
