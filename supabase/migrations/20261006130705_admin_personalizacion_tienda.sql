-- Admin, parte 3 (docs/prompts/admin-3-trabajo.md §3): leer lo que Personalizar necesita de una tienda (su personalización,
-- su marca para la vista previa y el estado del catálogo). Solo lectura y solo admins; no cambia tablas, políticas ni funciones.
create function public.admin_personalizacion_tienda(p_tienda_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v jsonb;
begin
  if not public.soy_admin() then raise exception 'no_admin' using errcode = '42501'; end if;
  select jsonb_build_object(
      'id', t.id, 'nombre', t.nombre, 'slug', t.slug, 'vendedora', t.nombre_vendedora, 'rubro', t.rubro, 'estado', t.estado,
      'marca_color_principal', t.marca_color_principal, 'marca_color_acento', t.marca_color_acento, 'marca_estilo', t.marca_estilo,
      'logo_url', t.logo_url, 'url_catalogo', t.url_catalogo, 'catalogo_estado', t.catalogo_estado,
      'catalogo_notas_cambios', t.catalogo_notas_cambios, 'personalizacion', t.personalizacion)
    into v
  from public.tiendas t where t.id = p_tienda_id;
  if v is null then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  return v;
end $$;
revoke execute on function public.admin_personalizacion_tienda(uuid) from public, anon;
grant execute on function public.admin_personalizacion_tienda(uuid) to authenticated;
