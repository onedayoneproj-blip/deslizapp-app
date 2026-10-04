-- Catálogo conectado, migración 2 de 4 (docs/12-catalogo-conectado.md §2 y §8).
-- Variantes con su stock, y pedidos e inventario por variante. Compatible con la app de hoy: un producto sin variantes se
-- comporta igual, y ajustar_stock / reponer_stock / despachar / deshacer / editar / registrar_venta_pasada aceptan los
-- argumentos de hoy.

-- ---------------------------------------------------------------------------------------------------------------------
-- Variantes
-- ---------------------------------------------------------------------------------------------------------------------

create table public.producto_variantes (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  producto_id uuid not null,
  valores jsonb not null check (jsonb_typeof(valores) = 'object'),
  stock integer check (stock is null or stock >= 0),
  precio integer check (precio is null or precio >= 0),
  activa boolean not null default true,
  orden smallint not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- La variante es de la misma tienda que su producto (la llave compuesta lo garantiza)
  foreign key (producto_id, tienda_id) references public.productos(id, tienda_id) on delete cascade,
  unique (producto_id, valores)
);
create index producto_variantes_tienda_idx on public.producto_variantes (tienda_id);

alter table public.producto_variantes enable row level security;
create policy producto_variantes_de_mis_tiendas on public.producto_variantes
  for all to authenticated
  using (tienda_id in (select public.mis_tiendas()))
  with check (tienda_id in (select public.mis_tiendas()));
-- Como en productos: el stock solo cambia por las funciones (guardar_variantes, ajustar_stock, pedidos)
revoke all on public.producto_variantes from anon, authenticated;
grant select, insert on public.producto_variantes to authenticated;
grant update (valores, precio, activa, orden) on public.producto_variantes to authenticated;

