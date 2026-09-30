-- Estado del catálogo en línea de cada tienda (lo arma el equipo; el dueño lo pide, lo revisa y lo publica).
-- Los cambios de estado del lado del equipo (solicitado → generando → revisar, cambios → revisar) los hace
-- el admin; el dueño solo puede: pedirlo, pedir cambios y publicar, mediante las tres funciones de abajo.

alter table public.tiendas
  add column catalogo_estado text not null default 'sin'
    check (catalogo_estado in ('sin', 'solicitado', 'generando', 'revisar', 'cambios', 'publicado')),
  add column catalogo_paso smallint check (catalogo_paso is null or catalogo_paso between 1 and 3),
  add column catalogo_notas_cambios text check (catalogo_notas_cambios is null or char_length(catalogo_notas_cambios) <= 500),
  add column catalogo_solicitado_en timestamptz,
  add column catalogo_publicado_en timestamptz;

-- Esencias Michel ya tiene su catálogo publicado.
update public.tiendas
set catalogo_estado = 'publicado', catalogo_publicado_en = now()
where url_catalogo is not null;

-- El dueño pide que armemos su catálogo.
create function public.solicitar_catalogo(p_tienda_id uuid)
returns public.tiendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tiendas;
begin
  if not public.soy_dueno(p_tienda_id) then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  select * into v from public.tiendas where id = p_tienda_id for update;
  if not found or v.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  if v.catalogo_estado <> 'sin' then raise exception 'catalogo_estado_invalido' using errcode = 'P0001'; end if;
  update public.tiendas
  set catalogo_estado = 'solicitado', catalogo_solicitado_en = now()
  where id = p_tienda_id returning * into v;
  return v;
end
$$;

-- El dueño revisó el catálogo y pide ajustes.
create function public.pedir_cambios_catalogo(p_tienda_id uuid, p_notas text)
returns public.tiendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tiendas;
  v_notas text := nullif(btrim(coalesce(p_notas, '')), '');
begin
  if not public.soy_dueno(p_tienda_id) then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  if v_notas is null or char_length(v_notas) > 500 then raise exception 'notas_invalidas' using errcode = 'P0001'; end if;
  select * into v from public.tiendas where id = p_tienda_id for update;
  if not found or v.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  if v.catalogo_estado <> 'revisar' then raise exception 'catalogo_estado_invalido' using errcode = 'P0001'; end if;
  update public.tiendas
  set catalogo_estado = 'cambios', catalogo_notas_cambios = v_notas
  where id = p_tienda_id returning * into v;
  return v;
end
$$;

-- El dueño revisó el catálogo y lo publica.
create function public.publicar_catalogo(p_tienda_id uuid)
returns public.tiendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tiendas;
begin
  if not public.soy_dueno(p_tienda_id) then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  select * into v from public.tiendas where id = p_tienda_id for update;
  if not found or v.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  if v.catalogo_estado <> 'revisar' then raise exception 'catalogo_estado_invalido' using errcode = 'P0001'; end if;
  if v.url_catalogo is null then raise exception 'catalogo_sin_enlace' using errcode = 'P0001'; end if;
  update public.tiendas
  set catalogo_estado = 'publicado', catalogo_publicado_en = now(), catalogo_notas_cambios = null
  where id = p_tienda_id returning * into v;
  return v;
end
$$;

revoke all on function public.solicitar_catalogo(uuid) from public, anon;
revoke all on function public.pedir_cambios_catalogo(uuid, text) from public, anon;
revoke all on function public.publicar_catalogo(uuid) from public, anon;
grant execute on function public.solicitar_catalogo(uuid) to authenticated;
grant execute on function public.pedir_cambios_catalogo(uuid, text) to authenticated;
grant execute on function public.publicar_catalogo(uuid) to authenticated;
