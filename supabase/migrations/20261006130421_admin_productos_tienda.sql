-- Admin, parte 3 (docs/prompts/admin-3-trabajo.md): leer los productos de una tienda para Trabajo («Ver sus fotos») y
-- Personalizar (orden y opiniones) sin abrir «Ver como». Solo lectura: no cambia tablas, políticas ni funciones existentes.
-- Devuelve los productos no retirados con sus medios, en el mismo orden que el catálogo público (orden, luego los más nuevos).
create function public.admin_productos_tienda(p_tienda_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  if not exists (select 1 from public.tiendas where id = p_tienda_id) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nombre', p.nombre, 'slug', p.slug, 'activo', p.activo, 'orden', p.orden,
        'opiniones', p.opiniones, 'medios', p.medios, 'creado_en', p.creado_en, 'actualizado_en', p.actualizado_en)
      order by p.orden asc nulls first, p.creado_en desc, p.id)
    from public.productos p
    where p.tienda_id = p_tienda_id and p.eliminado_en is null), '[]'::jsonb);
end $$;
revoke execute on function public.admin_productos_tienda(uuid) from public, anon;
grant execute on function public.admin_productos_tienda(uuid) to authenticated;
