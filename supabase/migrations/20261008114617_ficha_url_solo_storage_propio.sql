-- Ficha técnica: la url solo puede ser del Storage de ESTE proyecto (revisión de Codex en el PR #76).
-- Antes el `check` y `guardar_ficha_producto` aceptaban cualquier host con la forma `/storage/v1/object/public/productos/<tienda>/…`.
-- Aditiva: una función nueva (la regla, en un solo sitio), la restricción reemplazada y `guardar_ficha_producto` con la MISMA firma.
-- Ningún dato de tiendas va aquí. Antes de aplicarla se comprobó que ninguna fila tenía ficha (todas `ficha_url` nula).

create function public.ficha_url_valida(p_url text, p_tienda_id uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_url is null or (
    p_tienda_id is not null
    and char_length(p_url) <= 2048
    and p_url ~ ('^https://euihaeyfdlpvmbtfzvnt\.supabase\.co/storage/v1/object/public/productos/' || p_tienda_id::text || '/[A-Za-z0-9._/-]+$')
    and p_url !~ '\.\.'
  )
$$;
comment on function public.ficha_url_valida(text, uuid) is
  'Ficha técnica: nula, o una url pública del bucket productos del Storage de Deslizapp, dentro de la carpeta de la tienda.';
revoke execute on function public.ficha_url_valida(text, uuid) from public, anon;
grant execute on function public.ficha_url_valida(text, uuid) to authenticated;

alter table public.productos drop constraint productos_ficha_url_valida;
alter table public.productos add constraint productos_ficha_url_valida check (public.ficha_url_valida(ficha_url, tienda_id));

create or replace function public.guardar_ficha_producto(p_tienda_id uuid, p_producto_id uuid, p_url text)
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
  if not public.ficha_url_valida(p_url, p_tienda_id) then
    raise exception 'ficha_invalida' using errcode = '22023';
  end if;
  update public.productos p set ficha_url = p_url
  where p.id = p_producto_id and p.tienda_id = p_tienda_id and p.eliminado_en is null;
  if not found then
    raise exception 'ajuste_producto_no_encontrado' using errcode = 'P0002';
  end if;
  return p_url;
end $$;
