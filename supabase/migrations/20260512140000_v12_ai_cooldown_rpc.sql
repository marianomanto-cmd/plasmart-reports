-- =====================================================================
-- v1.2 · Cooldown server-side para análisis de Claude
--
-- RPC que devuelve la última llamada exitosa de un usuario a un
-- analizador específico dentro de una ventana de tiempo. Si hay
-- resultado, la API route rechaza la nueva petición con 429.
--
-- p_analyzer es 'analyze' (resumen) o 'corey' (corey-haines). El
-- mapeo al filtro sobre model_used queda encapsulado acá.
-- =====================================================================

create or replace function dashboard_last_ai_call(
  p_user_email     text,
  p_analyzer       text,
  p_within_minutes int default 60
)
returns table (
  generated_at  timestamptz,
  minutes_ago   numeric
)
language sql
stable
security invoker
as $$
  select
    generated_at,
    extract(epoch from (now() - generated_at)) / 60.0 as minutes_ago
  from ai_analysis_log
  where user_email = p_user_email
    and generated_at > now() - (p_within_minutes || ' minutes')::interval
    and case p_analyzer
          when 'corey'   then model_used like '%(corey)%'
          when 'analyze' then model_used not like '%(corey)%'
          else false
        end
  order by generated_at desc
  limit 1;
$$;

comment on function dashboard_last_ai_call is
  'Última llamada de un usuario a un analizador IA (analyze | corey) dentro de los últimos N minutos. Base del cooldown server-side.';
