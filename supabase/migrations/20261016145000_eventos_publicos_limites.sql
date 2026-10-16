-- Medición, endurecimiento (revisión de Planning al PR #138; docs/18-medicion.md). No edita la migración anterior: la reemplaza por una
-- función nueva con el mismo nombre y firma (los permisos se conservan) y añade la retención.
--  1. Límite por tipo de evento y por minuto (antes, un tope global que un solo cliente podía agotar), con contadores por minuto.
--     Sin IP no hay límite por visitante: esto solo evita que un abusador ahogue a todos los demás tipos de evento.
--  2. `ruta` ya no es texto libre: lista blanca de patrones, en minúsculas; lo que no encaje se guarda como «otra».
--  3. `tienda_slug` solo se guarda si es una tienda con catálogo publicado (las mismas que tienda_publica); si no, null.
--     El contador sigue sumando aunque se pase del tope; admin_eventos_descartados muestra cuántos sobraron por minuto y evento.
--  4. purgar_eventos_publicos(p_dias): borra eventos viejos. Solo admin, a mano (sin cron todavía).

create table public.eventos_publicos_ritmo (
  minuto timestamptz not null,
  evento text not null,
  total integer not null default 0,
  primary key (minuto, evento)
);
alter table public.eventos_publicos_ritmo enable row level security;
revoke all on table public.eventos_publicos_ritmo from public, anon, authenticated;

-- El tope por minuto de cada evento, en un solo sitio: lo usan registrar_evento_publico y admin_eventos_descartados.
create function public.tope_evento_publico(p_evento text) returns integer
language sql immutable set search_path = ''
as $$ select case when p_evento = 'conoce_paso' then 600 else 120 end $$;
revoke execute on function public.tope_evento_publico(text) from public, anon, authenticated;

create or replace function public.registrar_evento_publico(
  p_evento text, p_ruta text, p_origen text default 'otro', p_paso text default null, p_tienda_slug text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_ruta text; v_origen text; v_paso text; v_slug text; v_total integer;
begin
  if p_evento is null or p_evento <> all (array[
    'inicio_visto', 'cta_iniciar_sesion', 'cta_como_funciona', 'cta_quiero_vender', 'cta_demo',
    'conoce_paso', 'conoce_final', 'conoce_cta_vender', 'conoce_cta_catalogo', 'conoce_cta_entrar', 'conoce_cta_otra_vez',
    'catalogo_visto', 'catalogo_reel_deslizapp',
    'catalogo_cta_iniciar_sesion', 'catalogo_cta_como_funciona', 'catalogo_cta_quiero_vender', 'catalogo_cta_demo'
  ]) then
    raise exception 'evento_invalido' using errcode = '22023';
  end if;

  -- Ritmo: 120 por minuto por cada evento (conoce_paso, 600: una sola visita completa manda hasta 18). El contador sigue sumando aunque
  -- se pase del tope (así se sabe cuántos se descartaron: admin_eventos_descartados); lo que se pasa no se inserta en eventos_publicos.
  insert into public.eventos_publicos_ritmo as r (minuto, evento, total)
  values (date_trunc('minute', now()), p_evento, 1)
  on conflict (minuto, evento) do update set total = r.total + 1
  returning r.total into v_total;
  if v_total > public.tope_evento_publico(p_evento) then
    return false;
  end if;

  -- Ruta: sin ?consulta ni #hash, sin barra final, en minúsculas y solo si encaja con una de las páginas públicas.
  v_ruta := regexp_replace(lower(split_part(split_part(coalesce(p_ruta, '/'), '?', 1), '#', 1)), '/+$', '');
  if v_ruta = '' then v_ruta := '/'; end if;
  v_ruta := case
    when v_ruta in ('/', '/conoce', '/privacidad', '/terminos') then v_ruta
    when v_ruta ~ '^/tienda/[a-z0-9-]{1,60}$' then v_ruta
    when v_ruta ~ '^/pedido/[^/]+$' then '/pedido/*'   -- el código de pedido no se guarda
    else 'otra'
  end;

  -- Tienda: solo si existe con catálogo publicado. Si no, el slug se descarta y la ruta de catálogo se colapsa a /tienda/*.
  v_slug := lower(btrim(coalesce(p_tienda_slug, '')));
  if v_slug !~ '^[a-z0-9-]{1,60}$'
     or not exists (select 1 from public.tiendas t where t.slug = v_slug and t.estado in ('activa', 'en_prueba') and t.catalogo_estado = 'publicado') then
    v_slug := null;
  end if;
  if v_ruta ~ '^/tienda/' and not exists (
    select 1 from public.tiendas t where t.slug = substr(v_ruta, 9) and t.estado in ('activa', 'en_prueba') and t.catalogo_estado = 'publicado'
  ) then
    v_ruta := '/tienda/*';
  end if;

  v_origen := case when p_origen in ('instagram', 'whatsapp', 'directo') then p_origen else 'otro' end;
  v_paso := case when p_paso ~ '^[a-z0-9_-]{1,40}$' then p_paso end;
  insert into public.eventos_publicos (evento, ruta, origen, paso, tienda_slug) values (p_evento, v_ruta, v_origen, v_paso, v_slug);
  return true;
end $$;

-- Eventos descartados por pasarse del tope: por minuto (hora de Santo Domingo) y evento, cuántos llegaron, el tope y cuántos sobraron
-- (llegaron - tope, solo si es positivo). Solo admin. Los contadores se conservan 30 días como máximo (lo que borra purgar_eventos_publicos).
create function public.admin_eventos_descartados(p_desde date default null, p_hasta date default null)
returns table (minuto timestamp, evento text, llegaron integer, tope integer, descartados integer)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  return query
    select (r.minuto at time zone 'America/Santo_Domingo'), r.evento, r.total, public.tope_evento_publico(r.evento), r.total - public.tope_evento_publico(r.evento)
    from public.eventos_publicos_ritmo r
    where r.total > public.tope_evento_publico(r.evento)
      and (r.minuto at time zone 'America/Santo_Domingo')::date between coalesce(p_desde, (now() at time zone 'America/Santo_Domingo')::date - 30)
        and coalesce(p_hasta, (now() at time zone 'America/Santo_Domingo')::date)
    order by r.minuto desc, r.evento;
end $$;
revoke execute on function public.admin_eventos_descartados(date, date) from public, anon;
grant execute on function public.admin_eventos_descartados(date, date) to authenticated;

-- Retención: borra los eventos de más de p_dias días (mínimo 1; por defecto, 180) y los contadores de ritmo de más de 30 días (o de p_dias, si es menor).
-- Devuelve cuántos eventos borró. Solo admin; se llama a mano.
create function public.purgar_eventos_publicos(p_dias integer default 180) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare v_borrados bigint;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if p_dias is null or p_dias < 1 then raise exception 'dias_invalidos' using errcode = '22023'; end if;
  delete from public.eventos_publicos where creado_en < now() - make_interval(days => p_dias);
  get diagnostics v_borrados = row_count;
  delete from public.eventos_publicos_ritmo where minuto < now() - make_interval(days => least(p_dias, 30));
  return v_borrados;
end $$;
revoke execute on function public.purgar_eventos_publicos(integer) from public, anon;
grant execute on function public.purgar_eventos_publicos(integer) to authenticated;
