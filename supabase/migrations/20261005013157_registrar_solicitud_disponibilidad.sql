-- Validación al registrar, compatible con las firmas existentes del catálogo y el panel.
-- No modifica filas ni descuenta/reserva stock; conserva la nota, los precios y la creación atómica.
create or replace function public.registrar_solicitud(
  p_solicitud_id uuid,
  p_cliente_id uuid,
  p_cliente_nuevo jsonb,
  p_quitar uuid[],
  p_encargo uuid[]
)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.solicitudes_pedido;
  v_cliente uuid := p_cliente_id;
  v_nombre text;
  v_telefono text;
  v_nota text;
  v_existente uuid;
  v_items jsonb;
  v_subtotal_antes bigint;
  v_subtotal bigint;
  v_descuento integer;
  v_pedido public.pedidos;
begin
  if (select auth.uid()) is null then
    raise exception 'solicitud_sin_permiso' using errcode = '42501';
  end if;
  -- El bloqueo de la fila: dos registros a la vez esperan uno al otro y el segundo encuentra pedido_id.
  select * into v_solicitud from public.solicitudes_pedido s where s.id = p_solicitud_id for update;
  if not found or not (v_solicitud.tienda_id in (select public.mis_tiendas())) then
    raise exception 'solicitud_no_encontrada' using errcode = 'P0002';
  end if;
  if v_solicitud.pedido_id is not null or v_solicitud.registrada_en is not null or v_solicitud.descartada_en is not null
     or v_solicitud.vence_en < now() then
    raise exception 'solicitud_no_registrable' using errcode = 'P0001';
  end if;

  -- Lo que queda (sin lo quitado), con los que pasan a encargo
  select coalesce(sum((x ->> 'precio_unitario')::bigint * (x ->> 'cantidad')::bigint), 0) into v_subtotal_antes
  from jsonb_array_elements(v_solicitud.items) x;
  select coalesce(jsonb_agg(
    case when (x ->> 'producto_id')::uuid = any(coalesce(p_encargo, '{}')) or (x ->> 'variante_id')::uuid = any(coalesce(p_encargo, '{}'))
      then jsonb_set(x, '{por_encargo}', 'true'::jsonb) else x end
    order by n), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(v_solicitud.items) with ordinality as e(x, n)
  where not ((x ->> 'producto_id')::uuid = any(coalesce(p_quitar, '{}')) or coalesce((x ->> 'variante_id')::uuid = any(coalesce(p_quitar, '{}')), false));
  if jsonb_array_length(v_items) = 0 then
    raise exception 'pedido_vacio' using errcode = 'P0001';
  end if;
  -- Mismo orden que mover_stock_items/ajustar_stock/guardar_variantes: productos, luego variantes, por id.
  -- No se reserva ni descuenta. Los bloqueos duran solo esta transacción y validan la disponibilidad actual.
  perform 1 from public.productos p
  where p.id in (select (x ->> 'producto_id')::uuid from jsonb_array_elements(v_items) x)
  order by p.id for update;
  perform 1 from public.producto_variantes v
  where v.id in (select (x ->> 'variante_id')::uuid from jsonb_array_elements(v_items) x)
  order by v.id for update;

  if exists (
    select 1 from jsonb_to_recordset(v_items) as i(producto_id uuid, variante_id uuid)
    left join public.productos p on p.id = i.producto_id and p.tienda_id = v_solicitud.tienda_id
    left join public.producto_variantes v on v.id = i.variante_id and v.producto_id = i.producto_id and v.tienda_id = v_solicitud.tienda_id
    where p.id is null or not p.activo
      or (i.variante_id is not null and (v.id is null or not v.activa))
      or (i.variante_id is null and exists (select 1 from public.producto_variantes pv where pv.producto_id = p.id and pv.activa))
  ) then
    raise exception 'producto_no_disponible' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from (
      select i.producto_id, i.variante_id, sum(i.cantidad::bigint) cantidad
      from jsonb_to_recordset(v_items) as i(producto_id uuid, variante_id uuid, cantidad integer, por_encargo boolean)
      where not coalesce(i.por_encargo, false)
      group by i.producto_id, i.variante_id
    ) i
    join public.productos p on p.id = i.producto_id
    left join public.producto_variantes v on v.id = i.variante_id
    where (case when i.variante_id is null then p.stock else v.stock end) < i.cantidad
  ) then
    raise exception 'disponibilidad_cambio' using errcode = 'P0001';
  end if;

  -- Cliente: uno de la tienda, o uno nuevo del catálogo (con su nota)
  if (p_cliente_id is null) = (p_cliente_nuevo is null) then
    raise exception 'cliente_invalido' using errcode = '22023';
  end if;
  if p_cliente_id is not null then
    if not exists (select 1 from public.clientes c where c.id = p_cliente_id and c.tienda_id = v_solicitud.tienda_id) then
      raise exception 'cliente_no_encontrado' using errcode = 'P0002';
    end if;
  else
    v_nombre := btrim(coalesce(p_cliente_nuevo ->> 'nombre', ''));
    v_telefono := public.telefono_do(p_cliente_nuevo ->> 'telefono');
    v_nota := nullif(btrim(coalesce(p_cliente_nuevo ->> 'nota', '')), '');
    if char_length(v_nombre) not between 1 and 120
       or (nullif(btrim(coalesce(p_cliente_nuevo ->> 'telefono', '')), '') is not null and v_telefono is null)
       or (v_nota is not null and char_length(v_nota) > 60) then
      raise exception 'cliente_invalido' using errcode = '22023';
    end if;
    if v_telefono is not null then
      v_telefono := '+' || v_telefono;
      select c.id into v_existente from public.clientes c where c.tienda_id = v_solicitud.tienda_id and c.telefono = v_telefono;
      if found then
        raise exception 'cliente_duplicado' using errcode = '23505', detail = v_existente::text;
      end if;
    end if;
    insert into public.clientes (tienda_id, nombre, telefono, nota, origen) values (v_solicitud.tienda_id, v_nombre, v_telefono, v_nota, 'catalogo')
    returning id into v_cliente;
  end if;

  select sum((x ->> 'precio_unitario')::bigint * (x ->> 'cantidad')::bigint) into v_subtotal from jsonb_array_elements(v_items) x;
  -- El descuento del código, en proporción a lo que queda
  v_descuento := case when v_subtotal_antes > 0 then round(v_solicitud.descuento::numeric * v_subtotal / v_subtotal_antes)::integer else 0 end;

  insert into public.pedidos (tienda_id, cliente_id, origen, estado, total, codigo_promo, pago_modo)
  values (v_solicitud.tienda_id, v_cliente, 'catalogo', 'nuevo', (v_subtotal - v_descuento)::integer, v_solicitud.codigo_promo, 'contado')
  returning * into v_pedido;
  insert into public.pedido_items (pedido_id, producto_id, variante_id, nombre_producto, cantidad, precio_unitario, por_encargo)
  select v_pedido.id, (x ->> 'producto_id')::uuid, (x ->> 'variante_id')::uuid, x ->> 'nombre',
    (x ->> 'cantidad')::integer, (x ->> 'precio_unitario')::integer, coalesce((x ->> 'por_encargo')::boolean, false)
  from jsonb_array_elements(v_items) x;

  update public.solicitudes_pedido s set pedido_id = v_pedido.id, registrada_en = now() where s.id = p_solicitud_id;
  return v_pedido;
end
$$;

revoke all on function public.registrar_solicitud(uuid, uuid, jsonb, uuid[], uuid[]) from public, anon;
grant execute on function public.registrar_solicitud(uuid, uuid, jsonb, uuid[], uuid[]) to authenticated;
