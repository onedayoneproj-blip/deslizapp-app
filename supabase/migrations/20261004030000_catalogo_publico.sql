-- Catálogo conectado, migración 3 de 4 (docs/12-catalogo-conectado.md §5, §6, §7 y §9).
-- Lo público: el catálogo de una tienda, las solicitudes de pedido, los aaahs y "Avísame cuando llegue".
-- Ninguna función pública devuelve stock exacto mayor que 3, costos, clientes, códigos de promo ni datos internos, y todas
-- revisan que la tienda esté activa y con el catálogo publicado (si no: catalogo_no_disponible).

-- ---------------------------------------------------------------------------------------------------------------------
-- Piezas comunes
-- ---------------------------------------------------------------------------------------------------------------------

-- La tienda pública por su slug, o catalogo_no_disponible
create function public.tienda_publica(p_slug text)
returns public.tiendas
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tienda public.tiendas;
begin
  select * into v_tienda from public.tiendas t
  where t.slug = lower(btrim(coalesce(p_slug, ''))) and t.estado = 'activa' and t.catalogo_estado = 'publicado';
  if not found then
    raise exception 'catalogo_no_disponible' using errcode = 'P0002';
  end if;
  return v_tienda;
end
$$;

-- hay (sin control o más de 3) · quedan (1 a 3) · agotado (0 sin encargo) · por_encargo (0 con encargo)
create function public.disponibilidad(p_stock integer, p_por_encargo boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_stock is null or p_stock > 3 then 'hay'
    when p_stock between 1 and 3 then 'quedan'
    when coalesce(p_por_encargo, false) then 'por_encargo'
    else 'agotado'
  end
$$;

-- El stock que cuenta para el público: el de las variantes activas si las hay (sin control si alguna no lo lleva)
create function public.stock_publico(p_producto public.productos)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when not exists (select 1 from public.producto_variantes v where v.producto_id = p_producto.id and v.activa) then p_producto.stock
    when exists (select 1 from public.producto_variantes v where v.producto_id = p_producto.id and v.activa and v.stock is null) then null
    else (select sum(v.stock)::integer from public.producto_variantes v where v.producto_id = p_producto.id and v.activa)
  end
$$;

-- La mejor promo automática vigente (de producto o de su colección), la misma regla que precioConPromo (lib/promos.ts):
-- no pausada, no terminada, ya empezó y no venció; gana el porcentaje más alto.
create function public.promo_automatica(p_producto_id uuid, p_ahora timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('nombre', pr.nombre, 'porcentaje', pr.valor_porcentaje)
  from public.productos p
  join public.promos pr on pr.tienda_id = p.tienda_id
  where p.id = p_producto_id
    and pr.valor_porcentaje is not null
    and not pr.pausada
    and pr.estado <> 'terminada'
    and pr.fecha_inicio <= p_ahora
    and (pr.fecha_fin is null or pr.fecha_fin >= p_ahora)
    and ((pr.tipo = 'producto' and pr.producto_id = p.id)
      or (pr.tipo = 'coleccion' and pr.coleccion is not null and pr.coleccion = p.categoria))
  order by pr.valor_porcentaje desc, pr.fecha_inicio, pr.id
  limit 1
$$;

-- precioConPromo en SQL: el precio con la mejor promo automática (redondeo al peso, como Math.round)
create function public.precio_con_promo(p_producto_id uuid, p_precio integer, p_ahora timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_precio - round(p_precio::numeric * ((public.promo_automatica(p_producto_id, p_ahora)) ->> 'porcentaje')::numeric / 100)::integer,
    p_precio)
$$;

-- La foto de portada: la primera foto de medios (o de fotos)
create function public.portada_producto(p_producto public.productos)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (select e ->> 'url' from jsonb_array_elements(p_producto.medios) with ordinality as m(e, n) where e ->> 'tipo' = 'foto' order by n limit 1),
    p_producto.fotos[1])
$$;

-- "8095550142", "809-555-0142", "+1 809 555 0142" → "18095550142" (solo dígitos con código de país, como tiendas.whatsapp).
-- La misma regla que normalizarTelefonoDO (lib/telefono.ts): 809, 829 o 849. null si no es dominicano.
create function public.telefono_do(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^1(809|829|849)[0-9]{7}$' then d
    when d ~ '^(809|829|849)[0-9]{7}$' then '1' || d
    else null
  end
  from (select regexp_replace(coalesce(p_texto, ''), '[^0-9]', '', 'g') as d) x
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- El catálogo de una tienda
-- ---------------------------------------------------------------------------------------------------------------------

create function public.catalogo_publico(p_slug text)
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
      'rubro', v_tienda.rubro
    ),
    'productos', coalesce((
      select jsonb_agg(x.producto order by x.destacado desc, x.creado_en desc, x.id)
      from (
        select p.destacado, p.creado_en, p.id,
          jsonb_build_object(
            'id', p.id,
            'slug', p.slug,
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

-- ---------------------------------------------------------------------------------------------------------------------
-- Solicitudes de pedido (el pedido del catálogo antes de que la tienda lo registre)
-- ---------------------------------------------------------------------------------------------------------------------

create table public.solicitudes_pedido (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  codigo text not null unique check (codigo ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$'),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  codigo_promo text,
  descuento integer not null default 0 check (descuento >= 0),
  total integer not null check (total >= 0),
  dispositivo text not null check (char_length(dispositivo) between 1 and 64),
  creada_en timestamptz not null default now(),
  vence_en timestamptz not null default now() + interval '7 days',
  pedido_id uuid references public.pedidos(id) on delete set null,
  -- Cuándo se registró (así un pedido borrado después no vuelve a verse como "enviado")
  registrada_en timestamptz,
  descartada_en timestamptz
);
create index solicitudes_pedido_tienda_idx on public.solicitudes_pedido (tienda_id, creada_en desc);
create index solicitudes_pedido_dispositivo_idx on public.solicitudes_pedido (dispositivo, creada_en desc);
create index solicitudes_pedido_pedido_idx on public.solicitudes_pedido (pedido_id) where pedido_id is not null;

alter table public.solicitudes_pedido enable row level security;
create policy solicitudes_pedido_de_mis_tiendas on public.solicitudes_pedido
  for select to authenticated using (tienda_id in (select public.mis_tiendas()));
revoke all on public.solicitudes_pedido from anon, authenticated;
grant select on public.solicitudes_pedido to authenticated;

-- 10 caracteres sin ambigüedad (sin I, O, 0, 1), al azar
create function public.codigo_solicitud()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_letras constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_codigo text;
begin
  loop
    v_bytes := extensions.gen_random_bytes(10);
    select string_agg(substr(v_letras, (get_byte(v_bytes, i) % 32) + 1, 1), '' order by i) into v_codigo
    from generate_series(0, 9) as i;
    exit when not exists (select 1 from public.solicitudes_pedido s where s.codigo = v_codigo);
  end loop;
  return v_codigo;
end
$$;

-- Un código de descuento que sirve en el catálogo: vigente, sin cliente_id y con cupo. Devuelve el porcentaje o null.
create function public.porcentaje_codigo_publico(p_tienda_id uuid, p_codigo text, p_ahora timestamptz)
returns integer
language sql
stable
set search_path = ''
as $$
  select pr.valor_porcentaje
  from public.promos pr
  where pr.tienda_id = p_tienda_id and pr.tipo = 'codigo' and pr.cliente_id is null
    and pr.codigo = upper(btrim(p_codigo))
    and not pr.pausada and pr.estado <> 'terminada'
    and pr.fecha_inicio <= p_ahora and (pr.fecha_fin is null or pr.fecha_fin >= p_ahora)
    and (pr.limite_usos is null or pr.limite_usos > (
      select count(*) from public.pedidos pe
      where pe.tienda_id = pr.tienda_id and pe.estado <> 'cancelado' and upper(pe.codigo_promo) = pr.codigo
        and pe.creado_en >= pr.fecha_inicio and (pr.fecha_fin is null or pe.creado_en <= pr.fecha_fin)
    ))
  limit 1
$$;

create function public.crear_solicitud_pedido(p_slug text, p_items jsonb, p_codigo_promo text, p_dispositivo text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_tienda public.tiendas := public.tienda_publica(p_slug);
  v_ahora timestamptz := now();
  v_item jsonb;
  v_producto public.productos;
  v_variante public.producto_variantes;
  v_cantidad integer;
  v_stock integer;
  v_encargo boolean;
  v_lineas jsonb := '[]'::jsonb;
  v_subtotal bigint := 0;
  v_porcentaje integer;
  v_codigo_promo text := nullif(upper(btrim(coalesce(p_codigo_promo, ''))), '');
  v_descuento integer := 0;
  v_solicitud public.solicitudes_pedido;
begin
  if p_dispositivo is null or char_length(p_dispositivo) not between 1 and 64 then
    raise exception 'dispositivo_invalido' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'items_invalidos' using errcode = '22023';
  end if;

  -- Las vencidas sin registrar de esta tienda se van
  delete from public.solicitudes_pedido s where s.tienda_id = v_tienda.id and s.pedido_id is null and s.vence_en < v_ahora;

  if (select count(*) from public.solicitudes_pedido s where s.dispositivo = p_dispositivo and s.creada_en > v_ahora - interval '1 hour') >= 10
     or (select count(*) from public.solicitudes_pedido s where s.tienda_id = v_tienda.id and s.creada_en > v_ahora - interval '1 day') >= 300 then
    raise exception 'demasiadas_solicitudes' using errcode = '54000';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' or jsonb_typeof(v_item -> 'cantidad') <> 'number' or (v_item ->> 'producto_id') is null then
      raise exception 'items_invalidos' using errcode = '22023';
    end if;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    if v_cantidad not between 1 and 20 then
      raise exception 'items_invalidos' using errcode = '22023';
    end if;
    select * into v_producto from public.productos p
    where p.id = (v_item ->> 'producto_id')::uuid and p.tienda_id = v_tienda.id and p.activo;
    if not found then
      raise exception 'producto_no_disponible' using errcode = 'P0001';
    end if;
    v_variante := null;
    if exists (select 1 from public.producto_variantes v where v.producto_id = v_producto.id and v.activa) then
      select * into v_variante from public.producto_variantes v
      where v.id = (v_item ->> 'variante_id')::uuid and v.producto_id = v_producto.id and v.activa;
      if not found then
        raise exception 'producto_no_disponible: %', v_producto.nombre using errcode = 'P0001';
      end if;
      v_stock := v_variante.stock;
    elsif v_item ->> 'variante_id' is not null then
      raise exception 'producto_no_disponible: %', v_producto.nombre using errcode = 'P0001';
    else
      v_stock := v_producto.stock;
    end if;
    -- Pedible: hay, quedan (y alcanza) o por encargo
    v_encargo := false;
    if v_stock is not null and v_stock < v_cantidad then
      if v_producto.por_encargo then
        v_encargo := true;
      else
        raise exception 'producto_no_disponible: %', v_producto.nombre using errcode = 'P0001';
      end if;
    end if;
    v_lineas := v_lineas || jsonb_build_array(jsonb_build_object(
      'producto_id', v_producto.id,
      'variante_id', v_variante.id,
      'nombre', v_producto.nombre,
      'variante_texto', case when v_variante.id is not null then public.texto_variante(v_producto.opciones, v_variante.valores) end,
      'foto', public.portada_producto(v_producto),
      'precio_unitario', public.precio_con_promo(v_producto.id, coalesce(v_variante.precio, v_producto.precio), v_ahora),
      'cantidad', v_cantidad,
      'por_encargo', v_encargo
    ));
    v_subtotal := v_subtotal + v_cantidad::bigint * public.precio_con_promo(v_producto.id, coalesce(v_variante.precio, v_producto.precio), v_ahora);
  end loop;

  if v_codigo_promo is not null then
    v_porcentaje := public.porcentaje_codigo_publico(v_tienda.id, v_codigo_promo, v_ahora);
    if v_porcentaje is null then
      raise exception 'codigo_no_valido' using errcode = '22023';
    end if;
    v_descuento := round(v_subtotal::numeric * v_porcentaje / 100)::integer;
  end if;

  insert into public.solicitudes_pedido (tienda_id, codigo, items, codigo_promo, descuento, total, dispositivo, creada_en, vence_en)
  values (v_tienda.id, public.codigo_solicitud(), v_lineas, v_codigo_promo, v_descuento, (v_subtotal - v_descuento)::integer,
    p_dispositivo, v_ahora, v_ahora + interval '7 days')
  returning * into v_solicitud;

  return jsonb_build_object(
    'codigo', v_solicitud.codigo,
    'subtotal', v_subtotal,
    'descuento', v_solicitud.descuento,
    'total', v_solicitud.total,
    'codigo_promo', v_solicitud.codigo_promo,
    'items', v_solicitud.items,
    'vence_en', v_solicitud.vence_en
  );
end
$$;

-- El estado de una solicitud: enviado · confirmado · despachado · cancelado · vencido
create function public.estado_solicitud(p_solicitud public.solicitudes_pedido)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_solicitud.pedido_id is not null then (
      select case pe.estado when 'despachado' then 'despachado' when 'cancelado' then 'cancelado' else 'confirmado' end
      from public.pedidos pe where pe.id = p_solicitud.pedido_id)
    when p_solicitud.registrada_en is not null then 'cancelado'
    when p_solicitud.descartada_en is not null or p_solicitud.vence_en < now() then 'vencido'
    else 'enviado'
  end
$$;

create function public.ver_solicitud(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_solicitud public.solicitudes_pedido;
  v_tienda public.tiendas;
begin
  select * into v_solicitud from public.solicitudes_pedido s where s.codigo = upper(btrim(coalesce(p_codigo, '')));
  if not found then
    raise exception 'solicitud_no_encontrada' using errcode = 'P0002';
  end if;
  select * into v_tienda from public.tiendas t where t.id = v_solicitud.tienda_id;
  perform public.tienda_publica(v_tienda.slug);
  return jsonb_build_object(
    'id', case when v_tienda.id in (select public.mis_tiendas()) then v_solicitud.id end,
    'codigo', v_solicitud.codigo,
    'tienda', jsonb_build_object(
      'nombre', v_tienda.nombre,
      'slug', v_tienda.slug,
      'logo_url', v_tienda.logo_url,
      'foto_perfil_url', v_tienda.foto_perfil_url,
      'whatsapp', v_tienda.whatsapp
    ),
    'items', v_solicitud.items,
    'descuento', v_solicitud.descuento,
    'total', v_solicitud.total,
    'creada_en', v_solicitud.creada_en,
    'vence_en', v_solicitud.vence_en,
    'estado', public.estado_solicitud(v_solicitud),
    'es_mi_tienda', (select auth.uid()) is not null and v_tienda.id in (select public.mis_tiendas())
  );
end
$$;

-- La tienda registra la solicitud: une o crea el cliente, quita o pasa a encargo lo que ya no está y crea el pedido.
create function public.registrar_solicitud(
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
  select * into v_solicitud from public.solicitudes_pedido s where s.id = p_solicitud_id for update;
  if not found or not (v_solicitud.tienda_id in (select public.mis_tiendas())) then
    raise exception 'solicitud_no_encontrada' using errcode = 'P0002';
  end if;
  if v_solicitud.pedido_id is not null or v_solicitud.registrada_en is not null or v_solicitud.descartada_en is not null
     or v_solicitud.vence_en < now() then
    raise exception 'solicitud_no_registrable' using errcode = 'P0001';
  end if;

  -- Cliente: uno de la tienda, o uno nuevo del catálogo
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
    if char_length(v_nombre) not between 1 and 120 or (nullif(btrim(coalesce(p_cliente_nuevo ->> 'telefono', '')), '') is not null and v_telefono is null) then
      raise exception 'cliente_invalido' using errcode = '22023';
    end if;
    if v_telefono is not null then
      v_telefono := '+' || v_telefono;
      select c.id into v_existente from public.clientes c where c.tienda_id = v_solicitud.tienda_id and c.telefono = v_telefono;
      if found then
        raise exception 'cliente_duplicado' using errcode = '23505', detail = v_existente::text;
      end if;
    end if;
    insert into public.clientes (tienda_id, nombre, telefono, origen) values (v_solicitud.tienda_id, v_nombre, v_telefono, 'catalogo')
    returning id into v_cliente;
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

create function public.descartar_solicitud(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud public.solicitudes_pedido;
begin
  select * into v_solicitud from public.solicitudes_pedido s where s.id = p_solicitud_id for update;
  if not found or (select auth.uid()) is null or not (v_solicitud.tienda_id in (select public.mis_tiendas())) then
    raise exception 'solicitud_no_encontrada' using errcode = 'P0002';
  end if;
  if v_solicitud.pedido_id is not null or v_solicitud.registrada_en is not null then
    raise exception 'solicitud_no_registrable' using errcode = 'P0001';
  end if;
  update public.solicitudes_pedido s set descartada_en = coalesce(s.descartada_en, now()) where s.id = p_solicitud_id;
end
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Aaahs del catálogo (uno por dispositivo y producto)
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.eventos_aaah
  add column dispositivo text check (dispositivo is null or char_length(dispositivo) between 1 and 64),
  add constraint eventos_aaah_producto_dispositivo_unico unique (producto_id, dispositivo);
create index eventos_aaah_dispositivo_idx on public.eventos_aaah (dispositivo, creado_en desc) where dispositivo is not null;

-- Con p_on = true lo crea (si no existe); con false lo quita. El trigger de likes sigue sumando y restando. Devuelve los likes.
create function public.registrar_aaah(p_slug text, p_producto_slug text, p_dispositivo text, p_on boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tienda public.tiendas := public.tienda_publica(p_slug);
  v_producto public.productos;
begin
  if p_dispositivo is null or char_length(p_dispositivo) not between 1 and 64 or p_on is null then
    raise exception 'dispositivo_invalido' using errcode = '22023';
  end if;
  select * into v_producto from public.productos p
  where p.tienda_id = v_tienda.id and p.slug = lower(btrim(coalesce(p_producto_slug, ''))) and p.activo;
  if not found then
    raise exception 'producto_no_disponible' using errcode = 'P0001';
  end if;
  if p_on then
    if (select count(*) from public.eventos_aaah e where e.dispositivo = p_dispositivo and e.creado_en > now() - interval '1 hour') >= 120 then
      raise exception 'demasiados_aaah' using errcode = '54000';
    end if;
    insert into public.eventos_aaah (tienda_id, producto_id, dispositivo) values (v_tienda.id, v_producto.id, p_dispositivo)
    on conflict (producto_id, dispositivo) do nothing;
  else
    delete from public.eventos_aaah e where e.producto_id = v_producto.id and e.dispositivo = p_dispositivo;
  end if;
  return (select p.likes from public.productos p where p.id = v_producto.id);
end
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Avísame cuando llegue
-- ---------------------------------------------------------------------------------------------------------------------

create table public.avisos_llegada (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  variante_id uuid references public.producto_variantes(id) on delete cascade,
  telefono text not null check (telefono ~ '^[0-9]{10,15}$'),
  nombre text check (nombre is null or char_length(nombre) between 1 and 60),
  dispositivo text not null check (char_length(dispositivo) between 1 and 64),
  creado_en timestamptz not null default now(),
  avisado_en timestamptz
);
create unique index avisos_llegada_unico on public.avisos_llegada
  (producto_id, coalesce(variante_id, '00000000-0000-0000-0000-000000000000'::uuid), telefono) where avisado_en is null;
create index avisos_llegada_tienda_idx on public.avisos_llegada (tienda_id, producto_id) where avisado_en is null;
create index avisos_llegada_dispositivo_idx on public.avisos_llegada (dispositivo, creado_en desc);

alter table public.avisos_llegada enable row level security;
create policy avisos_llegada_de_mis_tiendas on public.avisos_llegada
  for select to authenticated using (tienda_id in (select public.mis_tiendas()));
revoke all on public.avisos_llegada from anon, authenticated;
grant select on public.avisos_llegada to authenticated;

-- Solo si eso está agotado (o por encargo). No duplica un aviso pendiente. Devuelve true.
create function public.pedir_aviso(
  p_slug text, p_producto_slug text, p_variante_id uuid, p_telefono text, p_nombre text, p_dispositivo text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tienda public.tiendas := public.tienda_publica(p_slug);
  v_producto public.productos;
  v_variante public.producto_variantes;
  v_telefono text := public.telefono_do(p_telefono);
  v_nombre text := nullif(btrim(coalesce(p_nombre, '')), '');
  v_disponibilidad text;
begin
  if p_dispositivo is null or char_length(p_dispositivo) not between 1 and 64 then
    raise exception 'dispositivo_invalido' using errcode = '22023';
  end if;
  if v_telefono is null then
    raise exception 'telefono_invalido' using errcode = '22023';
  end if;
  if v_nombre is not null and char_length(v_nombre) > 60 then
    raise exception 'nombre_invalido' using errcode = '22023';
  end if;
  select * into v_producto from public.productos p
  where p.tienda_id = v_tienda.id and p.slug = lower(btrim(coalesce(p_producto_slug, ''))) and p.activo and p.tipo = 'producto';
  if not found then
    raise exception 'producto_no_disponible' using errcode = 'P0001';
  end if;
  if p_variante_id is not null then
    select * into v_variante from public.producto_variantes v where v.id = p_variante_id and v.producto_id = v_producto.id and v.activa;
    if not found then
      raise exception 'producto_no_disponible' using errcode = 'P0001';
    end if;
    v_disponibilidad := public.disponibilidad(v_variante.stock, v_producto.por_encargo);
  else
    v_disponibilidad := public.disponibilidad(public.stock_publico(v_producto), v_producto.por_encargo);
  end if;
  if v_disponibilidad not in ('agotado', 'por_encargo') then
    raise exception 'aviso_no_disponible' using errcode = 'P0001';
  end if;
  if (select count(*) from public.avisos_llegada a where a.dispositivo = p_dispositivo and a.creado_en > now() - interval '1 hour') >= 10 then
    raise exception 'demasiados_avisos' using errcode = '54000';
  end if;
  insert into public.avisos_llegada (tienda_id, producto_id, variante_id, telefono, nombre, dispositivo)
  values (v_tienda.id, v_producto.id, p_variante_id, v_telefono, v_nombre, p_dispositivo)
  on conflict (producto_id, coalesce(variante_id, '00000000-0000-0000-0000-000000000000'::uuid), telefono) where avisado_en is null
  do nothing;
  return true;
end
$$;

-- La tienda marca a quién ya le avisó. Devuelve cuántos cerró.
create function public.marcar_avisado(p_aviso_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if (select auth.uid()) is null then
    raise exception 'aviso_sin_permiso' using errcode = '42501';
  end if;
  update public.avisos_llegada a set avisado_en = now()
  where a.id = any(coalesce(p_aviso_ids, '{}')) and a.avisado_en is null and a.tienda_id in (select public.mis_tiendas());
  get diagnostics v_n = row_count;
  return v_n;
end
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Permisos: lo público para anon y authenticated; lo de la tienda solo para authenticated; lo interno para nadie
-- ---------------------------------------------------------------------------------------------------------------------

revoke all on function public.tienda_publica(text) from public, anon, authenticated;
revoke all on function public.stock_publico(public.productos) from public, anon, authenticated;
revoke all on function public.promo_automatica(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.portada_producto(public.productos) from public, anon, authenticated;
revoke all on function public.codigo_solicitud() from public, anon, authenticated;
revoke all on function public.porcentaje_codigo_publico(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.estado_solicitud(public.solicitudes_pedido) from public, anon, authenticated;
revoke all on function public.disponibilidad(integer, boolean) from public, anon;
revoke all on function public.telefono_do(text) from public, anon;
revoke all on function public.precio_con_promo(uuid, integer, timestamptz) from public, anon;
grant execute on function public.disponibilidad(integer, boolean) to authenticated;
grant execute on function public.telefono_do(text) to authenticated;
grant execute on function public.precio_con_promo(uuid, integer, timestamptz) to authenticated;

revoke all on function public.catalogo_publico(text) from public;
revoke all on function public.crear_solicitud_pedido(text, jsonb, text, text) from public;
revoke all on function public.ver_solicitud(text) from public;
revoke all on function public.registrar_aaah(text, text, text, boolean) from public;
revoke all on function public.pedir_aviso(text, text, uuid, text, text, text) from public;
grant execute on function public.catalogo_publico(text) to anon, authenticated;
grant execute on function public.crear_solicitud_pedido(text, jsonb, text, text) to anon, authenticated;
grant execute on function public.ver_solicitud(text) to anon, authenticated;
grant execute on function public.registrar_aaah(text, text, text, boolean) to anon, authenticated;
grant execute on function public.pedir_aviso(text, text, uuid, text, text, text) to anon, authenticated;

revoke all on function public.registrar_solicitud(uuid, uuid, jsonb, uuid[], uuid[]) from public, anon;
revoke all on function public.descartar_solicitud(uuid) from public, anon;
revoke all on function public.marcar_avisado(uuid[]) from public, anon;
grant execute on function public.registrar_solicitud(uuid, uuid, jsonb, uuid[], uuid[]) to authenticated;
grant execute on function public.descartar_solicitud(uuid) to authenticated;
grant execute on function public.marcar_avisado(uuid[]) to authenticated;
