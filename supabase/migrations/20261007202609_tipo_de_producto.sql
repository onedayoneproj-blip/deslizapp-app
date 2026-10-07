-- Tipo de producto (docs/prompts/tipo-de-producto.md). Aditiva.
--   * tiendas.rubros: los rubros que vende la tienda ("Lo que vendes"); `rubro` sigue siendo el principal y siempre está dentro.
--   * productos.rubro: el tipo de cada producto (null = el principal de la tienda). Solo organiza y busca: los Detalles
--     siguen decididos por el rubro principal de la tienda.
--   * Quitar de la tienda un rubro que algún producto usa no se puede (rubro_en_uso, con los nombres).
--   * guardar_rubros_tienda: escribe "Lo que vendes". crear_producto y guardar_producto_inventario aceptan 'rubro'.
--   * catalogo_publico (misma firma) devuelve tienda.rubros y producto.rubro.

alter table public.tiendas add column rubros text[] not null default '{}';
update public.tiendas set rubros = array[rubro] where id is not null;
alter table public.tiendas add constraint tiendas_rubros_check check (
  cardinality(rubros) between 1 and 7
  and rubros <@ array['perfumes','ropa','accesorios','belleza','comida','hogar','general']::text[]
  and rubro = any(rubros));

alter table public.productos add column rubro text;
alter table public.productos add constraint productos_rubro_check check (
  rubro is null or rubro in ('perfumes','ropa','accesorios','belleza','comida','hogar','general'));

-- Si la tienda no manda rubros, o manda un principal que no está, se arreglan solos (así crear_mi_tienda no cambia).
create function public.tiendas_ajustar_rubros() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.rubros is null or cardinality(new.rubros) = 0 then new.rubros := array[new.rubro];
  elsif not (new.rubro = any(new.rubros)) then new.rubros := array[new.rubro] || new.rubros;
  end if;
  return new;
end $$;
create trigger tiendas_a_rubros before insert or update of rubro, rubros on public.tiendas
  for each row execute function public.tiendas_ajustar_rubros();

create function public.tiendas_rubros_en_uso() returns trigger
language plpgsql set search_path = '' as $$
declare v_nombres text;
begin
  select string_agg(p.nombre, ', ' order by p.nombre) into v_nombres
  from public.productos p
  where p.tienda_id = new.id and p.eliminado_en is null and p.rubro is not null
    and not (p.rubro = any(new.rubros));
  if v_nombres is not null then
    raise exception 'rubro_en_uso' using errcode = '22023', detail = v_nombres,
      hint = 'Cambia el tipo de estos productos antes de quitar ese rubro.';
  end if;
  return new;
end $$;
create trigger tiendas_b_rubros_en_uso before update of rubros on public.tiendas
  for each row when (old.rubros is distinct from new.rubros) execute function public.tiendas_rubros_en_uso();

create function public.productos_validar_rubro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.rubro is not null and not exists (
    select 1 from public.tiendas t where t.id = new.tienda_id and new.rubro = any(t.rubros)
  ) then raise exception 'rubro_invalido' using errcode = '22023'; end if;
  return new;
end $$;
create trigger productos_rubro before insert or update of rubro on public.productos
  for each row execute function public.productos_validar_rubro();

create function public.guardar_rubros_tienda(p_tienda_id uuid, p_rubros text[]) returns public.tiendas
language plpgsql security definer set search_path = '' as $$
declare v_tienda public.tiendas;
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'catalogo');
  if (select auth.uid()) is null or not exists(select 1 where p_tienda_id in (select public.mis_tiendas())) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_rubros is null or cardinality(p_rubros) = 0 then raise exception 'rubros_invalidos' using errcode = '22023'; end if;
  update public.tiendas set rubro = p_rubros[1],
    rubros = (select array_agg(r order by o) from (select r, min(o) o from unnest(p_rubros) with ordinality u(r, o) group by r) d) where id = p_tienda_id returning * into v_tienda;
  return v_tienda;
end $$;
revoke all on function public.guardar_rubros_tienda(uuid, text[]) from public, anon, authenticated;
grant execute on function public.guardar_rubros_tienda(uuid, text[]) to authenticated;

-- crear_producto y guardar_producto_inventario: igual que antes, más 'rubro'.
create or replace function public.crear_producto(
  p_tienda_id uuid, p_producto jsonb, p_creditos integer default 0,
  p_opciones jsonb default '[]'::jsonb, p_variantes jsonb default '[]'::jsonb
) returns public.productos
language plpgsql security definer set search_path = '' as $$
declare
  v_fila public.productos;
  v_producto public.productos;
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'catalogo');
  if (select auth.uid()) is null or not exists(select 1 where p_tienda_id in(select public.mis_tiendas())) then
    raise exception 'sin_permiso' using errcode='42501';
  end if;
  if p_producto is null or jsonb_typeof(p_producto) <> 'object' or exists(
    select 1 from jsonb_object_keys(p_producto) k where k not in (
      'nombre','precio','fotos','foto_retocada','categoria','activo','destacado','stock',
      'medios','detalles','por_encargo','encargo_texto','slug','tipo','rubro')
  ) or p_creditos is null or p_creditos < 0 then raise exception 'ficha_invalida' using errcode='22023'; end if;
  v_fila := jsonb_populate_record(null::public.productos, jsonb_build_object(
    'foto_retocada', false, 'activo', true, 'destacado', false, 'medios', '[]'::jsonb, 'detalles', '{}'::jsonb,
    'por_encargo', false, 'tipo', 'producto') || p_producto);
  if p_creditos > 0 then perform public.gastar_creditos(p_tienda_id, p_creditos); end if;
  insert into public.productos (tienda_id, nombre, precio, fotos, foto_retocada, categoria, activo, destacado, stock,
    slug, tipo, medios, detalles, por_encargo, encargo_texto, rubro)
  values (p_tienda_id, v_fila.nombre, v_fila.precio, coalesce(v_fila.fotos, '{}'), v_fila.foto_retocada, v_fila.categoria,
    v_fila.activo, v_fila.destacado, v_fila.stock, v_fila.slug, v_fila.tipo, v_fila.medios, v_fila.detalles,
    v_fila.por_encargo, v_fila.encargo_texto, v_fila.rubro)
  returning * into v_producto;
  if p_opciones is not null and jsonb_typeof(p_opciones) = 'array' and jsonb_array_length(p_opciones) > 0 then
    perform public.guardar_variantes(p_tienda_id, v_producto.id, p_opciones, coalesce(p_variantes, '[]'::jsonb));
    select * into v_producto from public.productos where id = v_producto.id;
  end if;
  return v_producto;
