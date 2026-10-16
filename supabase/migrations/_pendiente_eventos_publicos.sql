-- Medición de la página principal, «Cómo funciona» y los catálogos (docs/prompts/medicion-landing.md, docs/18-medicion.md).
-- Eventos propios y anónimos: sin cookies, sin IP, sin user_id ni identificador del visitante. Nadie lee ni escribe la tabla
-- desde el cliente; solo se inserta con registrar_evento_publico y solo el admin la lee, agregada, con admin_eventos_publicos.

create table public.eventos_publicos (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  evento text not null,
  ruta text not null,
  origen text not null check (origen in ('instagram', 'whatsapp', 'directo', 'otro')),
  paso text,
  tienda_slug text
);
create index eventos_publicos_creado_en_idx on public.eventos_publicos (creado_en);

alter table public.eventos_publicos enable row level security;
-- Sin políticas: RLS niega todo a anon y authenticated. Además, sin permisos de tabla.
revoke all on table public.eventos_publicos from public, anon, authenticated;

-- Registra un evento. Devuelve true si lo guardó. Lista cerrada: un evento que no está en ella se rechaza (22023).
-- Los textos se limpian: la ruta pierde ?consulta y #hash, no lleva códigos de pedido y se recorta a 120; `paso` y
-- `tienda_slug` que no tengan la forma esperada (o pasen de 40 / 60) se descartan; un origen raro pasa a «otro».
-- Ritmo: como máximo 600 eventos por minuto en total (sin IP no hay límite por visitante); pasado eso, se descarta en silencio.
create function public.registrar_evento_publico(
  p_evento text, p_ruta text, p_origen text default 'otro', p_paso text default null, p_tienda_slug text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_ruta text; v_origen text; v_paso text; v_slug text;
begin
  if p_evento is null or p_evento <> all (array[
    'inicio_visto', 'cta_iniciar_sesion', 'cta_como_funciona', 'cta_quiero_vender', 'cta_demo',
    'conoce_paso', 'conoce_final', 'conoce_cta_vender', 'conoce_cta_catalogo', 'conoce_cta_entrar', 'conoce_cta_otra_vez',
    'catalogo_visto', 'catalogo_reel_deslizapp',
    'catalogo_cta_iniciar_sesion', 'catalogo_cta_como_funciona', 'catalogo_cta_quiero_vender', 'catalogo_cta_demo'
  ]) then
    raise exception 'evento_invalido' using errcode = '22023';
  end if;
  if (select count(*) from public.eventos_publicos where creado_en > now() - interval '1 minute') >= 600 then
    return false;
  end if;
  v_ruta := split_part(split_part(coalesce(p_ruta, '/'), '?', 1), '#', 1);
  if v_ruta !~ '^/' then v_ruta := '/'; end if;
  if v_ruta ~ '^/pedido/' then v_ruta := '/pedido/*'; end if;
  v_ruta := left(v_ruta, 120);
  v_origen := case when p_origen in ('instagram', 'whatsapp', 'directo') then p_origen else 'otro' end;
  v_paso := case when p_paso ~ '^[a-z0-9_-]{1,40}$' then p_paso end;
  v_slug := case when p_tienda_slug ~ '^[a-z0-9-]{1,60}$' then p_tienda_slug end;
  insert into public.eventos_publicos (evento, ruta, origen, paso, tienda_slug) values (p_evento, v_ruta, v_origen, v_paso, v_slug);
  return true;
end $$;
revoke execute on function public.registrar_evento_publico(text, text, text, text, text) from public;
grant execute on function public.registrar_evento_publico(text, text, text, text, text) to anon, authenticated;

-- Lectura para Planning: conteos por día (hora de Santo Domingo), evento, origen, paso y tienda. Solo admin.
create function public.admin_eventos_publicos(p_desde date default null, p_hasta date default null)
returns table (dia date, evento text, origen text, paso text, tienda_slug text, total bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  return query
    select (e.creado_en at time zone 'America/Santo_Domingo')::date as dia, e.evento, e.origen, e.paso, e.tienda_slug, count(*)
    from public.eventos_publicos e
    where (e.creado_en at time zone 'America/Santo_Domingo')::date between coalesce(p_desde, (now() at time zone 'America/Santo_Domingo')::date - 30)
      and coalesce(p_hasta, (now() at time zone 'America/Santo_Domingo')::date)
    group by 1, 2, 3, 4, 5
    order by 1 desc, 2, 3, 4 nulls first, 5 nulls first;
end $$;
revoke execute on function public.admin_eventos_publicos(date, date) from public, anon;
grant execute on function public.admin_eventos_publicos(date, date) to authenticated;
