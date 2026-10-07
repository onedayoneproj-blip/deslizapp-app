-- Presentaciones del producto, parte 1 (docs/prompts/presentaciones-panel.md §4): la FOTO POR COLOR.
-- Aditiva: una columna, tres funciones, un trigger y `catalogo_publico` con la misma firma. No se reescribe `guardar_variantes`
-- ni `opciones_validas`. Un producto sin esto no cambia (`fotos_por_valor` = {}). Ningún dato de tiendas va aquí.
--
-- Forma: { "Color": { "Negro": "<url de una de las fotos del producto>" } }  (eje → valor → url que está en `medios`).

alter table public.productos add column fotos_por_valor jsonb not null default '{}'::jsonb;
alter table public.productos add constraint productos_fotos_por_valor_objeto check (jsonb_typeof(fotos_por_valor) = 'object');

-- Lo que queda de un mapa de fotos: solo las entradas cuyo eje y valor existen en `opciones` y cuya url es una foto de `medios`.
create function public.fotos_por_valor_limpias(p_fotos jsonb, p_opciones jsonb, p_medios jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(x.eje, x.valores), '{}'::jsonb)
  from (
    select e.key as eje, jsonb_object_agg(v.key, v.value) as valores
    from jsonb_each(case when jsonb_typeof(p_fotos) = 'object' then p_fotos else '{}'::jsonb end) e
    cross join lateral jsonb_each(case when jsonb_typeof(e.value) = 'object' then e.value else '{}'::jsonb end) v
    where jsonb_typeof(v.value) = 'string'
      and exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(p_opciones) = 'array' then p_opciones else '[]'::jsonb end) o
        where o ->> 'nombre' = e.key and (o -> 'valores') @> to_jsonb(v.key)
      )
      and exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(p_medios) = 'array' then p_medios else '[]'::jsonb end) m
        where m ->> 'tipo' = 'foto' and m ->> 'url' = (v.value #>> '{}')
      )
    group by e.key
  ) x
$$;
comment on function public.fotos_por_valor_limpias(jsonb, jsonb, jsonb) is
  'El mapa foto-por-color sin las entradas cuyo eje/valor ya no está en opciones o cuya url ya no es una foto de medios.';
revoke execute on function public.fotos_por_valor_limpias(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.fotos_por_valor_limpias(jsonb, jsonb, jsonb) to authenticated;

-- La limpieza vive en un trigger para que valga por cualquier camino que cambie `medios` u `opciones` (guardar_variantes,
-- guardar_producto_inventario, la entrega de un retoque…). Si una foto se reemplazó por su versión retocada (trabajos_retoque), la
-- entrada sigue a la foto nueva en vez de perderse. Corre después de `productos_medios` (por orden alfabético).
create function public.productos_limpiar_fotos_por_valor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb := new.fotos_por_valor;
  r record;
  v_nueva text;
begin
  if tg_op = 'UPDATE' and new.fotos_por_valor = old.fotos_por_valor and new.opciones = old.opciones and new.medios = old.medios then
    return new;
  end if;
  if v <> '{}'::jsonb then
    for r in
      select e.key as eje, x.key as valor, (x.value #>> '{}') as url
      from jsonb_each(v) e
      cross join lateral jsonb_each(case when jsonb_typeof(e.value) = 'object' then e.value else '{}'::jsonb end) x
      where jsonb_typeof(x.value) = 'string'
    loop
      if not exists (select 1 from jsonb_array_elements(new.medios) m where m ->> 'url' = r.url) then
        select t.medio_url_retocado into v_nueva
        from public.trabajos_retoque t
        where t.producto_id = new.id and t.estado = 'entregado' and t.medio_url_original = r.url
        order by t.atendido_en desc nulls last limit 1;
        if v_nueva is not null then v := jsonb_set(v, array[r.eje, r.valor], to_jsonb(v_nueva)); end if;
      end if;
    end loop;
  end if;
  new.fotos_por_valor := public.fotos_por_valor_limpias(v, new.opciones, new.medios);
  return new;
end $$;
revoke execute on function public.productos_limpiar_fotos_por_valor() from public, anon, authenticated;

create trigger productos_z_fotos_por_valor
  before insert or update on public.productos
  for each row execute function public.productos_limpiar_fotos_por_valor();

-- Guardar o quitar la foto de UN valor (p_url nula = quitarla). Grupo «catalogo». La url debe ser una de las fotos del producto y
-- el valor debe existir en el eje: si no, `foto_valor_invalida` (22023). Devuelve el mapa completo.
create function public.guardar_foto_valor(p_tienda_id uuid, p_producto_id uuid, p_eje text, p_valor text, p_url text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto public.productos;
  v_actual jsonb;
  v_eje jsonb;
  v_nuevo jsonb;
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'catalogo');
  if (select auth.uid()) is null or p_tienda_id is null or not exists (select 1 where p_tienda_id in (select public.mis_tiendas())) then
    raise exception 'variantes_sin_permiso' using errcode = '42501';
  end if;
  if p_eje is null or p_valor is null or char_length(p_eje) not between 1 and 20 or char_length(p_valor) not between 1 and 20
     or (p_url is not null and char_length(p_url) not between 1 and 2048) then
    raise exception 'foto_valor_invalida' using errcode = '22023';
  end if;
  select * into v_producto from public.productos p
  where p.id = p_producto_id and p.tienda_id = p_tienda_id and p.eliminado_en is null for update;
  if not found then
    raise exception 'ajuste_producto_no_encontrado' using errcode = 'P0002';
  end if;
  v_actual := v_producto.fotos_por_valor;
  v_eje := coalesce(v_actual -> p_eje, '{}'::jsonb);
  if p_url is null then
    v_eje := v_eje - p_valor;
  else
    v_eje := v_eje || jsonb_build_object(p_valor, p_url);
  end if;
  v_nuevo := case when v_eje = '{}'::jsonb then v_actual - p_eje else v_actual || jsonb_build_object(p_eje, v_eje) end;
  if p_url is not null and public.fotos_por_valor_limpias(v_nuevo, v_producto.opciones, v_producto.medios) <> v_nuevo then
    raise exception 'foto_valor_invalida' using errcode = '22023';
  end if;
  update public.productos p set fotos_por_valor = v_nuevo where p.id = p_producto_id;
  return v_nuevo;
end $$;
comment on function public.guardar_foto_valor(uuid, uuid, text, text, text) is
  'Foto por color: guarda (o quita, con url nula) la foto de un valor de un eje. La url debe estar en medios. Grupo catalogo; no en Ver como.';
revoke execute on function public.guardar_foto_valor(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.guardar_foto_valor(uuid, uuid, text, text, text) to authenticated;

-- El catálogo público la devuelve junto a `opciones` (la lectura en el comprador es de la parte 2). Misma firma, sin `drop`:
-- se reemplaza solo esa línea sobre la definición vigente.
do $$
declare
  def text := pg_get_functiondef('public.catalogo_publico(text)'::regprocedure);
  nuevo text;
begin
  if position('fotos_por_valor' in def) > 0 then return; end if;
  nuevo := replace(def, E'\'opciones\', p.opciones,', E'\'opciones\', p.opciones,\n            \'fotos_por_valor\', p.fotos_por_valor,');
  if nuevo = def then raise exception 'No se encontró la línea de opciones en catalogo_publico'; end if;
  execute nuevo;
end $$;