-- "Talla M · Negro" → "M · Negro": los valores en el orden de los ejes del producto, separados por " · ".
create function public.texto_variante(p_opciones jsonb, p_valores jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg(p_valores ->> (e.v ->> 'nombre'), ' · ' order by e.n)
  from jsonb_array_elements(coalesce(p_opciones, '[]'::jsonb)) with ordinality as e(v, n)
  where p_valores ? (e.v ->> 'nombre')
$$;

-- La variante es de un producto (no de un servicio) y trae exactamente un valor por eje, que existe en ese eje.
create function public.validar_variante()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_producto public.productos;
begin
  if tg_op = 'UPDATE' and new.valores is not distinct from old.valores and new.producto_id is not distinct from old.producto_id then
    return new;
  end if;
  select * into v_producto from public.productos p where p.id = new.producto_id and p.tienda_id = new.tienda_id;
  if not found or v_producto.tipo <> 'producto' then
    raise exception 'variante_invalida' using errcode = '22023';
  end if;
  if jsonb_array_length(v_producto.opciones) = 0
     or (select count(*) from jsonb_object_keys(new.valores)) <> jsonb_array_length(v_producto.opciones)
     or exists (
       select 1 from jsonb_array_elements(v_producto.opciones) e
       where not (new.valores ? (e ->> 'nombre'))
          or jsonb_typeof(new.valores -> (e ->> 'nombre')) <> 'string'
          or not ((e -> 'valores') @> jsonb_build_array(new.valores -> (e ->> 'nombre')))
     ) then
    raise exception 'variante_invalida' using errcode = '22023';
  end if;
  new.actualizado_en := now();
  return new;
end
$$;
create trigger producto_variantes_validar before insert or update on public.producto_variantes
  for each row execute function public.validar_variante();

-- productos.stock con variantes = la suma de las activas (null si todas son null). Sin variantes activas no se toca: el
-- producto vuelve a stock simple y conserva la última suma.
create function public.sumar_stock_variantes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto uuid := coalesce(new.producto_id, old.producto_id);
begin
  if exists (select 1 from public.producto_variantes v where v.producto_id = v_producto and v.activa) then
    update public.productos p
    set stock = (
      select case when count(v.stock) = 0 then null else sum(v.stock)::integer end
      from public.producto_variantes v where v.producto_id = v_producto and v.activa
    )
    where p.id = v_producto;
  end if;
  return null;
end
$$;
create trigger producto_variantes_stock after insert or update or delete on public.producto_variantes
  for each row execute function public.sumar_stock_variantes();

-- Un servicio no lleva variantes
create function public.servicio_sin_variantes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo = 'servicio' and exists (select 1 from public.producto_variantes v where v.producto_id = new.id and v.activa) then
    raise exception 'variante_invalida' using errcode = '22023';
  end if;
  return new;
end
$$;
create trigger productos_servicio_sin_variantes before update of tipo on public.productos
  for each row execute function public.servicio_sin_variantes();

-- ---------------------------------------------------------------------------------------------------------------------
-- Inventario y pedidos por variante
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.ajustes_inventario add column variante_id uuid references public.producto_variantes(id) on delete set null;

-- La llave se revisa al final de la sentencia: así borrar una tienda en cascada no choca con el orden de los borrados.
-- Una variante con pedidos no se puede borrar (guardar_variantes la deja inactiva).
alter table public.pedido_items
  add column variante_id uuid references public.producto_variantes(id) deferrable initially deferred,
  add column variante_texto text check (variante_texto is null or char_length(variante_texto) <= 120),
  add column por_encargo boolean not null default false;
create index pedido_items_variante_idx on public.pedido_items (variante_id) where variante_id is not null;

-- El item es de un producto de la tienda del pedido; la variante es de ese producto; un producto con variantes activas
-- entra con su variante. La foto fija del texto de la variante la pone la base.
create or replace function public.validar_item_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_opciones jsonb;
  v_valores jsonb;
begin
  if not exists (
    select 1
    from public.pedidos p
    join public.productos pr on pr.tienda_id = p.tienda_id
    where p.id = new.pedido_id and pr.id = new.producto_id
  ) then
    raise exception 'El producto no pertenece a la tienda del pedido' using errcode = '23514';
  end if;
  if new.variante_id is not null then
    select pr.opciones, v.valores into v_opciones, v_valores
    from public.producto_variantes v join public.productos pr on pr.id = v.producto_id
    where v.id = new.variante_id and v.producto_id = new.producto_id;
    if not found then
      raise exception 'variante_invalida' using errcode = '22023';
    end if;
    if new.variante_texto is null or tg_op = 'INSERT' or new.variante_id is distinct from old.variante_id then
      new.variante_texto := public.texto_variante(v_opciones, v_valores);
    end if;
  elsif exists (select 1 from public.producto_variantes v where v.producto_id = new.producto_id and v.activa) then
    raise exception 'usar_variante' using errcode = '22023';
  else
    new.variante_texto := null;
  end if;
  return new;
end
$$;
create or replace trigger pedido_items_validar
  before insert or update of pedido_id, producto_id, variante_id on public.pedido_items
  for each row execute function public.validar_item_pedido();

-- Mueve el stock de unos items (p_signo -1 descuenta y valida; +1 devuelve). Agrupa por (producto, variante); un item por
-- encargo no toca ni valida el stock. Bloquea primero los productos y luego las variantes, siempre por id.
-- Solo la llaman las funciones de pedidos.
create function public.mover_stock_items(p_items jsonb, p_signo integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_falta text;
begin
  perform 1 from public.productos
  where id in (
    select (e ->> 'producto_id')::uuid from jsonb_array_elements(p_items) e
    where not coalesce((e ->> 'por_encargo')::boolean, false)
  )
  order by id for update;
  perform 1 from public.producto_variantes
  where id in (
    select (e ->> 'variante_id')::uuid from jsonb_array_elements(p_items) e
    where e ->> 'variante_id' is not null and not coalesce((e ->> 'por_encargo')::boolean, false)
  )
  order by id for update;

  if p_signo < 0 then
    select pr.nombre || ' · ' || public.texto_variante(pr.opciones, v.valores) into v_falta
    from (
      select (e ->> 'variante_id')::uuid as variante_id, sum((e ->> 'cantidad')::integer) as cant
      from jsonb_array_elements(p_items) e
      where e ->> 'variante_id' is not null and not coalesce((e ->> 'por_encargo')::boolean, false)
      group by 1
    ) g
    join public.producto_variantes v on v.id = g.variante_id
    join public.productos pr on pr.id = v.producto_id
    where v.stock is not null and v.stock < g.cant
    limit 1;
    if v_falta is null then
      select pr.nombre into v_falta
      from (
        select (e ->> 'producto_id')::uuid as producto_id, sum((e ->> 'cantidad')::integer) as cant
        from jsonb_array_elements(p_items) e
        where e ->> 'variante_id' is null and not coalesce((e ->> 'por_encargo')::boolean, false)
        group by 1
      ) g
      join public.productos pr on pr.id = g.producto_id
      where pr.stock is not null and pr.stock < g.cant
      limit 1;
    end if;
    if v_falta is not null then
      raise exception 'stock_insuficiente: %', v_falta using errcode = 'P0001';
    end if;
  end if;

  update public.producto_variantes v set stock = v.stock + p_signo * g.cant
  from (
    select (e ->> 'variante_id')::uuid as variante_id, sum((e ->> 'cantidad')::integer) as cant
    from jsonb_array_elements(p_items) e
    where e ->> 'variante_id' is not null and not coalesce((e ->> 'por_encargo')::boolean, false)
    group by 1
  ) g
  where v.id = g.variante_id and v.stock is not null;

  update public.productos pr set stock = pr.stock + p_signo * g.cant
  from (
    select (e ->> 'producto_id')::uuid as producto_id, sum((e ->> 'cantidad')::integer) as cant
    from jsonb_array_elements(p_items) e
    where e ->> 'variante_id' is null and not coalesce((e ->> 'por_encargo')::boolean, false)
    group by 1
  ) g
  where pr.id = g.producto_id and pr.stock is not null;
end
$$;

-- Los items de un pedido guardado, como jsonb para mover_stock_items
create function public.items_de_pedido(p_pedido_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('producto_id', i.producto_id, 'variante_id', i.variante_id,
    'cantidad', i.cantidad, 'por_encargo', i.por_encargo)), '[]'::jsonb)
  from public.pedido_items i where i.pedido_id = p_pedido_id
$$;

create or replace function public.despachar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
begin
  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id and tienda_id in (select public.mis_tiendas())
  for update;
  if not found then
    raise exception 'pedido_no_encontrado' using errcode = 'P0002';
  end if;
  if v_pedido.estado <> 'por_despachar' then
    raise exception 'pedido_no_despachable' using errcode = 'P0001';
  end if;
  perform public.mover_stock_items(public.items_de_pedido(p_pedido_id), -1);
  update public.pedidos set estado = 'despachado', despachado_en = now()
  where id = p_pedido_id
  returning * into v_pedido;
  return v_pedido;
end
$$;

-- Deshacer un despacho: devuelve el stock (por variante cuando aplica; nada por los items por encargo).
create or replace function public.deshacer_despacho(p_pedido_id uuid)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
begin
  select * into v_pedido from public.pedidos
  where id = p_pedido_id and tienda_id in (select public.mis_tiendas())
  for update;
  if not found then raise exception 'pedido_no_encontrado' using errcode = 'P0002'; end if;
  if v_pedido.estado <> 'despachado' then raise exception 'pedido_no_deshacible' using errcode = 'P0001'; end if;
  perform public.mover_stock_items(public.items_de_pedido(p_pedido_id), 1);
  update public.pedidos set estado = 'por_despachar', despachado_en = null
  where id = p_pedido_id returning * into v_pedido;
  return v_pedido;
end
$$;

-- Los items que llegan en p_items, revisados y con su precio: el que viene, si no el de la variante, si no el del producto.
create function public.items_revisados(p_tienda_id uuid, p_items jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_res jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'sin_productos' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as i(producto_id uuid, variante_id uuid, cantidad int, precio_unitario int, por_encargo boolean)
    where i.cantidad is null or i.cantidad <= 0 or (i.precio_unitario is not null and i.precio_unitario < 0) or i.producto_id is null
  ) then
    raise exception 'items_invalidos' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as i(producto_id uuid, variante_id uuid, cantidad int, precio_unitario int, por_encargo boolean)
    where not exists (select 1 from public.productos pr where pr.id = i.producto_id and pr.tienda_id = p_tienda_id)
  ) then
    raise exception 'producto_no_encontrado' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as i(producto_id uuid, variante_id uuid, cantidad int, precio_unitario int, por_encargo boolean)
    where i.variante_id is not null and not exists (
      select 1 from public.producto_variantes v where v.id = i.variante_id and v.producto_id = i.producto_id and v.tienda_id = p_tienda_id
    )
  ) then
    raise exception 'variante_invalida' using errcode = '22023';
  end if;
  select jsonb_agg(jsonb_build_object(
    'producto_id', i.producto_id,
    'variante_id', i.variante_id,
    'nombre', pr.nombre,
    'cantidad', i.cantidad,
    'precio_unitario', coalesce(i.precio_unitario, v.precio, pr.precio),
    'por_encargo', coalesce(i.por_encargo, false)
  ) order by e.n)
  into v_res
  from jsonb_array_elements(p_items) with ordinality as e(x, n)
  cross join lateral jsonb_to_record(e.x) as i(producto_id uuid, variante_id uuid, cantidad int, precio_unitario int, por_encargo boolean)
  join public.productos pr on pr.id = i.producto_id
  left join public.producto_variantes v on v.id = i.variante_id;
  return v_res;
