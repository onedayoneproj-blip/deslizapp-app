-- Ajustes manuales de stock: registro auditable y actualización atómica.
-- Los pedidos siguen siendo la única forma de registrar ventas; despachar_pedido conserva su lógica actual.

create table public.ajustes_inventario (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  producto_id uuid not null,
  variacion integer not null check (variacion <> 0),
  stock_anterior integer not null check (stock_anterior >= 0),
  stock_nuevo integer not null check (stock_nuevo >= 0),
  motivo text not null check (motivo in ('reposicion', 'dano', 'perdida', 'correccion_inventario', 'otro')),
  nota text check (nota is null or char_length(nota) <= 200),
  creado_por uuid not null,
  creado_en timestamptz not null default now(),
  foreign key (producto_id, tienda_id) references public.productos (id, tienda_id) on delete restrict,
  check (stock_nuevo::bigint = stock_anterior::bigint + variacion::bigint),
  check (motivo <> 'otro' or (nota is not null and char_length(btrim(nota)) > 0))
);

-- Índices de las claves foráneas: borrar una tienda y proteger productos con ajustes.
create index ajustes_inventario_tienda_idx on public.ajustes_inventario (tienda_id);
create index ajustes_inventario_producto_idx on public.ajustes_inventario (producto_id, tienda_id);

alter table public.ajustes_inventario enable row level security;
revoke all on public.ajustes_inventario from anon, authenticated;
grant select on public.ajustes_inventario to authenticated;

create policy ajustes_inventario_de_mi_tienda on public.ajustes_inventario
  for select to authenticated
  using (exists (
    select 1
    where ajustes_inventario.tienda_id in (select public.mis_tiendas())
  ));

-- La app conserva permisos para editar la ficha del producto, pero el inventario existente solo se cambia por la RPC.
-- Crear productos sí conserva su stock inicial mediante INSERT; el despacho sigue usando sus RPC actuales.
revoke update on public.productos from authenticated;
-- Conserva los permisos anteriores sobre las demás columnas; el único campo restringido es stock.
grant update (id, tienda_id, nombre, precio, fotos, foto_retocada, categoria, activo, destacado, likes, creado_en, actualizado_en, detalles, opciones) on public.productos to authenticated;

-- SECURITY DEFINER es necesario para que la app no tenga permisos de escritura directa sobre el registro.
-- La función identifica al actor desde la sesión, valida su membresía, bloquea el producto y realiza ambas escrituras
-- en la misma transacción. search_path vacío y ejecución solo para authenticated.
create function public.ajustar_stock(
  p_tienda_id uuid,
  p_producto_id uuid,
  p_variacion integer,
  p_motivo text,
  p_nota text default null
)
returns public.productos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_producto public.productos;
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
  if v_producto.stock is null then
    raise exception 'stock_sin_control' using errcode = 'P0001';
  end if;

  v_stock_anterior := v_producto.stock;
  v_stock_nuevo := v_producto.stock::bigint + p_variacion::bigint;
  if v_stock_nuevo < 0 then
    raise exception 'stock_negativo' using errcode = 'P0001';
  end if;
  if v_stock_nuevo > 2147483647 then
    raise exception 'stock_fuera_de_rango' using errcode = '22003';
  end if;

  update public.productos p
  set stock = v_stock_nuevo::integer
  where p.id = p_producto_id and p.tienda_id = p_tienda_id
  returning p.* into v_producto;

  insert into public.ajustes_inventario (
    tienda_id, producto_id, variacion, stock_anterior, stock_nuevo, motivo, nota, creado_por
  ) values (
    p_tienda_id, p_producto_id, p_variacion, v_stock_anterior, v_producto.stock, p_motivo, v_nota, v_actor_id
  );

  return v_producto;
end
$$;

revoke all on function public.ajustar_stock(uuid, uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.ajustar_stock(uuid, uuid, integer, text, text) to authenticated;
