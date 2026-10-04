-- Catálogo conectado, parte 3: el pedido del catálogo en el panel (docs/prompts/pedido-catalogo-panel.md).
--   * ver_solicitud (anon): suma lo que la hoja de estado necesita y es público: el nombre de la vendedora, el rubro (para
--     decir "3 perfumes") y cuándo salió (despachado_en). Ya registrada, las líneas y el total son los del pedido (con lo
--     quitado, lo pasado a encargo y lo editado después), no la foto inicial; la foto de cada línea sale de la solicitud o
--     del producto. Nunca cliente, teléfono, notas ni ids privados.
--   * registrar_solicitud: el cliente nuevo puede traer su nota (hasta 60, como clientes.nota), y un producto o variante
--     que ya no existe en la tienda no se registra (producto_no_disponible): hay que quitarlo.

create or replace function public.ver_solicitud(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_solicitud public.solicitudes_pedido;
  v_tienda public.tiendas;
  v_pedido public.pedidos;
  v_items jsonb;
  v_subtotal bigint;
  v_total integer;
  v_descuento integer;
begin
  select * into v_solicitud from public.solicitudes_pedido s where s.codigo = upper(btrim(coalesce(p_codigo, '')));
  if not found then
    raise exception 'solicitud_no_encontrada' using errcode = 'P0002';
  end if;
  select * into v_tienda from public.tiendas t where t.id = v_solicitud.tienda_id;
  perform public.tienda_publica(v_tienda.slug);

  v_items := v_solicitud.items;
  v_total := v_solicitud.total;
  v_descuento := v_solicitud.descuento;
  if v_solicitud.pedido_id is not null then
    select * into v_pedido from public.pedidos pe where pe.id = v_solicitud.pedido_id;
  end if;
  if v_pedido.id is not null then
    -- Lo que de verdad quedó en el pedido, en el orden en que lo pidió; la foto, la de la solicitud o la del producto.
    select coalesce(jsonb_agg(jsonb_build_object(
        'producto_id', i.producto_id,
        'variante_id', i.variante_id,
        'nombre', i.nombre_producto,
        'variante_texto', i.variante_texto,
        'foto', coalesce(o.x ->> 'foto', pr.fotos[1]),
        'precio_unitario', i.precio_unitario,
        'cantidad', i.cantidad,
        'por_encargo', i.por_encargo
      ) order by coalesce(o.n, 1000), i.nombre_producto), '[]'::jsonb),
      coalesce(sum(i.precio_unitario::bigint * i.cantidad), 0)
    into v_items, v_subtotal
    from public.pedido_items i
    left join public.productos pr on pr.id = i.producto_id
    left join lateral (
      select e.x, e.n from jsonb_array_elements(v_solicitud.items) with ordinality as e(x, n)
      where (e.x ->> 'producto_id')::uuid = i.producto_id
        and (e.x ->> 'variante_id')::uuid is not distinct from i.variante_id
      limit 1
    ) o on true
    where i.pedido_id = v_pedido.id;
    if jsonb_array_length(v_items) > 0 then
      v_total := v_pedido.total;
      v_descuento := greatest(0, v_subtotal - v_pedido.total)::integer;
    else
      v_items := v_solicitud.items;
    end if;
  end if;

  return jsonb_build_object(
    'id', case when v_tienda.id in (select public.mis_tiendas()) then v_solicitud.id end,
    'codigo', v_solicitud.codigo,
    'tienda', jsonb_build_object(
      'nombre', v_tienda.nombre,
      'slug', v_tienda.slug,
      'logo_url', v_tienda.logo_url,
      'foto_perfil_url', v_tienda.foto_perfil_url,
      'whatsapp', v_tienda.whatsapp,
      'nombre_vendedora', v_tienda.nombre_vendedora,
      'rubro', v_tienda.rubro
    ),
    'items', v_items,
    'descuento', v_descuento,
    'total', v_total,
    'creada_en', v_solicitud.creada_en,
    'vence_en', v_solicitud.vence_en,
    'estado', public.estado_solicitud(v_solicitud),
    'despachado_en', case when v_pedido.estado = 'despachado' then v_pedido.despachado_en end,
    'es_mi_tienda', (select auth.uid()) is not null and v_tienda.id in (select public.mis_tiendas())
  );
end
$$;

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
  -- Un producto o variante que ya no existe en la tienda no se registra (ni como encargo): la tienda lo quita.
  if exists (
    select 1 from jsonb_array_elements(v_items) x
    where not exists (select 1 from public.productos p where p.id = (x ->> 'producto_id')::uuid and p.tienda_id = v_solicitud.tienda_id)
       or ((x ->> 'variante_id') is not null and not exists (
         select 1 from public.producto_variantes v where v.id = (x ->> 'variante_id')::uuid and v.producto_id = (x ->> 'producto_id')::uuid))
  ) then
    raise exception 'producto_no_disponible' using errcode = 'P0001';
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