end
$$;

-- Editar un pedido: como hoy, y cada item puede traer variante_id y por_encargo (y su precio por defecto).
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
  v_items  jsonb;
  v_total  bigint;
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
    v_items := public.items_revisados(v_pedido.tienda_id, p_items);
    if p_ya_hecho and p_fecha is null then raise exception 'fecha_invalida' using errcode = 'P0001'; end if;

    select sum((x ->> 'cantidad')::bigint * (x ->> 'precio_unitario')::bigint) into v_total from jsonb_array_elements(v_items) x;

    delete from public.pedido_items where pedido_id = p_pedido_id;
    insert into public.pedido_items (pedido_id, producto_id, variante_id, nombre_producto, cantidad, precio_unitario, por_encargo)
    select p_pedido_id, (x ->> 'producto_id')::uuid, (x ->> 'variante_id')::uuid, x ->> 'nombre',
      (x ->> 'cantidad')::integer, (x ->> 'precio_unitario')::integer, (x ->> 'por_encargo')::boolean
    from jsonb_array_elements(v_items) x;

    update public.pedidos
    set cliente_id = p_cliente_id,
        total = v_total,
        codigo_promo = nullif(trim(p_codigo_promo), ''),
        creado_en = coalesce(p_fecha, creado_en),
        estado = case when p_ya_hecho then 'despachado' else estado end,
        despachado_en = case when p_ya_hecho then p_fecha else despachado_en end
    where id = p_pedido_id returning * into v_pedido;

    if p_ya_hecho and p_descontar_stock then
      perform public.mover_stock_items(v_items, -1);
    end if;
  end if;

  if v_pedido.cliente_id is not null and p_fecha is not null then
    update public.clientes set primer_pedido_en = p_fecha
    where id = v_pedido.cliente_id and primer_pedido_en > p_fecha;
  end if;
  return v_pedido;
