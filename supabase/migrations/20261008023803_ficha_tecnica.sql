-- Ficha técnica del producto (docs/prompts/ficha-tecnica.md §2): UNA foto con las especificaciones, que sube la tienda.
-- Aditiva: una columna nullable, una función y `catalogo_publico` con la misma firma. Un producto sin ficha no cambia (`ficha_url` = null).
-- Ningún dato de tiendas va aquí. Los archivos viven en el bucket `productos` (carpeta de la tienda), como las fotos del producto.

alter table public.productos add column ficha_url text;
alter table public.productos add constraint productos_ficha_url_valida check (
  ficha_url is null or (
    char_length(ficha_url) <= 2048
    and ficha_url ~ ('^https://[a-z0-9.-]+/storage/v1/object/public/productos/' || tienda_id::text || '/[A-Za-z0-9._/-]+$')
    and ficha_url !~ '\.\.'
  )
);

-- Guardar o quitar la ficha (p_url nula = quitarla). Grupo «catalogo». Devuelve la url guardada.
create function public.guardar_ficha_producto(p_tienda_id uuid, p_producto_id uuid, p_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'catalogo');
  if (select auth.uid()) is null or p_tienda_id is null or not exists (select 1 where p_tienda_id in (select public.mis_tiendas())) then
    raise exception 'variantes_sin_permiso' using errcode = '42501';
  end if;
  if p_url is not null and (char_length(p_url) > 2048
     or p_url !~ ('^https://[a-z0-9.-]+/storage/v1/object/public/productos/' || p_tienda_id::text || '/[A-Za-z0-9._/-]+$')
     or p_url ~ '\.\.') then
    raise exception 'ficha_invalida' using errcode = '22023';
  end if;
  update public.productos p set ficha_url = p_url
  where p.id = p_producto_id and p.tienda_id = p_tienda_id and p.eliminado_en is null;
  if not found then
    raise exception 'ajuste_producto_no_encontrado' using errcode = 'P0002';
  end if;
  return p_url;
end $$;
comment on function public.guardar_ficha_producto(uuid, uuid, text) is
  'Ficha técnica: guarda (o quita, con url nula) la foto de las especificaciones. Debe estar en la carpeta de la tienda del bucket productos. Grupo catalogo; no en Ver como.';
revoke execute on function public.guardar_ficha_producto(uuid, uuid, text) from public, anon;
grant execute on function public.guardar_ficha_producto(uuid, uuid, text) to authenticated;

-- El catálogo público la devuelve junto a `fotos_por_valor`. Misma firma, sin `drop`: se reemplaza solo esa línea sobre la definición vigente.
do $$
declare
  def text := pg_get_functiondef('public.catalogo_publico(text)'::regprocedure);
  nuevo text;
begin
  if position('ficha_url' in def) > 0 then return; end if;
  nuevo := replace(def, E'\'fotos_por_valor\', p.fotos_por_valor,', E'\'fotos_por_valor\', p.fotos_por_valor,\n            \'ficha_url\', p.ficha_url,');
  if nuevo = def then raise exception 'No se encontró la línea de fotos_por_valor en catalogo_publico'; end if;
  execute nuevo;
end $$;
