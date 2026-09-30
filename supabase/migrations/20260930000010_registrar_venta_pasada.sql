-- Registrar una venta que ya ocurrió: fecha elegida (no futura), entra como "despachado" con esa fecha.
-- El stock solo baja si p_descontar_stock = true (por defecto no: la venta pudo ser anterior a cargar el inventario).
create or replace function public.registrar_venta_pasada(
  p_tienda_id uuid,
  p_cliente_id uuid,
  p_fecha timestamptz,
  p_items jsonb,
  p_codigo_promo text default null,
  p_descontar_stock boolean default false
)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_total  bigint;
  v_falta  text;
begin
  if p_tienda_id not in (select public.mis_tiendas()) then
    raise exception 'tienda_no_encontrada' using errcode = 'P0002';
  end if;
  if p_fecha is null or p_fecha > now() or p_fecha < timestamptz '2000-01-01' then
    raise exception 'fecha_invalida' using errcode = 'P0001';
  end if;
  if p_cliente_id is not null and not exists (
    select 1 from public.clientes where id = p_cliente_id and tienda_id = p_tienda_id
  ) then
    raise exception 'cliente_no_encontrado' using errcode = 'P0002';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'sin_productos' using errcode = 'P0001';
  end if;

  if exists (select 1 from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int) where cantidad is null or cantidad <= 0 or precio_unitario is null or precio_unitario < 0 or producto_id is null) then
    raise exception 'items_invalidos' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as i(producto_id uuid, cantidad int, precio_unitario int)
    where not exists (select 1 from public.productos pr where pr.id = i.producto_id and pr.tienda_id = p_tienda_id)
  ) then
    raise exception 'producto_no_encontrado' using errcode = 'P0002';
  end if;

  if p_descontar_stock then
    perform 1 from public.productos where id in (select producto_id from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int)) order by id for update;
    select pr.nombre into v_falta
    from (select producto_id, sum(cantidad) as cant from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int) group by producto_id) i
    join public.productos pr on pr.id = i.producto_id
    where pr.stock is not null and pr.stock < i.cant limit 1;
    if v_falta is not null then raise exception 'stock_insuficiente: %', v_falta using errcode = 'P0001'; end if;
  end if;

  select sum(cantidad::bigint * precio_unitario) into v_total from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int);

  insert into public.pedidos (tienda_id, cliente_id, origen, estado, total, codigo_promo, creado_en, despachado_en)
  values (p_tienda_id, p_cliente_id, 'manual', 'despachado', v_total, nullif(trim(p_codigo_promo), ''), p_fecha, p_fecha)
  returning * into v_pedido;

  insert into public.pedido_items (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario)
  select v_pedido.id, i.producto_id, pr.nombre, i.cantidad, i.precio_unitario
  from jsonb_to_recordset(p_items) as i(producto_id uuid, cantidad int, precio_unitario int) join public.productos pr on pr.id = i.producto_id;

  if p_descontar_stock then
    update public.productos pr set stock = pr.stock - i.cant
    from (select producto_id, sum(cantidad) as cant from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int) group by producto_id) i
    where pr.id = i.producto_id and pr.stock is not null;
  end if;

  if p_cliente_id is not null then
    update public.clientes set primer_pedido_en = p_fecha
    where id = p_cliente_id and primer_pedido_en > p_fecha;
  end if;

  return v_pedido;
end
$$;
revoke all on function public.registrar_venta_pasada(uuid, uuid, timestamptz, jsonb, text, boolean) from public, anon;
grant execute on function public.registrar_venta_pasada(uuid, uuid, timestamptz, jsonb, text, boolean) to authenticated;