end
$$;

-- Registrar una venta que ya ocurrió: como hoy, y cada item puede traer variante_id y por_encargo.
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
  v_items  jsonb;
  v_total  bigint;
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
  v_items := public.items_revisados(p_tienda_id, p_items);

  select sum((x ->> 'cantidad')::bigint * (x ->> 'precio_unitario')::bigint) into v_total from jsonb_array_elements(v_items) x;

  insert into public.pedidos (tienda_id, cliente_id, origen, estado, total, codigo_promo, creado_en, despachado_en)
  values (p_tienda_id, p_cliente_id, 'manual', 'despachado', v_total, nullif(trim(p_codigo_promo), ''), p_fecha, p_fecha)
  returning * into v_pedido;

  insert into public.pedido_items (pedido_id, producto_id, variante_id, nombre_producto, cantidad, precio_unitario, por_encargo)
  select v_pedido.id, (x ->> 'producto_id')::uuid, (x ->> 'variante_id')::uuid, x ->> 'nombre',
    (x ->> 'cantidad')::integer, (x ->> 'precio_unitario')::integer, (x ->> 'por_encargo')::boolean
  from jsonb_array_elements(v_items) x;

  if p_descontar_stock then
    perform public.mover_stock_items(v_items, -1);
  end if;

  if p_cliente_id is not null then
    update public.clientes set primer_pedido_en = p_fecha
    where id = p_cliente_id and primer_pedido_en > p_fecha;
  end if;

  return v_pedido;
end
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- ajustar_stock y reponer_stock por variante
-- ---------------------------------------------------------------------------------------------------------------------

