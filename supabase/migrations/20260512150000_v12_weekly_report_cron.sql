-- =====================================================================
-- v1.2 · Reporte semanal por mail · cron
--
-- pg_cron + pg_net + Supabase Vault.
--
-- Programa una llamada HTTP POST a /api/cron/weekly-report todos los
-- lunes a las 18:30 ART (21:30 UTC), 30 min después del ingest automático.
--
-- Los valores sensibles (URL del deploy + CRON_SECRET) viven en Vault.
-- Después de aplicar la migración, hay que correr estas dos sentencias
-- UNA VEZ en el SQL Editor de Supabase para setearlos:
--
--   SELECT vault.create_secret(
--     'https://plasmart-reports.vercel.app',  -- ⚠ Reemplazar por la URL real
--     'weekly_report_app_url'
--   );
--   SELECT vault.create_secret(
--     'cambiar-por-string-random-largo-32-chars',  -- ⚠ Mismo valor que CRON_SECRET en Vercel
--     'weekly_report_secret'
--   );
--
-- Para actualizar después:
--   SELECT vault.update_secret(
--     (SELECT id FROM vault.secrets WHERE name = 'weekly_report_app_url'),
--     'https://nuevo-dominio.com'
--   );
-- =====================================================================

-- ---- Extensiones (no rompen si ya están instaladas) ----
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---- Función que dispara el HTTP POST ----
-- Se ejecuta dentro del scheduler de pg_cron. Lee la URL y el secret
-- desde Vault. No retorna nada útil; lo registrado queda en cron.job_run_details.
create or replace function trigger_weekly_report()
returns void
language plpgsql
security definer
as $$
declare
  v_url    text;
  v_secret text;
  v_request_id bigint;
begin
  -- Lectura de secrets desde Vault. Si no existen, abortar con mensaje claro.
  select decrypted_secret into v_url
    from vault.decrypted_secrets
    where name = 'weekly_report_app_url'
    limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
    where name = 'weekly_report_secret'
    limit 1;

  if v_url is null or v_secret is null then
    raise warning 'weekly_report cron: faltan secrets en vault (weekly_report_app_url / weekly_report_secret). Saltando.';
    return;
  end if;

  -- POST al endpoint. pg_net es async — retorna un request_id que se puede
  -- inspeccionar en net.http_response_collect() para debugging.
  select net.http_post(
    url := v_url || '/api/cron/weekly-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type',  'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) into v_request_id;

  raise notice 'weekly_report cron: request enviado, id=%', v_request_id;
end;
$$;

comment on function trigger_weekly_report is
  'Disparador del cron semanal: hace POST a /api/cron/weekly-report con el CRON_SECRET. URL + secret en Supabase Vault.';

-- ---- Schedule: lunes 18:30 ART = 21:30 UTC ----
-- Si ya existe un job con el mismo nombre, lo eliminamos primero para que
-- la migración sea idempotente.
do $$
declare
  existing_jobid bigint;
begin
  select jobid into existing_jobid from cron.job where jobname = 'weekly_report';
  if existing_jobid is not null then
    perform cron.unschedule(existing_jobid);
  end if;
end $$;

select cron.schedule(
  'weekly_report',
  '30 21 * * 1',                -- minute hour DoM month DoW (lunes = 1)
  $$select trigger_weekly_report();$$
);
