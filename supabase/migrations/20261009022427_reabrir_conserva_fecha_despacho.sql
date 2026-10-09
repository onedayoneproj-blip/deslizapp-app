-- Reabrir un despachado conserva la fecha original de la venta (reportes, clientes que repiten y factura no se mueven a hoy).
create or replace function public.deshacer_despacho(p_pedido_id uuid)
 returns public.pedidos language plpgsql security definer set search_path to ''
as $function$
declare
  v_pedido public.pedidos;
begin
  perform public.exigir_no_viendo((select p.tienda_id from public.pedidos p where p.id = p_pedido_id));
  perform public.exigir_permiso((select p.tienda_id from public.pedidos p where p.id = p_pedido_id), 'ventas');
  select * into v_pedido from public.pedidos
  where id = p_pedido_id and tienda_id in (select public.mis_tiendas())
  for update;
  if not found then raise exception 'pedido_no_encontrado' using errcode = 'P0002'; end if;
  if v_pedido.estado <> 'despachado' then raise exception 'pedido_no_deshacible' using errcode = 'P0001'; end if;
  perform public.mover_stock_items(public.items_de_pedido(p_pedido_id), 1);
  update public.pedidos set estado = 'por_despachar'   -- CAMBIO: ya no pone despachado_en = null
  where id = p_pedido_id returning * into v_pedido;
  return v_pedido;
end
$function$;

create or replace function public.despachar_pedido(p_pedido_id uuid)
 returns public.pedidos language plpgsql security definer set search_path to ''
as $function$
declare
  v_pedido public.pedidos;
begin
  perform public.exigir_no_viendo((select p.tienda_id from public.pedidos p where p.id = p_pedido_id));
  perform public.exigir_permiso((select p.tienda_id from public.pedidos p where p.id = p_pedido_id), 'ventas');
  select * into v_pedido from public.pedidos
  where id = p_pedido_id and tienda_id in (select public.mis_tiendas())
  for update;
  if not found then raise exception 'pedido_no_encontrado' using errcode = 'P0002'; end if;
  if v_pedido.estado <> 'por_despachar' then raise exception 'pedido_no_despachable' using errcode = 'P0001'; end if;
  perform public.mover_stock_items(public.items_de_pedido(p_pedido_id), -1);
  update public.pedidos set estado = 'despachado', despachado_en = coalesce(despachado_en, now())   -- CAMBIO: respeta la fecha original
  where id = p_pedido_id returning * into v_pedido;
  return v_pedido;
end
$function$;
