-- "Por reponer" → "¡Ya la tengo!": suma la reposición de varios productos en una sola transacción (todo o nada).
-- p_items: [{"producto_id": uuid, "cantidad": int > 0}, ...]. Cada línea pasa por ajustar_stock (motivo 'reposicion'),
-- así quedan los mismos permisos, validaciones e historial en ajustes_inventario.
create or replace function public.reponer_stock(p_tienda_id uuid, p_items jsonb, p_nota text default null)
returns setof public.productos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_ids uuid[] := '{}';
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
    if (v_item->>'producto_id')::uuid = any(v_ids) then
      raise exception 'reposicion_repetida' using errcode = '22023';
    end if;
    v_ids := v_ids || (v_item->>'producto_id')::uuid;
    perform public.ajustar_stock(p_tienda_id, (v_item->>'producto_id')::uuid, (v_item->>'cantidad')::integer, 'reposicion', p_nota);
  end loop;
  return query select p.* from public.productos p where p.tienda_id = p_tienda_id and p.id = any(v_ids);
end
$$;

revoke all on function public.reponer_stock(uuid, jsonb, text) from public, anon;
grant execute on function public.reponer_stock(uuid, jsonb, text) to authenticated;
