-- Pendiente: generada con Supabase CLI. NO aplicada a producción.
-- Eliminación lógica: conserva snapshots, relaciones, medios, stock e historial.
alter table public.productos add column eliminado_en timestamptz;
alter table public.productos add constraint productos_eliminados_ocultos check (eliminado_en is null or not activo);
-- La app publicada no usa DELETE de productos. Solo la RPC permite retirarlos.
revoke delete on public.productos from authenticated;

create function public.revisar_eliminacion_producto(p_tienda_id uuid, p_producto_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pedidos integer; v_solicitudes integer; v_avisos integer; v_historial boolean;
begin
  if auth.uid() is null or p_tienda_id not in (select public.mis_tiendas()) then raise exception 'sin_acceso'; end if;
  if not exists (select 1 from public.productos where id=p_producto_id and tienda_id=p_tienda_id) then raise exception 'producto_no_encontrado'; end if;
  select count(*) into v_pedidos from public.pedidos p where p.tienda_id=p_tienda_id and p.estado in ('nuevo','por_despachar')
    and exists(select 1 from public.pedido_items i where i.pedido_id=p.id and i.producto_id=p_producto_id);
  select count(*) into v_solicitudes from public.solicitudes_pedido s where s.tienda_id=p_tienda_id and s.pedido_id is null
    and s.registrada_en is null and s.descartada_en is null and s.vence_en >= now()
    and exists(select 1 from jsonb_array_elements(s.items) x where x->>'producto_id'=p_producto_id::text);
  select count(*) into v_avisos from public.avisos_llegada where tienda_id=p_tienda_id and producto_id=p_producto_id and avisado_en is null;
  select exists(select 1 from public.pedido_items i join public.pedidos p on p.id=i.pedido_id where p.tienda_id=p_tienda_id and i.producto_id=p_producto_id)
    or exists(select 1 from public.ajustes_inventario where tienda_id=p_tienda_id and producto_id=p_producto_id)
    or exists(select 1 from public.solicitudes_pedido s where s.tienda_id=p_tienda_id and exists(select 1 from jsonb_array_elements(s.items) x where x->>'producto_id'=p_producto_id::text))
    into v_historial;
  return jsonb_build_object('pedidosPendientes',v_pedidos,'solicitudesPendientes',v_solicitudes,'avisosPendientes',v_avisos,'conHistorial',v_historial);
end $$;

create function public.eliminar_producto(p_tienda_id uuid, p_producto_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_producto public.productos; v_revision jsonb;
begin
  if auth.uid() is null or p_tienda_id not in (select public.mis_tiendas()) then raise exception 'sin_acceso'; end if;
  select * into v_producto from public.productos where id=p_producto_id and tienda_id=p_tienda_id for update;
  if not found then raise exception 'producto_no_encontrado'; end if;
  if v_producto.eliminado_en is not null then return; end if;
  v_revision := public.revisar_eliminacion_producto(p_tienda_id,p_producto_id);
  if (v_revision->>'pedidosPendientes')::integer > 0 or (v_revision->>'solicitudesPendientes')::integer > 0 or (v_revision->>'avisosPendientes')::integer > 0 then
    raise exception 'producto_con_pendientes';
  end if;
  update public.productos set activo=false, eliminado_en=now() where id=p_producto_id and tienda_id=p_tienda_id;
end $$;
revoke all on function public.revisar_eliminacion_producto(uuid,uuid), public.eliminar_producto(uuid,uuid) from public, anon;
grant execute on function public.revisar_eliminacion_producto(uuid,uuid), public.eliminar_producto(uuid,uuid) to authenticated;

-- El bloqueo de producto serializa la eliminación con nuevas relaciones. Los triggers
-- no exponen lecturas: se ejecutan solo desde escrituras ya autorizadas por RLS/RPC.
create function public.proteger_referencia_producto_eliminado()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_tienda uuid; v_producto public.productos;
begin
  if tg_table_name='solicitudes_pedido' then
    v_tienda:=new.tienda_id;
    for v_id in select distinct (x->>'producto_id')::uuid from jsonb_array_elements(new.items) x order by 1 loop
      select * into v_producto from public.productos where id=v_id for update;
      if not found or v_producto.tienda_id<>v_tienda or v_producto.eliminado_en is not null then raise exception 'producto_eliminado_o_ajeno'; end if;
    end loop;
  else
    v_id:=new.producto_id;
    if tg_table_name='pedido_items' then select tienda_id into v_tienda from public.pedidos where id=new.pedido_id;
    else v_tienda:=new.tienda_id; end if;
    select * into v_producto from public.productos where id=v_id for update;
    if not found or v_tienda is null or v_producto.tienda_id<>v_tienda or v_producto.eliminado_en is not null then raise exception 'producto_eliminado_o_ajeno'; end if;
  end if;
  return new;
end $$;
revoke all on function public.proteger_referencia_producto_eliminado() from public,anon,authenticated;
create trigger pedido_items_no_eliminados before insert or update of producto_id on public.pedido_items for each row execute function public.proteger_referencia_producto_eliminado();
create trigger solicitudes_no_eliminados before insert or update of items on public.solicitudes_pedido for each row execute function public.proteger_referencia_producto_eliminado();
create trigger avisos_no_eliminados before insert on public.avisos_llegada for each row execute function public.proteger_referencia_producto_eliminado();
create trigger ajustes_no_eliminados before insert on public.ajustes_inventario for each row execute function public.proteger_referencia_producto_eliminado();

-- No se pueden crear retirados ni editar/mostrar de nuevo desde una sesión antigua.
-- stock/likes se mantienen actualizables para despacho/devolución e historial.
create function public.proteger_ficha_producto_eliminado()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='INSERT' then
    if new.eliminado_en is not null then raise exception 'producto_eliminado'; end if;
  elsif old.eliminado_en is not null then raise exception 'producto_eliminado';
  end if;
  return new;
end $$;
revoke all on function public.proteger_ficha_producto_eliminado() from public,anon,authenticated;
create trigger productos_no_crear_eliminados before insert on public.productos for each row execute function public.proteger_ficha_producto_eliminado();
create trigger productos_no_editar_eliminados before update of nombre,precio,fotos,foto_retocada,categoria,activo,destacado,slug,tipo,medios,detalles,opciones,por_encargo,encargo_texto on public.productos for each row execute function public.proteger_ficha_producto_eliminado();
