-- Editar un pedido (misma identidad y número) y eliminar pedidos cancelados.
--  * nuevo / por_despachar: se puede cambiar todo (cliente, productos, código, fecha) y marcarlo como venta ya hecha.
--  * despachado: solo cliente y fecha (no toca stock ni productos).
--  * cancelado: no se edita (se reabre o se elimina).
create or replace function public.editar_pedido(
  p_pedido_id uuid,
  p_cliente_id uuid,
  p_items jsonb default null,
  p_codigo_promo text default null,
  p_fecha timestamptz default null,
  p_ya_hecho boolean default false,
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
  select * into v_pedido from public.pedidos
  where id = p_pedido_id and tienda_id in (select public.mis_tiendas())
  for update;
  if not found then raise exception 'pedido_no_encontrado' using errcode = 'P0002'; end if;
  if v_pedido.estado = 'cancelado' then raise exception 'pedido_no_editable' using errcode = 'P0001'; end if;

  if p_fecha is not null and (p_fecha > now() or p_fecha < timestamptz '2000-01-01') then
    raise exception 'fecha_invalida' using errcode = 'P0001';
  end if;
  if p_cliente_id is not null and not exists (
    select 1 from public.clientes where id = p_cliente_id and tienda_id = v_pedido.tienda_id
  ) then
    raise exception 'cliente_no_encontrado' using errcode = 'P0002';
  end if;

  -- Despachado: solo cliente y fecha.
  if v_pedido.estado = 'despachado' then
    update public.pedidos
    set cliente_id = p_cliente_id,
        creado_en = coalesce(p_fecha, creado_en),
        despachado_en = coalesce(p_fecha, despachado_en)
    where id = p_pedido_id returning * into v_pedido;
  else
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
      raise exception 'sin_productos' using errcode = 'P0001';
    end if;
    if exists (select 1 from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int)
               where cantidad is null or cantidad <= 0 or precio_unitario is null or precio_unitario < 0 or producto_id is null) then
      raise exception 'items_invalidos' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from jsonb_to_recordset(p_items) as i(producto_id uuid, cantidad int, precio_unitario int)
      where not exists (select 1 from public.productos pr where pr.id = i.producto_id and pr.tienda_id = v_pedido.tienda_id)
    ) then
      raise exception 'producto_no_encontrado' using errcode = 'P0002';
    end if;
    if p_ya_hecho and p_fecha is null then raise exception 'fecha_invalida' using errcode = 'P0001'; end if;

    if p_ya_hecho and p_descontar_stock then
      perform 1 from public.productos where id in (select producto_id from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int)) order by id for update;
      select pr.nombre into v_falta
      from (select producto_id, sum(cantidad) as cant from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int) group by producto_id) i
      join public.productos pr on pr.id = i.producto_id
      where pr.stock is not null and pr.stock < i.cant limit 1;
      if v_falta is not null then raise exception 'stock_insuficiente: %', v_falta using errcode = 'P0001'; end if;
    end if;

    select sum(cantidad::bigint * precio_unitario) into v_total
    from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int);

    delete from public.pedido_items where pedido_id = p_pedido_id;
    insert into public.pedido_items (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario)
    select p_pedido_id, i.producto_id, pr.nombre, i.cantidad, i.precio_unitario
    from jsonb_to_recordset(p_items) as i(producto_id uuid, cantidad int, precio_unitario int)
    join public.productos pr on pr.id = i.producto_id;

    update public.pedidos
    set cliente_id = p_cliente_id,
        total = v_total,
        codigo_promo = nullif(trim(p_codigo_promo), ''),
        creado_en = coalesce(p_fecha, creado_en),
        estado = case when p_ya_hecho then 'despachado' else estado end,
        despachado_en = case when p_ya_hecho then p_fecha else despachado_en end
    where id = p_pedido_id returning * into v_pedido;

    if p_ya_hecho and p_descontar_stock then
      update public.productos pr set stock = pr.stock - i.cant
      from (select producto_id, sum(cantidad) as cant from jsonb_to_recordset(p_items) as _i(producto_id uuid, cantidad int, precio_unitario int) group by producto_id) i
      where pr.id = i.producto_id and pr.stock is not null;
    end if;
  end if;

  if v_pedido.cliente_id is not null and p_fecha is not null then
    update public.clientes set primer_pedido_en = p_fecha
    where id = v_pedido.cliente_id and primer_pedido_en > p_fecha;
  end if;
  return v_pedido;
end
$$;
revoke all on function public.editar_pedido(uuid, uuid, jsonb, text, timestamptz, boolean, boolean) from public, anon;
grant execute on function public.editar_pedido(uuid, uuid, jsonb, text, timestamptz, boolean, boolean) to authenticated;

create or replace function public.eliminar_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_estado text;
begin
  select estado into v_estado from public.pedidos
  where id = p_pedido_id and tienda_id in (select public.mis_tiendas())
  for update;
  if not found then raise exception 'pedido_no_encontrado' using errcode = 'P0002'; end if;
  if v_estado <> 'cancelado' then raise exception 'solo_cancelados' using errcode = 'P0001'; end if;
  delete from public.pedido_items where pedido_id = p_pedido_id;
  delete from public.pedidos where id = p_pedido_id;
end
$$;
revoke all on function public.eliminar_pedido(uuid) from public, anon;
grant execute on function public.eliminar_pedido(uuid) to authenticated;
