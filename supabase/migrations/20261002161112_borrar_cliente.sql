-- Elimina un contacto conservando sus pedidos o borrándolos, según elección explícita.
-- Solo puede ejecutarlo una persona autenticada que pertenezca a la tienda del contacto.
create or replace function public.borrar_cliente(p_cliente_id uuid, p_borrar_pedidos boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tienda_id uuid;
begin
  select c.tienda_id into v_tienda_id
  from public.clientes c
  where c.id = p_cliente_id
    and c.tienda_id in (select public.mis_tiendas())
  for update;

  if not found then
    raise exception 'cliente_no_encontrado' using errcode = 'P0002';
  end if;

  if p_borrar_pedidos then
    -- Las FK borran en cascada los renglones y abonos. El inventario no cambia:
    -- eliminar el registro histórico no revierte ventas que ya ocurrieron.
    delete from public.pedidos
    where tienda_id = v_tienda_id and cliente_id = p_cliente_id;
  else
    update public.pedidos
    set cliente_id = null
    where tienda_id = v_tienda_id and cliente_id = p_cliente_id;
  end if;

  delete from public.clientes
  where id = p_cliente_id and tienda_id = v_tienda_id;
end
$$;

revoke all on function public.borrar_cliente(uuid, boolean) from public, anon;
grant execute on function public.borrar_cliente(uuid, boolean) to authenticated;
