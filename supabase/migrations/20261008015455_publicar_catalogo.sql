-- Publicar mi catálogo: la tienda lo pone en línea sola (docs/prompts/publicar-catalogo.md, decisión de Lewis del 7 oct 2026).
--
-- 1. Una tienda EN PRUEBA con el catálogo publicado ya tiene catálogo público (pausada y eliminada, nunca).
--    `tienda_publica` es la ÚNICA puerta: catalogo_publico, crear_solicitud_pedido, ver_solicitud, pedir_aviso y registrar_aaah
--    la llaman, así que el recorrido completo del comprador (ver, pedir, ♥, «Avísame», abrir su pedido) queda cubierto aquí.
--    (`crear_codigo_cliente` y las demás funciones que dicen 'activa' hablan del estado de una promo, no de la tienda.)
-- 2. `publicar_mi_catalogo` / `despublicar_mi_catalogo`: solo el DUEÑO; desde `sin` publica directo; no pisa un flujo manual en curso.
-- 3. Lo mínimo para publicar vive en un solo lugar: `productos_para_publicar` y la constante de `publicar_mi_catalogo`.
-- 4. `catalogo_publico` avisa si la tienda se puede indexar (solo las activas), para que las de prueba salgan con noindex.

create or replace function public.tienda_publica(p_slug text)
returns public.tiendas
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tienda public.tiendas;
begin
  select * into v_tienda from public.tiendas t
  where t.slug = lower(btrim(coalesce(p_slug, ''))) and t.estado in ('activa', 'en_prueba') and t.catalogo_estado = 'publicado';
  if not found then
    raise exception 'catalogo_no_disponible' using errcode = 'P0002';
  end if;
  return v_tienda;
end
$$;