-- Se recrea con el argumento nuevo al final (p_variante_id): las llamadas de hoy, sin él, siguen funcionando.
drop function public.ajustar_stock(uuid, uuid, integer, text, text);
create function public.ajustar_stock(
  p_tienda_id uuid,
  p_producto_id uuid,
  p_variacion integer,
  p_motivo text,
  p_nota text default null,
  p_variante_id uuid default null
)
returns public.productos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_producto public.productos;
  v_variante public.producto_variantes;
  v_stock_anterior integer;
  v_stock_nuevo bigint;
  v_nota text := nullif(btrim(p_nota), '');
begin
  if v_actor_id is null then
    raise exception 'ajuste_sin_sesion' using errcode = '42501';
  end if;
  if p_tienda_id is null or not exists (
    select 1 where p_tienda_id in (select public.mis_tiendas())
  ) then
    raise exception 'ajuste_sin_permiso' using errcode = '42501';
  end if;
  if p_producto_id is null or p_variacion is null or p_variacion = 0 then
    raise exception 'ajuste_invalido' using errcode = '22023';
  end if;
  if p_motivo is null or p_motivo not in ('reposicion', 'dano', 'perdida', 'correccion_inventario', 'otro')
     or (p_variacion > 0 and p_motivo <> 'reposicion')
     or (p_variacion < 0 and p_motivo = 'reposicion') then
    raise exception 'motivo_ajuste_invalido' using errcode = '22023';
  end if;
  if (v_nota is not null and char_length(v_nota) > 200) or (p_motivo = 'otro' and v_nota is null) then
    raise exception 'nota_ajuste_invalida' using errcode = '22023';
  end if;

  select * into v_producto
  from public.productos p
  where p.id = p_producto_id and p.tienda_id = p_tienda_id
  for update;
  if not found then
    raise exception 'ajuste_producto_no_encontrado' using errcode = 'P0002';
  end if;

  if p_variante_id is null then
    if exists (select 1 from public.producto_variantes v where v.producto_id = p_producto_id and v.activa) then
      raise exception 'usar_variante' using errcode = '22023';
    end if;
    if v_producto.stock is null then
      raise exception 'stock_sin_control' using errcode = 'P0001';
    end if;
    v_stock_anterior := v_producto.stock;
  else
    select * into v_variante from public.producto_variantes v
    where v.id = p_variante_id and v.producto_id = p_producto_id and v.tienda_id = p_tienda_id and v.activa
    for update;
    if not found then
      raise exception 'variante_invalida' using errcode = '22023';
    end if;
    if v_variante.stock is null then
      raise exception 'stock_sin_control' using errcode = 'P0001';
    end if;
    v_stock_anterior := v_variante.stock;
  end if;

  v_stock_nuevo := v_stock_anterior::bigint + p_variacion::bigint;
  if v_stock_nuevo < 0 then
    raise exception 'stock_negativo' using errcode = 'P0001';
  end if;
  if v_stock_nuevo > 2147483647 then
    raise exception 'stock_fuera_de_rango' using errcode = '22003';
  end if;

  if p_variante_id is null then
    update public.productos p set stock = v_stock_nuevo::integer
    where p.id = p_producto_id and p.tienda_id = p_tienda_id;
  else
    -- La suma del producto la pone el trigger de variantes
    update public.producto_variantes v set stock = v_stock_nuevo::integer where v.id = p_variante_id;
  end if;

  insert into public.ajustes_inventario (
    tienda_id, producto_id, variante_id, variacion, stock_anterior, stock_nuevo, motivo, nota, creado_por
  ) values (
    p_tienda_id, p_producto_id, p_variante_id, p_variacion, v_stock_anterior, v_stock_nuevo::integer, p_motivo, v_nota, v_actor_id
  );

  select * into v_producto from public.productos p where p.id = p_producto_id;
  return v_producto;
end
$$;
revoke all on function public.ajustar_stock(uuid, uuid, integer, text, text, uuid) from public, anon;
grant execute on function public.ajustar_stock(uuid, uuid, integer, text, text, uuid) to authenticated;

