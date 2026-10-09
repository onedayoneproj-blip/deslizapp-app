create or replace function public.publicar_mi_catalogo(p_tienda_id uuid)
returns public.tiendas
language plpgsql security definer set search_path = ''
as $$
declare
  -- Sin mínimo de productos (decisión de Lewis, 9 oct 2026): la tienda puede publicar aunque el catálogo esté vacío para ver desde el día uno cómo se verá.
  v_base constant text := 'https://deslizapp-app.vercel.app';
  v public.tiendas;
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'equipo');
  if p_tienda_id is null or p_tienda_id not in (select public.mis_tiendas_con_eliminadas()) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  if not public.soy_dueno(p_tienda_id) then
    raise exception 'solo_dueno' using errcode = '42501', hint = 'Esto lo hace quien administra la tienda.';
  end if;
  select * into v from public.tiendas where id = p_tienda_id for update;
  if not found or v.estado = 'eliminada' then raise exception 'tienda_no_encontrada' using errcode = 'P0002'; end if;
  if v.estado = 'pausada' then raise exception 'tienda_pausada' using errcode = 'P0001'; end if;
  if v.catalogo_estado = 'publicado' then return v; end if;
  if v.catalogo_estado <> 'sin' then raise exception 'catalogo_en_curso' using errcode = 'P0001'; end if;
  update public.tiendas
  set catalogo_estado = 'publicado',
      catalogo_publicado_en = coalesce(catalogo_publicado_en, now()),
      catalogo_notas_cambios = null,
      url_catalogo = v_base || '/tienda/' || slug
  where id = p_tienda_id returning * into v;
  return v;
end
$$;
revoke execute on function public.publicar_mi_catalogo(uuid) from public, anon;
grant execute on function public.publicar_mi_catalogo(uuid) to authenticated;