end $$;

create or replace function public.guardar_producto_inventario(
  p_tienda_id uuid, p_producto_id uuid, p_cambios jsonb,
  p_stock_base integer, p_stock_nuevo integer, p_motivo text,
  p_nota text, p_ajuste_id uuid, p_retocar boolean
) returns public.productos
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_producto public.productos;
  v_ficha public.productos;
  v_previo public.ajustes_inventario;
  v_delta bigint;
  v_nota text := nullif(btrim(p_nota), '');
  v_ajustar boolean := p_ajuste_id is not null;
begin
  perform public.exigir_no_viendo(p_tienda_id);
  perform public.exigir_permiso(p_tienda_id, 'catalogo');
  if v_actor is null or not exists(select 1 where p_tienda_id in(select public.mis_tiendas())) then
    raise exception 'ajuste_sin_permiso' using errcode='42501';
  end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' or exists(
    select 1 from jsonb_object_keys(p_cambios) k where k not in (
      'nombre','precio','fotos','foto_retocada','categoria','activo','destacado',
      'medios','detalles','por_encargo','encargo_texto','slug','tipo','rubro')
  ) or p_retocar is null then raise exception 'ficha_invalida' using errcode='22023'; end if;
  select * into v_producto from public.productos where id=p_producto_id and tienda_id=p_tienda_id for update;
  if not found then raise exception 'ajuste_producto_no_encontrado' using errcode='P0002'; end if;
  if v_ajustar then
    select * into v_previo from public.ajustes_inventario where id=p_ajuste_id;
    if found then
      if v_previo.tienda_id<>p_tienda_id or v_previo.producto_id<>p_producto_id or v_previo.creado_por<>v_actor
        or v_previo.stock_anterior is distinct from p_stock_base or v_previo.stock_nuevo is distinct from p_stock_nuevo
        or v_previo.motivo is distinct from p_motivo or v_previo.nota is distinct from v_nota then
        raise exception 'ajuste_id_reutilizado' using errcode='22023';
      end if;
      return v_producto;
    end if;
    if exists (select 1 from public.producto_variantes v where v.producto_id = p_producto_id and v.activa) then
      raise exception 'usar_variante' using errcode = '22023';
    end if;
    if v_producto.stock is null then raise exception 'stock_sin_control' using errcode='P0001'; end if;
    if v_producto.stock is distinct from p_stock_base then raise exception 'stock_base_cambio' using errcode='P0001'; end if;
    if p_stock_nuevo is null or p_stock_nuevo<0 then raise exception 'stock_negativo' using errcode='P0001';end if;
    v_delta := p_stock_nuevo::bigint-p_stock_base::bigint;
    if v_delta=0 or v_delta not between -2147483647 and 2147483647 then raise exception 'ajuste_invalido' using errcode='22023';end if;
    if p_motivo is null or p_motivo not in('reposicion','dano','perdida','correccion_inventario','otro')
      or (v_delta>0 and p_motivo<>'reposicion') or (v_delta<0 and p_motivo='reposicion') then
      raise exception 'motivo_ajuste_invalido' using errcode='22023';end if;
    if (v_nota is not null and char_length(v_nota)>200) or (p_motivo='otro' and v_nota is null) then
      raise exception 'nota_ajuste_invalida' using errcode='22023';end if;
  elsif p_stock_base is not null or p_stock_nuevo is not null or p_motivo is not null or p_nota is not null then
    raise exception 'ajuste_invalido' using errcode='22023';
  end if;
  v_ficha := jsonb_populate_record(v_producto,p_cambios);
  if p_retocar then perform public.gastar_creditos(p_tienda_id,5);end if;
  update public.productos set nombre=v_ficha.nombre, precio=v_ficha.precio, fotos=v_ficha.fotos,
    foto_retocada=v_ficha.foto_retocada, categoria=v_ficha.categoria, activo=v_ficha.activo,
    destacado=v_ficha.destacado, medios=v_ficha.medios, detalles=v_ficha.detalles,
    por_encargo=v_ficha.por_encargo, encargo_texto=v_ficha.encargo_texto, slug=v_ficha.slug, tipo=v_ficha.tipo,
    rubro=v_ficha.rubro,
    stock=case when v_ajustar then p_stock_nuevo else v_producto.stock end
    where id=p_producto_id and tienda_id=p_tienda_id returning * into v_producto;
  if v_ajustar then
    insert into public.ajustes_inventario(id,tienda_id,producto_id,variacion,stock_anterior,stock_nuevo,motivo,nota,creado_por)
    values(p_ajuste_id,p_tienda_id,p_producto_id,v_delta::integer,p_stock_base,p_stock_nuevo,p_motivo,v_nota,v_actor);
  end if;
  return v_producto;
end $$;

create or replace function public.catalogo_publico(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
