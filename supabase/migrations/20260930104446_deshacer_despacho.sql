-- Deshacer un despacho: devuelve el stock y regresa el pedido a "por_despachar".
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
  perform 1 from public.productos
  where id in (select producto_id from public.pedido_items where pedido_id = p_pedido_id) order by id for update;
  update public.productos pr set stock = pr.stock + i.cant
  from (select producto_id, sum(cantidad) as cant from public.pedido_items where pedido_id = p_pedido_id group by producto_id) i
  where pr.id = i.producto_id and pr.stock is not null;
  update public.pedidos set estado = 'por_despachar', despachado_en = null
  where id = p_pedido_id returning * into v_pedido;
  return v_pedido;
end
$$;
revoke all on function public.deshacer_despacho(uuid) from public, anon;
grant execute on function public.deshacer_despacho(uuid) to authenticated;