-- Misma firma de hoy: cada item puede traer variante_id. No se repite el mismo (producto, variante).
create or replace function public.reponer_stock(p_tienda_id uuid, p_items jsonb, p_nota text default null)
returns setof public.productos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_ids uuid[] := '{}';
  v_vistos text[] := '{}';
  v_clave text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'reposicion_vacia' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 200 then
    raise exception 'reposicion_muy_grande' using errcode = '22023';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if (v_item->>'producto_id') is null or (v_item->>'cantidad') is null
       or (v_item->>'cantidad')::integer <= 0 then
      raise exception 'reposicion_invalida' using errcode = '22023';
    end if;
    v_clave := (v_item->>'producto_id') || ':' || coalesce(v_item->>'variante_id', '');
    if v_clave = any(v_vistos) then
      raise exception 'reposicion_repetida' using errcode = '22023';
    end if;
    v_vistos := v_vistos || v_clave;
    if not ((v_item->>'producto_id')::uuid = any(v_ids)) then
      v_ids := v_ids || (v_item->>'producto_id')::uuid;
    end if;
    perform public.ajustar_stock(p_tienda_id, (v_item->>'producto_id')::uuid, (v_item->>'cantidad')::integer, 'reposicion', p_nota,
      (v_item->>'variante_id')::uuid);
  end loop;
  return query select p.* from public.productos p where p.tienda_id = p_tienda_id and p.id = any(v_ids);
end
$$;

-- Con variantes activas, el stock se cambia por variante: aquí solo la ficha (si viene un cambio de stock → usar_variante).
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
    select 1 from jsonb_object_keys(p_cambios) k where k not in ('nombre','precio','fotos','foto_retocada','categoria','activo','destacado')
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
  -- Las constraints de productos validan el resto; una excepción revierte todo.
  if p_retocar then perform public.gastar_creditos(p_tienda_id,5);end if;
  update public.productos set nombre=v_ficha.nombre, precio=v_ficha.precio, fotos=v_ficha.fotos,
    foto_retocada=v_ficha.foto_retocada, categoria=v_ficha.categoria, activo=v_ficha.activo,
    destacado=v_ficha.destacado, stock=case when v_ajustar then p_stock_nuevo else v_producto.stock end
    where id=p_producto_id and tienda_id=p_tienda_id returning * into v_producto;
  if v_ajustar then
    insert into public.ajustes_inventario(id,tienda_id,producto_id,variacion,stock_anterior,stock_nuevo,motivo,nota,creado_por)
    values(p_ajuste_id,p_tienda_id,p_producto_id,v_delta::integer,p_stock_base,p_stock_nuevo,p_motivo,v_nota,v_actor);
  end if;
  return v_producto;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Guardar opciones y variantes juntos
-- ---------------------------------------------------------------------------------------------------------------------

-- Deja exactamente las variantes de p_variantes (cada una: valores, stock, precio, activa, orden). Las que ya existían se
-- reconocen por valores y conservan su id; las que desaparecen se borran, salvo que tengan pedidos (quedan inactivas).
-- Cada cambio de stock de una variante queda en ajustes_inventario como corrección. Con p_opciones = '[]' quita las
-- variantes y el producto vuelve a stock simple. Devuelve las variantes del producto.
create function public.guardar_variantes(p_tienda_id uuid, p_producto_id uuid, p_opciones jsonb, p_variantes jsonb)
returns setof public.producto_variantes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_producto public.productos;
  v_item jsonb;
  v_previa public.producto_variantes;
  v_nueva public.producto_variantes;
  v_stock integer;
  v_orden integer := 0;
  v_valores jsonb[] := '{}';
