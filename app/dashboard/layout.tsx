import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardTabs } from "@/components/layout/dashboard-tabs";

/**
 * Layout compartido entre las tres pestañas del dashboard.
 * Renderiza header global + sub-nav de pestañas. Cada page hijo
 * solo renderiza su contenido específico.
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

  return (
    <>
      <DashboardHeader userEmail={user?.email} active="dashboard" />
      <DashboardTabs />
      {children}
    </>
  );
}
