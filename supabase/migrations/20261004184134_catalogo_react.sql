-- Catálogo React: solo estructura reutilizable. Los datos de Michel están en scripts/sql/.
alter table public.productos add column orden integer,
  add column opiniones jsonb not null default '[]'::jsonb;

create function public.opiniones_validas(p_opiniones jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare o jsonb;
begin
  if p_opiniones is null or jsonb_typeof(p_opiniones) <> 'array' then return false; end if;
  if jsonb_array_length(p_opiniones) > 20 then return false; end if;
  for o in select value from jsonb_array_elements(p_opiniones) loop
    if jsonb_typeof(o) <> 'object' then return false; end if;
    if exists (select 1 from jsonb_object_keys(o) k where k not in ('usuario','fuente','url','texto','estrellas','traducida')) then return false; end if;
    if not (o ?& array['usuario','fuente','url','texto','estrellas','traducida']) then return false; end if;
    if jsonb_typeof(o->'usuario') <> 'string' or char_length(o->>'usuario') not between 1 and 80
      or jsonb_typeof(o->'fuente') <> 'string' or char_length(o->>'fuente') not between 1 and 80
      or jsonb_typeof(o->'texto') <> 'string' or char_length(o->>'texto') not between 1 and 600
      or jsonb_typeof(o->'url') <> 'string' or char_length(o->>'url') > 2048
      or not ((o->>'url') ~ '^https://[^[:space:]/]+(/[^[:space:]]*)?$')
      or jsonb_typeof(o->'traducida') <> 'boolean'
      or not (o->'estrellas' = 'null'::jsonb or (jsonb_typeof(o->'estrellas') = 'number' and o->>'estrellas' ~ '^[1-5]$'))
    then return false; end if;
  end loop;
  return true;
end $$;
alter table public.productos add constraint productos_opiniones_validas check (public.opiniones_validas(opiniones));
revoke all on function public.opiniones_validas(jsonb) from public, anon;
grant execute on function public.opiniones_validas(jsonb) to authenticated;

-- Conserva el mismo control de tienda pública, search_path y permisos; no expone stock > 3.
create or replace function public.catalogo_publico(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
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
      'desde', v_tienda.creado_en,
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
            'categoria', p.categoria,
            'precio', p.precio,
            'precio_promo', case when promo is null then null else public.precio_con_promo(p.id, p.precio, v_ahora) end,
            'promo', promo,
            'medios', p.medios,
            'detalles', p.detalles,
            'opciones', p.opciones,
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

