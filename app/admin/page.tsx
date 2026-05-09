import { createClient } from "@/lib/supabase/server";
import {
  fetchAiAnalysisLog,
  fetchDataFreshness,
  fetchIngestionLog,
} from "@/lib/admin-queries";
import { DashboardHeader } from "@/components/dashboard-header";
import { IngestionLogTable } from "@/components/ingestion-log-table";
import { DataFreshnessPanel } from "@/components/data-freshness-panel";
import { ForceIngestButton } from "@/components/force-ingest-button";
import { AiAnalysisLogTable } from "@/components/ai-analysis-log-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rows, freshness, aiLog] = await Promise.all([
    fetchIngestionLog(20),
    fetchDataFreshness(),
    fetchAiAnalysisLog(50),
  ]);

  const lastSuccess = rows.find((r) => r.status === "success");
  const failedInLast20 = rows.filter((r) => r.status === "failed").length;

  return (
    <main className="min-h-screen bg-background">
      <DashboardHeader userEmail={user?.email} active="admin" />

      <div className="mx-auto max-w-7xl space-y-8 px-8 py-8">
        {/* Encabezado */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-light">
            Operación
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary">
            Estado de las fuentes de datos
          </h2>
          <p className="mt-1 text-sm text-steel">
            {lastSuccess && (
              <>Última ingesta exitosa: {formatRelative(lastSuccess.startedAt)}.</>
            )}
            {failedInLast20 > 0 && (
              <span className="text-warning">
                {" "}· {failedInLast20}{" "}
                {failedInLast20 === 1
                  ? "ejecución fallida"
                  : "ejecuciones fallidas"}{" "}
                en las últimas 20.
              </span>
            )}
          </p>
        </div>

        {/* Freshness por fuente */}
        <section aria-labelledby="freshness-heading">
          <h3 id="freshness-heading" className="sr-only">
            Datos disponibles por fuente
          </h3>
          <DataFreshnessPanel rows={freshness} />
        </section>

        {/* Acción manual */}
        <section className="border border-border-default bg-white p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
            Ingesta manual
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
            Disparar la ingesta a demanda corre las tres fuentes en
            paralelo y tarda hasta un minuto. Después de cada corrida hay
            un cooldown de 10 minutos para evitar consumo innecesario de
            cuotas.
          </p>
          <div className="mt-4">
            <ForceIngestButton />
          </div>
        </section>

        {/* Log de ingestas */}
        <section aria-labelledby="log-heading">
          <h3 id="log-heading" className="sr-only">
            Historial de ingestas
          </h3>
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
              Historial
            </p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-primary">
              Últimas 20 ejecuciones
            </h3>
          </div>
          <IngestionLogTable rows={rows} />
        </section>

        {/* Cómo se ejecuta */}
        <div className="border border-border-default bg-white p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
            Cómo corre el cron automático
          </p>
          <p className="mt-3 text-sm leading-relaxed text-steel">
            Postgres dispara la Edge Function{" "}
            <code className="bg-cream px-1.5 py-0.5 text-[12px] tabular-nums">
              ingest-reports
            </code>{" "}
            todos los lunes a las 18:00 ART. Cada fuente (Google Ads, Meta
            Ads, Google Analytics) se procesa de forma independiente: si
            una falla, las otras siguen y queda registrado el error.
          </p>
        </div>

        {/* Log de análisis generados por Claude */}
        <section aria-labelledby="ai-log-heading" className="pt-4">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-light">
              Análisis generados
            </p>
            <h3 id="ai-log-heading" className="mt-1 text-lg font-bold tracking-tight text-primary">
              Historial de Claude
            </h3>
            <p className="mt-1 text-sm text-steel">
              {aiLog.length === 0
                ? "Todavía no se generó ningún análisis."
                : `Últimos ${aiLog.length} análisis generados. Click en una fila para abrir el contenido.`}
            </p>
          </div>
          <AiAnalysisLogTable rows={aiLog} />
        </section>
      </div>
    </main>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60_000);
  const hours = Math.round(ms / 3_600_000);
  const days = Math.round(ms / 86_400_000);

  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}
