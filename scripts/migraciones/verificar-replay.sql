-- SOLO en la base desechable, después de reproducir las 15 migraciones.
do $$
begin
  if (select count(*) from pg_tables where schemaname = 'public' and rowsecurity) <> 11 then
    raise exception 'Se esperaban 11 tablas con RLS';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pedido_items'::regclass
      and conname = 'pedido_items_producto_id_fkey'
      and condeferrable and condeferred and confdeltype = 'a'
  ) then raise exception 'La relación de productos debe ser NO ACTION y diferida'; end if;
  if not exists (
    select 1 from pg_class where oid = 'public.pedidos_saldo'::regclass
      and reloptions @> array['security_invoker=true']
  ) then raise exception 'La vista de saldo debe respetar al usuario que consulta'; end if;
  if exists (select 1 from public.tiendas) or exists (select 1 from public.invitaciones) then
    raise exception 'El replay no debe crear tiendas ni invitaciones de producción';
  end if;
  if not exists (
    select 1 from storage.buckets where id = 'productos' and name = 'productos'
      and public and file_size_limit = 5242880
      and allowed_mime_types = array['image/jpeg','image/png','image/webp']
  ) then raise exception 'Configuración incorrecta del bucket de fotos'; end if;
end
$$;
