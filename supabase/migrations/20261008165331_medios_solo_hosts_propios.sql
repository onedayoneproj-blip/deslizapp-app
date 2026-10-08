-- Fotos y videos del producto, foto de cada color, logo y foto de perfil de la tienda: solo direcciones PROPIAS
-- (docs/prompts/medios-solo-hosts-propios.md). Antes `medios` solo validaba el largo y aceptaba cualquier host: quien edita el
-- catálogo podía poner una imagen de otro sitio y cada comprador la cargaría (rastreo, contenido ajeno).
--
-- Aditiva: dos funciones nuevas (la regla, en un solo sitio), cuatro restricciones nuevas (las de hoy no se tocan) y dos funciones
-- con la MISMA firma, editadas con reemplazos exactos sobre su definición vigente (sin `drop function`).
-- Ningún dato de tiendas va aquí. Antes de aplicarla se contó en la base real: 0 de 49 direcciones la violan.
--
-- Permitido (inventario del 8 oct 2026, todo lo que hay hoy):
--   https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/<la tienda>/…  (fotos, videos, portadas, logo)
--   https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/retoques/<la tienda>/…   (fotos retocadas por el equipo)
--   https://deslizapp-app.vercel.app/catalogos/…  y  /ensayo/…                                  (archivos fijos de la app)
-- Sin `..`, solo letras, números, `.`, `_`, `-` y `/` en la ruta (sin `?`, `#`, `%` ni espacios), hasta 2048 como hoy.

create function public.medio_url_valida(p_url text, p_tienda_id uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_url is not null
    and p_tienda_id is not null
    and char_length(p_url) <= 2048
    and p_url !~ '\.\.'
    and (
      p_url ~ ('^https://euihaeyfdlpvmbtfzvnt\.supabase\.co/storage/v1/object/public/(productos|retoques)/' || p_tienda_id::text || '/[A-Za-z0-9._/-]+$')
      or p_url ~ '^https://deslizapp-app\.vercel\.app/(catalogos|ensayo)/[A-Za-z0-9._/-]+$'
    ), false)
$$;
comment on function public.medio_url_valida(text, uuid) is
  'Una foto o video que ve el comprador: del Storage de Deslizapp (buckets productos o retoques, carpeta de la tienda) o de /catalogos/ o /ensayo/ de deslizapp-app.vercel.app.';
revoke execute on function public.medio_url_valida(text, uuid) from public, anon;
grant execute on function public.medio_url_valida(text, uuid) to authenticated;

-- Cada `url` y cada `portada` (si es texto) de `medios`, y cada url de `fotos_por_valor`. La forma la sigue cuidando `medios_validos`;
-- aquí lo que no es arreglo u objeto no se recorre (no se lanza un error de tipo desde un `check`).
create function public.medios_urls_validas(p_medios jsonb, p_fotos_por_valor jsonb, p_tienda_id uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not exists (
      select 1 from jsonb_array_elements(case when jsonb_typeof(p_medios) = 'array' then p_medios else '[]'::jsonb end) e
      where not public.medio_url_valida(e ->> 'url', p_tienda_id)
         or (jsonb_typeof(e -> 'portada') = 'string' and not public.medio_url_valida(e ->> 'portada', p_tienda_id))
    )
    and not exists (
      select 1
      from jsonb_each(case when jsonb_typeof(p_fotos_por_valor) = 'object' then p_fotos_por_valor else '{}'::jsonb end) x
      cross join lateral jsonb_each(case when jsonb_typeof(x.value) = 'object' then x.value else '{}'::jsonb end) v
      where jsonb_typeof(v.value) <> 'string' or not public.medio_url_valida(v.value #>> '{}', p_tienda_id)
    )
$$;
comment on function public.medios_urls_validas(jsonb, jsonb, uuid) is
  'Todas las direcciones de medios (url y portada) y de fotos_por_valor cumplen medio_url_valida para la tienda.';
revoke execute on function public.medios_urls_validas(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.medios_urls_validas(jsonb, jsonb, uuid) to authenticated;

-- Un `check` puede recorrer el jsonb a través de una función inmutable (como ya hace `medios_validos`), así que vale por CUALQUIER
-- camino que escriba la fila: crear_producto, guardar_producto_inventario, guardar_variantes, la entrega de un retoque, la
-- sincronía `fotos` → `medios` (trigger `productos_medios`) y un update directo. Los checks corren después de los triggers `before`.
-- `fotos` (arreglo viejo) no lleva restricción propia: el trigger la rehace desde `medios` o rehace `medios` desde ella, y entonces
-- esta restricción la cubre.
alter table public.productos add constraint productos_medios_hosts_propios
  check (public.medios_urls_validas(medios, fotos_por_valor, tienda_id));

alter table public.tiendas add constraint tiendas_logo_url_propia
  check (logo_url is null or public.medio_url_valida(logo_url, id));
alter table public.tiendas add constraint tiendas_foto_perfil_url_propia
  check (foto_perfil_url is null or public.medio_url_valida(foto_perfil_url, id));

-- Funciones de guardado con la misma firma: el error claro antes de llegar a la restricción.
-- `crear_producto` y `guardar_producto_inventario` no se reescriben: la restricción las cubre y el panel ya traduce el 23514 por
-- su nombre (lib/data/errores.ts).
do $$
declare
  def text;
  nuevo text;
begin
  -- Foto de un color: la url, además de estar en `medios`, debe ser propia.
  def := pg_get_functiondef('public.guardar_foto_valor(uuid, uuid, text, text, text)'::regprocedure);
  if position('medio_url_valida' in def) = 0 then
    nuevo := replace(def,
      E'     or (p_url is not null and char_length(p_url) not between 1 and 2048) then',
      E'     or (p_url is not null and (char_length(p_url) not between 1 and 2048 or not public.medio_url_valida(p_url, p_tienda_id))) then');
    if nuevo = def then raise exception 'No se encontró la validación de p_url en guardar_foto_valor'; end if;
    execute nuevo;
  end if;

  -- Entrega de un retoque (admin): la foto retocada debe estar en el Storage de la tienda del trabajo.
  def := pg_get_functiondef('public.admin_retoque_entregar(uuid, text)'::regprocedure);
  if position('medio_url_valida' in def) = 0 then
    nuevo := replace(def,
      E'  if v.estado <> \'pendiente\' then raise exception \'trabajo_no_pendiente\' using errcode = \'P0001\'; end if;\n',
      E'  if v.estado <> \'pendiente\' then raise exception \'trabajo_no_pendiente\' using errcode = \'P0001\'; end if;\n'
      || E'  if not public.medio_url_valida(p_url_retocada, v.tienda_id) then raise exception \'enlace_invalido\' using errcode = \'22023\'; end if;\n');
    if nuevo = def then raise exception 'No se encontró la línea de trabajo_no_pendiente en admin_retoque_entregar'; end if;
    execute nuevo;
  end if;
end $$;