-- Cuántos productos de la tienda cuentan para publicar: visibles (activo), no eliminados y con al menos una foto.
create or replace function public.productos_para_publicar(p_tienda_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.productos p
  where p.tienda_id = p_tienda_id and p.activo and p.eliminado_en is null
    and exists (
      select 1 from jsonb_array_elements(coalesce(p.medios, '[]'::jsonb)) m
      where m ->> 'tipo' = 'foto' and coalesce(m ->> 'url', '') <> ''
    )
$$;
revoke execute on function public.productos_para_publicar(uuid) from public, anon, authenticated;

create or replace function public.publicar_mi_catalogo(p_tienda_id uuid)
returns public.tiendas
language plpgsql security definer set search_path = ''
as $$
declare
  -- Mínimo para publicar (lib/config.ts: PRODUCTOS_MINIMOS_PARA_PUBLICAR). El checklist del onboarding lo subirá a 5.
  v_minimo constant integer := 3;
  -- Base de la dirección del catálogo (lib/config.ts: URL_BASE). Nunca una dirección escrita por el usuario.
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
  -- Ya en línea: nada que hacer (un doble toque no es un error).
  if v.catalogo_estado = 'publicado' then return v; end if;
  -- Un catálogo que el equipo está armando o que espera revisión sigue su flujo; aquí no se pisa.
  if v.catalogo_estado <> 'sin' then raise exception 'catalogo_en_curso' using errcode = 'P0001'; end if;
  if public.productos_para_publicar(p_tienda_id) < v_minimo then
    raise exception 'catalogo_incompleto' using errcode = 'P0001';
  end if;
  update public.tiendas
  set catalogo_estado = 'publicado',
      catalogo_publicado_en = coalesce(catalogo_publicado_en, now()),
      catalogo_notas_cambios = null,
      url_catalogo = v_base || '/tienda/' || slug
  where id = p_tienda_id returning * into v;
  return v;
end
$$;

create or replace function public.despublicar_mi_catalogo(p_tienda_id uuid)
returns public.tiendas
language plpgsql security definer set search_path = ''
as $$
declare
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
  if v.catalogo_estado = 'sin' then return v; end if;
  if v.catalogo_estado <> 'publicado' then raise exception 'catalogo_estado_invalido' using errcode = 'P0001'; end if;
  -- Conserva url_catalogo y catalogo_publicado_en: se puede volver a publicar sin perder nada.
  update public.tiendas set catalogo_estado = 'sin' where id = p_tienda_id returning * into v;
  return v;
end
$$;

revoke execute on function public.publicar_mi_catalogo(uuid) from public, anon;
revoke execute on function public.despublicar_mi_catalogo(uuid) from public, anon;
grant execute on function public.publicar_mi_catalogo(uuid) to authenticated;
grant execute on function public.despublicar_mi_catalogo(uuid) to authenticated;

-- catalogo_publico: misma función, una llave más en `tienda`: indexable (solo las tiendas activas salen en buscadores).
create or replace function public.catalogo_publico(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tienda public.tiendas := public.tienda_publica(p_slug);
  v_ahora timestamptz := now();
begin
  return jsonb_build_object(
    'tienda', jsonb_build_object(
      'slug', v_tienda.slug,
      'nombre', v_tienda.nombre,
      'logo_url', v_tienda.logo_url,
      'foto_perfil_url', v_tienda.foto_perfil_url,
      'marca_color_principal', v_tienda.marca_color_principal,
      'marca_color_acento', v_tienda.marca_color_acento,
      'marca_estilo', v_tienda.marca_estilo,
      'personalizacion', v_tienda.personalizacion,
      'whatsapp', v_tienda.whatsapp,
      'instagram', v_tienda.instagram,
      'descripcion', v_tienda.descripcion,
      'nombre_vendedora', v_tienda.nombre_vendedora,
      'rubro', v_tienda.rubro,
      'rubros', to_jsonb(v_tienda.rubros),
      'desde', v_tienda.creado_en,
      'indexable', v_tienda.estado = 'activa',
      'ventas', (select case when count(*) >= 10 then count(*) else null end from public.pedidos pe where pe.tienda_id = v_tienda.id and pe.estado = 'despachado')
    ),
    'productos', coalesce((
      select jsonb_agg(x.producto order by x.orden asc nulls first, x.creado_en desc, x.id)
      from (
        select p.orden, p.creado_en, p.id,
          jsonb_build_object(
            'id', p.id,
            'slug', p.slug,
            'orden', p.orden,
            'opiniones', p.opiniones,
            'nombre', p.nombre,
            'tipo', p.tipo,
            'rubro', coalesce(p.rubro, v_tienda.rubro),
            'categoria', p.categoria,
            'precio', p.precio,
            'precio_promo', case when promo is null then null else public.precio_con_promo(p.id, p.precio, v_ahora) end,
            'promo', promo,
            'medios', p.medios,
            'detalles', p.detalles,
            'opciones', p.opciones,
            'fotos_por_valor', p.fotos_por_valor,
            'likes', p.likes,
            'disponibilidad', public.disponibilidad(sp.stock, p.por_encargo),
            'quedan', case when public.disponibilidad(sp.stock, p.por_encargo) = 'quedan' then sp.stock end,
            'encargo_texto', case when p.por_encargo then p.encargo_texto end,
            'variantes', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', v.id,
                'valores', v.valores,
                'precio', coalesce(v.precio, p.precio),
                'precio_promo', case when promo is null then null else public.precio_con_promo(p.id, coalesce(v.precio, p.precio), v_ahora) end,
                'disponibilidad', public.disponibilidad(v.stock, p.por_encargo),
                'quedan', case when public.disponibilidad(v.stock, p.por_encargo) = 'quedan' then v.stock end
              ) order by v.orden, v.creado_en)
              from public.producto_variantes v where v.producto_id = p.id and v.activa
            ), '[]'::jsonb)
          ) as producto
        from public.productos p
        cross join lateral (select public.promo_automatica(p.id, v_ahora) as promo) pa
        cross join lateral (select public.stock_publico(p) as stock) sp
        where p.tienda_id = v_tienda.id and p.activo
      ) x
    ), '[]'::jsonb)
  );
end
$$;
