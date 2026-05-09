-- =====================================================================
-- v1.1 · Log permanente de análisis generados por Claude.
-- A diferencia de ai_analysis_cache (que dedupea por hash de filtros +
-- data_max_date), esta tabla guarda una fila por cada llamada exitosa
-- al modelo. Los cache hits NO se loguean acá.
-- =====================================================================

create table if not exists ai_analysis_log (
  id                uuid primary key default gen_random_uuid(),
  generated_at      timestamptz not null default now(),
  user_email        text not null,
  period_from       date not null,
  period_to         date not null,
  compare_mode      text not null,
  publisher         text,
  campaign_type     text,
  campaign_id       uuid,
  data_max_date     date,
  model_used        text not null,
  prompt_tokens     int,
  completion_tokens int,
  duration_ms       int,
  content           text not null
);

create index if not exists idx_ai_analysis_log_generated_at
  on ai_analysis_log (generated_at desc);

alter table ai_analysis_log enable row level security;

drop policy if exists "Authenticated transfil users can read ai log" on ai_analysis_log;
create policy "Authenticated transfil users can read ai log"
  on ai_analysis_log for select
  to authenticated
  using (auth.email() like '%@transfil.com.ar');

drop policy if exists "Authenticated transfil users can write ai log" on ai_analysis_log;
create policy "Authenticated transfil users can write ai log"
  on ai_analysis_log for insert
  to authenticated
  with check (auth.email() like '%@transfil.com.ar');

comment on table ai_analysis_log is
  'Log permanente de análisis generados por Claude. Una fila por cada llamada exitosa al modelo (cache hits no se loguean).';
