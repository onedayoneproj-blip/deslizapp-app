-- Aditiva: la RPC ajustar_stock publicada conserva nombre, firma y comportamiento.
-- Lectura de historial paginada y estable por tienda/producto.
create index ajustes_inventario_historial_idx on public.ajustes_inventario (tienda_id, producto_id, creado_en desc, id desc);

-- Ficha, stock, registro y créditos de la foto se confirman en una sola transacción.
-- Necesita privilegios de propietario para escribir el historial, igual que ajustar_stock.
create function public.guardar_producto_inventario(
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
revoke all on function public.guardar_producto_inventario(uuid,uuid,jsonb,integer,integer,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.guardar_producto_inventario(uuid,uuid,jsonb,integer,integer,text,text,uuid,boolean) to authenticated;
