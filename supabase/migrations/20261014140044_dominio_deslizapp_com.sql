-- Dominio propio: los enlaces de los catálogos pasan a https://deslizapp.com (docs/prompts/dominio-deslizapp-com.md).
-- Aprobado por Lewis, 14 oct 2026. deslizapp-app.vercel.app sigue funcionando; solo cambia la dirección que se guarda y se muestra.

-- 1. Publicar: la base del enlace del catálogo (lib/config.ts: URL_BASE_CATALOGO). Misma firma y mismo cuerpo que
--    20261009232947_publicar_catalogo_sin_minimo; solo cambia v_base.
create or replace function public.publicar_mi_catalogo(p_tienda_id uuid)
returns public.tiendas
language plpgsql security definer set search_path = ''
as $$
declare
  -- Sin mínimo de productos (decisión de Lewis, 9 oct 2026): la tienda puede publicar aunque el catálogo esté vacío para ver desde el día uno cómo se verá.
  v_base constant text := 'https://deslizapp.com';
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

-- 2. Regla de medios: se AGREGA deslizapp.com como host propio de /catalogos/ y /ensayo/; el host viejo se queda
--    (hay medios guardados con él). Misma firma que 20261008165331_medios_solo_hosts_propios.
create or replace function public.medio_url_valida(p_url text, p_tienda_id uuid)
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
      or p_url ~ '^https://(deslizapp-app\.vercel\.app|deslizapp\.com)/(catalogos|ensayo)/[A-Za-z0-9._/-]+$'
    ), false)
$$;
comment on function public.medio_url_valida(text, uuid) is
  'Una foto o video que ve el comprador: del Storage de Deslizapp (buckets productos o retoques, carpeta de la tienda) o de /catalogos/ o /ensayo/ de deslizapp.com o deslizapp-app.vercel.app.';
revoke execute on function public.medio_url_valida(text, uuid) from public, anon;
grant execute on function public.medio_url_valida(text, uuid) to authenticated;

-- 3. Enlaces guardados: los catálogos ya publicados pasan al dominio nuevo. Otras columnas con la dirección vieja
--    (medios, foto de perfil) son archivos fijos de la app y siguen válidos con el host viejo: no se tocan.
update public.tiendas
set url_catalogo = replace(url_catalogo, 'https://deslizapp-app.vercel.app', 'https://deslizapp.com')
where url_catalogo like 'https://deslizapp-app.vercel.app/%';
