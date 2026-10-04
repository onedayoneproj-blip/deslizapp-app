-- Guardar el producto en una sola vez (PR #42, docs/prompts/producto-panel.md).
--   * guardar_producto_inventario: p_cambios también acepta lo del catálogo conectado (medios, detalles, por_encargo,
--     encargo_texto, slug y tipo). Antes iban en un update aparte, y si ese segundo paso fallaba el producto quedaba a medias.
--     Las validaciones son las de siempre: constraints de productos y los triggers productos_medios / productos_detalles.
--   * crear_producto: crea el producto con todo lo anterior, cobra el retoque y deja sus opciones y variantes, en una
--     sola transacción.

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
  if v_actor is null or not exists(select 1 where p_tienda_id in(select public.mis_tiendas())) then
    raise exception 'ajuste_sin_permiso' using errcode='42501';
  end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' or exists(
    select 1 from jsonb_object_keys(p_cambios) k where k not in (
      'nombre','precio','fotos','foto_retocada','categoria','activo','destacado',
      'medios','detalles','por_encargo','encargo_texto','slug','tipo')
  ) or p_retocar is null then raise exception 'ficha_invalida' using errcode='22023'; end if;
  select * into v_producto from public.productos where id=p_producto_id and tienda_id=p_tienda_id for update;
  if not found then raise exception 'ajuste_producto_no_encontrado' using errcode='P0002'; end if;
  if v_ajustar then
    -- El mismo ID no puede aplicar el ajuste dos veces, incluso tras una respuesta perdida.
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
  -- Las constraints y los triggers de productos validan el resto (medios, detalles del rubro, encargo, slug); una
  -- excepción revierte todo, también el cobro del retoque y el ajuste.
  if p_retocar then perform public.gastar_creditos(p_tienda_id,5);end if;
  update public.productos set nombre=v_ficha.nombre, precio=v_ficha.precio, fotos=v_ficha.fotos,
    foto_retocada=v_ficha.foto_retocada, categoria=v_ficha.categoria, activo=v_ficha.activo,
    destacado=v_ficha.destacado, medios=v_ficha.medios, detalles=v_ficha.detalles,
    por_encargo=v_ficha.por_encargo, encargo_texto=v_ficha.encargo_texto, slug=v_ficha.slug, tipo=v_ficha.tipo,
    stock=case when v_ajustar then p_stock_nuevo else v_producto.stock end
    where id=p_producto_id and tienda_id=p_tienda_id returning * into v_producto;
  if v_ajustar then
    insert into public.ajustes_inventario(id,tienda_id,producto_id,variacion,stock_anterior,stock_nuevo,motivo,nota,creado_por)
    values(p_ajuste_id,p_tienda_id,p_producto_id,v_delta::integer,p_stock_base,p_stock_nuevo,p_motivo,v_nota,v_actor);
  end if;
  return v_producto;
end $$;

-- Crear un producto en una sola llamada: la ficha completa (con medios, detalles y encargo), el cobro del retoque
-- (p_creditos, 0 si no hay) y, si trae opciones, sus variantes (lo mismo que guardar_variantes). Todo o nada.
create function public.crear_producto(
  p_tienda_id uuid, p_producto jsonb, p_creditos integer default 0,
  p_opciones jsonb default '[]'::jsonb, p_variantes jsonb default '[]'::jsonb
) returns public.productos
language plpgsql security definer set search_path = '' as $$
declare
  v_fila public.productos;
  v_producto public.productos;
begin
  if (select auth.uid()) is null or not exists(select 1 where p_tienda_id in(select public.mis_tiendas())) then
    raise exception 'sin_permiso' using errcode='42501';
  end if;
  if p_producto is null or jsonb_typeof(p_producto) <> 'object' or exists(
    select 1 from jsonb_object_keys(p_producto) k where k not in (
      'nombre','precio','fotos','foto_retocada','categoria','activo','destacado','stock',
      'medios','detalles','por_encargo','encargo_texto','slug','tipo')
  ) or p_creditos is null or p_creditos < 0 then raise exception 'ficha_invalida' using errcode='22023'; end if;
  -- Lo que no venga toma el valor por defecto de la tabla.
  v_fila := jsonb_populate_record(null::public.productos, jsonb_build_object(
    'foto_retocada', false, 'activo', true, 'destacado', false, 'medios', '[]'::jsonb, 'detalles', '{}'::jsonb,
    'por_encargo', false, 'tipo', 'producto') || p_producto);
  if p_creditos > 0 then perform public.gastar_creditos(p_tienda_id, p_creditos); end if;
  insert into public.productos (tienda_id, nombre, precio, fotos, foto_retocada, categoria, activo, destacado, stock,
    slug, tipo, medios, detalles, por_encargo, encargo_texto)
  values (p_tienda_id, v_fila.nombre, v_fila.precio, coalesce(v_fila.fotos, '{}'), v_fila.foto_retocada, v_fila.categoria,
    v_fila.activo, v_fila.destacado, v_fila.stock, v_fila.slug, v_fila.tipo, v_fila.medios, v_fila.detalles,
    v_fila.por_encargo, v_fila.encargo_texto)
  returning * into v_producto;
  if p_opciones is not null and jsonb_typeof(p_opciones) = 'array' and jsonb_array_length(p_opciones) > 0 then
    perform public.guardar_variantes(p_tienda_id, v_producto.id, p_opciones, coalesce(p_variantes, '[]'::jsonb));
    select * into v_producto from public.productos where id = v_producto.id;
  end if;
  return v_producto;
end $$;
revoke all on function public.crear_producto(uuid,jsonb,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.crear_producto(uuid,jsonb,integer,jsonb,jsonb) to authenticated;