begin
  if v_actor is null or p_tienda_id is null or not exists (select 1 where p_tienda_id in (select public.mis_tiendas())) then
    raise exception 'variantes_sin_permiso' using errcode = '42501';
  end if;
  if p_opciones is null or not public.opciones_validas(p_opciones)
     or p_variantes is null or jsonb_typeof(p_variantes) <> 'array'
     or (jsonb_array_length(p_opciones) = 0 and jsonb_array_length(p_variantes) > 0)
     or jsonb_array_length(p_variantes) > 144 then
    raise exception 'variante_invalida' using errcode = '22023';
  end if;
  select * into v_producto from public.productos p where p.id = p_producto_id and p.tienda_id = p_tienda_id for update;
  if not found then
    raise exception 'ajuste_producto_no_encontrado' using errcode = 'P0002';
  end if;
  if v_producto.tipo <> 'producto' and jsonb_array_length(p_variantes) > 0 then
    raise exception 'variante_invalida' using errcode = '22023';
  end if;
  -- Cada variante: valores (objeto, sin repetir), stock y precio enteros ≥ 0 o null, activa y orden opcionales
  for v_item in select * from jsonb_array_elements(p_variantes) loop
    if jsonb_typeof(v_item) <> 'object' or jsonb_typeof(v_item -> 'valores') <> 'object'
       or (v_item -> 'valores') = any(v_valores)
       or (v_item ? 'stock' and jsonb_typeof(v_item -> 'stock') not in ('number', 'null'))
       or (v_item ? 'precio' and jsonb_typeof(v_item -> 'precio') not in ('number', 'null'))
       or (v_item ? 'activa' and jsonb_typeof(v_item -> 'activa') <> 'boolean')
       or (v_item ? 'orden' and jsonb_typeof(v_item -> 'orden') <> 'number')
       -- un valor por eje, que existe en ese eje (las que ya existían también se revisan contra los ejes nuevos)
       or (select count(*) from jsonb_object_keys(v_item -> 'valores')) <> jsonb_array_length(p_opciones)
       or exists (
         select 1 from jsonb_array_elements(p_opciones) e
         where jsonb_typeof(v_item -> 'valores' -> (e ->> 'nombre')) is distinct from 'string'
            or not ((e -> 'valores') @> jsonb_build_array(v_item -> 'valores' -> (e ->> 'nombre')))
       ) then
      raise exception 'variante_invalida' using errcode = '22023';
    end if;
    v_valores := v_valores || (v_item -> 'valores');
  end loop;

  update public.productos p set opciones = p_opciones where p.id = p_producto_id;

  -- Las que desaparecen: sin pedidos se borran; con pedidos quedan inactivas
  update public.producto_variantes v set activa = false
  where v.producto_id = p_producto_id and v.activa and not (v.valores = any(v_valores))
    and exists (select 1 from public.pedido_items i where i.variante_id = v.id);
  delete from public.producto_variantes v
  where v.producto_id = p_producto_id and not (v.valores = any(v_valores))
    and not exists (select 1 from public.pedido_items i where i.variante_id = v.id);

  for v_item in select * from jsonb_array_elements(p_variantes) loop
    v_stock := (v_item ->> 'stock')::integer;
    select * into v_previa from public.producto_variantes v
    where v.producto_id = p_producto_id and v.valores = v_item -> 'valores' for update;
    if found then
      update public.producto_variantes v
      set stock = v_stock,
          precio = (v_item ->> 'precio')::integer,
          activa = coalesce((v_item ->> 'activa')::boolean, true),
          orden = coalesce((v_item ->> 'orden')::smallint, v_orden::smallint)
      where v.id = v_previa.id
      returning * into v_nueva;
    else
      insert into public.producto_variantes (tienda_id, producto_id, valores, stock, precio, activa, orden)
      values (p_tienda_id, p_producto_id, v_item -> 'valores', v_stock, (v_item ->> 'precio')::integer,
        coalesce((v_item ->> 'activa')::boolean, true), coalesce((v_item ->> 'orden')::smallint, v_orden::smallint))
      returning * into v_nueva;
      v_previa := null;
    end if;
    -- El cambio de stock queda registrado (una variante nueva parte de 0)
    if v_nueva.stock is not null and v_nueva.stock is distinct from coalesce(v_previa.stock, 0)
       and (v_previa.id is null or v_previa.stock is not null) then
      insert into public.ajustes_inventario (tienda_id, producto_id, variante_id, variacion, stock_anterior, stock_nuevo, motivo, nota, creado_por)
      values (p_tienda_id, p_producto_id, v_nueva.id, v_nueva.stock - coalesce(v_previa.stock, 0), coalesce(v_previa.stock, 0),
        v_nueva.stock, 'correccion_inventario', null, v_actor);
    end if;
    v_orden := v_orden + 1;
  end loop;

  return query select v.* from public.producto_variantes v where v.producto_id = p_producto_id order by v.orden, v.creado_en;
end
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------------------------------------------------

revoke all on function public.texto_variante(jsonb, jsonb) from public, anon;
grant execute on function public.texto_variante(jsonb, jsonb) to authenticated;
revoke all on function public.validar_variante() from public, anon, authenticated;
revoke all on function public.sumar_stock_variantes() from public, anon, authenticated;
revoke all on function public.servicio_sin_variantes() from public, anon, authenticated;
revoke all on function public.mover_stock_items(jsonb, integer) from public, anon, authenticated;
revoke all on function public.items_de_pedido(uuid) from public, anon, authenticated;
revoke all on function public.items_revisados(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.guardar_variantes(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_variantes(uuid, uuid, jsonb, jsonb) to authenticated;
