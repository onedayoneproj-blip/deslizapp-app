-- Reglas de negocio que deben cumplirse SIEMPRE, aunque falle la app: número de pedido por tienda,
-- conteo de pedidos por cliente, likes, stock al despachar (sin negativos) y gasto de créditos.

-- Tienda de la persona con sesión. security definer: lee `usuarios` sin pasar por su RLS (evita recursión).
create function public.mi_tienda_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tienda_id from public.usuarios where id = (select auth.uid())
$$;

create function public.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end
$$;
create trigger productos_actualizado
  before update on public.productos
  for each row execute function public.tocar_actualizado_en();

-- Número visible del pedido: el mayor de la tienda + 1 (1001 si no tiene). El candado evita repetidos
-- cuando dos pedidos entran a la vez.
create function public.asignar_numero_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtextextended(new.tienda_id::text, 0));
    select coalesce(max(numero), 1000) + 1 into new.numero
    from public.pedidos
    where tienda_id = new.tienda_id;
  end if;
  return new;
end
$$;
-- numero es NOT NULL: el trigger corre antes de esa comprobación.
create trigger pedidos_numero
  before insert on public.pedidos
  for each row execute function public.asignar_numero_pedido();

-- pedidos_count = pedidos NO cancelados del cliente.
create function public.recalcular_pedidos_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viejo uuid;
  v_nuevo uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_viejo := old.cliente_id; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_nuevo := new.cliente_id; end if;

  if v_viejo is not null then
    update public.clientes c
    set pedidos_count = (select count(*) from public.pedidos p where p.cliente_id = c.id and p.estado <> 'cancelado')
    where c.id = v_viejo;
  end if;
  if v_nuevo is not null and v_nuevo is distinct from v_viejo then
    update public.clientes c
    set pedidos_count = (select count(*) from public.pedidos p where p.cliente_id = c.id and p.estado <> 'cancelado')
    where c.id = v_nuevo;
  end if;
  return null;
end
$$;
create trigger pedidos_conteo_cliente
  after insert or update of cliente_id, estado or delete on public.pedidos
  for each row execute function public.recalcular_pedidos_cliente();

-- productos.likes = número de eventos_aaah del producto.
create function public.actualizar_likes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.productos set likes = likes + 1 where id = new.producto_id;
  else
    update public.productos set likes = greatest(likes - 1, 0) where id = old.producto_id;
  end if;
  return null;
end
$$;
create trigger eventos_aaah_likes
  after insert or delete on public.eventos_aaah
  for each row execute function public.actualizar_likes();

-- Un producto solo puede entrar en pedidos de su propia tienda.
create function public.validar_item_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.pedidos p
    join public.productos pr on pr.tienda_id = p.tienda_id
    where p.id = new.pedido_id and pr.id = new.producto_id
  ) then
    raise exception 'El producto no pertenece a la tienda del pedido' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger pedido_items_validar
  before insert or update of pedido_id, producto_id on public.pedido_items
  for each row execute function public.validar_item_pedido();

-- Despachar: todo o nada. Revisa el stock, lo descuenta y marca el pedido. Nunca deja stock negativo.
-- Errores: pedido_no_encontrado, pedido_no_despachable, stock_insuficiente: <producto>.
create function public.despachar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_falta text;
begin
  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id and tienda_id = public.mi_tienda_id()
  for update;
  if not found then
    raise exception 'pedido_no_encontrado' using errcode = 'P0002';
  end if;
  if v_pedido.estado <> 'por_despachar' then
    raise exception 'pedido_no_despachable' using errcode = 'P0001';
  end if;

  -- Bloquea los productos del pedido en orden fijo (evita bloqueos cruzados entre dos despachos).
  perform 1
  from public.productos
  where id in (select producto_id from public.pedido_items where pedido_id = p_pedido_id)
  order by id
  for update;

  select pr.nombre into v_falta
  from (
    select producto_id, sum(cantidad) as cant
    from public.pedido_items
    where pedido_id = p_pedido_id
    group by producto_id
  ) i
  join public.productos pr on pr.id = i.producto_id
  where pr.stock is not null and pr.stock < i.cant
  limit 1;
  if v_falta is not null then
    raise exception 'stock_insuficiente: %', v_falta using errcode = 'P0001';
  end if;

  update public.productos pr
  set stock = pr.stock - i.cant
  from (
    select producto_id, sum(cantidad) as cant
    from public.pedido_items
    where pedido_id = p_pedido_id
    group by producto_id
  ) i
  where pr.id = i.producto_id and pr.stock is not null;

  update public.pedidos
  set estado = 'despachado', despachado_en = now()
  where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end
$$;

-- Créditos de retoque: solo se descuentan por aquí (la app no puede editar el saldo directamente).
create function public.gastar_creditos(p_cantidad integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo integer;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'cantidad_invalida' using errcode = '22023';
  end if;
  update public.tiendas
  set creditos_retoque = creditos_retoque - p_cantidad
  where id = public.mi_tienda_id() and creditos_retoque >= p_cantidad
  returning creditos_retoque into v_saldo;
  if not found then
    raise exception 'creditos_insuficientes' using errcode = 'P0001';
  end if;
  return v_saldo;
end
$$;

-- Las funciones que se llaman desde la app solo las puede ejecutar una persona con sesión.
revoke execute on function public.mi_tienda_id() from public, anon;
revoke execute on function public.despachar_pedido(uuid) from public, anon;
revoke execute on function public.gastar_creditos(integer) from public, anon;
grant execute on function public.mi_tienda_id() to authenticated;
grant execute on function public.despachar_pedido(uuid) to authenticated;
grant execute on function public.gastar_creditos(integer) to authenticated;

-- Funciones de trigger: nadie las llama a mano.
revoke execute on function public.recalcular_pedidos_cliente() from public, anon, authenticated;
revoke execute on function public.actualizar_likes() from public, anon, authenticated;
